/**
 * SMS Parser Service — Android Bank Transaction Auto-Detection
 *
 * Parses Egyptian bank SMS strings (prioritizing NBE / National Bank of Egypt,
 * with support for CIB, Banque Misr, QNB, etc.) into structured ParsedTransaction
 * objects, reusing the architecture pattern from voiceParser.ts.
 */

import { ParsedTransaction, TransactionType, Budget } from "../types";
import { findMatchingBudgetForCategory } from "../utils/budgetMatching";

export const KNOWN_BANK_SENDERS = [
  "NBE",
  "NBE-SMS",
  "NBE-ALERT",
  "AHLY",
  "ALAHLY",
  "CIB",
  "CIBEGYPT",
  "BANQUEMISR",
  "BM",
  "QNB",
  "HSBC",
  "ALEXBANK",
  "BDC",
  "EGBANK",
];

export function isBankSender(sender: string): boolean {
  if (!sender) return false;
  const clean = sender.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return KNOWN_BANK_SENDERS.some((bank) => clean.includes(bank));
}

// ── Amount extraction ──────────────────────────────────────────────────
function extractSmsAmount(text: string): number | undefined {
  // Try specific bank amount patterns first
  const amountPatterns = [
    // Direct amount after بمبلغ or مبلغ: e.g. "بمبلغ 2000.00 جم" or "مبلغ 2000.00 EGP"
    /(?:بمبلغ|مبلغ)\s*(?:EGP|LE|USD|EUR|جم|جنيه)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:جم|جنيه|EGP|LE)?/i,
    // Arabic patterns: e.g. "تم خصم 414.2 EGP", "شراء بمبلغ 450.00 جم"
    /(?:شراء|خصم|سحب|إيداع|إضافة|تحويل)\s*(?:بمبلغ)?\s*(?:EGP|LE|USD|EUR|جم|جنيه)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:جم|جنيه|EGP|LE)?/i,
    // English patterns: e.g. "Purchase of EGP 450.00", "Amount of 450.00 EGP", "EGP 450.00 was made"
    /(?:Purchase|Withdrawal|Payment|Transfer|Deposit|Amount|Bal|EGP|LE|USD|EUR)\s*(?:of|is|was|:)?\s*(?:EGP|LE|USD|EUR)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    // General currency prefix/suffix: "EGP 450.50" or "450.50 EGP" or "450.00 جم"
    /(?:EGP|LE|USD|EUR|جم|جنيه)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:EGP|LE|USD|EUR|جم|جنيه)/i,
  ];

  for (const regex of amountPatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const clean = match[1].replace(/,/g, "");
      const num = parseFloat(clean);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  }
  return undefined;
}

// ── Transaction Type extraction ─────────────────────────────────────────
function extractSmsType(text: string): TransactionType {
  const lower = text.toLowerCase();
  const incomeKeywords = [
    "credited",
    "deposit",
    "received",
    "income",
    "salary",
    "إيداع",
    "إضافة",
    "وارد",
    "تم اضافة",
    "تحويل وارد",
  ];

  for (const kw of incomeKeywords) {
    if (lower.includes(kw)) {
      return "income";
    }
  }
  return "expense";
}

// ── Date extraction ─────────────────────────────────────────────────────
function extractSmsDate(text: string): Date {
  // 1) Match 3-part date: "يوم 03/07/26" or "on 03/07/2026"
  const fullDateMatch = text.match(/(?:يوم|بتاريخ|on|date)\s+([0-3]?\d)[/-]([0-1]?\d)[/-](\d{2,4})/i);
  if (fullDateMatch && fullDateMatch[1] && fullDateMatch[2] && fullDateMatch[3]) {
    const day = parseInt(fullDateMatch[1], 10);
    const month = parseInt(fullDateMatch[2], 10) - 1;
    let year = parseInt(fullDateMatch[3], 10);
    if (year < 100) {
      year += 2000; // e.g. "26" -> 2026
    }
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }

  // 2) Match 2-part date without year (e.g., NBE InstaPay "يوم 07-22" = MM-DD)
  const shortDateMatch = text.match(/(?:يوم|بتاريخ|on|date)\s+([0-1]?\d)[/-]([0-3]?\d)(?!\d)/i);
  if (shortDateMatch && shortDateMatch[1] && shortDateMatch[2]) {
    const month = parseInt(shortDateMatch[1], 10) - 1;
    const day = parseInt(shortDateMatch[2], 10);
    const year = new Date().getFullYear();
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }

  return new Date();
}

