import AsyncStorage from "@react-native-async-storage/async-storage";
import { Dimensions, NativeModules, Platform } from "react-native";
import * as Crypto from "expo-crypto";

const DEVICE_ID_KEY = "@financy/device_id";

let cachedDeviceId: string | null = null;
let cachedHardwareIds: string[] | null = null;

/**
 * Get or generate a persistent device ID that remains constant across app restarts
 * This is used to track which device made changes to avoid sync loops
 */
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  try {
    const existingId = await AsyncStorage.getItem(DEVICE_ID_KEY);

    if (existingId) {
      cachedDeviceId = existingId;
      return existingId;
    }

    const hwIds = await getPersistentDeviceKeys();
    const newDeviceId = hwIds[0] || `device_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    await AsyncStorage.setItem(DEVICE_ID_KEY, newDeviceId);

    cachedDeviceId = newDeviceId;
    return newDeviceId;
  } catch (error) {
    console.warn("Failed to get/set device ID from AsyncStorage:", error);

    const fallbackId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    cachedDeviceId = fallbackId;
    return fallbackId;
  }
}

/**
 * Returns deterministic hardware/OS identifiers that survive app uninstall & reinstall.
 * - Includes Android's Settings.Secure.ANDROID_ID (when native module is available)
 * - Includes a deterministic SHA-256 hardware/build fingerprint so it works even without a native rebuild
 */
export async function getPersistentDeviceKeys(): Promise<string[]> {
  if (cachedHardwareIds && cachedHardwareIds.length > 0) {
    return cachedHardwareIds;
  }

  const keys: string[] = [];

  // 1. Hardware ANDROID_ID via native module (survives app uninstall/reinstall on Android)
  if (Platform.OS === "android") {
    try {
      const androidId: string | undefined =
        await NativeModules.DeviceIdModule?.getAndroidId?.();
      if (androidId && androidId.trim().length > 4) {
        keys.push(`hw_aid_${androidId.trim()}`);
      }
    } catch {
      // Native module not yet compiled in current binary; fallback below handles it
    }
  }

  // 2. Deterministic hardware/OS build fingerprint (survives app uninstall/reinstall without native rebuild)
  try {
    const constants: Record<string, any> = (Platform as any).constants || {};
    const screen = Dimensions.get("screen");
    const minDim = Math.min(Math.round(screen.width), Math.round(screen.height));
    const maxDim = Math.max(Math.round(screen.width), Math.round(screen.height));

    const rawFingerprint = [
      Platform.OS,
      constants.Brand || "",
      constants.Manufacturer || "",
      constants.Model || "",
      constants.Fingerprint || "",
      constants.Release || "",
      constants.Serial || "",
      `${minDim}x${maxDim}@${screen.scale}`,
    ].join("|");

    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawFingerprint,
    );
    keys.push(`hw_fp_${digest.slice(0, 32)}`);
  } catch (err) {
    console.warn("Failed to compute hardware fingerprint:", err);
  }

  if (keys.length === 0) {
    const fallback = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (fallback) {
      keys.push(fallback);
    }
  }

  cachedHardwareIds = keys;
  return keys;
}

/**
 * Clear the cached device ID (for testing purposes)
 */
export function clearDeviceIdCache(): void {
  cachedDeviceId = null;
  cachedHardwareIds = null;
}
