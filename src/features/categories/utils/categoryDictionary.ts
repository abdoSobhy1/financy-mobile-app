/**
 * Category Dictionary — Description-based Category Guessing
 *
 * Uses a static dictionary built from historical transaction data
 * to guess the most likely category for a transaction description.
 * Dictionary keys are category names (not IDs) for portability.
 */

import { Category } from "../../../shared/types";

// ── Static dictionary: categoryName → known descriptions ────────────

const CATEGORY_DICTIONARY: Record<string, string[]> = {
  "مواصلات الشغل": [
    "فطار الشغل+ شيتوس",
    "مواصلات",
    "مواصلات  خ",
    "مواصلات  ن",
    "مواصلات الشغل الخميس",
    "مواصلات ث",
    "مواصلات ح",
    "مواصلات خ",
    "مواصلات ر",
    "مواصلات ن",
    "مواصلات يوم الاربعاء",
  ],
  رفاهية: [
    "اكل جاهز",
    "اندومي",
    "اوريو",
    "بسبوسة",
    "بسبوسه",
    "بيبسي",
    "بيتزاية",
    "ترفيه",
    "حاجات كيكة",
    "حاجة الكيكة",
    "حبة هجايص اندومي وشيبسي",
    "حلاوة فولية",
    "حلويات",
    "دونات طلب العجبة اللي جنبي",
    "رفاهيات",
    "رفاهيات متفرقة",
    "سفندي",
    "سناك",
    "سناكس",
    "سوداني",
    "شيبسي",
    "عسكريم",
    "فشار",
    "فشار ودوريتوس",
    "فطيرة كاستارد",
    "قهوة",
    "كونو ونسكافيه",
    "لب",
    "لب وسوداني",
    "هشك بشك",
  ],
  اخرى: [
    "اكياس",
    "الخروجات + السفر",
    "الشاشة",
    "المعلمة",
    "بانادول",
    "تسوية",
    "تكاتك",
    "تيشرتاتي",
    "حاجة الريسيفر",
    "حجارة",
    "حلبة",
    "خروجة اسكندرية",
    "سجادة الاوضة",
    "سكرينة ليا",
    "شماعة",
    "شمعة الفلتر",
    "ضيعتهم",
    "علاقة حمام",
    "غوايش لفاطمة",
    "كابل الشاشة",
    "كابل للريسيفر",
    "كرتونة رمضان",
    "كركديه",
    "كوبايات",
    "كياس تلاجة",
    "مشوار القاهرة",
    "مفرش سفرة",
    "مكن حلاقة",
    "مواصلات للموقف",
    "مولبيد",
  ],
  Freelance: ["امباور", "امباور هب 🥳🥳🥳", "منصور", "نورهان (اورنج كاش)"],
  منظفات: [
    "شاور جيل",
    "فيبا",
    "لفه اكياس",
    "ليفة مواعين وسلك",
    "مسحوق",
    "مناديل",
    "مناديل مطبخ",
  ],
  "Bills & Utilities": [
    "Bill Payment: النت",
    "Debt Payment: باب",
    "Debt Payment: بابا",
    "الشهرية",
    "العمارة",
    "الكهرباء",
    "المياه",
    "النت",
    "باقة إضافية",
    "باقة اضافية",
    "شحن فودافون",
    "شحن كهربا",
    "شحن كهرباء",
    "غاز",
    "فاتورة الارضي",
    "فاتورة الماية",
    "فاتورة المياه",
    "فاتورة النت",
    "فانورة الارضي",
    "فلوس العمارة",
    "كارت الكهرباء",
    "ماية",
  ],
  Salary: ["بواقي المرتب", "تم قبض🥳🥳🥳"],
  "Other Income": ["باقي الشهر الماضي( مؤقتا)", "ريفاند الكورس"],
  اكل: [
    "2 ك رز",
    "4 ك مكرونة",
    "5ك رز",
    "،شكارة دقيق",
    "اكل من برا",
    "اندومي",
    "بسبوسة",
    "بلح",
    "بليلة",
    "بهارات",
    "بيض",
    "بيكنج باودر واخواته",
    "تونة",
    "جلاش",
    "حاجات للكيكة",
    "حلاوة",
    "خل",
    "خميوة",
    "دقيق",
    "دومتي",
    "دومتي زيتون",
    "رانش",
    "رانش وباربكيو",
    "رز",
    "رز بسمتي",
    "زبادي",
    "زبادي + بيكنج باودر",
    "زيت",
    "زيت درة",
    "زيتون وشيبسي",
    "سحور",
    "سكر",
    "سكر دايت",
    "سكر دايت سويتال",
    "سمبوسة",
    "سمك",
    "سوبيا",
    "شاي",
    "شعرية",
    "شكارة رز",
    "شوفان",
    "شيبسي",
    "صلصة",
    "طبق بيض",
    "طحينة",
    "عدس",
    "عسل",
    "عشا",
    "عشاء",
    "علبة جبنة",
    "علبة سمنة",
    "علبه صلصه",
    "عيش",
    "عيش سوري",
    "عيش فينو",
    "غداء",
    "فانيليا وكاكاو",
    "فتح الله",
    "فطار",
    "فطير",
    "فطيرة سجق",
    "فلفل اسود",
    "فلفل هاليبينو",
    "فول",
    "كاتشب",
    "كنافة",
    "كيري",
    "كيس سكر",
    "كيس شيبسي",
    "كيلو رز بسمتي",
    "لب",
    "لبن",
    "لسان عصفور",
    "مايونيز",
    "مرقة",
    "مرقة دجاج",
    "مسطردة",
    "ملح",
    "موتزاريلا",
    "نسكافيه",
    "نص موتزاريلا",
    "نص موتزاريلا التاني",
    "هاليبينو",
    "٢ كيس لسان عصفور",
  ],
  خضار: [
    "½ فلفل رومي",
    "السوق",
    "باذنجان",
    "بتنجان",
    "بتنجان وفلفل",
    "بصل",
    "بصل وخضرة",
    "بطاطا",
    "بطاطس",
    "جزر",
    "خس",
    "خصار",
    "خضار",
    "خضرة",
    "خيار",
    "سبانخ",
    "سفندي",
    "طماطم",
    "طماطم وخضرة",
    "فلفل",
    "فلفل ألوان",
    "فلفل اخضر",
    "فلفل حراق",
    "فلفل رومي",
    "قصب",
    "ك طماطم",
    "كابوتشا",
    "كابوتشي",
    "كرومبة",
    "كوسة",
    "ليمون",
    "موز",
    "٣ كيلو بصل",
  ],
  علاج: [
    "التحليل",
    "الكشف",
    "بانادول",
    "برشام",
    "بورشام",
    "دهان",
    "علاج",
    "علاج + كشف",
    "علاج البت",
    "علاج ريجيماكس",
    "كشف + علاج",
    "كشف فتمة وعلاج",
    "كيس شيبسي",
    "لزقة الرقبة",
    "لزقة ضهر",
  ],
  فطار: [
    "بيض",
    "تركي",
    "جبنة",
    "جبنة تركي",
    "جبنة تركي و لانشون",
    "جبنة قريش",
    "حلاوة طحينية",
    "دومتي",
    "ربع تركي",
    "ربع لانشون",
    "زبادي",
    "زيتون وشيبسي",
    "سحور",
    "عجينة فلاقل",
    "عسل اسود",
    "عشاء",
    "علبة جبنة",
    "فطار",
    "فطار وبسكوت",
    "فطار وعشا",
    "فطاري",
    "فلافل",
    "فول",
    "فول وفلافل",
    "كريم كراميل",
    "كيري",
    "لانشون",
    "لبنز",
  ],
  ملابس: ["هدوم ليا"],
  فاكهة: [
    "برتقان",
    "بلح",
    "تفاح",
    "جوافة",
    "رمان",
    "سفندي",
    "سوبيا",
    "عنب",
    "فراولة",
    "موز",
  ],
  لحوم: [
    "2.25 كيلو وراك",
    "بانيه",
    "بسطرمة",
    "سجق",
    "طرب",
    "كبدة",
    "كيلو لحمة",
    "لحمة",
    "مفرو",
    "مفروم",
    "نص بانيه",
    "وراك",
    "وراك فراخ",
    "٢ ك وراك",
  ],
  بهارات: [
    "بهارات",
    "بهارات سجق",
    "بهارات كبسة",
    "بهارات كمون وفراخ وبطاطس",
    "بهارات متنوعة",
    "سحلب وحمص",
    "شطة",
    "كبسة",
    "نشا",
  ],
};