// ── Merchant / Description extraction ───────────────────────────────────
function extractSmsMerchant(text: string, defaultName: string = "Bank SMS Transaction"): string {
  // Arabic merchant/recipient patterns: e.g. "إلى احمد م*** ف****", "عند ASWAK FATHALLA MALLK. DAW  يوم", "لدى CARREFOUR في", "لصالح STARBUCKS"
  const arabicMatch = text.match(/(?:إلى|الي|إلي|عند|لدى|لصالح|من|في)\s+([^\d]+?)(?:\s+(?:رقم|مرجعي|يوم|في|بتاريخ|الساعه|الساعة|رصيد|\d{2}[/-]\d{2})|\.|$)/);
  if (arabicMatch && arabicMatch[1] && arabicMatch[1].trim().length > 1) {
    const clean = arabicMatch[1].trim();
    if (clean.length > 1 && !clean.includes("حساب") && !clean.includes("بطاق")) {
      return clean;
    }
  }

  // English merchant patterns: e.g. "at CARREFOUR EGYPT on 29/07/2026", "to STARBUCKS on"
  const englishMatch = text.match(/(?:at|from|to|in)\s+([A-Z0-9\s.&_-]+?)(?:\s+(?:on|in|at|date|avail|balance|bal|\d{2}[/-]\d{2})|\.|$)/i);
  if (englishMatch && englishMatch[1] && englishMatch[1].trim().length > 1) {
    const clean = englishMatch[1].replace(/^(the|a|an)\s+/i, "").trim();
    if (clean.length > 1 && !clean.toLowerCase().includes("your") && !clean.toLowerCase().includes("account")) {
      return clean;
    }
  }

  // Fallback description based on transaction keywords
  if (/withdrawal|سحب/i.test(text)) return "ATM Withdrawal";
  if (/purchase|شراء/i.test(text)) return "Card Purchase";
  if (/transfer|تحويل/i.test(text)) return "Bank Transfer";

  return defaultName;
}

// ── Category Matching ───────────────────────────────────────────────────
function matchSmsCategory(
  text: string,
  categories: { id: string; name: string }[] = [],
  defaultCategoryId?: string,
): { categoryId: string | undefined; categoryHint: string | undefined } {
  const normalized = text.toLowerCase();

  // Full name match
  for (const cat of categories) {
    if (normalized.includes(cat.name.toLowerCase())) {
      return { categoryId: cat.id, categoryHint: cat.name };
    }
  }

  // Word-level partial match (sorted by length descending)
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
): ParsedTransaction | null {
  if (!smsText || !smsText.trim()) return null;

  const amount = extractSmsAmount(smsText);
  // If no amount found, it's not a valid financial transaction SMS
  if (amount === undefined || isNaN(amount) || amount <= 0) {
    return null;
  }

  const type = extractSmsType(smsText);
  const description = extractSmsMerchant(smsText);

  // Match Category
  const { categoryId, categoryHint } = matchSmsCategory(
    `${description} ${smsText}`,
    categories,
    defaultCategoryId,
  );

  // Match Budget using shared utility
  let budgetId: string | undefined = undefined;
  if (categoryId && budgets) {
    const matchedBudget = findMatchingBudgetForCategory(budgets, categoryId);
    if (matchedBudget) {
      budgetId = matchedBudget.id;
    }
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
