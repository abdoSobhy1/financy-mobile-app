/**
 * AI Configuration Service — Manages user API keys for Cloud AI
 *
 * Supports:
 * - Google Gemini (gemini-3.6-flash) — 100% Free at aistudio.google.com
 * - Groq (Llama 3.3 70B) — Free at console.groq.com
 * - OpenAI (GPT-4o-mini)
 * - Public Fallback (No key)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getActiveGeminiModelInfo,
  getAvailableGeminiModels,
  markModelRateLimited,
  recordModelSuccess,
  isRateLimitError,
} from "./geminiQuotaService";
import { isInfiniteOcrUserSync } from "./ocrRateLimitService";

export type AIProvider = "gemini" | "groq" | "openai" | "free";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}

const AI_CONFIG_KEY = "@financy_ai_config";

function getBundledKeys(): string[] {
  return [
    process.env.EXPO_PUBLIC_GEMINI_API_KEY,
    process.env.GEMINI_API_KEY,
    process.env.EXPO_PUBLIC_GROQ_API_KEY,
    process.env.GROQ_API_KEY,
    process.env.EXPO_PUBLIC_OPENAI_API_KEY,
    process.env.OPENAI_API_KEY,
  ]
    .filter((k): k is string => Boolean(k && k.trim()))
    .map((k) => k.trim());
}

/**
 * Returns metadata about the user's custom AI configuration WITHOUT ever returning the raw API key string for UI display.
 */
export async function getAIConfigStatus(): Promise<{
  provider: AIProvider;
  hasCustomKey: boolean;
  hasBundledKey: boolean;
  activeModel: string;
  isFallbackModel?: boolean;
  availableGeminiModelsCount?: number;
  totalGeminiModelsCount?: number;
  rateLimitedModels?: string[];
}> {
  const bundledKeys = getBundledKeys();
  const hasBundled = bundledKeys.length > 0;
  try {
    const raw = await AsyncStorage.getItem(AI_CONFIG_KEY);
    let provider: AIProvider = "gemini";
    let isCustom = false;
    let preferredModel = "gemini-3.6-flash";

    if (raw) {
      const parsed: AIConfig = JSON.parse(raw);
      const trimmedKey = parsed?.apiKey?.trim() || "";
      isCustom = trimmedKey.length > 0 && !bundledKeys.includes(trimmedKey);
      provider = parsed?.provider || "gemini";
      preferredModel = parsed?.model || (parsed?.provider === "groq" ? "llama-3.3-70b-versatile" : "gemini-3.6-flash");
    }

    if (provider === "gemini") {
      const geminiInfo = await getActiveGeminiModelInfo(preferredModel);
      return {
        provider: "gemini",
        hasCustomKey: isCustom,
        hasBundledKey: hasBundled,
        activeModel: geminiInfo.activeModel,
        isFallbackModel: geminiInfo.isFallback,
        availableGeminiModelsCount: geminiInfo.availableCount,
        totalGeminiModelsCount: geminiInfo.totalModels,
        rateLimitedModels: geminiInfo.rateLimitedModels,
      };
    }

    return {
      provider,
      hasCustomKey: isCustom,
      hasBundledKey: hasBundled,
      activeModel: preferredModel,
    };
  } catch (e) {
    console.warn("[AIConfigService] Failed to read stored config status:", e);
  }
  const defaultInfo = await getActiveGeminiModelInfo("gemini-3.6-flash");
  return {
    provider: "gemini",
    hasCustomKey: false,
    hasBundledKey: hasBundled,
    activeModel: defaultInfo.activeModel,
    isFallbackModel: defaultInfo.isFallback,
    availableGeminiModelsCount: defaultInfo.availableCount,
    totalGeminiModelsCount: defaultInfo.totalModels,
    rateLimitedModels: defaultInfo.rateLimitedModels,
  };
}

/**
 * Returns true if the user has explicitly configured their own personal API key (not the bundled fallback key).
 */
export async function hasCustomAIApiKey(): Promise<boolean> {
  const status = await getAIConfigStatus();
  return status.hasCustomKey;
}

export async function clearCustomAIConfig(): Promise<void> {
  await AsyncStorage.removeItem(AI_CONFIG_KEY);
}

