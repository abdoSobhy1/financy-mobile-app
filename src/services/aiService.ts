/**
 * AI Service — Cloud Fallback & Hybrid AI for Transaction & Receipt Parsing
 *
 * Supports:
 * - Direct Multimodal Vision: Sends resized receipt images (capped at 1080w/1920h)
 *   directly to Google Gemini for 100% accurate OCR + item extraction.
 * - Google Gemini (Gemini-3.6-Flash / 500 requests per day)
 * - Groq (Llama 3.3 70B)
 * - OpenAI (GPT-4o-mini)
 */

import { Image } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import NetInfo from "@react-native-community/netinfo";
import { Category, ParsedTransaction, TransactionType } from "../types";
import { guessCategoryId } from "../utils/categoryDictionary";
import { detectCategory } from "./voiceParser";
import { getAIConfig } from "./aiConfigService";
import {
  getAvailableGeminiModels,
  markModelRateLimited,
  recordModelSuccess,
  isRateLimitError,
} from "./geminiQuotaService";
import type { OcrReceiptItem, OcrReceiptResult, OcrDebugReport, OcrLineDebug } from "./ocrService";

// ── Types ────────────────────────────────────────────────────────────────

export interface PreparedImage {
  base64: string;
  mimeType: string;
  width?: number;
  height?: number;
}

interface AIExtractedSingle {
  amount?: number;
  type?: "income" | "expense";
  description?: string;
  date?: string;
  categoryHint?: string;
}

interface AIExtractedItem {
  name: string;
  quantity?: number;
  price: number;
  unitPrice?: number;
  categoryHint?: string;
}

interface AIExtractedReceipt {
  merchant?: string | null;
  date?: string | null;
  total?: number | null;
  discount?: number | null;
  type?: "expense" | "income";
  items?: AIExtractedItem[];
}

// ── Connectivity check ──────────────────────────────────────────────────

export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true;
  } catch {
    return false;
  }
}

// ── Image Preprocessor (Cap at 1080w max / 1920h max, preserve aspect ratio) ─

export async function prepareReceiptImage(imageUri: string): Promise<PreparedImage> {
  const MAX_WIDTH = 1080;
  const MAX_HEIGHT = 1920;

  try {
    const { manipulateAsync, SaveFormat } = await import("expo-image-manipulator");

    // 1. Get original dimensions to compute proportional scale
    let originalWidth = 0;
    let originalHeight = 0;

    await new Promise<void>((resolve) => {
      Image.getSize(
        imageUri,
        (w, h) => {
          originalWidth = w;
          originalHeight = h;
          resolve();
        },
        () => resolve()
      );
    });

    const actions: any[] = [];

    if (originalWidth > 0 && originalHeight > 0) {
      const scaleW = MAX_WIDTH / originalWidth;
      const scaleH = MAX_HEIGHT / originalHeight;
      const scale = Math.min(scaleW, scaleH, 1); // Only downscale, never upscale

      if (scale < 1) {
        actions.push({
          resize: {
            width: Math.round(originalWidth * scale),
            height: Math.round(originalHeight * scale),
          },
        });
      }
    } else {
      // If dimensions could not be read, cap width at 1080 (expo auto-calculates height)
      actions.push({ resize: { width: MAX_WIDTH } });
    }

    const result = await manipulateAsync(imageUri, actions, {
      compress: 0.85,
      format: SaveFormat.JPEG,
      base64: true,
    });

    if (result.base64) {
      return {
        base64: result.base64,
        mimeType: "image/jpeg",
        width: result.width,
        height: result.height,
      };
    }
  } catch (err) {
    console.warn("[AIService] expo-image-manipulator failed, falling back to raw base64:", err);
  }

  // Fallback: read directly as base64
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { base64, mimeType: "image/jpeg" };
}

// ── Helper: Call LLM (Text or Multimodal Vision) ─────────────────────────

