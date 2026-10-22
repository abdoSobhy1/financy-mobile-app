import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const PROFILE_STORAGE_KEY = "financy_user_profile_v1";
const APP_LOCK_PIN_HASH_KEY = "financy_app_lock_pin_hash_v1";
const APP_LOCK_ENABLED_KEY = "financy_app_lock_enabled_v1";

export interface LocalUserProfile {
  displayName: string;
  email: string;
  avatarColor: string;
  monthlyIncomeTarget?: number;
}

const DEFAULT_PROFILE: LocalUserProfile = {
  displayName: "Financy User",
  email: "",
  avatarColor: "#10B981",
};

type LockStateListener = (enabled: boolean) => void;
const listeners = new Set<LockStateListener>();

export const securityService = {
  // ── Profile Management ──────────────────────────────────────────────
  async getProfile(): Promise<LocalUserProfile> {
    try {
      const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) return DEFAULT_PROFILE;
      return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_PROFILE;
    }
  },

  async saveProfile(profile: Partial<LocalUserProfile>): Promise<LocalUserProfile> {
    const current = await this.getProfile();
    const updated: LocalUserProfile = {
      ...current,
      ...profile,
    };
    await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },

  // ── PIN / App Lock Management ───────────────────────────────────────
  async hashPin(pin: string): Promise<string> {
    return Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `financy_pin_salt_${pin.trim()}`,
    );
  },

  async isAppLockEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(APP_LOCK_ENABLED_KEY);
      const hash = await AsyncStorage.getItem(APP_LOCK_PIN_HASH_KEY);
      return enabled === "true" && Boolean(hash);
    } catch {
      return false;
    }
  },

  async setAppLockPin(pin: string): Promise<void> {
    const hash = await this.hashPin(pin);
    await AsyncStorage.setItem(APP_LOCK_PIN_HASH_KEY, hash);
    await AsyncStorage.setItem(APP_LOCK_ENABLED_KEY, "true");
    listeners.forEach((cb) => cb(true));
  },

  async verifyAppLockPin(pin: string): Promise<boolean> {
    try {
      const storedHash = await AsyncStorage.getItem(APP_LOCK_PIN_HASH_KEY);
      if (!storedHash) return true;
      const candidateHash = await this.hashPin(pin);
      return storedHash === candidateHash;
    } catch {
      return false;
    }
  },

  async disableAppLock(): Promise<void> {
    await AsyncStorage.setItem(APP_LOCK_ENABLED_KEY, "false");
    await AsyncStorage.removeItem(APP_LOCK_PIN_HASH_KEY);
    listeners.forEach((cb) => cb(false));
  },

  subscribeLockChanges(listener: LockStateListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
