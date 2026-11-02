import { getDeviceId } from "./deviceId";

/**
 * Add device tracking metadata to any data object
 * This ensures all database operations include device information for sync loop prevention
 */
export async function addDeviceTracking<T extends Record<string, any>>(data: T): Promise<T & { lastModifiedBy: string; lastModifiedAt: number }> {
  const deviceId = await getDeviceId();
  const timestamp = Date.now();

  return {
    ...data,
    lastModifiedBy: deviceId,
    lastModifiedAt: timestamp,
  };
}

/**
 * Check if data has device tracking information
 */
export function hasDeviceTracking(data: any): boolean {
  return !!(data && data.lastModifiedBy && data.lastModifiedAt);
}

/**
 * Get device tracking info from data
 */
export function getDeviceTrackingInfo(data: any): { deviceId: string; timestamp: number } | null {
  if (!hasDeviceTracking(data)) {
    return null;
  }

  return {
    deviceId: data.lastModifiedBy,
    timestamp: data.lastModifiedAt,
  };
}