// ── Pre-built normalized lookup for fast matching ────────────────────

interface DictionaryEntry {
  categoryName: string;
  original: string;
  normalized: string;
  words: string[];
}

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width chars
    .replace(/[ًٌٍَُِّْ]/g, "") // Arabic diacritics
    .replace(/\s+/g, " ");
}

// Build the lookup table once at module load
const LOOKUP_TABLE: DictionaryEntry[] = [];
for (const [categoryName, descriptions] of Object.entries(
  CATEGORY_DICTIONARY,
)) {
  for (const desc of descriptions) {
    const normalized = normalize(desc);
    LOOKUP_TABLE.push({
      categoryName,
      original: desc,
      normalized,
      words: normalized.split(/\s+/).filter((w) => w.length > 1),
    });
  }
}

// ── Guessing function ───────────────────────────────────────────────

export interface CategoryGuess {
  categoryName: string;
  confidence: number; // 0–1
  matchedEntry: string; // the dictionary entry that matched
}

/**
 * Guess the category for a transaction description.
 * Returns the best match or null if nothing reasonable was found.
 *
 * Matching strategy (in priority order):
 * 1. Exact match (confidence 1.0)
 * 2. Input contains a dictionary entry (confidence 0.9)
 * 3. A dictionary entry contains the input (confidence 0.85)
 * 4. Word overlap scoring (confidence 0.3–0.8 based on overlap)
 */
