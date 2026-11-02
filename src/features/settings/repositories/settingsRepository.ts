import { DatabaseManager } from "../../../infrastructure/database";
import { Settings } from "../../../shared/types";
import { SettingsTable, transformSettings, toSettingsTable } from "../../../infrastructure/database/models";
import { offlineFirstSync } from "../../../infrastructure/sync/OfflineFirstSync";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authService } from "../../auth/services/authService";
import { normalizeSyncTimestamp } from "../../../shared/utils/syncTimestamp";

export class SettingsRepository {
  private db = DatabaseManager.getInstance();

  async getSettings(): Promise<Settings> {
    const database = this.db.getDatabase();
    const result = (await database.getFirstAsync("SELECT * FROM settings WHERE id = ?", ["default"])) as SettingsTable | null;

    if (!result) {
      // Create default settings if none exist
      return await this.createDefaultSettings();
    }

    return transformSettings(result);
  }

  async updateSettings(updates: Partial<Omit<Settings, "id" | "createdAt" | "updatedAt">>, options?: { skipSync?: boolean }): Promise<Settings> {
    const database = this.db.getDatabase();

    const setParts: string[] = ["updated_at = ?", "sync_updated_at = ?", "sync_status = ?"];
    const editTimestamp = options?.skipSync ? normalizeSyncTimestamp(updates.syncUpdatedAt) : Date.now();
    const params: any[] = [
      new Date(editTimestamp).toISOString(),
      editTimestamp,
      options?.skipSync ? "synced" : "pending",
    ];

    if (updates.billingPeriodStartDay !== undefined) {
      setParts.push("billing_period_start_day = ?");
      params.push(updates.billingPeriodStartDay);
    }

    if (updates.currency !== undefined) {
      setParts.push("currency = ?");
      params.push(updates.currency);
    }

    if (updates.firebaseSync !== undefined) {
      setParts.push("firebase_sync = ?");
      params.push(updates.firebaseSync ? 1 : 0);
    }

    if (updates.theme !== undefined) {
      setParts.push("theme = ?");
      params.push(updates.theme);
    }

    params.push("default");

    await database.runAsync(
      `
      UPDATE settings 
      SET ${setParts.join(", ")}
      WHERE id = ?
    `,
      params
    );

    // Log sync operation for Firebase sync
    const updatedSettings = await this.getSettings();
    if (!options?.skipSync) {
      await offlineFirstSync.logOperation("settings", "default", "update", updatedSettings);
    }

    return updatedSettings;
  }

  async updateBillingPeriodStartDay(day: number, options?: { skipSync?: boolean }): Promise<void> {
    if (day < 1 || day > 30) {
      throw new Error("Billing period start day must be between 1 and 30");
    }

    const database = this.db.getDatabase();
    await database.runAsync(
      `
      UPDATE settings 
      SET billing_period_start_day = ?, updated_at = ?, sync_updated_at = ?, sync_status = ?
      WHERE id = ?
    `,
      [day, new Date().toISOString(), Date.now(), "pending", "default"]
    );

    // Log sync operation for Firebase sync
    const updatedSettings = await this.getSettings();
    if (!options?.skipSync) {
      await offlineFirstSync.logOperation("settings", "default", "update", updatedSettings);
    }
  }

  async toggleFirebaseSync(): Promise<boolean> {
    const settings = await this.getSettings();
    const newSyncState = !settings.firebaseSync;

    await this.updateSettings({ firebaseSync: newSyncState });
    return newSyncState;
  }

  async updateCurrency(currency: string, options?: { skipSync?: boolean }): Promise<void> {
    const database = this.db.getDatabase();
    await database.runAsync(
      `
      UPDATE settings 
      SET currency = ?, updated_at = ?, sync_updated_at = ?, sync_status = ?
      WHERE id = ?
    `,
      [currency, new Date().toISOString(), Date.now(), "pending", "default"]
    );

    // Log sync operation for Firebase sync
    const updatedSettings = await this.getSettings();
    if (!options?.skipSync) {
      await offlineFirstSync.logOperation("settings", "default", "update", updatedSettings);
    }
  }

  async updateTheme(theme: "dark" | "light", options?: { skipSync?: boolean }): Promise<void> {
    const database = this.db.getDatabase();
    await database.runAsync(
      `
      UPDATE settings 
      SET theme = ?, updated_at = ?, sync_updated_at = ?, sync_status = ?
      WHERE id = ?
    `,
      [theme, new Date().toISOString(), Date.now(), "pending", "default"]
    );

    // Log sync operation for Firebase sync
    const updatedSettings = await this.getSettings();
    if (!options?.skipSync) {
      await offlineFirstSync.logOperation("settings", "default", "update", updatedSettings);
    }
  }

