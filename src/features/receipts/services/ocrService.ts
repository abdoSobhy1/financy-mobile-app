/**
 * OCR Service — Receipt, Invoice & Transfer Text Recognition & Transaction Extraction
 *
 * Supports on-device Google ML Kit & Apple Vision (offline, fast, private)
 * with local on-device recognition and Gemini-based receipt parsing.
 *
 * Intelligently handles:
 * 1. Single transfer slips (e.g. InstaPay with amount, date, reference, living notes)
 * 2. Multi-entry receipts (supermarkets, restaurants, retail with itemized rows & total)
 * 3. Arabic & English dates, currencies, and thousands separators
 * 4. Automatic category assignment based on item names and dictionary
 */

import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Category, TransactionType } from "../../../shared/types";
import { guessCategoryId } from "../../categories/utils/categoryDictionary";
import { detectCategory } from "../../voice/services/voiceParser";
import { AIService, isReceiptMetadataOrTotal } from "../../../infrastructure/ai/aiService";
import { getAIConfig } from "../../../infrastructure/ai/aiConfigService";
import { getOcrQuotaStatus, consumeOcrQuota } from "./ocrRateLimitService";

let DocumentScannerModule: any = null;
let ResponseTypeEnum: any = { ImageFilePath: "imageFilePath", Base64: "base64" };
let ScanStatusEnum: any = { Success: "success", Cancel: "cancel" };

try {
  const mod = require("react-native-document-scanner-plugin");
  DocumentScannerModule = mod.default || mod;
  if (mod.ResponseType) ResponseTypeEnum = mod.ResponseType;
  if (mod.ScanDocumentResponseStatus) ScanStatusEnum = mod.ScanDocumentResponseStatus;
} catch (e) {
  // Document scanner plugin not available
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface OcrReceiptItem {
  id: string;
  name: string;
  quantity?: number;
  unitPrice?: number;
  price: number;
  categoryId?: string;
  selected?: boolean;
}

export interface OcrLineDebug {
  line: string;
  type: "item" | "header" | "total" | "date" | "merchant" | "note" | "tax_discount" | "unrecognized";
  reason?: string;
  item?: OcrReceiptItem;
}

export interface OcrDebugReport {
  totalLines: number;
  recognizedItemsCount: number;
  unrecognizedLinesCount: number;
  detectedGrandTotal?: number;
  computedItemsSum?: number;
  discount?: number;
  merchant?: string;
  date?: Date;
  type: TransactionType;
  items: OcrReceiptItem[];
  unrecognizedLines: string[];
  lines: OcrLineDebug[];
  rawText: string;
}

export interface OcrReceiptResult {
  amount?: number;
  description?: string;
  date?: Date;
  type: TransactionType;
  categoryId?: string;
  note?: string;
  items?: OcrReceiptItem[];
  itemsSum?: number;
  discount?: number;
  rawText: string;
  confidence: number;
  isMultiEntry?: boolean;
  isInstaPay?: boolean;
  debugReport?: OcrDebugReport;
}

export interface DocumentAsset {
  uri: string;
  name?: string;
  mimeType?: string;
  size?: number;
}

// ── Configuration ──────────────────────────────────────────────────────────

// ── Constants & Helpers ────────────────────────────────────────────────────

export function easternToWestern(text: string): string {
  if (!text) return "";
  return text
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    .replace(/ى/g, "ي");
}

const ARABIC_MONTHS: Record<string, number> = {
  يناير: 0,
  فبراير: 1,
  مارس: 2,
  ابريل: 3,
  أبريل: 3,
  مايو: 4,
  يونيو: 5,
  يوليو: 6,
  اغسطس: 7,
  أغسطس: 7,
  سبتمبر: 8,
  اكتوبر: 9,
  أكتوبر: 9,
  نوفمبر: 10,
  ديسمبر: 11,
};

const ENGLISH_MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/**
 * Robust Amount Parser:
 * Handles:
 * - Thousands separators: "10,000", "10,000.00", "25,264", "10 000"
 * - European formats: "10.000,50"
 * - Integers without decimals: "25264", "10000"
 * - Standard floats: "1200.00", "39.75"
 */
export function parseAmount(str?: string): number | undefined {
  if (!str) return undefined;
  // Clean unwanted characters except digits, commas, dots
  let cleaned = easternToWestern(str).replace(/[^\d.,]/g, "").trim();
  if (!cleaned) return undefined;

  // Handle standard comma thousands separator: e.g. "10,000" or "10,000.50"
  if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, "");
  } else if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(cleaned)) {
    // European style "10.000,50"
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (/,\d{1,2}$/.test(cleaned)) {
    // Trailing decimal comma "15,50" -> "15.50"
    cleaned = cleaned.replace(",", ".");
  } else {
    // Just remove commas
    cleaned = cleaned.replace(/,/g, "");
  }

  const val = parseFloat(cleaned);
  if (isNaN(val) || val <= 0 || val > 50000000) return undefined;
  return Math.round(val * 100) / 100;
}

/**
 * Robust Date Parser:
 * Supports Arabic months ("19 سبتمبر", "23 أكتوبر 2026"),
 * English months ("Nov17'22", "23 Oct 2026", "Oct 23 2026"),
 * and numeric dates ("23/10/2026", "2026-10-23", "19.09.2026").
 */
