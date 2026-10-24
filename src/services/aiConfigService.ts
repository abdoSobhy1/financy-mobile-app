/**
 * AI Configuration Service — Manages user API keys for Cloud AI
 *
 * Supports:
 * - Google Gemini (1.5 Flash / 2.0 Flash) — 100% Free at aistudio.google.com
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

export async function getAIConfig(): Promise<AIConfig> {
  try {
    const raw = await AsyncStorage.getItem(AI_CONFIG_KEY);
    if (raw) {
      const parsed: AIConfig = JSON.parse(raw);
      if (parsed && parsed.provider) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("[AIConfigService] Failed to read stored config:", e);
  }

  // Fallback to environment variables
  if (process.env.GEMINI_API_KEY) {
    return { provider: "gemini", apiKey: process.env.GEMINI_API_KEY, model: "gemini-3.5-flash-lite" };
  }
  if (process.env.GROQ_API_KEY) {
    return { provider: "groq", apiKey: process.env.GROQ_API_KEY, model: "llama-3.3-70b-versatile" };
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: "openai", apiKey: process.env.OPENAI_API_KEY, model: "gpt-4o-mini" };
  }
  if (process.env.G4F_API_KEY && process.env.G4F_API_KEY !== "your_api_key_here") {
    return { provider: "custom" as any, apiKey: process.env.G4F_API_KEY };
  }

  return { provider: "gemini", apiKey: "", model: "gemini-3.5-flash-lite" };
}

export async function saveAIConfig(config: AIConfig): Promise<void> {
  await AsyncStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
}

export async function testAIConnection(
  config: AIConfig
): Promise<{ success: boolean; message: string }> {
  const { provider, apiKey } = config;

  if (!apiKey && provider !== "free") {
    return { success: false, message: "Please enter an API key first." };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    if (provider === "gemini") {
      const model = config.model || "gemini-3.5-flash-lite";
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

    // Free test
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
        model: "openai",
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      return { success: false, message: `Public endpoint error: ${res.status}` };
    }
    return { success: true, message: "Public endpoint is reachable." };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { success: false, message: "Connection timed out. Check your internet connection." };
    }
    return { success: false, message: `Connection failed: ${err.message || "Network error"}` };
  }
}
