import * as SQLite from "expo-sqlite";
import { DATABASE } from "../../shared/constants";
import { invalidateCloudRestore } from "../sync/cloudRestoreState";

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this._performInit();

    try {
      await this.initPromise;
      this.isInitialized = true;
      this.isInitializing = false;

      // Recalculate entry counts after database is fully initialized
      await this.recalculateEntryCounts();
    } catch (error) {
      this.isInitializing = false;
      this.initPromise = null;
      console.error("Database initialization failed:", error);
      throw error;
    }
  }

  private async _performInit(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync(DATABASE.NAME);
    await this.createTables();
    await this.insertDefaultData();
  }

  public getDatabase(): SQLite.SQLiteDatabase {
    if (!this.isInitialized || !this.db) {
      throw new Error("Database not initialized. Call init() first and wait for completion.");
    }
    return this.db;
  }

  public async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  public isReady(): boolean {
    return this.isInitialized && this.db !== null;
  }

  private async createTables(): Promise<void> {
    if (!this.db) return;

    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS sms_settings (
        id TEXT PRIMARY KEY,
        config TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        updated_at INTEGER NOT NULL DEFAULT 0,
        sync_updated_at INTEGER NOT NULL DEFAULT 0,
        deleted INTEGER NOT NULL DEFAULT 0,
        sync_status TEXT NOT NULL DEFAULT 'pending'
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        color TEXT,
        icon TEXT,
        entry_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        sync_updated_at INTEGER DEFAULT 0,
        deleted INTEGER DEFAULT 0 CHECK (deleted IN (0, 1)),
        sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'error'))
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        amount REAL NOT NULL CHECK (amount >= 0),
        current_balance REAL NOT NULL DEFAULT 0,
        period_type TEXT NOT NULL DEFAULT 'monthly',
        period_start INTEGER,
        category_id TEXT,
        alerts_enabled INTEGER DEFAULT 1,
        reset_day INTEGER NOT NULL CHECK (reset_day >= 1 AND reset_day <= 31),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        sync_updated_at INTEGER DEFAULT 0,
        deleted INTEGER DEFAULT 0 CHECK (deleted IN (0, 1)),
        sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'error')),
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        amount REAL NOT NULL CHECK (amount > 0),
        type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'debt', 'transfer')),
        category_id TEXT,
        budget_id TEXT,
        account_id TEXT DEFAULT 'default_cash',
        to_account_id TEXT,
        receipt_uri TEXT,
        description TEXT NOT NULL,
        date TEXT NOT NULL,
        note TEXT,
        linked_debt_payment_id TEXT,
        recurring_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        duplicated_at TEXT,
        sync_updated_at INTEGER DEFAULT 0,
        deleted INTEGER DEFAULT 0 CHECK (deleted IN (0, 1)),
        sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error')),
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT,
        FOREIGN KEY (budget_id) REFERENCES budgets (id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        billing_period_start_day INTEGER NOT NULL DEFAULT 1 CHECK (billing_period_start_day >= 1 AND billing_period_start_day <= 31),
        currency TEXT NOT NULL DEFAULT 'USD',
        firebase_sync INTEGER NOT NULL DEFAULT 0 CHECK (firebase_sync IN (0, 1)),
        theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
        key TEXT,
        value TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        sync_updated_at INTEGER NOT NULL DEFAULT 0,
        deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error'))
      );

      CREATE TABLE IF NOT EXISTS debts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        debt_type TEXT DEFAULT 'i_owe',
        amount REAL NOT NULL CHECK (amount > 0),
        total_amount REAL NOT NULL CHECK (total_amount > 0),
        current_balance REAL NOT NULL CHECK (current_balance >= 0),
        monthly_payment REAL CHECK (monthly_payment >= 0),
        interest_rate REAL CHECK (interest_rate >= 0),
        minimum_payment REAL CHECK (minimum_payment >= 0),
        due_date TEXT,
        creditor TEXT,
        description TEXT,
        category_id TEXT,
        budget_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        sync_updated_at INTEGER DEFAULT 0,
        deleted INTEGER DEFAULT 0 CHECK (deleted IN (0, 1)),
        sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error')),
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
        FOREIGN KEY (budget_id) REFERENCES budgets (id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS debt_payments (
        id TEXT PRIMARY KEY,
        debt_id TEXT NOT NULL,
        amount REAL NOT NULL CHECK (amount > 0),
        date TEXT NOT NULL,
        payment_date TEXT NOT NULL,
        principal REAL DEFAULT 0 CHECK (principal >= 0),
        interest REAL NOT NULL DEFAULT 0 CHECK (interest >= 0),
        note TEXT,
        linked_transaction_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        sync_updated_at INTEGER DEFAULT 0,
        deleted INTEGER DEFAULT 0 CHECK (deleted IN (0, 1)),
        sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error')),
        FOREIGN KEY (debt_id) REFERENCES debts (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS wallets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        initial_balance REAL NOT NULL DEFAULT 0,
        is_secret INTEGER NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at INTEGER NOT NULL DEFAULT 0,
        sync_updated_at INTEGER NOT NULL DEFAULT 0,
        deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error'))
      );

      CREATE TABLE IF NOT EXISTS sync_log (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
        payload TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        is_processed INTEGER DEFAULT 0 CHECK (is_processed IN (0, 1)),
        retry_count INTEGER DEFAULT 0,
        error_message TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
      CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions (category_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_budget ON transactions (budget_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);
      CREATE INDEX IF NOT EXISTS idx_transactions_sync_updated ON transactions (sync_updated_at);
      CREATE INDEX IF NOT EXISTS idx_transactions_to_account ON transactions (to_account_id);
      CREATE INDEX IF NOT EXISTS idx_categories_sync_updated ON categories (sync_updated_at);
      CREATE INDEX IF NOT EXISTS idx_budgets_sync_updated ON budgets (sync_updated_at);
      CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts (due_date);
      CREATE INDEX IF NOT EXISTS idx_debts_category ON debts (category_id);
      CREATE INDEX IF NOT EXISTS idx_debts_sync_updated ON debts (sync_updated_at);
      CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments (debt_id);
      CREATE INDEX IF NOT EXISTS idx_debt_payments_date ON debt_payments (payment_date);
      CREATE INDEX IF NOT EXISTS idx_sync_log_processed ON sync_log (is_processed);
      CREATE INDEX IF NOT EXISTS idx_sync_log_created ON sync_log (created_at);
      CREATE INDEX IF NOT EXISTS idx_sync_log_table ON sync_log (table_name);
      CREATE INDEX IF NOT EXISTS idx_wallets_updated_at ON wallets (updated_at);
      CREATE INDEX IF NOT EXISTS idx_wallets_deleted ON wallets (deleted);
      CREATE INDEX IF NOT EXISTS idx_wallets_archived ON wallets (archived);
    `);
  }

  private async insertDefaultData(): Promise<void> {
    if (!this.db) return;

    const settingsResult = await this.db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM settings",
    );

    if (settingsResult && settingsResult.count === 0) {
      await this.db.runAsync(`
        INSERT INTO settings (id, billing_period_start_day, currency, firebase_sync, theme, created_at, updated_at, sync_updated_at, sync_status)
        VALUES ('default', 1, 'USD', 0, 'dark', '1970-01-01T00:00:00.000Z', '1970-01-01T00:00:00.000Z', 0, 'synced')
      `);
    }
  }

  public async resetDatabase(): Promise<void> {
    if (!this.db) return;
    await invalidateCloudRestore();

    await this.db.execAsync(`
      DROP TABLE IF EXISTS debt_payments;
      DROP TABLE IF EXISTS debts;
      DROP TABLE IF EXISTS wallets;
      DROP TABLE IF EXISTS transactions;
      DROP TABLE IF EXISTS budgets;
      DROP TABLE IF EXISTS categories;
      DROP TABLE IF EXISTS settings;
      DROP TABLE IF EXISTS sync_log;
      DROP TABLE IF EXISTS sms_settings;
    `);

    await this.createTables();
    await this.insertDefaultData();

    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      await AsyncStorage.removeItem("financy_categories_seeded_v1_guest");
      await AsyncStorage.removeItem("financy_wallets_seeded_v1_guest");
      await AsyncStorage.removeItem("@financy_sms_detector_config_v1");
      await AsyncStorage.removeItem("sms_detection_enabled");
      const { getSmsConfig } = require("../../features/sms/services/smsConfigService");
      await getSmsConfig();
      const { walletService } = require("../../features/wallets/services/walletService");
      walletService.clearCache();
    } catch (e) {
      console.warn("Could not clear guest seeded flags or wallet cache on resetDatabase:", e);
    }
  }

  public async clearAllData(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;
    await invalidateCloudRestore();

    await this.db.execAsync(`
      DELETE FROM debt_payments;
      DELETE FROM debts;
      DELETE FROM transactions;
      DELETE FROM budgets;
      UPDATE settings SET 
        billing_period_start_day = 1,
        currency = 'USD',
        firebase_sync = 0,
        theme = 'dark',
        updated_at = '1970-01-01T00:00:00.000Z',
        sync_updated_at = 0,
        sync_status = 'synced'
      WHERE id = 'default';
    `);
  }

  public async recalculateEntryCounts(): Promise<void> {
    try {
      if (!this.db) return;
      await this.db.runAsync(`
        UPDATE categories 
        SET entry_count = (
          SELECT COUNT(*) 
          FROM transactions 
          WHERE transactions.category_id = categories.id
        )
      `);
    } catch (error) {
      console.warn("Error recalculating entry counts:", error);
    }
  }

  public async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}