export function parseReceiptDate(text?: string): Date | undefined {
  if (!text) return undefined;
  const normalized = easternToWestern(text);
  const currentYear = new Date().getFullYear();

  // 1. Textual Arabic month: e.g. "19 سبتمبر" or "23 اكتوبر 2026"
  for (const [mName, mIdx] of Object.entries(ARABIC_MONTHS)) {
    const reg = new RegExp(`(\\d{1,2})\\s*(?:من)?\\s*${mName}(?:\\s*(\\d{2,4}))?`, "i");
    const m = normalized.match(reg);
    if (m) {
      const day = parseInt(m[1], 10);
      let year = m[2] ? parseInt(m[2], 10) : currentYear;
      if (year < 100) year += 2000;
      if (day >= 1 && day <= 31 && year >= 2020 && year <= 2035) {
        return new Date(year, mIdx, day);
      }
    }
  }

  // 2. Textual English month: "23 Oct 2026", "Nov17'22", "Nov 17 2022"
  const engReg =
    /(?:([a-z]{3,9})[\s'’]*(\d{1,2})(?:[\s'’,]+(\d{2,4}))?|(\d{1,2})[\s'’]+([a-z]{3,9})(?:[\s'’,]+(\d{2,4}))?)/i;
  const em = normalized.match(engReg);
  if (em) {
    const mStr = (em[1] || em[5] || "").slice(0, 3).toLowerCase();
    const day = parseInt(em[2] || em[4], 10);
    const yr = em[3] || em[6];
    let year = yr ? parseInt(yr, 10) : currentYear;
    if (year < 100) year += 2000;
    if (
      ENGLISH_MONTHS[mStr] !== undefined &&
      day >= 1 &&
      day <= 31 &&
      year >= 2020 &&
      year <= 2035
    ) {
      return new Date(year, ENGLISH_MONTHS[mStr], day);
    }
  }

  // 3. Numeric ISO: "2026-10-23", "2026/10/23"
  const isoReg = /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/;
  const im = normalized.match(isoReg);
  if (im) {
    const y = parseInt(im[1], 10);
    const m = parseInt(im[2], 10) - 1;
    const d = parseInt(im[3], 10);
    if (y >= 2020 && y <= 2035 && m >= 0 && m <= 11 && d >= 1 && d <= 31) {
      return new Date(y, m, d);
    }
  }

  // 4. Numeric DMY / MDY: "23/10/2026", "23-10-26"
  const dmyReg = /(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/;
  const dm = normalized.match(dmyReg);
  if (dm) {
    let day = parseInt(dm[1], 10);
    let month = parseInt(dm[2], 10) - 1;
    let year = parseInt(dm[3], 10);
    if (year < 100) year += 2000;
    if (day <= 12 && month > 11) {
      const temp = day;
      day = month + 1;
      month = temp - 1;
    }
    if (year >= 2020 && year <= 2035 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return new Date(year, month, day);
    }
  }

  return undefined;
}

// ── Text Extraction (OCR Engine) ───────────────────────────────────────────

export async function extractTextFromFile(asset: DocumentAsset): Promise<string> {
  const { uri, name, mimeType } = asset;
  const lowerName = (name || "").toLowerCase();
  const lowerMime = (mimeType || "").toLowerCase();

  // 1. Plain text file direct read
  if (
    lowerMime.startsWith("text/") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".json")
  ) {
    try {
      const text = await FileSystem.readAsStringAsync(uri);
      if (text && text.trim().length > 0) {
        return text;
      }
    } catch (e) {
      console.warn("[OCRService] Failed to read text file directly:", e);
    }
  }

  // 2. Priority 1: On-Device Google ML Kit / Apple Vision
  let mlKitText: string | undefined;
  try {
    const { recognizeText } = await import("@dariyd/react-native-text-recognition");
    if (typeof recognizeText === "function") {
      const mlKitResult = await recognizeText(uri, {
        recognitionLevel: "line",
      });

      if (
        mlKitResult &&
        mlKitResult.success &&
        mlKitResult.fullText &&
        mlKitResult.fullText.trim().length > 0
      ) {
        mlKitText = mlKitResult.fullText;
      }
    }
  } catch (mlKitErr) {
    console.warn(
      "[OCRService] On-device ML Kit recognition unavailable:",
      mlKitErr
    );
  }

  if (mlKitText) {
    return mlKitText;
  }

  throw new Error("Could not recognize readable text on this device.");
}

export function logOcrDebugReport(report: OcrDebugReport) {
  const lineBar = "━".repeat(60);
  if (report.computedItemsSum !== undefined) {
  }
  if (report.discount) {
  }
  if (report.items.length === 0) {
    if (report.detectedGrandTotal !== undefined) {
    } else {
    }
  } else {
    report.items.forEach((it, i) => {
      const qtyDetails =
        it.quantity && it.quantity > 1
          ? ` (Qty: ${it.quantity} × ${it.unitPrice ?? (it.price / it.quantity).toFixed(2)})`
          : "";
      const cat = it.categoryId ? ` [Cat: ${it.categoryId}]` : "";
    });
  }
  if (report.unrecognizedLines.length === 0) {
  } else {
    report.unrecognizedLines.forEach((l, i) => {
    });
  }
}

