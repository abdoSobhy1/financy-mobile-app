/**
 * SMS Config Service
 *
 * Manages user-configurable rules for bank SMS detection and parsing:
 * - Bank senders whitelist
 * - Income detection keywords
 * - Expense detection keywords
 * - ATM / cash withdrawal keywords
 * - Currency identifiers
 * - Toggle for ignoring ATM withdrawals
 *
 * Persists to AsyncStorage and keeps an in-memory cache for synchronous parser calls.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export interface SmsDetectorConfig {
  bankSenders: string[];
  incomeKeywords: string[];
  expenseKeywords: string[];
  atmKeywords: string[];
  currencyKeywords: string[];
  ignoreAtmWithdrawals: boolean;
}

export const DEFAULT_SMS_CONFIG: Readonly<SmsDetectorConfig> = Object.freeze({
  bankSenders: [
    "BANK-ALAHLY",
    "BANKALAHLY",
    "ALAHLY",
    "AHLY",
    "NBE",
    "NBE-SMS",
    "NBE-ALERT",
    "CIB",
    "CIBEGYPT",
    "BANQUEMISR",
    "BM",
    "QNB",
    "HSBC",
    "ALEXBANK",
    "BDC",
    "EGBANK",
    "INSTAPAY",
    "FAWRY",
    "VODAFONE",
    "TELDA",
    "KLIVVR",
  ],
  incomeKeywords: [
    "تم إضافة تحويل",
    "تحويل وارد",
    "credited",
    "deposit",
    "received",
    "income",
    "salary",
    "إيداع",
    "وارد",
  ],
  expenseKeywords: [
    "تم تنفيذ تحويل",
    "تم خصم",
    "خصم",
    "purchase",
    "شراء",
    "دفع",
    "paid",
    "debit",
    "withdrawal",
  ],
  atmKeywords: [
    "ATM",
    "تم سحب",
    "عملية سحب",
    "سحب نقدي",
    "سحب كاش",
    "صراف آلي",
    "صراف الي",
    "ماكينة الصراف",
    "ماكينة صراف",
    "cash withdrawal",
    "atm withdrawal",
  ],
  currencyKeywords: [
    "EGP",
    "LE",
    "جم",
    "جنيه",
    "USD",
    "EUR",
    "SAR",
    "AED",
  ],
  ignoreAtmWithdrawals: true,
});

const SMS_CONFIG_STORAGE_KEY = "@financy_sms_detector_config_v1";

// In-memory cache for ultra-fast, synchronous parser lookups
let cachedConfig: SmsDetectorConfig = {
  bankSenders: [...DEFAULT_SMS_CONFIG.bankSenders],
  incomeKeywords: [...DEFAULT_SMS_CONFIG.incomeKeywords],
  expenseKeywords: [...DEFAULT_SMS_CONFIG.expenseKeywords],
  atmKeywords: [...DEFAULT_SMS_CONFIG.atmKeywords],
  currencyKeywords: [...DEFAULT_SMS_CONFIG.currencyKeywords],
  ignoreAtmWithdrawals: DEFAULT_SMS_CONFIG.ignoreAtmWithdrawals,
};

let isInitialized = false;
const configListeners = new Set<(config: SmsDetectorConfig) => void>();

export function subscribeSmsConfig(listener: (config: SmsDetectorConfig) => void): () => void {
  configListeners.add(listener);
  return () => { configListeners.delete(listener); };
}

/**
 * Returns the currently cached configuration synchronously.
 */
export function getCachedConfig(): SmsDetectorConfig {
  return cachedConfig;
}

/**
 * Loads the stored SMS configuration from AsyncStorage or defaults if not found.
 */