async function callChatModel(
  systemPrompt: string,
  userPrompt: string,
  imageInput?: PreparedImage
): Promise<string> {
  const config = await getAIConfig();
  const apiKey = config.apiKey ? config.apiKey.trim() : "";

  // 1. Google Gemini (Multi-model auto-fallback & daily quota management)
  if (config.provider === "gemini" && apiKey) {
    const preferredModel = config.model ? config.model.toLowerCase().trim() : "gemini-3.6-flash";
    const candidateModels = await getAvailableGeminiModels(preferredModel);

    if (candidateModels.length === 0) {
      throw new Error(
        "All free Google Gemini models have reached their daily usage limit today. Limits automatically reset tomorrow, or you can switch AI providers in Settings."
      );
    }

    const parts: any[] = [
      { text: `${systemPrompt}\n\n[USER INSTRUCTION]:\n${userPrompt}` },
    ];

    if (imageInput && imageInput.base64) {
      parts.push({
        inlineData: {
          mimeType: imageInput.mimeType,
          data: imageInput.base64,
        },
      });
    }

    let lastError: Error | null = null;

    for (const model of candidateModels) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      try {
        console.log(`[AIService] Sending Gemini request to model: ${model}`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          const errMsg = errJson.error?.message || `Gemini API error ${res.status}`;

          if (isRateLimitError(res.status, errJson.error, errMsg)) {
            console.warn(
              `[AIService] Model ${model} exceeded rate limit today (${res.status}): ${errMsg}. Flagging model and falling back.`
            );
            await markModelRateLimited(model, errMsg);
            lastError = new Error(`Model ${model} daily quota exceeded: ${errMsg}`);
            continue; // Fall back to next model in chain
          }

          // Other API errors (e.g. 503 service unavailable, 500, model overload)
          console.warn(`[AIService] Model ${model} failed with HTTP ${res.status}: ${errMsg}. Trying fallback model.`);
          lastError = new Error(errMsg);
          continue; // Try next candidate
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          console.warn(`[AIService] Model ${model} returned empty response. Trying fallback model.`);
          lastError = new Error(`Empty response from ${model}`);
          continue;
        }

        // Successfully received valid response! Record success and return
        await recordModelSuccess(model);
        console.log(`[AIService] Successfully processed request with model: ${model}`);
        return text;
      } catch (err: any) {
        clearTimeout(timeoutId);
        const errMsg = err.name === "AbortError" ? "Request timed out (20s)" : err.message || "Network error";
        console.warn(`[AIService] Request failed with model ${model}: ${errMsg}`);
        lastError = err;
        // Continue to fallback model
      }
    }

    throw lastError || new Error("Failed to get response from any Gemini model.");
  }

  // 2. Groq (Free: Llama 3.3 70B)
  if (config.provider === "groq" && apiKey) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let userContent: any = userPrompt;
    if (imageInput && imageInput.base64) {
      userContent = [
        { type: "text", text: userPrompt || "Extract all items from this receipt" },
        {
          type: "image_url",
          image_url: {
            url: `data:${imageInput.mimeType};base64,${imageInput.base64}`,
          },
        },
      ];
    }

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: imageInput ? "llama-3.2-11b-vision-preview" : config.model || "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Groq API error ${res.status}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response from Groq");
      return content;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") throw new Error("Groq request timed out");
      throw err;
    }
  }

  // 3. OpenAI (GPT-4o-mini)
  if (config.provider === "openai" && apiKey) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18000);

    let userContent: any = userPrompt;
    if (imageInput && imageInput.base64) {
      userContent = [
        { type: "text", text: userPrompt || "Extract all items from this receipt" },
        {
          type: "image_url",
          image_url: {
            url: `data:${imageInput.mimeType};base64,${imageInput.base64}`,
          },
        },
      ];
    }

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `OpenAI API error ${res.status}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response from OpenAI");
      return content;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") throw new Error("OpenAI request timed out");
      throw err;
    }
  }

  throw new Error(
    "Cloud AI requires an API key. Add your free Google Gemini key in Settings > Cloud AI Assistant (100% free at aistudio.google.com)."
  );
}

function cleanJsonContent(content: string): string {
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }
  return cleaned;
}

// ── Single Transaction Parser (Voice / Quick Text) ──────────────────────

const SINGLE_SYSTEM_PROMPT = `أنت مساعد مالي ذكي. مهمتك هي استخراج بيانات المعاملة المالية من النص المعطى.

أعد النتيجة كـ JSON فقط (بدون أي نص إضافي) بالحقول التالية:
{
  "amount": رقم (المبلغ),
  "type": "income" أو "expense",
  "description": "وصف المعاملة",
  "date": "YYYY-MM-DD" أو null,
  "categoryHint": "تلميح الفئة مثل: طعام، مواصلات، راتب..."
}

