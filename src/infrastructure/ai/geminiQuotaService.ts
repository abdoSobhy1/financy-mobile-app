/**
 * Gemini Quota & Multi-Model Service
 *
 * Manages daily rate-limit tracking and automatic multi-model fallback for Google Gemini.
 * Uses the exact models and rate limits from Google AI Studio (aistudio.google.com/rate-limit).
 *
 * Models with active free-tier quota:
 * - gemini-3.6-flash: 20 RPD, 5 RPM
 * - gemini-3.5-flash-lite: 500 RPD, 15 RPM (High quota)
 * - gemini-3.1-flash-lite: 500 RPD, 15 RPM (High quota)
 * - gemini-3.8-flash: 20 RPD, 5 RPM
 * - gemini-3-flash: 20 RPD, 5 RPM
 * - gemini-2.5-flash-lite: 20 RPD, 10 RPM
 * - gemini-2.5-flash: 20 RPD, 5 RPM
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export const GEMINI_FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-3-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
] as const;

export type GeminiModelName = (typeof GEMINI_FALLBACK_MODELS)[number] | string;

export interface ModelQuotaMeta {
  name: string;
  label: string;
  rpm: number;
  rpd: number;
  tpm: string;
  isGenerous: boolean;
}

export const GEMINI_MODEL_METADATA: Record<string, ModelQuotaMeta> = {
  "gemini-3.6-flash": {
    name: "gemini-3.6-flash",
    label: "Gemini 3.6 Flash",
    rpm: 5,
    rpd: 20,
    tpm: "250K",
    isGenerous: false,
  },
  "gemini-3.5-flash-lite": {
    name: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash Lite",
    rpm: 15,
    rpd: 500,
    tpm: "250K",
    isGenerous: true,
  },
  "gemini-3.1-flash-lite": {
    name: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash Lite",
    rpm: 15,
    rpd: 500,
    tpm: "250K",
    isGenerous: true,
  },
  "gemini-3.8-flash": {
    name: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash",
    rpm: 5,
    rpd: 20,
    tpm: "250K",
    isGenerous: false,
  },
  "gemini-3-flash": {
    name: "gemini-3-flash",
    label: "Gemini 3 Flash",
    rpm: 5,
    rpd: 20,
    tpm: "250K",
    isGenerous: false,
  },
  "gemini-2.5-flash-lite": {
    name: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    rpm: 10,
    rpd: 20,
    tpm: "250K",
    isGenerous: false,
  },
  "gemini-2.5-flash": {
    name: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    rpm: 5,
    rpd: 20,
    tpm: "250K",
    isGenerous: false,
  },
};

export interface ModelUsageRecord {
  requestCount: number;
  isRateLimited: boolean;
  rateLimitedAt?: string; // ISO date string
  lastUsedAt?: string; // ISO date string
  lastError?: string;
}

export interface GeminiDailyUsage {
  date: string; // "YYYY-MM-DD"
  models: Record<string, ModelUsageRecord>;
}

export const GEMINI_USAGE_STORAGE_KEY = "@financy_gemini_daily_usage";

/**
 * Returns current date string in "YYYY-MM-DD" format using local timezone.
 */
export function getTodayDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Retrieves daily usage from AsyncStorage.
 * If the stored date is different from today (a new day has started),
 * it resets the usage and flags automatically so models are not false-flagged.
 */