export async function getSmsConfig(): Promise<SmsDetectorConfig> {
  try {
    const raw = await AsyncStorage.getItem(SMS_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SmsDetectorConfig>;
      cachedConfig = {
        bankSenders: Array.isArray(parsed.bankSenders)
          ? parsed.bankSenders
          : [...DEFAULT_SMS_CONFIG.bankSenders],
        incomeKeywords: Array.isArray(parsed.incomeKeywords)
          ? parsed.incomeKeywords
          : [...DEFAULT_SMS_CONFIG.incomeKeywords],
        expenseKeywords: Array.isArray(parsed.expenseKeywords)
          ? parsed.expenseKeywords
          : [...DEFAULT_SMS_CONFIG.expenseKeywords],
        atmKeywords: Array.isArray(parsed.atmKeywords)
          ? parsed.atmKeywords
          : [...DEFAULT_SMS_CONFIG.atmKeywords],
        currencyKeywords: Array.isArray(parsed.currencyKeywords)
          ? parsed.currencyKeywords
          : [...DEFAULT_SMS_CONFIG.currencyKeywords],
        ignoreAtmWithdrawals: typeof parsed.ignoreAtmWithdrawals === "boolean"
          ? parsed.ignoreAtmWithdrawals
          : DEFAULT_SMS_CONFIG.ignoreAtmWithdrawals,
      };
    } else {
      cachedConfig = {
        bankSenders: [...DEFAULT_SMS_CONFIG.bankSenders],
        incomeKeywords: [...DEFAULT_SMS_CONFIG.incomeKeywords],
        expenseKeywords: [...DEFAULT_SMS_CONFIG.expenseKeywords],
        atmKeywords: [...DEFAULT_SMS_CONFIG.atmKeywords],
        currencyKeywords: [...DEFAULT_SMS_CONFIG.currencyKeywords],
        ignoreAtmWithdrawals: DEFAULT_SMS_CONFIG.ignoreAtmWithdrawals,
      };
    }
  } catch (error) {
    console.warn("[SmsConfigService] Failed to load SMS config, using defaults:", error);
  }
  isInitialized = true;
  return cachedConfig;
}

/**
 * Saves updated configuration to AsyncStorage and refreshes the in-memory cache.
 */
export async function saveSmsConfig(config: SmsDetectorConfig, options?: { skipSync?: boolean }): Promise<void> {
  try {
    cachedConfig = {
      bankSenders: [...config.bankSenders],
      incomeKeywords: [...config.incomeKeywords],
      expenseKeywords: [...config.expenseKeywords],
      atmKeywords: [...config.atmKeywords],
      currencyKeywords: [...config.currencyKeywords],
      ignoreAtmWithdrawals: config.ignoreAtmWithdrawals,
    };
    await AsyncStorage.setItem(SMS_CONFIG_STORAGE_KEY, JSON.stringify(cachedConfig));
    configListeners.forEach((listener) => listener(cachedConfig));
    if (!options?.skipSync) {
      const { SmsSettingsRepository } = await import("./smsSettingsRepository");
      const enabled = await AsyncStorage.getItem("sms_detection_enabled");
      await new SmsSettingsRepository().save(cachedConfig, enabled !== "false");
    }
  } catch (error) {
    console.error("[SmsConfigService] Failed to save SMS config:", error);
    throw error;
  }
}

/**
 * Resets configuration to the hardcoded application defaults.
 */
export async function resetSmsConfigToDefaults(): Promise<SmsDetectorConfig> {
  const freshDefaults: SmsDetectorConfig = {
    bankSenders: [...DEFAULT_SMS_CONFIG.bankSenders],
    incomeKeywords: [...DEFAULT_SMS_CONFIG.incomeKeywords],
    expenseKeywords: [...DEFAULT_SMS_CONFIG.expenseKeywords],
    atmKeywords: [...DEFAULT_SMS_CONFIG.atmKeywords],
    currencyKeywords: [...DEFAULT_SMS_CONFIG.currencyKeywords],
    ignoreAtmWithdrawals: DEFAULT_SMS_CONFIG.ignoreAtmWithdrawals,
  };
  await saveSmsConfig(freshDefaults);
  return freshDefaults;
}

// Auto-initialize asynchronously at import time
getSmsConfig().catch((err) =>
  console.warn("[SmsConfigService] Auto-init failed:", err)
);
