/**
 * SMS Parser Service — Android Bank Transaction Auto-Detection
 *
 * Parses Egyptian bank SMS strings (CIB, NBE, Banque Misr, QNB, etc.)
 * into structured ParsedTransaction objects.
 *
 * Patterns handled (from real bank messages):
 *  EXPENSE — card debit:    تم خصم X EGP من بطاقة... عند MERCHANT يوم...
 *  EXPENSE — prepaid debit: تم خصم X EGP من بطاقة المدفوعة مقدما... عند MERCHANT
 *  EXPENSE — instant pay:   تم خصم مبلغ X جم لحظيا... من حسابكم... عند MERCHANT
 *  EXPENSE — outgoing xfer: تم تنفيذ تحويل لحظي من حسابكم/بطاقتكم... بمبلغ X جم إلى NAME
 *  INCOME  — incoming xfer: تم إضافة تحويل لحظي لحسابكم... بمبلغ X جم من NAME
 */

import { ParsedTransaction, TransactionType, Budget } from "../../../shared/types";
import { findMatchingBudgetForCategory } from "../../budgets/utils/budgetMatching";
import {
  SmsDetectorConfig,
  getCachedConfig,
  DEFAULT_SMS_CONFIG,
} from "./smsConfigService";

export const KNOWN_BANK_SENDERS = DEFAULT_SMS_CONFIG.bankSenders;

export function isBankSender(sender: string, config?: SmsDetectorConfig): boolean {
  if (!sender) return false;
  const activeConfig = config || getCachedConfig();
  const cleanSender = sender.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  return activeConfig.bankSenders.some((bank) => {
    const cleanBank = bank.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (!cleanBank) return false;
    return (
      cleanSender.includes(cleanBank) ||
      (cleanSender.length >= 3 && cleanBank.includes(cleanSender))
    );
  });
}

/**
 * Detects if the SMS text represents an ATM cash withdrawal.
 * ATM cash withdrawals transfer money from bank/card to cash in pocket,
 * so they are not tracked as expenses (if ignoreAtmWithdrawals is enabled).
 */
export function isAtmWithdrawal(text: string, config?: SmsDetectorConfig): boolean {
  if (!text) return false;
  const activeConfig = config || getCachedConfig();

  if (!activeConfig.ignoreAtmWithdrawals) {
    return false;
  }

  const lowerText = text.toLowerCase();
  for (const kw of activeConfig.atmKeywords) {
    if (!kw) continue;
    const cleanKw = kw.trim();
    if (!cleanKw) continue;
    // Special handling for "ATM" so it matches "ATM", "ATM186", "ATM-123" but not "ATMOSPHERE"
    if (cleanKw.toUpperCase() === "ATM") {
      if (/(?:^|[^a-zA-Z])ATM(?:\d+|\b|[-_\s])/i.test(text)) {
        return true;
      }
      continue;
    }
    if (lowerText.includes(cleanKw.toLowerCase())) {
      return true;
    }
  }

  return false;
}

function cleanWhitespace(str: string): string {
  return str.replace(/\s+/g, " ").trim();
}

