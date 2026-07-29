/**
 * AI Service — g4f Online Fallback for Transaction Parsing
 *
 * Uses @gpt4free/g4f.dev to parse voice/OCR text into transaction fields
 * when offline parsers have low confidence. Requires internet + API key.
 */

import { ParsedTransaction, TransactionType } from "../types";
import NetInfo from "@react-native-community/netinfo";

// ── Configuration ────────────────────────────────────────────────────────

// API key is read from .env via expo's built-in env support
const G4F_API_KEY = process.env.G4F_API_KEY || "";
const G4F_API_URL = "https://api.g4f.dev/v1/chat/completions";

// ── Types ────────────────────────────────────────────────────────────────

interface G4FResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface AIExtractedFields {
  amount?: number;
  type?: "income" | "expense";
  description?: string;
  date?: string;
  categoryHint?: string;
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

// ── AI parsing ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `أنت مساعد مالي ذكي. مهمتك هي استخراج بيانات المعاملة المالية من النص المعطى.

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
  // Check connectivity first
  const online = await isOnline();
  if (!online) {
    return {
      confidence: 0,
      rawText,
      note: "لا يوجد اتصال بالإنترنت", // "No internet connection"
    };
  }

  // Check API key
  if (!G4F_API_KEY || G4F_API_KEY === "your_api_key_here") {
    return {
      confidence: 0,
      rawText,
      note: "مفتاح API غير مُعد", // "API key not configured"
    };
  }

  try {
    const response = await fetch(G4F_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${G4F_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: rawText },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: G4FResponse = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from AI");
    }

    // Parse the JSON response
    const extracted: AIExtractedFields = JSON.parse(content);

    // Convert to ParsedTransaction
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
      confidence: Math.min(fieldsFound / 3 + 0.2, 1), // AI results get a slight confidence boost
      rawText,
    };
  } catch (error) {
    console.error("[AIService] Parse failed:", error);
    return {
      confidence: 0,
      rawText,
      note: `خطأ في الذكاء الاصطناعي: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export const AIService = {
  isOnline,
  parseWithAI,
};