  private async createDefaultSettings(options?: { skipSync?: boolean }): Promise<Settings> {
    const database = this.db.getDatabase();
    const epoch = "1970-01-01T00:00:00.000Z";

    const defaultSettings: Settings = {
      id: "default",
      billingPeriodStartDay: 1,
      currency: "USD",
      firebaseSync: false,
      theme: "light",
      createdAt: epoch,
      updatedAt: epoch,
      syncUpdatedAt: 0,
      syncStatus: "synced",
    };

    const tableData = toSettingsTable(defaultSettings);

    await database.runAsync(
      `
      INSERT INTO settings (
        id, billing_period_start_day, currency, firebase_sync, theme, created_at, updated_at, sync_updated_at, deleted, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        defaultSettings.id,
        tableData.billing_period_start_day,
        tableData.currency,
        tableData.firebase_sync,
        tableData.theme,
        defaultSettings.createdAt,
        defaultSettings.updatedAt,
        0,
        tableData.deleted,
        "synced",
      ]
    );

    // Note: Creating initial default placeholder settings locally must NEVER queue
    // an overwrite to Firebase. Real user updates (via updateSettings/updateBillingPeriodStartDay)
    // will log their own operations.

    return defaultSettings;
  }

  async resetToDefaults(): Promise<Settings> {
    const database = this.db.getDatabase();
    const now = new Date().toISOString();

    await database.runAsync(
      `
      UPDATE settings 
      SET 
        billing_period_start_day = 1,
        currency = 'USD',
        firebase_sync = 0,
        theme = 'dark',
        updated_at = ?,
        sync_updated_at = ?,
        sync_status = ?
      WHERE id = ?
    `,
      [now, Date.now(), "pending", "default"]
    );

    // Log sync operation for Firebase sync
    const updatedSettings = await this.getSettings();
    await offlineFirstSync.logOperation("settings", "default", "update", updatedSettings);

    return updatedSettings;
  }

  async getCurrentBillingPeriod(): Promise<{ start: Date; end: Date }> {
    const settings = await this.getSettings();
    const today = new Date();
    const startDay = settings.billingPeriodStartDay || 1;

    let periodStart: Date;
    let periodEnd: Date;

    if (today.getDate() >= startDay) {
      // Current period started this month
      periodStart = new Date(today.getFullYear(), today.getMonth(), startDay);
      periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, startDay - 1);
    } else {
      // Current period started last month
      periodStart = new Date(today.getFullYear(), today.getMonth() - 1, startDay);
      periodEnd = new Date(today.getFullYear(), today.getMonth(), startDay - 1);
    }

    return { start: periodStart, end: periodEnd };
  }

  async getPreviousBillingPeriod(): Promise<{ start: Date; end: Date }> {
    const settings = await this.getSettings();
    const today = new Date();
    const startDay = settings.billingPeriodStartDay || 1;

    let periodStart: Date;
    let periodEnd: Date;

    if (today.getDate() >= startDay) {
      // Previous period was last month
      periodStart = new Date(today.getFullYear(), today.getMonth() - 1, startDay);
      periodEnd = new Date(today.getFullYear(), today.getMonth(), startDay - 1);
    } else {
      // Previous period was two months ago
      periodStart = new Date(today.getFullYear(), today.getMonth() - 2, startDay);
      periodEnd = new Date(today.getFullYear(), today.getMonth() - 1, startDay - 1);
    }

    return { start: periodStart, end: periodEnd };
  }

  async getNextBillingPeriod(): Promise<{ start: Date; end: Date }> {
    const settings = await this.getSettings();
    const today = new Date();
    const startDay = settings.billingPeriodStartDay || 1;

    let periodStart: Date;
    let periodEnd: Date;

    if (today.getDate() >= startDay) {
      // Next period starts next month
      periodStart = new Date(today.getFullYear(), today.getMonth() + 1, startDay);
      periodEnd = new Date(today.getFullYear(), today.getMonth() + 2, startDay - 1);
    } else {
      // Next period starts this month
      periodStart = new Date(today.getFullYear(), today.getMonth(), startDay);
      periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, startDay - 1);
    }

    return { start: periodStart, end: periodEnd };
  }

  /**
   * Store the per-account sync cursor separately from preference edit times.
   */
  async setLastSyncAttempt(timestamp: number): Promise<void> {
    const userId = await authService.requireUserIdAsync();
    await AsyncStorage.setItem(`financy_last_sync_attempt_v1_${userId}`, String(timestamp));
  }

  async getLastSyncAttempt(): Promise<number> {
    const userId = await authService.requireUserIdAsync();
    const value = Number(await AsyncStorage.getItem(`financy_last_sync_attempt_v1_${userId}`));
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  async getDaysUntilNextBillingPeriod(): Promise<number> {
    const { start: nextPeriodStart } = await this.getNextBillingPeriod();
    const today = new Date();
    const timeDiff = nextPeriodStart.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }
}
