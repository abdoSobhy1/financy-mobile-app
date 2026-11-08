/**
 * Voice Parser Service — Offline Transaction Extraction (Multi-Transaction)
 *
 * Parses spoken text (Arabic primary, English fallback) into one OR MORE
 * transaction objects using regex patterns and keyword matching.
 * Supports separators like "و" (and), commas, "also", "then".
 *
 * Arabic Sentence Patterns Handled:
 *   "انا اشتريت بطاطس ب20 جنيه"   → expense, "بطاطس", 20
 *   "دفعت 50 جنيه كهربا"           → expense, "كهربا", 50
 *   "صرفت 100 على الأكل"           → expense, "الأكل", 100
 *   "استلمت 5000 مرتب"             → income,  "مرتب", 5000
 *   "كسبت 200 من المشروع"          → income,  "المشروع", 200
 */

import { ParsedTransaction, TransactionType } from "../../../shared/types";
import { guessCategoryId } from "../../categories/utils/categoryDictionary";

// ── Arabic-Eastern ↔ Western digit conversion ───────────────────────────

const EASTERN_DIGITS: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

function easternToWestern(text: string): string {
  return text.replace(/[٠-٩]/g, (d) => EASTERN_DIGITS[d] ?? d);
}

// ── Keyword dictionaries ────────────────────────────────────────────────

const EXPENSE_KEYWORDS_AR = [
  "صرفت",
  "دفعت",
  "اشتريت",
  "حسابي",
  "ثمن",
  "فاتورة",
  "مصاريف",
  "شراء",
  "سعر",
  "تكلفة",
  "اشتري",
  "ادفع",
  "صرف",
  "جيبت",
  "خدت",
  "اخدت",
  "شريت",
  "اخذت",
  "حاسبت",
  "دافع",
];

const INCOME_KEYWORDS_AR = [
  "كسبت",
  "استلمت",
  "قبضت",
  "راتب",
  "دخل",
  "ربحت",
  "مكسب",
  "استلام",
  "تحويل",
  "قبض",
  "مرتب",
  "حصلت",
  "جالي",
  "وصلني",
  "استلم",
  "اخدت فلوس",
];

const EXPENSE_KEYWORDS_EN = [
  "spent",
  "paid",
  "bought",
  "cost",
  "expense",
  "bill",
  "purchase",
  "pay",
  "charged",
];

const INCOME_KEYWORDS_EN = [
  "earned",
  "received",
  "got paid",
  "income",
  "salary",
  "wage",
  "profit",
  "revenue",
  "collected",
];

const TODAY_KEYWORDS = ["النهارده", "اليوم", "today", "النهاردة"];
const YESTERDAY_KEYWORDS = ["امبارح", "أمس", "yesterday", "إمبارح", "البارحة"];

// Arabic filler / stop words that should be stripped from descriptions
const AR_STOP_WORDS = [
  "انا",
  "أنا",
  "احنا",
  "إحنا",
  "هو",
  "هي",
  "في",
  "من",
  "على",
  "عن",
  "الى",
  "إلى",
  "لل",
  "ب",
  "بس",
  "كده",
  "كدا",
  "يعني",
  "النهارده",
  "النهاردة",
  "اليوم",
  "امبارح",
  "أمس",
  "إمبارح",
  "البارحة",
  "فلوس",
  "حق",
  "تمن",
  "جنيه",
  "جنية",
  "دولار",
  "ريال",
  "دينار",
  "درهم",
];

// Currency words to strip
const CURRENCY_WORDS = [
  "جنيه",
  "جنية",
  "دولار",
  "ريال",
  "دينار",
  "درهم",
  "USD",
  "EUR",
  "GBP",
  "EGP",
];

