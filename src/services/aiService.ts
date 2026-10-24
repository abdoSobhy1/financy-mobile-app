/**
 * AI Service — Cloud Fallback & Hybrid AI for Transaction & Receipt Parsing
 *
 * Supports:
 * - Direct Multimodal Vision: Sends resized receipt images (capped at 1080w/1920h)
 *   directly to Google Gemini for 100% accurate OCR + item extraction.
 * - Google Gemini (gemini-3.5-flash-lite / 500 requests per day)
 * - Groq (Llama 3.3 70B)
 * - OpenAI (GPT-4o-mini)
 */

import { Image } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import NetInfo from "@react-native-community/netinfo";
import { Category, ParsedTransaction, TransactionType } from "../types";
import { guessCategoryId } from "../utils/categoryDictionary";
import { getAIConfig } from "./aiConfigService";
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

  // 1. Google Gemini (Preferred: 500 free requests/day with gemini-3.5-flash-lite)
  if (config.provider === "gemini" && apiKey) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const model = config.model || "gemini-3.5-flash-lite";

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

    try {
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
        throw new Error(errJson.error?.message || `Gemini API error ${res.status}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response from Gemini");
      return text;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") throw new Error("Gemini request timed out (20s)");
      throw err;
    }
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

  // 4. Public Free Fallback (text only)
  if (!imageInput) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("https://text.pollinations.ai/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          model: "openai",
          jsonMode: true,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const text = await res.text();
        if (text) return text;
      }
    } catch (publicErr) {
      console.warn("[AIService] Public fallback endpoint unreachable:", publicErr);
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

// ── Multi-Entry Receipt Parser Prompt ────────────────────────────────────

const RECEIPT_SYSTEM_PROMPT = `You are an expert financial receipt, bill and invoice parser with vision capabilities.
Your job is to read this receipt (from text or image), recognize all purchased items, merchant/store name, date, and totals.
The receipt may be in English, Arabic, or mixed.

Rules:
1. Extract ALL purchased items:
   - "name": Clean item description (without leading/trailing quantity, price, or table metadata). Keep internal numbers like "Golden Sirt 3" or sizes.
   - "quantity": Number of units purchased (default 1).
   - "price": Total price for this line item.
   - "unitPrice": Price per single unit (or price / quantity).
   - "categoryHint": Suggested category (e.g., Food & Dining, Groceries, Shopping, Electronics, Health, Cafe).
2. "merchant": The store/business name from the top header (or null if not visible).
3. "date": Date in "YYYY-MM-DD" format (or null if not visible).
4. "total": Net/Grand total amount to pay (or null if not visible).
5. "discount": Discount amount if present (or null).
6. "type": "expense" or "income" (default "expense").

Return ONLY valid JSON matching this schema:
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
      "unitPrice": number,
      "categoryHint": string or null
    }
  ]
}`;

function buildOcrResultFromExtracted(
  extracted: AIExtractedReceipt,
  categories: Record<string, Category>,
  rawTextSource: string
): OcrReceiptResult {
  const items: OcrReceiptItem[] = (extracted.items || []).map((it) => {
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
      categoryId: guessCategoryId(it.categoryHint || it.name, categories),
      selected: true,
    };
  });

  const itemsSum =
    items.length > 0 ? Math.round(items.reduce((sum, it) => sum + it.price, 0) * 100) / 100 : undefined;

  let grandTotal = extracted.total || undefined;
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

  const content = await callChatModel(RECEIPT_SYSTEM_PROMPT, rawText);
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

  const content = await callChatModel(
    RECEIPT_SYSTEM_PROMPT,
    "Read this receipt image and extract all purchased items, quantities, prices, store name, date, and total.",
    prepared
  );

  const cleaned = cleanJsonContent(content);
  const extracted: AIExtractedReceipt = JSON.parse(cleaned);

  const summaryText = (extracted.items || []).map((it) => `${it.quantity}x ${it.name} ${it.price}`).join("\n");
  return buildOcrResultFromExtracted(extracted, categories, summaryText);
}

export const AIService = {
  isOnline,
  prepareReceiptImage,
  parseWithAI,
  parseReceiptWithAI,
  parseReceiptImageWithAI,
};