export async function getDailyGeminiUsage(referenceDate?: Date): Promise<GeminiDailyUsage> {
  const today = getTodayDateString(referenceDate);
  try {
    const raw = await AsyncStorage.getItem(GEMINI_USAGE_STORAGE_KEY);
    if (raw) {
      const parsed: GeminiDailyUsage = JSON.parse(raw);
      if (parsed && parsed.date === today && parsed.models) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[GeminiQuotaService] Failed to read daily usage from storage:", err);
  }

  const freshUsage: GeminiDailyUsage = {
    date: today,
    models: {},
  };
  try {
    await AsyncStorage.setItem(GEMINI_USAGE_STORAGE_KEY, JSON.stringify(freshUsage));
  } catch (err) {
    console.warn("[GeminiQuotaService] Failed to initialize fresh daily usage:", err);
  }
  return freshUsage;
}

/**
 * Checks if a specific model has exceeded its usage limit today.
 */
export async function isModelRateLimitedToday(
  model: string,
  referenceDate?: Date
): Promise<boolean> {
  const usage = await getDailyGeminiUsage(referenceDate);
  const normalized = model.toLowerCase().trim();
  return Boolean(usage.models[normalized]?.isRateLimited);
}

/**
 * Flags a model as rate-limited for today in AsyncStorage.
 */
export async function markModelRateLimited(
  model: string,
  errorMessage?: string,
  referenceDate?: Date
): Promise<void> {
  const today = getTodayDateString(referenceDate);
  const usage = await getDailyGeminiUsage(referenceDate);
  const normalized = model.toLowerCase().trim();
  const existing = usage.models[normalized] || { requestCount: 0, isRateLimited: false };

  usage.date = today;
  usage.models[normalized] = {
    ...existing,
    isRateLimited: true,
    rateLimitedAt: new Date().toISOString(),
    lastError: errorMessage,
  };

  try {
    await AsyncStorage.setItem(GEMINI_USAGE_STORAGE_KEY, JSON.stringify(usage));
  } catch (err) {
    console.warn("[GeminiQuotaService] Failed to save rate-limit flag:", err);
  }
}

/**
 * Records a successful request for a model today, incrementing request count and updating lastUsedAt.
 */
export async function recordModelSuccess(
  model: string,
  referenceDate?: Date
): Promise<void> {
  const today = getTodayDateString(referenceDate);
  const usage = await getDailyGeminiUsage(referenceDate);
  const normalized = model.toLowerCase().trim();
  const existing = usage.models[normalized] || { requestCount: 0, isRateLimited: false };

  usage.date = today;
  usage.models[normalized] = {
    ...existing,
    requestCount: (existing.requestCount || 0) + 1,
    lastUsedAt: new Date().toISOString(),
  };

  try {
    await AsyncStorage.setItem(GEMINI_USAGE_STORAGE_KEY, JSON.stringify(usage));
  } catch (err) {
    console.warn("[GeminiQuotaService] Failed to record model success:", err);
  }
}

/**
 * Returns the ordered list of Gemini models that have NOT been rate-limited today.
 * The preferredModel (if provided) is prioritized first, followed by the remaining fallback models.
 */
export async function getAvailableGeminiModels(
  preferredModel?: string,
  referenceDate?: Date
): Promise<string[]> {
  const usage = await getDailyGeminiUsage(referenceDate);
  const preferred = preferredModel ? preferredModel.toLowerCase().trim() : "gemini-3.6-flash";

  // Build candidate chain without duplicates
  const candidateChain: string[] = [];
  if (preferred) candidateChain.push(preferred);
  for (const m of GEMINI_FALLBACK_MODELS) {
    if (!candidateChain.includes(m)) {
      candidateChain.push(m);
    }
  }

  // Filter out models that are flagged as rate-limited today
  const available = candidateChain.filter((m) => !usage.models[m]?.isRateLimited);
  return available;
}

/**
 * Returns the active Gemini model (first non-rate-limited model in fallback order),
 * or the preferred model if all have exceeded limits.
 */
export async function getActiveGeminiModelInfo(
  preferredModel?: string,
  referenceDate?: Date
): Promise<{
  activeModel: string;
  isFallback: boolean;
  availableCount: number;
  totalModels: number;
  rateLimitedModels: string[];
}> {
  const usage = await getDailyGeminiUsage(referenceDate);
  const preferred = preferredModel ? preferredModel.toLowerCase().trim() : "gemini-3.6-flash";
  const available = await getAvailableGeminiModels(preferred, referenceDate);
  const rateLimited = Object.entries(usage.models)
    .filter(([_, rec]) => rec.isRateLimited)
    .map(([m]) => m);

  const activeModel = available.length > 0 ? available[0] : preferred;
  return {
    activeModel,
    isFallback: activeModel !== preferred,
    availableCount: available.length,
    totalModels: GEMINI_FALLBACK_MODELS.length,
    rateLimitedModels: rateLimited,
  };
}

/**
 * Manually resets all rate-limit flags and usage stats for today.
 */
export async function resetDailyGeminiUsage(referenceDate?: Date): Promise<void> {
  const today = getTodayDateString(referenceDate);
  const fresh: GeminiDailyUsage = {
    date: today,
    models: {},
  };
  await AsyncStorage.setItem(GEMINI_USAGE_STORAGE_KEY, JSON.stringify(fresh));
}

/**
 * Inspects an HTTP status code, API error response, and error message to determine
 * whether the failure was caused by a rate limit / quota exhaustion.
 */
export function isRateLimitError(
  status?: number,
  errorObj?: any,
  message?: string
): boolean {
  if (status === 429) return true;
  if (errorObj?.code === 429) return true;
  if (errorObj?.status === "RESOURCE_EXHAUSTED") return true;

  const combined = `${message || ""} ${errorObj?.message || ""} ${JSON.stringify(errorObj || {})}`.toLowerCase();
  if (
    combined.includes("resource_exhausted") ||
    combined.includes("quota") ||
    combined.includes("rate limit") ||
    combined.includes("too many requests") ||
    combined.includes("exceeded your current quota") ||
    combined.includes("429")
  ) {
    return true;
  }

  return false;
}