// Separators for splitting multi-transaction recordings
// NOTE: The و separator uses a lookbehind to ensure it's not the last
// letter of words like كيلو or شامبو, but allows being attached to the next word (e.g. واشتريت, وكيلو).
const SEPARATORS =
  /\s*(?:,|،|[.]\s|(?<=^|\s)و\s*(?:كمان|بعدين)?|and\s|also\s|then\s|plus\s|كمان\s|بعدين\s)\s*/i;

// ── Arabic Textual Numbers Normalization ────────────────────────────────
function normalizeArabicTextualNumbers(text: string): string {
  let normalized = text;

  // Map of textual numbers to their values
  const multipliers: Record<string, number> = {
    ألف: 1000,
    الف: 1000,
    آلاف: 1000,
    الاف: 1000,
    مليون: 1000000,
    ملايين: 1000000,
    مليار: 1000000000,
    مليارات: 1000000000,
  };

  // 1. Handle "Number + Word" (e.g., "13 ألف", "10 الاف", "5 مليون", "1.5 مليون")
  // Matches: (digits) (spaces) (word)
  // We use a regex that finds a number followed by one of our keywords
  const numberWordRegex =
    /(\d+(?:[.,]\d+)?)\s*(ألف|الف|آلاف|الاف|مليون|ملايين|مليار|مليارات)/g;

  normalized = normalized.replace(
    numberWordRegex,
    (match, numberPart, word) => {
      const value = parseFloat(numberPart.replace(/,/g, ""));
      const multiplier = multipliers[word];
      if (!isNaN(value) && multiplier) {
        return (value * multiplier).toString(); // e.g., "13000"
      }
      return match;
    },
  );

  // 2. Handle Standalone Words (e.g., "ألف" -> 1000)
  // This should only happen if they weren't caught by the step above (i.e., no preceding number)
  // We need to be careful not to replace "13000" (which might have come from step 1) if we were to just replace "ألف".
  // But wait, step 1 replaces the whole "13 ألف" string with "13000", so the word "ألف" is gone.
  // So we can safely replace remaining standalone keywords.

  Object.keys(multipliers).forEach((word) => {
    // Only match if it's a distinct word, not part of another word
    const regex = new RegExp(`(^|\\s)${word}($|\\s)`, "g");
    normalized = normalized.replace(regex, (match, prefix, suffix) => {
      return `${prefix}${multipliers[word]}${suffix}`;
    });
  });

  return normalized;
}

// ── Amount extraction (handles ب prefix) ────────────────────────────────

function extractAmount(text: string): {
  amount: number | undefined;
  remaining: string;
} {
  // First, convert Eastern numerals to Western
  let normalized = easternToWestern(text);

  // Then, normalize textual Arabic numbers (e.g., "ألف", "13 ألف") to digits
  normalized = normalizeArabicTextualNumbers(normalized);

  // Patterns ordered from most specific to least specific
  const patterns: { regex: RegExp; groupIndex: number }[] = [
    // Currency symbol then number: $50, €100
    { regex: /(?:\$|USD|€|EUR|£|GBP)\s*(\d+(?:[.,]\d{1,2})?)/, groupIndex: 1 },
    // Number then currency word: 50 جنيه, 100 دولار
    {
      regex:
        /(\d+(?:[.,]\d{1,2})?)\s*(?:جنيه|جنية|دولار|ريال|دينار|درهم|\$|USD|€|EUR|£|GBP)/i,
      groupIndex: 1,
    },
    // Arabic "ب" prefix: ب20, ب٥٠
    { regex: /ب\s*(\d+(?:[.,]\d{1,2})?)/, groupIndex: 1 },
    // Standalone number (fallback)
    { regex: /(\d+(?:[.,]\d{1,2})?)/, groupIndex: 1 },
  ];

  for (const { regex, groupIndex } of patterns) {
    const match = normalized.match(regex);
    if (match?.[groupIndex]) {
      const amount = parseFloat(match[groupIndex].replace(",", "."));
      if (!isNaN(amount) && amount > 0) {
        // Remove the entire matched portion from the original text
        // We need to find the same match in the original text
        // For the ب prefix pattern, also remove the ب
        let textToRemove = match[0];
        let remaining = normalized.replace(textToRemove, " ").trim();

        // Since we modified 'normalized' heavily (textual numbers), mapping back to 'text' (original)
        // by strict string replacement is risky if we don't know exactly what 'normalized' corresponds to.
        // However, the requirement is just to return remaining text.
        // If we found the amount in the normalized text, we should try to remove the *original* representation of that amount from the original text.

        // HEURISTIC: precise reconstruction is hard.
        // We will return the *normalized* text as the remaining text, minus the amount.
        // This is actually better because it leaves "clean" text for description extraction.
        // The only downside is if we wanted to preserve exact original wording for description,
        // but 'normalizeArabicTextualNumbers' only touches numbers, which we want to remove anyway.

        // Remove the matched amount pattern
        // remaining is already set above from 'normalized'

        // Also cleanup double spaces
        remaining = remaining.replace(/\s+/g, " ").trim();

        return { amount, remaining };
      }
    }
  }

  return { amount: undefined, remaining: text }; // Return original text if no amount found
}

