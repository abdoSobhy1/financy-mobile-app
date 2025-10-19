import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_ID_KEY = "@financy/device_id";

let cachedDeviceId: string | null = null;

/**
 * Get or generate a persistent device ID that remains constant across app restarts
 * This is used to track which device made changes to avoid sync loops
 */
export async function getDeviceId(): Promise<string> {
  // Return cached value if available
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  try {
    // Try to get existing device ID
    const existingId = await AsyncStorage.getItem(DEVICE_ID_KEY);

    if (existingId) {
      cachedDeviceId = existingId;
      return existingId;
    }

    // Generate new device ID if none exists
    const newDeviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store for future use
    await AsyncStorage.setItem(DEVICE_ID_KEY, newDeviceId);

    cachedDeviceId = newDeviceId;
    return newDeviceId;
  } catch (error) {
    console.warn("Failed to get/set device ID from AsyncStorage:", error);

    // Fallback to session-based ID if storage fails
    const fallbackId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    cachedDeviceId = fallbackId;
    return fallbackId;
  }
}

/**
 * Clear the cached device ID (for testing purposes)
 */
export function clearDeviceIdCache(): void {
  cachedDeviceId = null;
}
