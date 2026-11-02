function assert(condition: boolean, message?: string) {
  if (!condition) {
    throw new Error(`Assertion failed! ${message || ""}`);
  }
}

function assertStrictEqual(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed! Expected: ${expected}, Got: ${actual}. ${message || ""}`);
  }
}

import {
  getTodayDateString,
  getDailyGeminiUsage,
  isModelRateLimitedToday,
  markModelRateLimited,
  recordModelSuccess,
  getAvailableGeminiModels,
  getActiveGeminiModelInfo,
  resetDailyGeminiUsage,
  isRateLimitError,
  GEMINI_FALLBACK_MODELS,
  GEMINI_USAGE_STORAGE_KEY,
} from "../../src/infrastructure/ai/geminiQuotaService";
import AsyncStorage from "@react-native-async-storage/async-storage";

async function runGeminiQuotaTests() {
  console.log("Running geminiQuotaService unit tests...\n");

  const day1 = new Date("2026-10-29T10:00:00Z");
  const day2 = new Date("2026-10-30T10:00:00Z");

  await AsyncStorage.removeItem(GEMINI_USAGE_STORAGE_KEY);

  // Test 1: getTodayDateString produces YYYY-MM-DD
  {
    const str = getTodayDateString(day1);
    assertStrictEqual(str, "2026-10-29", "Test 1: Date formatting failed");
    console.log("✓ Test 1: Date formatting passed");
  }

  // Test 2: getDailyGeminiUsage initializes fresh structure
  {
    const usage = await getDailyGeminiUsage(day1);
    assertStrictEqual(usage.date, "2026-10-29", "Test 2: Date mismatch");
    assertStrictEqual(Object.keys(usage.models).length, 0, "Test 2: Expected empty models");
    console.log("✓ Test 2: Fresh daily usage initialization passed");
  }

  // Test 3: recordModelSuccess tracks counts
  {
    await recordModelSuccess("gemini-3.6-flash", day1);
    await recordModelSuccess("gemini-3.6-flash", day1);

    const usage = await getDailyGeminiUsage(day1);
    assertStrictEqual(usage.models["gemini-3.6-flash"].requestCount, 2, "Test 3: Count should be 2");
    assertStrictEqual(usage.models["gemini-3.6-flash"].isRateLimited, false, "Test 3: Should not be limited");
    assert(Boolean(usage.models["gemini-3.6-flash"].lastUsedAt), "Test 3: lastUsedAt should be defined");
    console.log("✓ Test 3: Request count and lastUsedAt tracking passed");
  }

  // Test 4: markModelRateLimited flags model
  {
    const wasLimited = await isModelRateLimitedToday("gemini-3.6-flash", day1);
    assertStrictEqual(wasLimited, false, "Test 4: Should not be limited yet");

    await markModelRateLimited("gemini-3.6-flash", "Quota exceeded (429)", day1);

    const isLimitedNow = await isModelRateLimitedToday("gemini-3.6-flash", day1);
    assertStrictEqual(isLimitedNow, true, "Test 4: Model should be flagged rate-limited");
    const usage = await getDailyGeminiUsage(day1);
    assertStrictEqual(usage.models["gemini-3.6-flash"].isRateLimited, true, "Test 4: flag mismatch");
    assertStrictEqual(usage.models["gemini-3.6-flash"].lastError, "Quota exceeded (429)", "Test 4: lastError mismatch");
    console.log("✓ Test 4: Rate limit flagging and error message persistence passed");
  }

  // Test 5: getAvailableGeminiModels excludes rate-limited models and promotes next in chain
  {
    const after36 = await getAvailableGeminiModels("gemini-3.6-flash", day1);
    assert(!after36.includes("gemini-3.6-flash"), "Test 5: 3.6-flash must be excluded");
    assertStrictEqual(after36[0], "gemini-3.5-flash-lite", "Test 5: 3.5-flash-lite should be next candidate");
    assertStrictEqual(after36[1], "gemini-3.1-flash-lite", "Test 5: 3.1-flash-lite should be 2nd candidate");

    // Also rate-limit 3.5-flash-lite
    await markModelRateLimited("gemini-3.5-flash-lite", "429", day1);
    const after35 = await getAvailableGeminiModels("gemini-3.6-flash", day1);
    assert(!after35.includes("gemini-3.6-flash"), "Test 5: 3.6-flash excluded");
    assert(!after35.includes("gemini-3.5-flash-lite"), "Test 5: 3.5-flash-lite excluded");
    assertStrictEqual(after35[0], "gemini-3.1-flash-lite", "Test 5: 3.1-flash-lite promoted to candidate");
    console.log("✓ Test 5: Fallback promotion (3.6 -> 3.5-lite -> 3.1-lite) passed");
  }

  // Test 6: getActiveGeminiModelInfo returns status
  {
    const info = await getActiveGeminiModelInfo("gemini-3.6-flash", day1);
    assertStrictEqual(info.activeModel, "gemini-3.1-flash-lite", "Test 6: Active model mismatch");
    assertStrictEqual(info.isFallback, true, "Test 6: Should indicate fallback");
    assert(info.rateLimitedModels.includes("gemini-3.6-flash"), "Test 6: rateLimitedModels missing 3.6");
    assert(info.rateLimitedModels.includes("gemini-3.5-flash-lite"), "Test 6: rateLimitedModels missing 3.5");
    assertStrictEqual(info.availableCount, GEMINI_FALLBACK_MODELS.length - 2, "Test 6: Count mismatch");
    console.log("✓ Test 6: getActiveGeminiModelInfo passed");
  }

  // Test 7: Automatic day change reset
  {
    // On Day 1: 3.6 is limited
    assertStrictEqual(await isModelRateLimitedToday("gemini-3.6-flash", day1), true, "Test 7: Limited on Day 1");

    // On Day 2: Day change reset!
    const day2Usage = await getDailyGeminiUsage(day2);
    assertStrictEqual(day2Usage.date, "2026-10-30", "Test 7: Day 2 date mismatch");
    assertStrictEqual(day2Usage.models["gemini-3.6-flash"], undefined, "Test 7: Model record reset");
    assertStrictEqual(await isModelRateLimitedToday("gemini-3.6-flash", day2), false, "Test 7: Not limited on Day 2");

    const availableDay2 = await getAvailableGeminiModels("gemini-3.6-flash", day2);
    assertStrictEqual(availableDay2[0], "gemini-3.6-flash", "Test 7: 3.6-flash restored to primary on Day 2");
    console.log("✓ Test 7: Next-day automatic quota reset passed");
  }

  // Test 8: Manual resetDailyGeminiUsage
  {
    await markModelRateLimited("gemini-3.6-flash", "429", day1);
    assertStrictEqual(await isModelRateLimitedToday("gemini-3.6-flash", day1), true, "Test 8: Limited");

    await resetDailyGeminiUsage(day1);
    assertStrictEqual(await isModelRateLimitedToday("gemini-3.6-flash", day1), false, "Test 8: Cleared");
    console.log("✓ Test 8: Manual resetDailyGeminiUsage passed");
  }

  // Test 9: isRateLimitError detection
  {
    assertStrictEqual(isRateLimitError(429), true, "Test 9.1: HTTP 429");
    assertStrictEqual(isRateLimitError(200, { status: "RESOURCE_EXHAUSTED" }), true, "Test 9.2: RESOURCE_EXHAUSTED");
    assertStrictEqual(isRateLimitError(500, null, "Resource has been exhausted (check quota)"), true, "Test 9.3: Quota in text");
    assertStrictEqual(isRateLimitError(400, null, "Rate limit exceeded"), true, "Test 9.4: Rate limit in text");
    assertStrictEqual(isRateLimitError(500, null, "Internal server error"), false, "Test 9.5: Normal 500");
    console.log("✓ Test 9: isRateLimitError detection passed");
  }

  console.log("\nAll geminiQuotaService unit tests passed successfully! 🚀\n");
}

runGeminiQuotaTests().catch((err) => {
  console.error("geminiQuotaService test failed:", err);
  process.exit(1);
});
