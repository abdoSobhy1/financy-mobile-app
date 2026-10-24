import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILE_STORAGE_KEY = "financy_user_profile_v1";

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
};
