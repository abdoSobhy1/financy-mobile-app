/**
 * AI Configuration Service — Manages user API keys for Cloud AI
 *
 * Supports:
 * - Google Gemini (gemini-3.6-flash) — 100% Free at aistudio.google.com
 * - Groq (Llama 3.3 70B) — Free at console.groq.com
 * - OpenAI (GPT-4o-mini)
 * - Authenticated hosted Gemini through the Cloudflare Worker gateway
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import {
  getActiveGeminiModelInfo,
  getAvailableGeminiModels,
  markModelRateLimited,
  recordModelSuccess,
  isRateLimitError,
} from "./geminiQuotaService";
import { isInfiniteOcrUserSync } from "../../features/receipts/services/ocrRateLimitService";

export type AIProvider = "gemini" | "groq" | "openai" | "free";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}

const AI_CONFIG_KEY = "@financy_ai_config";
const AI_KEY_STORAGE_KEY = "@financy_ai_provider_key";
const hostedGeminiConfigured = Boolean(process.env.EXPO_PUBLIC_GEMINI_WORKER_URL?.trim());

async function readSavedAIConfig(): Promise<AIConfig | null> {
  const raw = await AsyncStorage.getItem(AI_CONFIG_KEY);
  if (!raw) return null;

  const parsed = JSON.parse(raw) as Partial<AIConfig>;
  const legacyKey = typeof parsed.apiKey === "string" ? parsed.apiKey.trim() : "";
  let apiKey = await SecureStore.getItemAsync(AI_KEY_STORAGE_KEY);
  if (!apiKey && legacyKey) {
    await SecureStore.setItemAsync(AI_KEY_STORAGE_KEY, legacyKey, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    apiKey = legacyKey;
  }

  if (legacyKey) {
    await AsyncStorage.setItem(
      AI_CONFIG_KEY,
      JSON.stringify({ provider: parsed.provider, model: parsed.model }),
    );
  }

  return {
    provider: parsed.provider || "gemini",
    model: parsed.model,
    apiKey: apiKey?.trim() || "",
  };
}

/**
 * Returns metadata about the user's custom AI configuration WITHOUT ever returning the raw API key string for UI display.
 */
export async function getAIConfigStatus(): Promise<{
  provider: AIProvider;
  hasCustomKey: boolean;
  hasHostedKey: boolean;
  activeModel: string;
  isFallbackModel?: boolean;
  availableGeminiModelsCount?: number;
  totalGeminiModelsCount?: number;
  rateLimitedModels?: string[];
}> {
  try {
    const savedConfig = await readSavedAIConfig();
    let provider: AIProvider = "gemini";
    let isCustom = false;
    let preferredModel = "gemini-3.6-flash";

    if (savedConfig) {
      isCustom = savedConfig.apiKey.length > 0;
      provider = savedConfig.provider;
      preferredModel = savedConfig.model || (savedConfig.provider === "groq" ? "llama-3.3-70b-versatile" : "gemini-3.6-flash");
    }

    if (provider === "gemini") {
      const geminiInfo = await getActiveGeminiModelInfo(preferredModel);
      return {
        provider: "gemini",
        hasCustomKey: isCustom,
        hasHostedKey: hostedGeminiConfigured,
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
      hasHostedKey: hostedGeminiConfigured,
      activeModel: preferredModel,
    };
  } catch (e) {
    console.warn("[AIConfigService] Failed to read stored config status:", e);
  }
  const defaultInfo = await getActiveGeminiModelInfo("gemini-3.6-flash");
  return {
    provider: "gemini",
    hasCustomKey: false,
    hasHostedKey: hostedGeminiConfigured,
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
  await SecureStore.deleteItemAsync(AI_KEY_STORAGE_KEY);
  await AsyncStorage.removeItem(AI_CONFIG_KEY);
}

/**
 * Internal getter used by AIService to perform requests.
 * Uses the user's key from device secure storage, or the authenticated Worker gateway.
 */
export async function getAIConfig(): Promise<AIConfig> {
  try {
    const savedConfig = await readSavedAIConfig();
    if (savedConfig?.apiKey) return savedConfig;
  } catch (e) {
    console.warn("[AIConfigService] Failed to read stored config:", e);
  }

  return { provider: "gemini", apiKey: "", model: "gemini-3.6-flash" };
}

export async function saveAIConfig(config: AIConfig): Promise<void> {
  const trimmedKey = config.apiKey?.trim() || "";
  if (!trimmedKey) {
    await SecureStore.deleteItemAsync(AI_KEY_STORAGE_KEY);
    await AsyncStorage.removeItem(AI_CONFIG_KEY);
    return;
  }
  await SecureStore.setItemAsync(AI_KEY_STORAGE_KEY, trimmedKey, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  await AsyncStorage.setItem(
    AI_CONFIG_KEY,
    JSON.stringify({
      provider: config.provider,
      model: config.model,
    }),
  );
}

export async function testAIConnection(
  config: AIConfig
): Promise<{ success: boolean; message: string }> {
  const { provider, apiKey } = config;

  if (provider === "gemini" && !apiKey?.trim()) {
    try {
      const { testHostedGeminiConnection } = await import("./geminiGateway");
      return await testHostedGeminiConnection(config.model || "gemini-3.6-flash");
    } catch (err: any) {
      const message = err.code === "unauthenticated"
        ? "Sign in to use hosted Gemini, or add your own Gemini API key."
        : err.message || "Hosted Gemini is unavailable. Check the Cloudflare Worker deployment.";
      return { success: false, message };
    }
  }

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
