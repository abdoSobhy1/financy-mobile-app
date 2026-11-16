import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../../../shared/types";

export interface SessionData {
  user: User;
  lastActivity: number;
  expiresAt: number;
}

export const AUTH_SESSION_KEY = "financy_user_session";
export const AUTH_LAST_USER_KEY = "financy_last_user_id";
export const AUTH_GUEST_DATA_PENDING_KEY = "financy_guest_data_pending_migration_v1";
export const AUTH_SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

/**
 * Retrieves the stored session data from AsyncStorage if valid and not expired.
 */
export async function getStoredSession(): Promise<SessionData | null> {
  try {
    const sessionJson = await AsyncStorage.getItem(AUTH_SESSION_KEY);
    if (!sessionJson) return null;

    const sessionData: SessionData = JSON.parse(sessionJson);
    const now = Date.now();

    if (now > sessionData.expiresAt) {
      await AsyncStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }

    return sessionData;
  } catch (error) {
    console.error("Failed to get stored session:", error);
    return null;
  }
}

/**
 * Returns the currently stored user from session, or null if unauthenticated.
 */
export async function getStoredUser(): Promise<User | null> {
  const session = await getStoredSession();
  return session?.user || null;
}

/**
 * Returns the current active user ID from session or last remembered user ID.
 */
export async function getCurrentSessionUserId(): Promise<string | null> {
  const session = await getStoredSession();
  if (session?.user?.uid) {
    return session.user.uid;
  }
  const lastUserId = await AsyncStorage.getItem(AUTH_LAST_USER_KEY);
  return lastUserId || null;
}

/**
 * Checks whether the current session is allowed to use Firebase cloud sync.
 * Guest and anonymous sessions return false.
 */
export async function isCurrentSessionCloudAllowed(): Promise<boolean> {
  const user = await getStoredUser();
  if (!user || user.isGuest || user.uid === "guest") {
    return false;
  }
  return true;
}

/**
 * Checks whether default data has already been seeded for this user to avoid resurrecting deleted records.
 */
export async function isSessionSeeded(
  feature: "categories" | "wallets",
  userId?: string,
): Promise<boolean> {
  try {
    const uid = userId || (await getCurrentSessionUserId()) || "guest";
    const key = `financy_${feature}_seeded_v1_${uid}`;
    const value = await AsyncStorage.getItem(key);
    return value === "true";
  } catch {
    return false;
  }
}

/**
 * Marks a feature as seeded for the given user so defaults will not be re-inserted.
 */
export async function markSessionSeeded(
  feature: "categories" | "wallets",
  userId?: string,
): Promise<void> {
  try {
    const uid = userId || (await getCurrentSessionUserId()) || "guest";
    const key = `financy_${feature}_seeded_v1_${uid}`;
    await AsyncStorage.setItem(key, "true");
  } catch (e) {
    console.warn(`Failed to set ${feature} seeded key:`, e);
  }
}