function parseInstaPaySlip(
  lines: string[],
  normalizedText: string,
  categories: Record<string, Category>
): OcrReceiptResult | null {
  const isInstapay = /instapay|انستاباي|IPN|المبلغ الإجمالي المحول/i.test(normalizedText);
  if (!isInstapay) return null;

  let amount: number | undefined;
  let date: Date | undefined;
  let note: string | undefined;
  let reference: string | undefined;
  let sender: string | undefined;
  let recipient: string | undefined;

  // 1. Amount Extraction
  // Pattern A: "10,000 EGP" or line before "المبلغ الإجمالي المحول"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const currMatch = line.match(
      /([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:egp|le|جم|جنيه)/i
    );
    if (currMatch) {
      amount = parseAmount(currMatch[1]);
      break;
    }

    if (/المبلغ\s*الإجمالي\s*المحول/i.test(line)) {
      if (i > 0) {
        const prev = lines[i - 1];
        const pm = prev.match(/([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/);
        if (pm) {
          amount = parseAmount(pm[1]);
          break;
        }
      }
    }
  }

  // 2. Note / Purpose Extraction (e.g. "ملاحظة: نفقات المعيشة")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^ملاحظة[:\s]*(.*)$/i.test(line)) {
      const inline = line.replace(/^ملاحظة[:\s]*/i, "").trim();
      if (inline) {
        note = inline;
      } else if (i + 1 < lines.length && !/POWERED|IPN/i.test(lines[i + 1])) {
        note = lines[i + 1].trim();
      }
      break;
    }
  }

  // 3. Date Extraction
  for (const line of lines) {
    if (/تاريخ|date/i.test(line)) {
      const d = parseReceiptDate(line);
      if (d) {
        date = d;
        break;
      }
    }
  }

  // 4. Reference & Sender/Recipient
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const rm = line.match(/المرجع\s*([0-9]+)/);
    if (rm) reference = rm[1];

    if (/^من\b/i.test(line) && i + 1 < lines.length) {
      sender = lines[i + 1].trim();
    }
    if (/^إل[يى]/i.test(line)) {
      const inlineRecipient = line.replace(/^إل[يى]\s*(انستاباي|حساب|مستخدم)?[:\s]*/i, "").trim();
      if (inlineRecipient) {
        recipient = inlineRecipient;
      } else if (i + 1 < lines.length) {
        recipient = lines[i + 1].trim();
      }
    }
  }

  let description = "InstaPay Transfer";
  if (note) {
    description = `InstaPay: ${note}`;
  } else if (recipient) {
    description = `InstaPay: ${recipient}`;
  }
  const noteDetails: string[] = [];
  if (note) noteDetails.push(note);
  if (reference) noteDetails.push(`Ref: ${reference}`);
  if (recipient) noteDetails.push(`To: ${recipient}`);

  // Detect category based on note (using voice/ML category matching algorithm)
  let categoryId: string | undefined;
  if (note) {
    categoryId = detectCategory(note, categories);
  }
  if (!categoryId) {
    categoryId = detectCategory("مصاريف", categories) || detectCategory("اخرى", categories);
  }

  const debugLines: OcrLineDebug[] = [];
  const unrecognizedLines: string[] = [];
  for (const line of lines) {
    if (amount && (line.includes(amount.toString()) || /egp|le|جم|جنيه/i.test(line))) {
      debugLines.push({ line, type: "total", reason: `Detected as transfer amount: ${amount} EGP` });
    } else if (date && (parseReceiptDate(line) || /تاريخ|date/i.test(line))) {
      debugLines.push({ line, type: "date", reason: `Detected as transfer date: ${date.toISOString().split("T")[0]}` });
    } else if (recipient && line.includes(recipient)) {
      debugLines.push({ line, type: "merchant", reason: `Detected as recipient: ${recipient}` });
    } else if (reference && line.includes(reference)) {
      debugLines.push({ line, type: "note", reason: `Detected as reference: ${reference}` });
    } else if (sender && line.includes(sender)) {
      debugLines.push({ line, type: "note", reason: `Detected as sender: ${sender}` });
    } else if (note && line.includes(note)) {
      debugLines.push({ line, type: "note", reason: `Detected as living note: ${note}` });
    } else if (/instapay|انستاباي|ipn|powered\s*by/i.test(line)) {
      debugLines.push({ line, type: "header", reason: "Watermark / Header" });
    } else {
      debugLines.push({ line, type: "unrecognized", reason: "Unmatched transfer text" });
      unrecognizedLines.push(line);
    }
  }

  const debugReport: OcrDebugReport = {
    totalLines: lines.length,
    recognizedItemsCount: amount ? 1 : 0,
    unrecognizedLinesCount: unrecognizedLines.length,
    detectedGrandTotal: amount,
    computedItemsSum: amount,
    merchant: description,
    date: date || new Date(),
    type: "expense",
    items: amount
      ? [
          {
            id: `item_${Math.random().toString(36).substring(2, 9)}`,
            name: description,
            price: amount,
            quantity: 1,
            unitPrice: amount,
            categoryId,
            selected: true,
          },
        ]
      : [],
    unrecognizedLines,
    lines: debugLines,
    rawText: normalizedText,
  };

  logOcrDebugReport(debugReport);

  return {
    amount,
    description,
    date: date || new Date(),
    type: "expense",
    categoryId,
    note: noteDetails.join(" • "),
    rawText: normalizedText,
    confidence: 0.95,
    isInstaPay: true,
    items: [],
    debugReport,
  };
}

// ── Line Item Parser for Multi-Entry Receipts ──────────────────────────────

function isTableHeaderRow(line: string): boolean {
  return /الصنف.*الكمية|الكمية.*السعر|السعر.*الاجمالي|الاجمالي.*السعر|item.*qty|qty.*price/i.test(
    line
  );
}