إذا لم تستطع استخراج حقل معين، اتركه null.
دائماً أعد JSON فقط بدون أي شرح.`;

export async function parseWithAI(rawText: string): Promise<ParsedTransaction> {
  const online = await isOnline();
  if (!online) {
    return {
      confidence: 0,
      rawText,
      note: "لا يوجد اتصال بالإنترنت",
    };
  }

  try {
    const content = await callChatModel(SINGLE_SYSTEM_PROMPT, rawText);
    const cleaned = cleanJsonContent(content);
    const extracted: AIExtractedSingle = JSON.parse(cleaned);

    let fieldsFound = 0;
    if (extracted.amount) fieldsFound++;
    if (extracted.type) fieldsFound++;
    if (extracted.description) fieldsFound++;

    return {
      amount: extracted.amount ?? undefined,
      type: (extracted.type as TransactionType) ?? "expense",
      description: extracted.description ?? undefined,
      date: extracted.date ? new Date(extracted.date) : new Date(),
      categoryHint: extracted.categoryHint ?? undefined,
      confidence: Math.min(fieldsFound / 3 + 0.2, 1),
      rawText,
    };
  } catch (error) {
    console.error("[AIService] Parse single failed:", error);
    return {
      confidence: 0,
      rawText,
      note: `خطأ في الذكاء الاصطناعي: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// ── Metadata & Exclusion Filter ──────────────────────────────────────────

/**
 * Returns true if a given line or extracted item name represents receipt metadata,
 * totals, tax, fees, payment info, cashier, or table info rather than an actual
 * purchased product or service.
 */