export function guessCategory(description: string): CategoryGuess | null {
  if (!description || description.trim().length === 0) return null;

  const input = normalize(description);
  if (input.length === 0) return null;

  let bestMatch: CategoryGuess | null = null;

  // 1. Exact match
  for (const entry of LOOKUP_TABLE) {
    if (input === entry.normalized) {
      return {
        categoryName: entry.categoryName,
        confidence: 1.0,
        matchedEntry: entry.original,
      };
    }
  }

  // 2. Input contains a dictionary entry (longer entries = better match)
  for (const entry of LOOKUP_TABLE) {
    if (entry.normalized.length >= 2 && input.includes(entry.normalized)) {
      const confidence = 0.9;
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = {
          categoryName: entry.categoryName,
          confidence,
          matchedEntry: entry.original,
        };
      }
    }
  }
  if (bestMatch && bestMatch.confidence >= 0.9) return bestMatch;

  // 3. Dictionary entry contains the input (input is a substring)
  for (const entry of LOOKUP_TABLE) {
    if (input.length >= 2 && entry.normalized.includes(input)) {
      const confidence = 0.85;
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = {
          categoryName: entry.categoryName,
          confidence,
          matchedEntry: entry.original,
        };
      }
    }
  }
  if (bestMatch && bestMatch.confidence >= 0.85) return bestMatch;

  // 4. Word overlap scoring
  const inputWords = input.split(/\s+/).filter((w) => w.length > 1);
  if (inputWords.length === 0) return bestMatch;

  for (const entry of LOOKUP_TABLE) {
    if (entry.words.length === 0) continue;

    let matchedWords = 0;
    for (const iw of inputWords) {
      for (const ew of entry.words) {
        // Check if words share a common root (one contains the other)
        if (iw.includes(ew) || ew.includes(iw)) {
          matchedWords++;
          break;
        }
      }
    }

    if (matchedWords === 0) continue;

    // Score based on how many input words matched vs total unique words
    const totalUniqueWords = new Set([...inputWords, ...entry.words]).size;
    const overlapScore = matchedWords / totalUniqueWords;
    const confidence = 0.3 + overlapScore * 0.5; // Range: 0.3–0.8

    if (!bestMatch || confidence > bestMatch.confidence) {
      bestMatch = {
        categoryName: entry.categoryName,
        confidence,
        matchedEntry: entry.original,
      };
    }
  }

  // Only return if confidence is reasonable
  if (bestMatch && bestMatch.confidence >= 0.4) return bestMatch;
  return null;
}

/**
 * Guess and resolve to a category ID from the Redux categories store.
 * Returns the category ID or undefined if no match.
 */
export function guessCategoryId(
  description: string,
  categories: Record<string, Category>,
): string | undefined {
  const guess = guessCategory(description);
  if (!guess) return undefined;

  // Find the category by name (case-insensitive)
  const match = Object.values(categories).find(
    (c) => c.name.toLowerCase() === guess.categoryName.toLowerCase(),
  );

  if (match) {
  }

  return match?.id;
}