function parseSingleLineItem(line: string): OcrReceiptItem | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) return null;

  // Ignore header rows, table column headers, discounts, tax, totals, receipt numbers
  if (isTableHeaderRow(trimmed) || isReceiptMetadataOrTotal(trimmed)) return null;

  const ignorePatterns = [
    /^(?:تاريخ|date|time|chk|check|tbl|table|gst|guest|طاولة|فاتورة|كاشير|cashier|الكاتب|مبيعات|س\.ت|ب\.ض)/i,
    /^(?:خصم|discount|tax|ضريبة|خدمة|service|subtotal|grand\s*total)/i,
    /^(?:tel|phone|branch|فرع|www\.|\.com|powered\s*by)/i,
    /^(?:صافي|الصافي|المجموع|الاجمالي|الإجمالي)\s*$/i,
  ];
  if (ignorePatterns.some((p) => p.test(trimmed))) return null;

  // 1. Table Left-to-Right: [TotalPrice] [UnitPrice] [Qty] [Name]
  // e.g. "4579 4579 1 برفان سي بوزيشن اورجينال الاحمر" or "770 385 2 شامبو + بلسم"
  const ltrTableMatch = trimmed.match(
    /^(\d+(?:[.,]\d{1,2})?)\s+(\d+(?:[.,]\d{1,2})?)\s+(\d+(?:[.,]\d+)?)\s+(.+)$/
  );
  if (ltrTableMatch) {
    const totalPrice = parseFloat(ltrTableMatch[1].replace(",", "."));
    const unitPrice = parseFloat(ltrTableMatch[2].replace(",", "."));
    const qty = parseFloat(ltrTableMatch[3].replace(",", "."));
    const name = ltrTableMatch[4].trim();
    if (totalPrice > 0 && name.length >= 2 && !/^\d+$/.test(name)) {
      return {
        id: `item_${Math.random().toString(36).substring(2, 9)}`,
        name,
        quantity: isNaN(qty) ? 1 : qty,
        unitPrice: isNaN(unitPrice) ? undefined : unitPrice,
        price: totalPrice,
        selected: true,
      };
    }
  }

  // 2. Table Right-to-Left: [Name] [Qty] [UnitPrice] [TotalPrice]
  // e.g. "ريجينا مكرونة خوا 1 24.00 24.00"
  const patternB =
    /^(.*?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d{1,2})?)\s+(\d+(?:[.,]\d{1,2})?)$/;
  let match = trimmed.match(patternB);
  if (match) {
    const name = match[1].trim();
    const qty = parseFloat(match[2].replace(",", "."));
    const unitPrice = parseFloat(match[3].replace(",", "."));
    const totalPrice = parseFloat(match[4].replace(",", "."));
    if (totalPrice > 0 && name.length >= 2 && !/^\d+$/.test(name)) {
      return {
        id: `item_${Math.random().toString(36).substring(2, 9)}`,
        name,
        quantity: isNaN(qty) ? 1 : qty,
        unitPrice: isNaN(unitPrice) ? undefined : unitPrice,
        price: totalPrice,
        selected: true,
      };
    }
  }

  // 3. POS Layout: [Seat/Course?] [Qty] [Item Name] [Total Price]
  // e.g. "5 Beef Carpaccio 1200.00", "2 Golden Sirt 3 4500.00", "11 1 Lokum 3905.00", "15 Golden Baklava 5850.00"
  const qtyNamePriceMatch = trimmed.match(
    /^(?:(\d{1,3})\s+)?(\d{1,3})\s+(.+?)\s+([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)$/
  );
  if (qtyNamePriceMatch) {
    const seatOrCourse = qtyNamePriceMatch[1];
    const qty = parseInt(qtyNamePriceMatch[2], 10);
    const name = qtyNamePriceMatch[3].trim();
    const priceStr = qtyNamePriceMatch[4].replace(/,/g, "");
    const price = parseFloat(priceStr);

    if (
      price > 0 &&
      qty > 0 &&
      name.length >= 2 &&
      /[^\d\s.,_-]/.test(name) &&
      !isReceiptMetadataOrTotal(name)
    ) {
      let unitPrice: number | undefined = undefined;
      if (qty > 1 && price > 0) {
        unitPrice = Math.round((price / qty) * 100) / 100;
      }
      return {
        id: `item_${Math.random().toString(36).substring(2, 9)}`,
        name,
        quantity: qty,
        unitPrice,
        price,
        selected: true,
      };
    }
  }

  // 4. Table Left-to-Right: [TotalPrice] [UnitPrice] [Name] (where qty column is omitted or 1)
  // e.g. "540 540 مزيل بيزلين رول اون ورد" or "1290 430 طقم فرش جيس اب"
  const ltrPriceUnitNameMatch = trimmed.match(
    /^(\d+(?:[.,]\d{1,2})?)\s+(\d+(?:[.,]\d{1,2})?)\s+([^\d\s.,].*)$/
  );
  if (ltrPriceUnitNameMatch) {
    const totalPrice = parseFloat(ltrPriceUnitNameMatch[1].replace(",", "."));
    const unitPrice = parseFloat(ltrPriceUnitNameMatch[2].replace(",", "."));
    const name = ltrPriceUnitNameMatch[3].trim();
    if (
      totalPrice > 0 &&
      name.length >= 2 &&
      !/^(?:صافي|إجمالي|المجموع|كاشير|فاتورة|المرجع|التاريخ)/i.test(name)
    ) {
      let calcQty = 1;
      if (unitPrice > 0 && totalPrice > unitPrice) {
        calcQty = Math.round(totalPrice / unitPrice);
      }
      return {
        id: `item_${Math.random().toString(36).substring(2, 9)}`,
        name,
        quantity: calcQty,
        unitPrice: isNaN(unitPrice) ? undefined : unitPrice,
        price: totalPrice,
        selected: true,
      };
    }
  }

  // 5. Table Left-to-Right with 2 numbers: [TotalPrice] [Qty] [Name]
  // e.g. "4579 1 برفان سي بوزيشن"
  const ltr2Match = trimmed.match(/^(\d+(?:[.,]\d{1,2})?)\s+(\d{1,3})\s+([^\d\s.,].*)$/);
  if (ltr2Match) {
    const totalPrice = parseFloat(ltr2Match[1].replace(",", "."));
    const qty = parseInt(ltr2Match[2], 10);
    const name = ltr2Match[3].trim();
    if (
      totalPrice > 0 &&
      name.length >= 2 &&
      !/^\d+$/.test(name) &&
      !/^(?:صافي|إجمالي|المجموع|كاشير|فاتورة|المرجع|التاريخ)/i.test(name)
    ) {
      return {
        id: `item_${Math.random().toString(36).substring(2, 9)}`,
        name,
        quantity: isNaN(qty) ? 1 : qty,
        price: totalPrice,
        selected: true,
      };
    }
  }

  // 6. Table Left-to-Right with 1 number: [TotalPrice] [Name]
  // e.g. "2740 كلارينس سيروم عيون توتال ليفت"
  const ltr1Match = trimmed.match(/^(\d+(?:[.,]\d{1,2})?)\s+([^\d\s.,].*)$/);
  if (ltr1Match) {
    const priceStr = ltr1Match[1];
    const price = parseFloat(priceStr.replace(",", "."));
    const name = ltr1Match[2].trim();
    if (
      price > 0 &&
      price < 250000 &&
      name.length >= 2 &&
      /[^\d\s.,_-]/.test(name) &&
      !/[:#/=-]\s*$/.test(name) &&
      !isReceiptMetadataOrTotal(name)
    ) {
      return {
        id: `item_${Math.random().toString(36).substring(2, 9)}`,
        name,
        quantity: 1,
        price,
        selected: true,
      };
    }
  }

  // 7. Table row with numbers only (e.g. "1890 1890 1" or "15 15")
  const numbersOnlyMatch = trimmed.match(
    /^(\d+(?:[.,]\d{1,2})?)\s+(\d+(?:[.,]\d{1,2})?)(?:\s+(\d{1,3}))?$/
  );
  if (numbersOnlyMatch) {
    const totalPrice = parseFloat(numbersOnlyMatch[1].replace(",", "."));
    const unitPrice = parseFloat(numbersOnlyMatch[2].replace(",", "."));
    const qty = numbersOnlyMatch[3] ? parseInt(numbersOnlyMatch[3], 10) : 1;
    if (
      totalPrice > 0 &&
      unitPrice > 0 &&
      Math.abs(totalPrice - unitPrice * qty) <= 1 &&
      totalPrice < 25000
    ) {
      return {
        id: `item_${Math.random().toString(36).substring(2, 9)}`,
        name: "Item",
        quantity: qty,
        unitPrice,
        price: totalPrice,
        selected: true,
      };
    }
  }

  // 8. Pattern C: [Name] [Price]
  // e.g. "French Fries 180.00" or "Heineken 55.00"
  // Must be a genuine product name, NOT an order slip / ID / reference / date / timestamp!
  const patternC =
    /^(.*?)\s+([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)$/;
  match = trimmed.match(patternC);
  if (match) {
    const name = match[1].trim();
    const rawPriceStr = match[2];
    const cleanPriceStr = rawPriceStr.replace(/,/g, "");
    const price = parseFloat(cleanPriceStr);

    // General safeguards against non-item document text:
    // a. Name must not end with a key-value punctuation separator like '/', ':', '#', '-', '='
    const endsWithSeparator = /[:#/=-]\s*$/.test(name);

    // b. Unformatted numbers with 6+ digits (e.g. 48683612) are order #, slips, phone #, or barcodes
    const isUnformattedIdNumber = !rawPriceStr.includes(".") && !rawPriceStr.includes(",") && cleanPriceStr.length >= 6;

    // c. 4-digit numbers looking like years (1990-2050) when preceded by date/time words
    const isYearOrTime = /^(?:19\d{2}|20\d{2})$/.test(cleanPriceStr) && /(?:date|time|تاريخ|وقت|print|am|pm)/i.test(name);

    // d. Plausibility limit for single-item retail prices without table columns
    const isAstronomicalPrice = price > 250000;

    // e. Name must not contain identifier labels (e.g. "اذن صرف رقم", "Order #", "Ref No")
    const hasIdentifierLabel = /(?:رقم|اذن|إذن|امر|أمر|طلب|فاتورة|كود|مسلسل|سند|شحنة|order|slip|invoice|ref|code|id|no\.)(?:[\s:#/=-]|$)/i.test(name);

    if (
      price > 0 &&
      !isAstronomicalPrice &&
      !isUnformattedIdNumber &&
      !isYearOrTime &&
      !endsWithSeparator &&
      !hasIdentifierLabel &&
      name.length >= 2 &&
      /[^\d\s.,_-]/.test(name) &&
      !isReceiptMetadataOrTotal(name)
    ) {
      return {
        id: `item_${Math.random().toString(36).substring(2, 9)}`,
        name,
        quantity: 1,
        price,
        selected: true,
      };
    }
  }

  return null;
}

// ── General Receipt Parser ─────────────────────────────────────────────────

export function parseReceiptText(
  rawText: string,
  categories: Record<string, Category> = {},
  fallbackName?: string
): OcrReceiptResult {
  const normalized = easternToWestern(rawText);
  const rawLines = normalized
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Pre-process: merge numeric-only rows (e.g. "240 240 1") with the immediately following text line
  // (OCR engines often split table numbers and item description across 2 lines)
  const lines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const cur = rawLines[i];
    const isCurOnlyNumbers = /^[\d\s.,\t]+$/.test(cur);
    if (isCurOnlyNumbers && i + 1 < rawLines.length) {
      const next = rawLines[i + 1];
      const nextHasLetters = /[\u0600-\u06FFa-zA-Z]/.test(next);
      const nextStartsWithNum = /^\d/.test(next);
      const isNextGrandTotal = /صافي|إجمالي|المجموع/i.test(next);
      if (nextHasLetters && !nextStartsWithNum && !isNextGrandTotal) {
        lines.push(`${cur} ${next}`);
        i++;
        continue;
      }
    }
    lines.push(cur);
  }

  // 1. Check for InstaPay transfer
  const instaPayResult = parseInstaPaySlip(lines, normalized, categories);
  if (instaPayResult) {
    return instaPayResult;
  }

  let amount: number | undefined;
  let date: Date | undefined;
  let merchant: string | undefined;
  let categoryId: string | undefined;
  let type: TransactionType = "expense";

  // Check refund / return
  if (/مرتجع|استرداد|refund|credit\s*note|return/i.test(normalized)) {
    type = "income";
  }

  // 2. Date Extraction
  for (const line of lines) {
    const foundDate = parseReceiptDate(line);
    if (foundDate) {
      date = foundDate;
      break;
    }
  }

  // 3. Total Amount Extraction from Keywords
  const totalKeywords = [
    "صافي\\s*الفاتورة",
    "صافي\\s*القيمة",
    "صافي\\s*المبلغ",
    "صافي",
    "الصافي",
    "المبلغ\\s*الإجمالي",
    "المبلغ\\s*المطلوب",
    "المستحق",
    "المطلوب\\s*سداده",
    "المجموع\\s*الكلي",
    "المجموع",
    "إجمالي\\s*الفاتورة",
    "إجمالي\\s*الحساب",
    "الإجمالي",
    "الاجمالي",
    "جملة\\s*الفاتورة",
    "الجملة",
    "المدفوع",
    "المسدد",
    "المبلغ",
    "grand\\s*total",
    "total\\s*amount",
    "total\\s*due",
    "net\\s*total",
    "net\\s*amount",
    "amount\\s*due",
    "balance\\s*due",
    "final\\s*total",
    "total\\s*bill",
    "subtotal",
    "total",
  ];

  // Look from bottom up for total amount
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (isTableHeaderRow(line)) continue;

    for (const kw of totalKeywords) {
      // 1. [Keyword] [Amount] (e.g. "صافي 25264")
      const reg1 = new RegExp(
        `(?:${kw})[:\\s=-]*([0-9]{1,3}(?:,[0-9]{3})+(?:\\.[0-9]{1,2})?|[0-9]+(?:\\.[0-9]{1,2})?)`,
        "i"
      );
      let match = line.match(reg1);
      if (match && match[1]) {
        const val = parseAmount(match[1]);
        if (val) {
          amount = val;
          break;
        }
      }

      // 2. [Amount] [Keyword] (e.g. "25264 صافي")
      const reg2 = new RegExp(
        `([0-9]{1,3}(?:,[0-9]{3})+(?:\\.[0-9]{1,2})?|[0-9]+(?:\\.[0-9]{1,2})?)[\\s:=-]*(?:${kw})`,
        "i"
      );
      match = line.match(reg2);
      if (match && match[1]) {
        const val = parseAmount(match[1]);
        if (val) {
          amount = val;
          break;
        }
      }
    }
    if (amount) break;
  }

  // Fallback: check line right below or above a total keyword
  if (!amount) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (isTableHeaderRow(line)) continue;
      if (/صافي|إجمالي|المجموع|total|grand|net|المستحق/i.test(line)) {
        // Line above (e.g. InstaPay or receipt footer)
        if (i > 0 && !isTableHeaderRow(lines[i - 1])) {
          const prevMatch = lines[i - 1].match(
            /([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/
          );
          if (prevMatch) {
            const val = parseAmount(prevMatch[1]);
            if (val) {
              amount = val;
              break;
            }
          }
        }
        // Line below
        if (i + 1 < lines.length && !isTableHeaderRow(lines[i + 1])) {
          const nextMatch = lines[i + 1].match(
            /([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/
          );
          if (nextMatch) {
            const val = parseAmount(nextMatch[1]);
            if (val) {
              amount = val;
              break;
            }
          }
        }
      }
    }
  }

  // Fallback: currency anchored amounts (e.g. "10,000 EGP" or "EGP 10,000")
  if (!amount) {
    const currencyRegex =
      /(?:egp|le|usd|\$|ج\.م|ج\s+م|جنيه)\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)|([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:egp|le|usd|\$|ج\.م|ج\s+م|جنيه)/i;
    for (let i = lines.length - 1; i >= 0; i--) {
      const match = lines[i].match(currencyRegex);
      if (match) {
        const valStr = match[1] || match[2];
        const val = parseAmount(valStr);
        if (val) {
          amount = val;
          break;
        }
      }
    }
  }

  // 3b. Discount extraction
  let discount: number | undefined;
  for (const line of lines) {
    if (/خصم|discount/i.test(line)) {
      const dm = line.match(/([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/);
      if (dm) {
        discount = parseAmount(dm[1]);
        if (discount) break;
      }
    }
  }

  // 4. Line Items Extraction
  const items: OcrReceiptItem[] = [];
  let itemsSum: number | undefined;
  for (const line of lines) {
    if (isReceiptMetadataOrTotal(line)) continue;
    const it = parseSingleLineItem(line);
    if (it && !isReceiptMetadataOrTotal(it.name)) {
      // Detect category for each individual item using voice/ML category matching
      it.categoryId = detectCategory(it.name, categories);
      items.push(it);
    }
  }

  // 4b. Assign orphan text lines (e.g. "شفرات الوجه فلامينجو") to unnamed numeric items
  const orphanNames = lines.filter(
    (l) =>
      /[\u0600-\u06FF]/.test(l) &&
      !/\d/.test(l) &&
      !isTableHeaderRow(l) &&
      !/^(?:مشتريات|فاتورة|الكاتب|كاشير|مبيعات|صافي|إجمالي)/i.test(l) &&
      l !== merchant
  );
  for (const it of items) {
    if (it.name === "Item" && orphanNames.length > 0) {
      it.name = orphanNames.shift()!;
      it.categoryId = detectCategory(it.name, categories);
    }
  }

  // 4c. Universal Sanity & Statistical Outlier Filtering:
  // Discard spurious lines (e.g. order numbers, phone numbers, timestamps, tax codes)
  let validItems = [...items];

  // If a keyword-based total (amount) was detected (e.g. from الصافي / Total):
  // Filter out any item whose price exceeds the grand total by > 50% (mathematically impossible)
  if (amount && amount > 0) {
    const detectedTotal = amount;
    validItems = validItems.filter((it) => it.price <= detectedTotal * 1.5);
  }

  // Statistical outlier filter for remaining items (e.g. slips or IDs that slipped past regex)
  if (validItems.length >= 3) {
    const sortedPrices = validItems.map((it) => it.price).sort((a, b) => a - b);
    const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
    if (medianPrice > 0) {
      validItems = validItems.filter(
        (it) => !(it.price > 50 * medianPrice && it.price >= 50000)
      );
    }
  }

  // Replace items array in-place with validated items
  items.splice(0, items.length, ...validItems);

  // 4d. Total Amount Calculation:
  // Items sum is computed from validated line items.
  if (items.length > 0) {
    itemsSum = Math.round(items.reduce((acc, it) => acc + it.price, 0) * 100) / 100;
    // If no explicit grand total keyword was found, derive amount from items sum.
    // If an explicit grand total was found and items sum is closely aligned, adopt items sum for decimal accuracy.
    if (!amount) {
      amount = itemsSum;
    } else if (Math.abs(amount - itemsSum) <= 5) {
      amount = itemsSum;
    }
  }

  // 5. Merchant / Description Extraction
  const ignorePatterns = [
    /فاتورة/i,
    /tax\s*invoice/i,
    /receipt/i,
    /welcome/i,
    /مرحبا/i,
    /cashier/i,
    /كاشير/i,
    /date/i,
    /تاريخ/i,
    /tel/i,
    /phone/i,
    /branch/i,
    /فرع/i,
    /www\./i,
    /\.com/i,
    /tax\s*id/i,
    /الرقم\s*الضريبي/i,
    /^(?:tbl|table|chk|check|gst|guest)/i,
  ];

  // Store names only appear in the header *before* item lines begin
  let firstItemIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (parseSingleLineItem(lines[i])) {
      firstItemIndex = i;
      break;
    }
  }
  const maxMerchantScan =
    firstItemIndex >= 0 ? Math.min(firstItemIndex, 5) : Math.min(5, lines.length);

  for (let i = 0; i < maxMerchantScan; i++) {
    const line = lines[i];
    // Don't treat a date or number as merchant name
    if (parseReceiptDate(line)) continue;
    if (line.length >= 3 && line.length <= 60) {
      const isIgnored = ignorePatterns.some((p) => p.test(line));
      if (!isIgnored && !/^\d+$/.test(line) && !parseSingleLineItem(line)) {
        merchant = line.replace(/[#*_-]/g, " ").trim();
        break;
      }
    }
  }

  if (!merchant && fallbackName) {
    const cleanTitle = fallbackName
      .replace(/\.[^/.]+$/, "")
      .replace(/[_-]+/g, " ")
      .trim();
    if (cleanTitle) {
      merchant = cleanTitle;
    }
  }

  // 6. Category Assignment for overall receipt
  if (merchant) {
    categoryId = detectCategory(merchant, categories);
  }
  if (!categoryId && items.length > 0) {
    // If multiple items, use the most frequent category among items
    const catCounts: Record<string, number> = {};
    for (const it of items) {
      if (it.categoryId) {
        catCounts[it.categoryId] = (catCounts[it.categoryId] || 0) + 1;
      }
    }
    const mostFrequent = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
    if (mostFrequent) {
      categoryId = mostFrequent[0];
    }
  }
  if (!categoryId) {
    for (const line of lines.slice(0, 10)) {
      const guessed = detectCategory(line, categories);
      if (guessed) {
        categoryId = guessed;
        break;
      }
    }
  }

  // 7. Comprehensive Debug Classification & Logging
  const debugLines: OcrLineDebug[] = [];
  const unrecognizedLines: string[] = [];

  for (const line of lines) {
    const matchedItem = items.find((it) => it.name && line.includes(it.name));
    if (matchedItem) {
      debugLines.push({
        line,
        type: "item",
        reason: `Detected Item: "${matchedItem.name}" • Price: ${matchedItem.price} EGP`,
        item: matchedItem,
      });
      continue;
    }

    if (isTableHeaderRow(line)) {
      debugLines.push({ line, type: "header", reason: "Table column headers (الصنف, السعر, الكمية, etc.)" });
      continue;
    }

    if (parseReceiptDate(line)) {
      debugLines.push({ line, type: "date", reason: `Detected Date: ${date?.toISOString().split("T")[0]}` });
      continue;
    }

    if (merchant && line.trim() === merchant.trim()) {
      debugLines.push({ line, type: "merchant", reason: `Detected Merchant: ${merchant}` });
      continue;
    }

    if (discount && /خصم|discount/i.test(line)) {
      debugLines.push({ line, type: "tax_discount", reason: `Detected Discount: ${discount} EGP` });
      continue;
    }

    if (amount && (line.includes(amount.toString()) || /صافي|المجموع|الاجمالي|total|net/i.test(line))) {
      debugLines.push({ line, type: "total", reason: `Detected Total: ${amount} EGP` });
      continue;
    }

    if (ignorePatterns.some((p) => p.test(line)) || /^\d{2}:\d{2}/.test(line)) {
      debugLines.push({ line, type: "note", reason: "Invoice metadata (Number, Time, Branch, or Tax ID)" });
      continue;
    }

    // Line not recognized as item or metadata
    debugLines.push({ line, type: "unrecognized", reason: "Unmatched line (not parsed into an item or metadata)" });
    unrecognizedLines.push(line);
  }

  const debugReport: OcrDebugReport = {
    totalLines: lines.length,
    recognizedItemsCount: items.length,
    unrecognizedLinesCount: unrecognizedLines.length,
    detectedGrandTotal: amount,
    computedItemsSum: itemsSum,
    discount,
    merchant,
    date,
    type,
    items,
    unrecognizedLines,
    lines: debugLines,
    rawText,
  };

  logOcrDebugReport(debugReport);

  // Confidence calculation
  let found = 0;
  if (amount) found++;
  if (merchant) found++;
  if (date) found++;
  if (categoryId) found++;
  if (items.length > 0) found++;

  return {
    amount,
    description: merchant,
    date,
    type,
    categoryId,
    items,
    itemsSum: items.length > 0 ? itemsSum : undefined,
    discount,
    isMultiEntry: items.length > 1,
    rawText,
    confidence: found / 5,
    debugReport,
  };
}

// ── Main Scan Method ───────────────────────────────────────────────────────

export async function scanReceiptFile(
  asset: DocumentAsset,
  categories: Record<string, Category> = {}
): Promise<OcrReceiptResult> {
  let quotaConsumed = false;
  const markQuotaConsumed = async () => {
    if (!quotaConsumed) {
      quotaConsumed = true;
      try {
        await consumeOcrQuota();
      } catch (error) {
        console.warn("[OCRService] Failed to update Gemini scan quota:", error);
      }
    }
  };
  let geminiRequestMade = false;
  let geminiAllowed: boolean | undefined;
  const canUseGemini = async () => {
    if (geminiAllowed !== undefined) return geminiAllowed;
    let quota = await getOcrQuotaStatus({ fast: true });
    if (!quota.canScan) quota = await getOcrQuotaStatus();
    geminiAllowed = quota.canScan;
    return geminiAllowed;
  };

  const isImage =
    !asset.mimeType ||
    asset.mimeType.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|bmp)$/i.test(asset.name || asset.uri);

  // Priority 1: If online and an AI API key is configured, send the resized image directly to Gemini Vision!
  // It caps at 1080w / 1920h max while strictly preserving aspect ratio.
  let hostedVisionFailed = false;
  if (isImage) {
    let usedHostedVision = false;
    try {
      const online = await AIService.isOnline();
      const config = await getAIConfig();
      const hasGeminiGateway = config.provider === "gemini" && !config.apiKey;
      const hasPersonalKey = Boolean(config.apiKey && config.apiKey.trim().length > 5);
      if (online && (hasGeminiGateway || hasPersonalKey) && await canUseGemini()) {
        usedHostedVision = hasGeminiGateway;
        geminiRequestMade = true;
        let visionResult: OcrReceiptResult;
        try {
          visionResult = await AIService.parseReceiptImageWithAI(asset.uri, categories);
        } finally {
          await markQuotaConsumed();
        }
        const hasRecognizedItems = Boolean(visionResult?.items?.length);
        const hasRecognizedAmount = Number.isFinite(visionResult?.amount) && (visionResult?.amount || 0) > 0;
        if (visionResult && (hasRecognizedItems || hasRecognizedAmount)) {
          return visionResult;
        }
      }
    } catch (visionErr) {
      hostedVisionFailed = usedHostedVision;
      console.warn("[OCRService] Vision AI scan failed, falling back to local OCR:", visionErr);
    }
  }

  // Priority 2: Local on-device OCR + regex parser (Offline fallback)
  const rawText = await extractTextFromFile(asset);
  let result = parseReceiptText(rawText, categories, asset.name);

  // Priority 3: Hybrid Cloud AI Text Fallback
  // If local regex confidence is low, or multi-item lines exist that regex couldn't decipher
  const hasMultiplePriceLines =
    rawText.split(/\r?\n/).filter((l) => /\d/.test(l)).length >= 3;
  const needsAIFallback =
    !result.isInstaPay &&
    (result.confidence < 0.65 ||
      ((!result.items || result.items.length <= 1) && hasMultiplePriceLines) ||
      (result.debugReport &&
        result.debugReport.unrecognizedLinesCount >= 4 &&
        result.debugReport.unrecognizedLinesCount > (result.items?.length || 0)));

  if (needsAIFallback && !hostedVisionFailed && !geminiRequestMade) {
    try {
      const isNetOnline = await AIService.isOnline();
      if (isNetOnline && await canUseGemini()) {
        geminiRequestMade = true;
        let aiReceipt: OcrReceiptResult | null;
        try {
          aiReceipt = await AIService.parseReceiptWithAI(rawText, categories);
        } finally {
          await markQuotaConsumed();
        }
        if (aiReceipt && aiReceipt.items && aiReceipt.items.length > 0) {
          result = aiReceipt;
        } else if (aiReceipt && aiReceipt.amount) {
          result = {
            ...result,
            amount: aiReceipt.amount,
            description: aiReceipt.description || result.description,
            date: aiReceipt.date || result.date,
            confidence: Math.max(result.confidence, aiReceipt.confidence),
          };
        }
      }
    } catch (e) {
      console.warn("[OCRService] Hybrid AI fallback skipped:", e);
    }
  }

  return result;
}

export function generateItemizedNote(items: OcrReceiptItem[]): string {
  if (!items || items.length === 0) return "";
  const lines = items.map((it) => {
    const qtyStr = it.quantity && it.quantity > 1 ? `${it.quantity}x ` : "";
    return `• ${qtyStr}${it.name}: ${it.price.toLocaleString()}`;
  });
  return `Receipt items:\n${lines.join("\n")}`;
}

/**
 * Launches Google Play Services ML Kit Document Scanner on Android (auto edge detection, crop, perspective)
 * Falls back to Expo Camera if Document Scanner is not available.
 */
export async function scanReceiptWithScanner(): Promise<string | null> {
  try {
    if (DocumentScannerModule && typeof DocumentScannerModule.scanDocument === "function") {
      const response = await DocumentScannerModule.scanDocument({
        responseType: ResponseTypeEnum.ImageFilePath,
        croppedImageQuality: 92,
        maxNumDocuments: 1,
      });

      if (response && response.status === ScanStatusEnum.Cancel) {
        return null;
      }

      if (response && response.scannedImages && response.scannedImages.length > 0) {
        return response.scannedImages[0];
      }
    }
  } catch (err) {
    console.warn("[OCRService] Document scanner failed, falling back to camera:", err);
  }

  // Fallback: standard camera
  return pickReceiptWithCamera();
}

/**
 * Capture photo using device camera
 */
export async function pickReceiptWithCamera(): Promise<string | null> {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    return result.assets[0].uri;
  } catch (err) {
    console.warn("[OCRService] Camera capture failed:", err);
    return null;
  }
}

/**
 * Pick receipt image from device photo gallery
 */
export async function pickReceiptFromGallery(): Promise<string | null> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    return result.assets[0].uri;
  } catch (err) {
    console.warn("[OCRService] Photo gallery pick failed:", err);
    return null;
  }
}

/**
 * Pick document file (PDF, image, text)
 */
export async function pickReceiptDocument(): Promise<DocumentAsset | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf", "text/*"],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    return result.assets[0];
  } catch (err) {
    console.warn("[OCRService] Document pick failed:", err);
    return null;
  }
}

export const OCRService = {
  extractTextFromFile,
  parseReceiptText,
  scanReceiptFile,
  scanReceiptWithScanner,
  pickReceiptWithCamera,
  pickReceiptFromGallery,
  pickReceiptDocument,
  parseAmount,
  parseReceiptDate,
  generateItemizedNote,
  easternToWestern,
};
