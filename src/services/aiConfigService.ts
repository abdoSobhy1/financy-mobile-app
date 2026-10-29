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
}> {
  try {
    const raw = await AsyncStorage.getItem(AI_CONFIG_KEY);
    if (raw) {
      const parsed: AIConfig = JSON.parse(raw);
      const trimmedKey = parsed?.apiKey?.trim() || "";
      const bundledKeys = getBundledKeys();
      const isCustom = trimmedKey.length > 0 && !bundledKeys.includes(trimmedKey);
      return {
        provider: parsed?.provider || "gemini",
        hasCustomKey: isCustom,
      };
    }
  } catch (e) {
    console.warn("[AIConfigService] Failed to read stored config status:", e);
  }
  return { provider: "gemini", hasCustomKey: false };
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

  // Fallback to environment variables
  const geminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return { provider: "gemini", apiKey: geminiKey, model: "gemini-3.6-flash" };
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
      const model = config.model ? config.model.toLowerCase() : "gemini-3.6-flash";
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
        return { success: false, message: `Gemini Error: ${err}` };
      }
      return { success: true, message: "Google Gemini connection successful! 🚀" };
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