// ── Type extraction ────────────────────────────────────────────────────

function extractType(text: string): TransactionType | undefined {
  const lower = text.toLowerCase();

  for (const kw of EXPENSE_KEYWORDS_AR) {
    if (text.includes(kw)) return "expense";
  }
  for (const kw of INCOME_KEYWORDS_AR) {
    if (text.includes(kw)) return "income";
  }
  for (const kw of EXPENSE_KEYWORDS_EN) {
    if (lower.includes(kw)) return "expense";
  }
  for (const kw of INCOME_KEYWORDS_EN) {
    if (lower.includes(kw)) return "income";
  }

  return undefined;
}

// ── Date extraction ────────────────────────────────────────────────────

function extractDate(text: string): Date | undefined {
  const lower = text.toLowerCase();

  for (const kw of TODAY_KEYWORDS) {
    if (lower.includes(kw) || text.includes(kw)) return new Date();
  }

  for (const kw of YESTERDAY_KEYWORDS) {
    if (lower.includes(kw) || text.includes(kw)) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d;
    }
  }

  const normalized = easternToWestern(text);
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
  ];

  for (const pattern of datePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const parsed = new Date(match[0]);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  return undefined;
}

// ── Description extraction (Arabic-aware) ─────────────────────────────

function extractDescription(remaining: string, originalText: string): string {
  // Strategy: strip all known keywords, stop words, numbers, currency,
  // and prepositions, then take what's left as the description.

  let desc = remaining;

  // Remove all transaction type keywords
  const allTypeKeywords = [
    ...EXPENSE_KEYWORDS_AR,
    ...INCOME_KEYWORDS_AR,
    ...EXPENSE_KEYWORDS_EN,
    ...INCOME_KEYWORDS_EN,
  ];

  for (const kw of allTypeKeywords) {
    const regex = /^[a-zA-Z]/.test(kw)
      ? new RegExp(`\\b${kw}\\b`, "gi")
      : new RegExp(kw, "g");
    desc = desc.replace(regex, "");
  }

  // Remove Arabic stop words (pronouns, prepositions, fillers)
  for (const sw of AR_STOP_WORDS) {
    // Word boundary approach: match the stop word when surrounded by spaces or at start/end
    const regex = new RegExp(`(?:^|\\s)${sw}(?:\\s|$)`, "g");
    desc = desc.replace(regex, " ");
  }

  // Remove currency words
  for (const cw of CURRENCY_WORDS) {
    desc = desc.replace(new RegExp(cw, "gi"), "");
  }

  // Remove remaining numbers, currency symbols, prepositions
  desc = desc
    .replace(/[\$€£]/g, "")
    .replace(/\d+(?:[.,]\d{1,2})?/g, "")
    .replace(/\bب\b/g, "") // standalone ب
    .replace(/\b(on|from|for)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // If description still has leading/trailing Arabic prepositions, clean them
  desc = desc
    .replace(/^(في|من|على|عن|لل?|ب)\s+/g, "")
    .replace(/\s+(في|من|على|عن)$/g, "")
    .trim();

  return desc;
}

// ── Parse a single segment ─────────────────────────────────────────────

// ── Category matching ──────────────────────────────────────────────────

export function findCategory(
  text: string,
  categories: { id: string; name: string }[] | Record<string, any>,
  transactions: any[] = [],
  defaultCategoryId?: string,
): { id: string | undefined; matchedText: string | undefined } {
  const normalizedText = text.toLowerCase();

  const categoryList: { id: string; name: string }[] = Array.isArray(categories)
    ? categories
    : Object.values(categories).map((c: any) => ({ id: c.id, name: c.name }));

  // First pass: try full category name match
  for (const category of categoryList) {
    if (!category?.name) continue;
    const catName = category.name.toLowerCase();
    if (normalizedText.includes(catName)) {
      return { id: category.id, matchedText: category.name };
    }
  }

  // Second pass: ML History matching
  if (transactions && transactions.length > 0) {
    const categoryScores: Record<string, number> = {};
    const inputWords = normalizedText.split(/\s+/).filter((w) => w.length > 2);
    let hasHistoryMatch = false;

    for (const tx of transactions) {
      if (!tx.description || !tx.categoryId) continue;
      const txDesc = tx.description.toLowerCase();

      let matchCount = 0;
      for (const word of inputWords) {
        if (txDesc.includes(word)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        categoryScores[tx.categoryId] = (categoryScores[tx.categoryId] || 0) + matchCount;
        hasHistoryMatch = true;
      }
    }

    if (hasHistoryMatch) {
      let maxScore = 0;
      let bestCatId: string | undefined;
      for (const [catId, score] of Object.entries(categoryScores)) {
        if (score > maxScore) {
          maxScore = score;
          bestCatId = catId;
        }
      }

      if (bestCatId) {
        return { id: bestCatId, matchedText: undefined };
      }
    }
  }

  // Third pass: try partial match (any single word from category name)
  // Sort by word length descending so longer/more specific words match first
  const candidates: { id: string; word: string; catName: string }[] = [];
  for (const category of categoryList) {
    if (!category?.name) continue;
    const words = category.name.split(/\s+/).filter((w) => w.length > 1);
    for (const word of words) {
      candidates.push({ id: category.id, word, catName: category.name });
    }
  }
  candidates.sort((a, b) => b.word.length - a.word.length);

  for (const { id, word, catName } of candidates) {
    if (normalizedText.includes(word.toLowerCase())) {
      return { id, matchedText: word };
    }
  }

  // Fourth pass: Dictionary fallback matching
  try {
    const categoriesMap = Array.isArray(categories)
      ? categories.reduce((acc, c: any) => ({ ...acc, [c.id]: c }), {})
      : categories;
    const dictGuess = guessCategoryId(text, categoriesMap);
    if (dictGuess) {
      return { id: dictGuess, matchedText: undefined };
    }
  } catch (e) {}

  return { id: defaultCategoryId, matchedText: undefined };
}

export function detectCategory(
  text: string,
  categories: { id: string; name: string }[] | Record<string, any>,
  transactions: any[] = [],
  defaultCategoryId?: string,
): string | undefined {
  return findCategory(text, categories, transactions, defaultCategoryId).id;
}

function parseSingleTransaction(
  text: string,
  categories: { id: string; name: string }[] = [],
  defaultCategoryId?: string,
  budgets: { id: string; categoryId?: string | null }[] = [],
  transactions: any[] = [],
): ParsedTransaction {
  const trimmed = text.trim();
  if (!trimmed) {
    return { confidence: 0, rawText: trimmed };
  }

  const type = extractType(trimmed);
  const { amount, remaining } = extractAmount(trimmed);
  const date = extractDate(trimmed);

  // Find category based on raw text
  const { id: categoryId, matchedText } = findCategory(
    trimmed,
    categories,
    transactions,
    defaultCategoryId,
  );

  // Strip matched category text from the remaining text before extracting description
  let descInput = remaining;
  if (matchedText) {
    // Remove the matched category word/phrase from the description input
    const regex = new RegExp(
      matchedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "gi",
    );
    descInput = descInput.replace(regex, " ").replace(/\s+/g, " ").trim();
  }

  const description = extractDescription(descInput, trimmed);
  const categoryHint = categoryId ? undefined : description || undefined;

  let fieldsFound = 0;
  const totalFields = 3;

  if (amount !== undefined) fieldsFound++;
  if (type !== undefined) fieldsFound++;
  if (description.length > 0) fieldsFound++;

  const confidence = fieldsFound / totalFields;

  // Find matching budget if available (ML History Scoring)
  let budgetId: string | undefined;
  if (categoryId) {
    // 1. Direct link check
    const directBudget = budgets.find(b => b.categoryId === categoryId);
    if (directBudget) {
      budgetId = directBudget.id;
    } else {
      // 2. ML History check: what budget is most often used with this category?
      const budgetScores: Record<string, number> = {};
      for (const tx of transactions) {
        if (tx.categoryId === categoryId && tx.budgetId) {
          budgetScores[tx.budgetId] = (budgetScores[tx.budgetId] || 0) + 1;
        }
      }
      
      let maxScore = 0;
      for (const [bId, score] of Object.entries(budgetScores)) {
        if (score > maxScore) {
          maxScore = score;
          budgetId = bId;
        }
      }
    }
  }

  return {
    amount,
    type: type ?? "expense",
    description: description || undefined,
    date: date ?? new Date(),
    categoryHint,
    categoryId,
    budgetId,
    confidence,
    rawText: trimmed,
  };
}

// ── Main parser (multi-transaction) ────────────────────────────────────

/**
 * Parse a voice transcript into one or more transactions.
 * Splits on natural separators ("و", "and", commas, etc.)
 * and parses each segment independently.
 */
export function parseVoiceInput(
  transcript: string,
  categories: { id: string; name: string }[] = [],
  defaultCategoryId?: string,
  budgets: { id: string; categoryId?: string | null }[] = [],
  transactions: any[] = [],
): ParsedTransaction[] {
  const text = transcript.trim();
  if (!text) return [];

  // Split on separators
  const segments = text.split(SEPARATORS).filter((s) => s.trim().length > 0);

  // If only one segment, check if it has multiple amounts (fallback heuristic)
  if (segments.length === 1) {
    const normalized = easternToWestern(text);
    const amounts = normalized.match(/\d+(?:[.,]\d{1,2})?/g);
    if (amounts && amounts.length > 1 && text.length > 20) {
      const parts: string[] = [];
      let remaining = text;
      for (let i = 0; i < amounts.length; i++) {
        const idx = easternToWestern(remaining).indexOf(amounts[i]);
        if (idx > 0 && i > 0) {
          parts.push(remaining.substring(0, idx).trim());
          remaining = remaining.substring(idx);
        }
      }
      if (remaining.trim()) parts.push(remaining.trim());
      if (parts.length > 1) {
        const transactionsList: ParsedTransaction[] = [];
        for (const part of parts) {
          const tx = parseSingleTransaction(part, categories, defaultCategoryId, budgets, transactions);
          if (tx.confidence > 0) {
            transactionsList.push(tx);
          }
        }
        return transactionsList;
      }
    }
  }

  const transactionsList = segments
    .map((s) => parseSingleTransaction(s, categories, defaultCategoryId, budgets, transactions))
    .filter((tx) => tx.confidence > 0);

  return transactionsList.length > 0 ? transactionsList : [parseSingleTransaction(text, categories, defaultCategoryId, budgets, transactions)];
}