function normalizeDigits(str: string): string {
  return str
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Amount extraction ──────────────────────────────────────────────────
function extractSmsAmount(text: string, config?: SmsDetectorConfig): number | undefined {
  const activeConfig = config || getCachedConfig();
  const normalizedText = normalizeDigits(text);
  const currencyPattern =
    activeConfig.currencyKeywords.length > 0
      ? activeConfig.currencyKeywords.map(escapeRegex).join("|")
      : "EGP|LE|جم|جنيه|USD";

  // Strip the available-balance suffix (المتاح...) before parsing
  // so we never accidentally grab the post-transaction balance
  const balanceRegex = new RegExp(`(?:المتاح|الرصيد\\s*المتاح)\\s*[:\\-]?\\s*[\\d,]+(?:\\.\\d{1,2})?\\s*(?:${currencyPattern})?`, "gi");
  const stripped = normalizedText.replace(balanceRegex, "");

  const amountPatterns = [
    // "بمبلغ 7400.00 جم" or "بمبلغ 468.30 EGP" — most explicit, try first
    new RegExp(`بمبلغ\\s*([\\d,]+(?:\\.\\d{1,2})?)\\s*(?:${currencyPattern})?`, "i"),
    // "تم خصم 4000 EGP" or "تم خصم مبلغ 468.30 جم" or "تم إضافة مبلغ 1500 جم"
    new RegExp(`(?:تم\\s+خصم|خصم|تم\\s+إضافة|تم\\s+اضافة|تم\\s+إيداع|تم\\s+ايداع|إيداع|ايداع)\\s+(?:مبلغ\\s+)?([\\d,]+(?:\\.\\d{1,2})?)\\s*(?:${currencyPattern})?`, "i"),
    // English: "Purchase of EGP 450.00" / "Amount: 450.00 EGP"
    new RegExp(`(?:Purchase|Withdrawal|Payment|Transfer|Deposit|Credited|Debited|Amount|${currencyPattern})\\s*(?:of|is|was|:)?\\s*(?:${currencyPattern})?\\s*([\\d,]+(?:\\.\\d{1,2})?)`, "i"),
    // Currency prefix: "EGP 450.50"
    new RegExp(`(?:${currencyPattern})\\s*([\\d,]+(?:\\.\\d{1,2})?)`, "i"),
    // Currency suffix: "450.00 EGP"
    new RegExp(`([\\d,]+(?:\\.\\d{1,2})?)\\s*(?:${currencyPattern})`, "i"),
  ];

  for (const regex of amountPatterns) {
    const match = stripped.match(regex);
    if (match && match[1]) {
      const num = parseFloat(match[1].replace(/,/g, ""));
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return undefined;
}

function containsKeyword(lowerText: string, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return false;
  // Short single-word keywords (like "وارد") should match on word/whitespace boundaries
  // so they don't falsely match substrings like "موارد"
  if (!kw.includes(" ") && kw.length <= 4) {
    const escaped = escapeRegex(kw);
    const boundaryRegex = new RegExp(`(?:^|[\\s.,:;()\\-/])${escaped}(?:$|[\\s.,:;()\\-/])`, "i");
    return boundaryRegex.test(lowerText);
  }
  return lowerText.includes(kw);
}

// ── Transaction Type extraction ─────────────────────────────────────────
function extractSmsType(text: string, config?: SmsDetectorConfig): TransactionType {
  const activeConfig = config || getCachedConfig();
  const lowerText = text.toLowerCase();

  // Check multi-word configured phrases first (more specific), then single-word configured keywords
  const incomePhrases = activeConfig.incomeKeywords.filter((k) => k.trim().includes(" "));
  const expensePhrases = activeConfig.expenseKeywords.filter((k) => k.trim().includes(" "));
  const incomeWords = activeConfig.incomeKeywords.filter((k) => !k.trim().includes(" "));
  const expenseWords = activeConfig.expenseKeywords.filter((k) => !k.trim().includes(" "));

  for (const kw of incomePhrases) {
    if (containsKeyword(lowerText, kw)) return "income";
  }
  for (const kw of expensePhrases) {
    if (containsKeyword(lowerText, kw)) return "expense";
  }
  for (const kw of incomeWords) {
    if (containsKeyword(lowerText, kw)) return "income";
  }
  for (const kw of expenseWords) {
    if (containsKeyword(lowerText, kw)) return "expense";
  }

  return "expense";
}

// ── Date extraction ─────────────────────────────────────────────────────
function extractSmsDate(text: string): Date {
  const normalizedText = normalizeDigits(text);
  // 3-part full date: "يوم 03/09/26" (DD/MM/YY) or "يوم 07/08/26"
  // Handles with or without space: "يوم 03/09/26" or "يوم03/09/26"
  const fullDateMatch = normalizedText.match(
    /(?:يوم|بتاريخ|on|date)\s*([0-3]?\d)[/\-]([0-1]?\d)[/\-](\d{2,4})/i
  );
  if (fullDateMatch) {
    const day = parseInt(fullDateMatch[1], 10);
    const month = parseInt(fullDateMatch[2], 10) - 1;
    let year = parseInt(fullDateMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // 2-part short date without year: "يوم 09-03" (MM-DD, as NBE InstaPay uses)
  const shortDateMatch = normalizedText.match(
    /(?:يوم|بتاريخ|on|date)\s*([0-1]?\d)[/\-]([0-3]?\d)(?!\d)/i
  );
  if (shortDateMatch) {
    const month = parseInt(shortDateMatch[1], 10) - 1;
    const day = parseInt(shortDateMatch[2], 10);
    const year = new Date().getFullYear();
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  return new Date();
}

// ── Merchant / Description extraction ───────────────────────────────────
function extractSmsMerchant(text: string, type: TransactionType): string {
  // For INCOME — extract sender name after "من"
  // Pattern: "بمبلغ X جم من NAME رقم مرجعي"
  if (type === "income") {
    const incomeMatch = text.match(
      /(?:بمبلغ\s*[\d.,]+\s*(?:جم|جنيه|EGP|LE)?\s+)من\s+([^\d]+?)(?:\s+رقم\s+مرجعي|\s+يوم|$)/i
    );
    if (incomeMatch && incomeMatch[1]) {
      const name = cleanWhitespace(incomeMatch[1]);
      if (name && !name.includes("حساب") && !name.includes("بطاق")) {
        return `من: ${name}`;
      }
    }
  }

  // For EXPENSE outgoing transfer — extract recipient after "إلى"
  // Pattern: "بمبلغ X جم إلى NAME رقم مرجعي"
  const toMatch = text.match(
    /إلى\s+([^\d]+?)(?:\s+رقم\s+مرجعي|\s+يوم|$)/i
  );
  if (toMatch && toMatch[1]) {
    const name = cleanWhitespace(toMatch[1].replace(/\*+/g, ""));
    if (name && name.length > 1) return `تحويل إلى: ${name}`;
  }

  // For card purchases / instant pay — extract merchant after "عند"
  // Pattern: "عند MERCHANT يوم" or "عندMERCHANT يوم03/09/26"
  const atMatch = text.match(/عند\s*([^\n]+?)(?:\s+يوم|\s*يوم\d|\s+الساعه|\s+الساعة|\s*$)/i);
  if (atMatch && atMatch[1]) {
    const merchant = cleanWhitespace(atMatch[1]);
    // Skip if it's just whitespace or a bank account reference
    if (merchant && !merchant.includes("حساب") && merchant.length > 1) {
      return merchant;
    }
  }

  // English merchant
  const englishMatch = text.match(
    /(?:at|from|to)\s+([A-Z0-9\s.&_-]+?)(?:\s+(?:on|in|date|avail|\d{2}[/-])|\.|$)/i
  );
  if (englishMatch && englishMatch[1]) {
    const m = cleanWhitespace(englishMatch[1]);
    if (m.length > 1 && !m.toLowerCase().includes("account")) return m;
  }

  // Fallback by keyword
  if (/سحب|withdrawal|atm/i.test(text)) return "ATM Withdrawal";
  if (/شراء|purchase/i.test(text)) return "Card Purchase";
  if (/تحويل|transfer/i.test(text)) return "Bank Transfer";
  if (/انترنت|internet/i.test(text)) return "Internet Bill";

  return "Bank SMS Transaction";
}

// ── Category Matching ───────────────────────────────────────────────────
function matchSmsCategory(
  text: string,
  categories: { id: string; name: string }[] = [],
  defaultCategoryId?: string
): { categoryId: string | undefined; categoryHint: string | undefined } {
  const normalized = text.toLowerCase();

  for (const cat of categories) {
    if (normalized.includes(cat.name.toLowerCase())) {
      return { categoryId: cat.id, categoryHint: cat.name };
    }
  }

  const candidates: { id: string; word: string; name: string }[] = [];
  for (const cat of categories) {
    const words = cat.name.split(/\s+/).filter((w) => w.length > 2);
    for (const w of words) {
      candidates.push({ id: cat.id, word: w.toLowerCase(), name: cat.name });
    }
  }
  candidates.sort((a, b) => b.word.length - a.word.length);

  for (const item of candidates) {
    if (normalized.includes(item.word)) {
      return { categoryId: item.id, categoryHint: item.name };
    }
  }

  return { categoryId: defaultCategoryId, categoryHint: undefined };
}

// ── Main SMS Parser ─────────────────────────────────────────────────────
export function parseSmsTransaction(
  smsText: string,
  categories: { id: string; name: string }[] = [],
  budgets?: Record<string, Budget> | Budget[] | null,
  defaultCategoryId?: string,
  config?: SmsDetectorConfig
): ParsedTransaction | null {
  if (!smsText || !smsText.trim()) return null;

  const activeConfig = config || getCachedConfig();

  // Ignore ATM cash withdrawals if enabled
  if (isAtmWithdrawal(smsText, activeConfig)) {
    return null;
  }

  const amount = extractSmsAmount(smsText, activeConfig);
  if (amount === undefined || isNaN(amount) || amount <= 0) return null;

  const type = extractSmsType(smsText, activeConfig);
  const description = extractSmsMerchant(smsText, type);

  const { categoryId, categoryHint } = matchSmsCategory(
    `${description} ${smsText}`,
    categories,
    defaultCategoryId
  );

  let budgetId: string | undefined = undefined;
  if (categoryId && budgets) {
    const matched = findMatchingBudgetForCategory(budgets, categoryId);
    if (matched) budgetId = matched.id;
  }

  return {
    amount,
    type,
    description,
    date: extractSmsDate(smsText),
    categoryId,
    budgetId,
    categoryHint,
    confidence: 0.9,
    rawText: smsText.trim(),
  };
}