/**
 * Internal getter used by AIService to perform requests.
 * Uses user's custom key if present, otherwise falls back to bundled environment key.
 */
export async function getAIConfig(): Promise<AIConfig> {
  try {
    const raw = await AsyncStorage.getItem(AI_CONFIG_KEY);
    if (raw) {
      const parsed: AIConfig = JSON.parse(raw);
      if (parsed && parsed.provider && parsed.apiKey && parsed.apiKey.trim()) {
        return {
          ...parsed,
          apiKey: parsed.apiKey.trim(),
        };
      }
    }
  } catch (e) {
    console.warn("[AIConfigService] Failed to read stored config:", e);
  }

  // Fallback to git-ignored environment variables (.env / EAS secrets)
  const geminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return { provider: "gemini", apiKey: geminiKey.trim(), model: "gemini-3.6-flash" };
  }
  const groqKey = process.env.EXPO_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY;
  if (groqKey) {
    return { provider: "groq", apiKey: groqKey, model: "llama-3.3-70b-versatile" };
  }
  const openaiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return { provider: "openai", apiKey: openaiKey, model: "gpt-4o-mini" };
  }

  return { provider: "gemini", apiKey: "", model: "gemini-3.6-flash" };
}

export async function saveAIConfig(config: AIConfig): Promise<void> {
  const trimmedKey = config.apiKey?.trim() || "";
  if (!trimmedKey) {
    await AsyncStorage.removeItem(AI_CONFIG_KEY);
    return;
  }
  await AsyncStorage.setItem(
    AI_CONFIG_KEY,
    JSON.stringify({
      provider: config.provider,
      apiKey: trimmedKey,
      model: config.model,
    }),
  );
}

export async function testAIConnection(
  config: AIConfig
): Promise<{ success: boolean; message: string }> {
  const { provider, apiKey } = config;

  if (!apiKey || !apiKey.trim()) {
    return { success: false, message: "Please enter an API key first." };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    if (provider === "gemini") {
      const preferred = config.model ? config.model.toLowerCase().trim() : "gemini-3.6-flash";
      const available = await getAvailableGeminiModels(preferred);
      const candidates = available.length > 0 ? available : [preferred];

      let lastErr = "";
      for (const model of candidates) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "Respond with the word OK." }] }],
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          const data = await res.json();
          if (!res.ok) {
            const err = data.error?.message || `HTTP ${res.status}`;
            if (isRateLimitError(res.status, data.error, err)) {
              await markModelRateLimited(model, err);
              lastErr = `${model} daily quota reached`;
              continue; // Try next fallback model
            }
            lastErr = `${model} error: ${err}`;
            continue;
          }
          await recordModelSuccess(model);
          const isDevOwner = isInfiniteOcrUserSync();
          const fallbackNote = model !== preferred ? ` (Auto-fallback from ${preferred})` : "";
          return {
            success: true,
            message: isDevOwner
              ? `Google Gemini connected successfully! 🚀\nUsing: ${model}${fallbackNote}`
              : "Google Gemini connection successful! 🚀",
          };
        } catch (err: any) {
          clearTimeout(timeoutId);
          lastErr = err.name === "AbortError" ? `${model} timed out` : err.message || "Network error";
        }
      }
      return { success: false, message: `Gemini Error: ${lastErr || "All candidate models failed"}` };
    }

    if (provider === "groq") {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: "Respond with OK." }],
          max_tokens: 5,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) {
        const err = data.error?.message || `HTTP ${res.status}`;
        return { success: false, message: `Groq Error: ${err}` };
      }
      return { success: true, message: "Groq Llama 3.3 connection successful! ⚡" };
    }

    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Respond with OK." }],
          max_tokens: 5,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) {
        const err = data.error?.message || `HTTP ${res.status}`;
        return { success: false, message: `OpenAI Error: ${err}` };
      }
      return { success: true, message: "OpenAI connection successful! ✨" };
    }

    clearTimeout(timeoutId);
    return { success: false, message: "Unsupported AI provider selected." };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { success: false, message: "Connection timed out. Check your internet connection." };
    }
    return { success: false, message: `Connection failed: ${err.message || "Network error"}` };
  }
}