export function isReceiptMetadataOrTotal(text: string): boolean {
  if (!text) return true;
  const t = text.trim();
  if (t.length < 2) return true;

  // 1. Totals, subtotals, balance, net amounts, settlements
  if (
    /^(?:grand\s*)?total\b/i.test(t) ||
    /^sub\s*total\b/i.test(t) ||
    /^net\s*(?:total|amount|due)?\b/i.test(t) ||
    /^balance\s*(?:due)?\b/i.test(t) ||
    /^amount\s*due\b/i.test(t) ||
    /^(?:[0-9.,\s]+)?(?:total|grand\s*total|subtotal|net)\b/i.test(t) ||
    /^(?:المجموع|مجموع|الإجمالي|إجمالي|الاجمالي|اجمالي|الصافي|صافي|صافي\s*المبلغ|المبلغ\s*المطلوب|المطلوب\s*سداده|المجموع\s*الكلي|مجموع\s*كلي|جملة\s*الفاتورة|الجملة|جملة|المستحق|مستحق|صافي\s*الفاتورة|صافي\s*القيمة)(?:[\s:#\d]|$|\b)/i.test(t) ||
    /^[0-9.,\s]+(?:المجموع|مجموع|الإجمالي|إجمالي|الاجمالي|اجمالي|الصافي|صافي|الجملة|جملة|المستحق)(?:[\s:#]|$)/i.test(t)
  ) {
    return true;
  }

  // 2. Receipt / Invoice / Order / Slip / Dispatch / PO / Reference numbers & IDs
  if (
    /^(?:dispatch\s*slip|delivery\s*slip|packing\s*slip|delivery\s*note|purchase\s*order|sales\s*order|work\s*order|receipt|rec|invoice|inv|bill|order|chk|check|ticket|txn|trans|slip|dispatch|po|so|quote|quotation|ref|reference)\s*(?:#|no\.?|num\.?|number|id|code)?\s*[:#/-]?\s*\d+/i.test(t) ||
    /^(?:dispatch\s*slip|delivery\s*slip|packing\s*slip|receipt|rec|invoice|inv|bill|order|chk|check|ticket|slip|dispatch)\s*(?:#|no\.?|num\.?|number)\b/i.test(t) ||
    /^(?:رقم\s*(?:الفاتورة|الإيصال|الشيك|الطلب|العملية|الحساب|التسجيل|الملف|المسلسل|الشحنة|الإذن|الاذن)|فاتورة\s*رقم|إيصال\s*رقم|طلب\s*رقم|شيك\s*رقم|سند\s*رقم|حوالة\s*رقم)(?:[\s:#/=-]|$|\b)/i.test(t) ||
    /^(?:إذن|اذن)\s*(?:صرف|استلام|تسليم|إضافة|اضافة|دفع|قبض|توريد)?(?:\s*رقم)?(?:[\s:#/=-]|$|\b)/i.test(t) ||
    /^(?:أمر|امر)\s*(?:توريد|شراء|بيع|شغل|عمل|صرف)?(?:\s*رقم)?(?:[\s:#/=-]|$|\b)/i.test(t) ||
    /^(?:سند|حوالة|بوليصة)\s*(?:قبض|صرف|شحن|تسليم|استلام)?(?:\s*رقم)?(?:[\s:#/=-]|$|\b)/i.test(t) ||
    /^(?:كود\s*(?:العميل|المندوب|الحساب|المستودع)|مسلسل)(?:[\s:#/=-]|$|\b)/i.test(t)
  ) {
    return true;
  }

  // 3. Tax, VAT, service charges, delivery fees, discount
  if (
    /^(?:vat|tax|gst|hst|sales\s*tax|service\s*charge|service|delivery\s*fee|discount|promo|tip|surcharge)\b/i.test(t) ||
    /^(?:ضريبة(\s*القيمة\s*المضافة)?|الضريبة|خدمة|رسوم\s*خدمة|رسوم\s*توصيل|خصم|تخفيض)(?:[\s:#\d%]|$|\b)/i.test(t)
  ) {
    return true;
  }

  // 4. Payment / Tender methods & change
  if (
    /^(?:cash|visa|mastercard|mada|knet|credit\s*card|debit\s*card|paid|change\s*due|change|tendered|customer\s*paid)\b/i.test(t) ||
    /^(?:نقداً|كاش|فيزا|ماستركارد|مدى|المدفوع|المسدد|الباقي|متبقي|المدفوعات)(?:[\s:#\d]|$|\b)/i.test(t)
  ) {
    return true;
  }

  // 5. Timestamps, print metadata, staff, warehouse, terminal, tax ID, phone, URL, greetings
  if (
    /^(?:print\s*(?:date|time|ed)|printed\s*(?:on|at)|time\b|date\b)/i.test(t) ||
    /^(?:تاريخ\s*(?:الطباعة|الاصدار|الفاتورة)|وقت\s*(?:الطباعة|الاصدار)|طبع\s*في|توقيت)(?:[\s:#]|$|\b)/i.test(t) ||
    /^(?:cashier|server|waiter|operator|terminal|pos|table|guest|tbl|station|lane)\b/i.test(t) ||
    /^(?:sales\s*(?:rep|person|man)|driver|warehouse|depot|branch|store)\b/i.test(t) ||
    /^(?:كاشير|طاولة|ترابيزة|ويتر|مستخدم|نقطة\s*بيع|محطة|مندوب|سائق|بائع|مخزن|مستودع|معرض|فرع|صالة)(?:[\s:#]|$|\b)/i.test(t) ||
    /^(?:tel|phone|mobile|fax|cr\s*#|trn|tax\s*id|p\.?o\.?\s*box)\b/i.test(t) ||
    /^(?:س\.ت|ب\.ض|س\s*ت|ب\s*ض|الرقم\s*الضريبي|السجل\s*التجاري|البطاقة\s*الضريبية|الملف\s*الضريبي)(?:[\s:#\d]|$|\b)/i.test(t) ||
    /^(?:هاتف|تليفون|موبايل|فاكس|العنوان|ص\.ب)(?:[\s:#\d]|$|\b)/i.test(t) ||
    /^(?:thank\s*you|welcome)\b/i.test(t) ||
    /^(?:شكراً\s*(?:لزيارتكم)?|أهلاً\s*بكم)(?:[\s:#\d]|$|\b)/i.test(t)
  ) {
    return true;
  }

  // 6. Any line containing explicit time pattern at start e.g. "10:37:25 AM" or ending in separator /:#
  if (/^\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm|ص|م)?/i.test(t)) {
    return true;
  }

  return false;
}

// ── Multi-Entry Receipt Parser Prompt ────────────────────────────────────

const RECEIPT_SYSTEM_PROMPT = `You are an expert financial receipt, bill, and invoice parser with advanced document understanding and vision capabilities.
Your primary task is to understand the context and layout of the receipt and extract ONLY the actual purchased line items (products, goods, foods, beverages, or services).

DOCUMENT ARCHITECTURE & CONTEXTUAL UNDERSTANDING:
Every retail receipt or bill is structured into three distinct semantic zones. You must distinguish between them:

1. HEADER ZONE (Operational Metadata — NOT Items):
   - Contains: Store/business name, branch location, date, time, receipt/invoice #, order #, table #, cashier/operator name, and tax registration IDs (TRN/CR).
   - Context: These identify the transaction event and merchant. They are NEVER goods bought by the customer. Do not put them in "items".

2. BODY ZONE (Purchased Goods / Services — THE ONLY ITEMS):
   - Contains: The itemized rows of actual products, dishes, groceries, retail goods, or services bought by the customer.
   - The Customer Bag Test: "Did the customer pay for this specific merchandise to consume, own, or take with them?"
     Examples: "Milk 1L", "Latte", "Golden Sirt 3", "Beef Carpaccio", "Shampoo", "T-Shirt".
   - This Body Zone is the ONLY source for the "items" array!

3. FOOTER & SETTLEMENT ZONE (Financial Totals & Payment — NOT Items):
   - Contains: Subtotal, VAT / sales tax, service charge, delivery fee, discounts, final grand total, payment method (Cash, Visa, MasterCard, etc.), customer paid, change returned, and greetings/return policy.
   - Context: These represent financial accounting and payment settlement. They are the mathematical result of the items, NOT items themselves!
   - Mathematical Consistency: Line item prices add up to the total. Putting the total or subtotal into "items" doubles or corrupts the sum, which is mathematically invalid.

EXTRACTION RULES:
1. "items" Array:
   - Extract ONLY line items from the BODY ZONE.
   - "name": Clean item description (e.g., "Latte Large", "Beef Carpaccio", "Milk 1L"). Do not prepend numbering like "1." or append price text.
   - "quantity": Number of units purchased (default 1).
   - "price": Total final price for this line item.
   - "unitPrice": Unit price (or price / quantity).

2. Top-Level Root Fields:
   - "merchant": Business/store name from Header (or null).
   - "date": Date in "YYYY-MM-DD" format (or null).
   - "total": Final grand total / net amount to pay from the Footer (or null).
   - "discount": Explicit discount amount if printed separately (or null).
   - "type": "expense" (default) or "income".

Return ONLY valid JSON:
{
  "merchant": string or null,
  "date": "YYYY-MM-DD" or null,
  "total": number or null,
  "discount": number or null,
  "type": "expense" or "income",
  "items": [
    {
      "name": string,
      "quantity": number,
      "price": number,
      "unitPrice": number
    }
  ]
};`;

function buildOcrResultFromExtracted(
  extracted: AIExtractedReceipt,
  categories: Record<string, Category>,
  rawTextSource: string
): OcrReceiptResult {
  let fallbackGrandTotal: number | undefined;

  // Filter out any totals, receipt numbers, taxes or metadata lines that slipped into items
  const validExtractedItems = (extracted.items || []).filter((it) => {
    if (!it.name) return false;
    const nameTrimmed = it.name.trim();
    if (isReceiptMetadataOrTotal(nameTrimmed)) {
      if (!fallbackGrandTotal && /total|المجموع|الإجمالي|الصافي/i.test(nameTrimmed) && it.price > 0) {
        fallbackGrandTotal = it.price;
      }
      return false;
    }
    return true;
  });

  const items: OcrReceiptItem[] = validExtractedItems.map((it) => {
    const qty = it.quantity && it.quantity > 0 ? it.quantity : 1;
    const price = typeof it.price === "number" ? it.price : parseFloat(String(it.price));
    const unitPrice =
      it.unitPrice || (qty > 1 && price > 0 ? Math.round((price / qty) * 100) / 100 : undefined);

    return {
      id: `item_${Math.random().toString(36).substring(2, 9)}`,
      name: it.name.trim(),
      quantity: qty,
      price: isNaN(price) ? 0 : price,
      unitPrice,
      categoryId: detectCategory(it.name, categories),
      selected: true,
    };
  });

  const itemsSum =
    items.length > 0 ? Math.round(items.reduce((sum, it) => sum + it.price, 0) * 100) / 100 : undefined;

  let grandTotal = extracted.total || fallbackGrandTotal || undefined;
  if (!grandTotal && itemsSum) {
    grandTotal = itemsSum;
  }

  let parsedDate: Date | undefined;
  if (extracted.date) {
    const d = new Date(extracted.date);
    if (!isNaN(d.getTime())) {
      parsedDate = d;
    }
  }

  const debugReport: OcrDebugReport = {
    totalLines: items.length,
    recognizedItemsCount: items.length,
    unrecognizedLinesCount: 0,
    detectedGrandTotal: grandTotal,
    computedItemsSum: itemsSum,
    discount: extracted.discount || undefined,
    merchant: extracted.merchant || undefined,
    date: parsedDate,
    type: extracted.type || "expense",
    items,
    unrecognizedLines: [],
    lines: items.map((it) => ({
      line: `${it.quantity}x ${it.name} - ${it.price}`,
      type: "item",
      reason: "Vision AI extracted item",
      item: it,
    })),
    rawText: rawTextSource,
  };

  return {
    amount: grandTotal,
    description: extracted.merchant || undefined,
    date: parsedDate,
    type: extracted.type || "expense",
    items,
    itemsSum,
    discount: extracted.discount || undefined,
    isMultiEntry: items.length > 1,
    rawText: rawTextSource,
    confidence: 0.98,
    debugReport,
  };
}

// ── Multi-Entry Receipt: From Extracted Text ─────────────────────────────

export async function parseReceiptWithAI(
  rawText: string,
  categories: Record<string, Category> = {}
): Promise<OcrReceiptResult> {
  const online = await isOnline();
  if (!online) {
    throw new Error("No internet connection for AI enhancement");
  }

  const userPrompt = `Understand the receipt layout and context. Extract ONLY the purchased goods/services from the line-item body into 'items'. Exclude all header metadata (receipt/invoice #, cashier, table) and footer settlement data (total, subtotal, tax, cash, change).\n\nReceipt Text:\n${rawText}`;

  const content = await callChatModel(RECEIPT_SYSTEM_PROMPT, userPrompt);
  const cleaned = cleanJsonContent(content);
  const extracted: AIExtractedReceipt = JSON.parse(cleaned);

  return buildOcrResultFromExtracted(extracted, categories, rawText);
}

// ── Multi-Entry Receipt: Direct Multimodal Image Vision ──────────────────

export async function parseReceiptImageWithAI(
  imageUri: string,
  categories: Record<string, Category> = {}
): Promise<OcrReceiptResult> {
  const online = await isOnline();
  if (!online) {
    throw new Error("No internet connection for AI vision scan");
  }

  console.log("[AIService] Resizing receipt image (max 1080w / 1920h) for Gemini Vision...");
  const prepared = await prepareReceiptImage(imageUri);
  console.log(`[AIService] Image prepared: ${prepared.width}x${prepared.height}, size: ~${Math.round(prepared.base64.length / 1024)} KB`);

  const userPrompt =
    "Understand the receipt layout and context. Extract ONLY the purchased goods/services from the line-item body into 'items'. Exclude all header metadata (receipt/invoice #, cashier, table) and footer settlement data (total, subtotal, tax, cash, change).";

  const content = await callChatModel(
    RECEIPT_SYSTEM_PROMPT,
    userPrompt,
    prepared
  );

  const cleaned = cleanJsonContent(content);
  const extracted: AIExtractedReceipt = JSON.parse(cleaned);

  const summaryText = (extracted.items || []).map((it) => `${it.quantity}x ${it.name} ${it.price}`).join("\n");
  return buildOcrResultFromExtracted(extracted, categories, summaryText);
}

// ── Spoken Voice Transcript Analyzer (Gemini AI) ─────────────────────────

const VOICE_ANALYSIS_SYSTEM_PROMPT = `أنت مساعد مالي ذكي متخصص في استخراج المعاملات المالية من النصوص الصوتية المسجلة (بالعربية أو الإنجليزية).
مهمتك هي تحليل النص المنطوق واستخراج كل معاملة مالية مذكورة فيه بدقة.
قد يحتوي التسجيل على معاملة واحدة أو عدة معاملات منفصلة (مثل: "صرفت 50 سوبرماركت و 20 مواصلات وكمان 100 بنزين").

قواعد الاستخراج:
1. استخرج كل معاملة كعنصر مستقل في مصفوفة "transactions".
2. لكل معاملة استخرج:
   - "amount": رقم المبلغ كقيمة رقمية (مثل 50 أو 150.5). إذا لم يُذكر مبلغ ضع 0.
   - "type": "expense" أو "income" (المصروف هو الافتراضي، والدخل للمعاملات مثل: استلمت، راتب، قبضت، مكسب، تحويل لي).
   - "description": وصف واضح ونظيف للمعاملة (اسم المكان أو السلعة أو الغرض مثل: "سوبرماركت"، "بنزين"، "قهوة ومطعم")، احتفظ به بنفس لغة النص الأصلية بدون إضافة كلمات زائدة مثل "صرفت" أو "دفعت".
   - "date": تاريخ المعاملة بصيغة "YYYY-MM-DD" إذا ذكر تاريخ معين، أو null إذا لم يذكر تاريخ محدد.

تنبيه هام جداً:
- لا تقم بتخمين أو وضع أي حقل للفئات (Categories). سيتم تحديد الفئات تلقائياً بواسطة نظام الحسابات الخاص بنا.
- أعد النتيجة كـ JSON فقط (بدون أي علامات markdown أو شرح إضافي) بالشكل التالي:
{
  "transactions": [
    {
      "amount": 150,
      "type": "expense",
      "description": "سوبرماركت",
      "date": null
    }
  ]
}`;

export async function parseVoiceWithAI(
  rawText: string,
  categories: Record<string, Category> = {},
  transactions: any[] = [],
  budgets: any[] = []
): Promise<ParsedTransaction[]> {
  const online = await isOnline();
  if (!online) {
    throw new Error("No internet connection for AI enhancement");
  }

  const userPrompt = `حلل هذا النص الصوتي واستخرج المعاملات المالية منه:\n\n"${rawText}"`;
  const content = await callChatModel(VOICE_ANALYSIS_SYSTEM_PROMPT, userPrompt);
  const cleaned = cleanJsonContent(content);

  let extractedItems: Array<{
    amount?: number | string;
    type?: string;
    description?: string;
    date?: string | null;
  }> = [];

  try {
    const parsedJson = JSON.parse(cleaned);
    if (Array.isArray(parsedJson.transactions)) {
      extractedItems = parsedJson.transactions;
    } else if (Array.isArray(parsedJson.items)) {
      extractedItems = parsedJson.items;
    } else if (parsedJson.amount !== undefined || parsedJson.description) {
      extractedItems = [parsedJson];
    }
  } catch (parseErr) {
    console.error("[AIService] Failed to parse JSON from AI response:", cleaned);
    throw new Error("Failed to interpret AI response as transactions");
  }

  if (extractedItems.length === 0) {
    throw new Error("AI could not detect any transactions in the transcript");
  }

  const resultList: ParsedTransaction[] = [];
  const budgetsList = Array.isArray(budgets) ? budgets : Object.values(budgets);

  for (const item of extractedItems) {
    const rawAmt = typeof item.amount === "number" ? item.amount : parseFloat(String(item.amount || "0"));
    const amount = isNaN(rawAmt) ? 0 : rawAmt;
    const type: TransactionType = item.type === "income" ? "income" : "expense";
    const description = (item.description || "").trim() || rawText.trim();

    // Category detection: strictly through local category algorithm, NOT the AI!
    const categoryId = detectCategory(description, categories, transactions);

    // Budget matching based on detected category
    let budgetId: string | undefined;
    if (categoryId && budgetsList.length > 0) {
      const directBudget = budgetsList.find((b: any) => b.categoryId === categoryId);
      if (directBudget) {
        budgetId = directBudget.id;
      } else {
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

    let parsedDate: Date = new Date();
    if (item.date) {
      const d = new Date(item.date);
      if (!isNaN(d.getTime())) {
        parsedDate = d;
      }
    }

    resultList.push({
      amount,
      type,
      description,
      date: parsedDate,
      categoryId,
      budgetId,
      confidence: 0.98,
      rawText: `${description} ${amount > 0 ? amount : ""}`.trim() || rawText,
    });
  }

  return resultList;
}

export const AIService = {
  isOnline,
  prepareReceiptImage,
  parseWithAI,
  parseVoiceWithAI,
  parseReceiptWithAI,
  parseReceiptImageWithAI,
  isReceiptMetadataOrTotal,
};
