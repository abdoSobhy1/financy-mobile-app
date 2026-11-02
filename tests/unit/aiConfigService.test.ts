import assert from "node:assert/strict";
import { clearCustomAIConfig, getAIConfig, saveAIConfig } from "../../src/infrastructure/ai/aiConfigService";

const asyncStorage = require("@react-native-async-storage/async-storage").default;
const secureStore = require("expo-secure-store");
const configKey = "@financy_ai_config";
const secretKey = "@financy_ai_provider_key";

async function run() {
  console.log("Running AI key storage tests...");
  await clearCustomAIConfig();

  const personalKey = "test-provider-key-not-for-async-storage";
  await saveAIConfig({ provider: "openai", apiKey: personalKey, model: "gpt-4o-mini" });

  const metadata = JSON.parse(await asyncStorage.getItem(configKey));
  assert.equal(metadata.apiKey, undefined, "AsyncStorage contains only provider metadata");
  assert.equal(await secureStore.getItemAsync(secretKey), personalKey);
  assert.deepEqual(await getAIConfig(), {
    provider: "openai",
    apiKey: personalKey,
    model: "gpt-4o-mini",
  });

  await asyncStorage.setItem(configKey, JSON.stringify({
    provider: "gemini",
    apiKey: "legacy-plaintext-key",
    model: "gemini-3.6-flash",
  }));
  await secureStore.deleteItemAsync(secretKey);
  await getAIConfig();

  const migratedMetadata = JSON.parse(await asyncStorage.getItem(configKey));
  assert.equal(migratedMetadata.apiKey, undefined, "Legacy plaintext key was removed from AsyncStorage");
  assert.equal(await secureStore.getItemAsync(secretKey), "legacy-plaintext-key");

  await clearCustomAIConfig();
  assert.equal(await asyncStorage.getItem(configKey), null);
  assert.equal(await secureStore.getItemAsync(secretKey), null);
  console.log("All AI key storage tests passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
