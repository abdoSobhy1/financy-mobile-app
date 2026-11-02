import AsyncStorage from "@react-native-async-storage/async-storage";
import { DatabaseManager } from "../../../infrastructure/database";
import { offlineFirstSync } from "../../../infrastructure/sync/OfflineFirstSync";
import { normalizeSyncTimestamp } from "../../../shared/utils/syncTimestamp";
import { DEFAULT_SMS_CONFIG, saveSmsConfig, SmsDetectorConfig } from "./smsConfigService";

export function validateSmsPreferences(value: any): { config: SmsDetectorConfig; enabled: boolean } {
  const config = value?.config;
  const lists = ["bankSenders", "incomeKeywords", "expenseKeywords", "atmKeywords", "currencyKeywords"] as const;
  if (!config || lists.some((key) => !Array.isArray(config[key]) || config[key].some((item: unknown) => typeof item !== "string")) ||
    typeof config.ignoreAtmWithdrawals !== "boolean" || typeof value.enabled !== "boolean") {
    throw new Error("Invalid SMS detector settings");
  }
  return { config, enabled: value.enabled };
}

export class SmsSettingsRepository {
  private db = DatabaseManager.getInstance();

  async migrateLegacy(): Promise<void> {
    const database = this.db.getDatabase();
    if (await database.getFirstAsync("SELECT id FROM sms_settings WHERE id = 'default'")) return;
    const [raw, enabled] = await Promise.all([
      AsyncStorage.getItem("@financy_sms_detector_config_v1"), AsyncStorage.getItem("sms_detection_enabled"),
    ]);
    if (!raw && enabled === null) return;
    const preferences = validateSmsPreferences({ config: raw ? JSON.parse(raw) : DEFAULT_SMS_CONFIG, enabled: enabled !== "false" });
    // Legacy data has no edit time. An existing cloud copy must win over it.
    await database.runAsync(`INSERT OR IGNORE INTO sms_settings
      (id, config, enabled, updated_at, sync_updated_at, sync_status) VALUES ('default', ?, ?, 0, 0, 'pending')`,
    [JSON.stringify(preferences.config), preferences.enabled ? 1 : 0]);
  }

  async save(config: SmsDetectorConfig, enabled: boolean): Promise<void> {
    if (!this.db.isReady()) return; // Background parser can start before the database.
    const preferences = validateSmsPreferences({ config, enabled });
    const now = Date.now();
    await this.db.getDatabase().runAsync(`INSERT INTO sms_settings
      (id, config, enabled, updated_at, sync_updated_at, sync_status) VALUES ('default', ?, ?, ?, ?, 'pending')
      ON CONFLICT(id) DO UPDATE SET config=excluded.config, enabled=excluded.enabled,
        updated_at=excluded.updated_at, sync_updated_at=excluded.sync_updated_at, sync_status='pending'`,
    [JSON.stringify(config), enabled ? 1 : 0, now, now]);
    await offlineFirstSync.logOperation("sms_settings", "default", "update", { ...preferences, updatedAt: now });
  }

  async applyRemote(data: any): Promise<void> {
    const preferences = validateSmsPreferences(data);
    const timestamp = normalizeSyncTimestamp(data.updatedAt ?? data.syncUpdatedAt);
    await this.db.getDatabase().runAsync(`INSERT INTO sms_settings
      (id, config, enabled, updated_at, sync_updated_at, sync_status) VALUES ('default', ?, ?, ?, ?, 'synced')
      ON CONFLICT(id) DO UPDATE SET config=excluded.config, enabled=excluded.enabled,
        updated_at=excluded.updated_at, sync_updated_at=excluded.sync_updated_at, sync_status='synced'`,
    [JSON.stringify(preferences.config), preferences.enabled ? 1 : 0, timestamp, timestamp]);
    await this.refreshCache();
  }

  async refreshCache(): Promise<void> {
    const row = await this.db.getDatabase().getFirstAsync<{ config: string; enabled: number }>(
      "SELECT config, enabled FROM sms_settings WHERE id = 'default'",
    );
    if (!row) return;
    await AsyncStorage.setItem("sms_detection_enabled", row.enabled ? "true" : "false");
    await saveSmsConfig(JSON.parse(row.config), { skipSync: true });
  }
}
