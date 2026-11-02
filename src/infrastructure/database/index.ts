import * as SQLite from "expo-sqlite";
import { DATABASE } from "../../shared/constants";

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
      console.log("Database already initialized");
      return;
    }

    if (this.isInitializing && this.initPromise) {
      console.log("Database initialization in progress, waiting...");
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this._performInit();

    try {
      await this.initPromise;
      this.isInitialized = true;
      this.isInitializing = false;
      console.log("Database initialized successfully");

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
    await this.runMigrations();
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
    `);

    // Categories table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        color TEXT,
        icon TEXT,
        entry_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Migration: Add entry_count column if it doesn't exist
    try {
      await this.db.execAsync(`
        ALTER TABLE categories ADD COLUMN entry_count INTEGER NOT NULL DEFAULT 0;
      `);
    } catch (error: any) {
      // Column might already exist, ignore error
      if (!error.message?.includes("duplicate column")) {
        console.warn("Error adding entry_count column:", error);
      }
    }

    // Budgets table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        amount REAL NOT NULL CHECK (amount >= 0),
        current_balance REAL NOT NULL DEFAULT 0,
        period_type TEXT NOT NULL DEFAULT 'monthly',
        period_start INTEGER,
        category_id TEXT,
        reset_day INTEGER NOT NULL CHECK (reset_day >= 1 AND reset_day <= 31),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
      );
    `);

    // Transactions table
    await this.db.execAsync(`
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
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        duplicated_at TEXT,
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT,
        FOREIGN KEY (budget_id) REFERENCES budgets (id) ON DELETE SET NULL
      );
    `);

    // Settings table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        billing_period_start_day INTEGER NOT NULL DEFAULT 1 CHECK (billing_period_start_day >= 1 AND billing_period_start_day <= 31),
        currency TEXT NOT NULL DEFAULT 'USD',
        firebase_sync INTEGER NOT NULL DEFAULT 0 CHECK (firebase_sync IN (0, 1)),
        theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        sync_updated_at INTEGER NOT NULL DEFAULT 0,
        deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error'))
      );
    `);

    // Debts table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS debts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
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
        sync_updated_at INTEGER,
        deleted INTEGER DEFAULT 0,
        sync_status TEXT DEFAULT 'pending',
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
        FOREIGN KEY (budget_id) REFERENCES budgets (id) ON DELETE SET NULL
      );
    `);

    // Migration: Add sync columns to debts table if they don't exist
    try {
      await this.db.execAsync(`
        ALTER TABLE debts ADD COLUMN sync_updated_at INTEGER;
      `);
    } catch (error: any) {
      // Column might already exist, ignore error
      if (!error.message?.includes("duplicate column")) {
        console.warn("Error adding sync_updated_at column to debts:", error.message);
      }
    }

    try {
      await this.db.execAsync(`
        ALTER TABLE debts ADD COLUMN deleted INTEGER DEFAULT 0;
      `);
    } catch (error: any) {
      // Column might already exist, ignore error
      if (!error.message?.includes("duplicate column")) {
        console.warn("Error adding deleted column to debts:", error.message);
      }
    }

    try {
      await this.db.execAsync(`
        ALTER TABLE debts ADD COLUMN sync_status TEXT DEFAULT 'pending';
      `);
    } catch (error: any) {
      // Column might already exist, ignore error
      if (!error.message?.includes("duplicate column")) {
        console.warn("Error adding sync_status column to debts:", error.message);
      }
    }

    // Debt payments table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS debt_payments (
        id TEXT PRIMARY KEY,
        debt_id TEXT NOT NULL,
        amount REAL NOT NULL CHECK (amount > 0),
        date TEXT NOT NULL,
        payment_date TEXT NOT NULL,
        principal REAL NOT NULL CHECK (principal >= 0),
        interest REAL NOT NULL DEFAULT 0 CHECK (interest >= 0),
        note TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (debt_id) REFERENCES debts (id) ON DELETE CASCADE
      );
    `);

    // Wallets table
    await this.db.execAsync(`
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
    `);

    // Bill payments table
    // Bill payments removed

    // Add sync fields to existing tables (migrations)
    await this.addSyncFields();

    // Add missing columns for cloud data compatibility
    await this.addMissingColumns();

    // Sync log table for offline-first operations
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_log (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
        payload TEXT NOT NULL, -- JSON string of the record data
        created_at INTEGER NOT NULL,
        is_processed INTEGER DEFAULT 0 CHECK (is_processed IN (0, 1)),
        retry_count INTEGER DEFAULT 0,
        error_message TEXT
      );
    `);

    // Create indexes for better performance
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
      CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions (category_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_budget ON transactions (budget_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);
    -- Bills table and indexes removed
      CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts (due_date);
      CREATE INDEX IF NOT EXISTS idx_debts_category ON debts (category_id);
      CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments (debt_id);
  CREATE INDEX IF NOT EXISTS idx_debt_payments_date ON debt_payments (payment_date);
  CREATE INDEX IF NOT EXISTS idx_transactions_sync_updated ON transactions (sync_updated_at);
  CREATE INDEX IF NOT EXISTS idx_categories_sync_updated ON categories (sync_updated_at);
  CREATE INDEX IF NOT EXISTS idx_budgets_sync_updated ON budgets (sync_updated_at);
  -- Bills table removed; do not create index on bills
  CREATE INDEX IF NOT EXISTS idx_debts_sync_updated ON debts (sync_updated_at);
      CREATE INDEX IF NOT EXISTS idx_sync_log_processed ON sync_log (is_processed);
      CREATE INDEX IF NOT EXISTS idx_sync_log_created ON sync_log (created_at);
      CREATE INDEX IF NOT EXISTS idx_sync_log_table ON sync_log (table_name);
      CREATE INDEX IF NOT EXISTS idx_wallets_updated_at ON wallets (updated_at);
      CREATE INDEX IF NOT EXISTS idx_wallets_deleted ON wallets (deleted);
      CREATE INDEX IF NOT EXISTS idx_wallets_archived ON wallets (archived);
      CREATE INDEX IF NOT EXISTS idx_transactions_to_account ON transactions (to_account_id);
    `);
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) return;

    try {
      // Ensure legacy bills tables are removed from existing databases
      try {
        await this.db.execAsync(`
          DROP TABLE IF EXISTS bill_payments;
          DROP TABLE IF EXISTS bills;
        `);
        console.log("Dropped legacy bills tables if they existed");
      } catch (err) {
        console.warn("Failed to drop legacy bills tables (non-fatal):", err);
      }

      // Ensure wallets table exists and has proper schema for existing databases
      try {
        await this.db.execAsync(`
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
          CREATE INDEX IF NOT EXISTS idx_wallets_updated_at ON wallets (updated_at);
          CREATE INDEX IF NOT EXISTS idx_wallets_deleted ON wallets (deleted);
          CREATE INDEX IF NOT EXISTS idx_wallets_archived ON wallets (archived);
        `);
        console.log("Wallets table verified/created in migrations");
      } catch (err) {
        console.warn("Failed to ensure wallets table in migrations:", err);
      }

      // Ensure transactions table supports transfers and nullable category_id
      try {
        const tableInfo = await this.db.getFirstAsync<{ sql: string }>(
          "SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'",
        );
        if (
          tableInfo?.sql &&
          (!tableInfo.sql.includes("'transfer'") ||
            tableInfo.sql.includes("category_id TEXT NOT NULL"))
        ) {
          console.log(
            "Migrating transactions table to allow transfers and nullable category_id...",
          );
          await this.db.execAsync(`
            CREATE TABLE IF NOT EXISTS transactions_new (
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
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              updated_at TEXT NOT NULL DEFAULT (datetime('now')),
              duplicated_at TEXT,
              sync_updated_at INTEGER DEFAULT 0,
              deleted INTEGER DEFAULT 0 CHECK (deleted IN (0, 1)),
              sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error')),
              FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT,
              FOREIGN KEY (budget_id) REFERENCES budgets (id) ON DELETE SET NULL
            );

            INSERT INTO transactions_new (
              id, amount, type, category_id, budget_id, account_id, receipt_uri, description,
              date, note, linked_debt_payment_id, created_at, updated_at, duplicated_at,
              sync_updated_at, deleted, sync_status
            )
            SELECT 
              id, amount, type, category_id, budget_id, 
              COALESCE(account_id, 'default_cash'), receipt_uri, description,
              date, note, linked_debt_payment_id, created_at, updated_at, duplicated_at,
              COALESCE(sync_updated_at, 0), COALESCE(deleted, 0), COALESCE(sync_status, 'pending')
            FROM transactions;

            DROP TABLE transactions;

            ALTER TABLE transactions_new RENAME TO transactions;

            CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
            CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions (category_id);
            CREATE INDEX IF NOT EXISTS idx_transactions_budget ON transactions (budget_id);
            CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);
            CREATE INDEX IF NOT EXISTS idx_transactions_sync_updated ON transactions (sync_updated_at);
            CREATE INDEX IF NOT EXISTS idx_transactions_to_account ON transactions (to_account_id);
          `);
          console.log("Transactions table migration for transfers completed successfully");
        }
      } catch (err) {
        console.warn("Transactions table check/migration non-fatal error:", err);
      }

      // Migrations completed
      console.log("All migrations completed successfully");
    } catch (error) {
      console.error("Error running migrations:", error);
      // Don't throw here as the app should still work even if migrations fail
    }
  }

  private async addSyncFields(): Promise<void> {
    if (!this.db) return;

    // Add sync fields to all tables that don't have them
    const syncFields = [
      "sync_updated_at INTEGER DEFAULT 0",
      "deleted INTEGER DEFAULT 0 CHECK (deleted IN (0, 1))",
      'sync_status TEXT DEFAULT "synced" CHECK (sync_status IN ("pending", "synced", "error"))',
    ];

    const tables = ["transactions", "categories", "budgets", "debts", "debt_payments", "settings"];

    for (const table of tables) {
      for (const field of syncFields) {
        try {
          const columnName = field.split(" ")[0];
          await this.db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${field};`);
          console.log(`Added ${columnName} to ${table}`);
        } catch (error: any) {
          // Column might already exist, ignore duplicate column errors
          if (!error.message?.includes("duplicate column")) {
            console.warn(`Error adding sync field to ${table}:`, error);
          }
        }
      }
    }

    // Update existing records to have sync timestamps
    const now = Date.now();
    for (const table of tables) {
      try {
        await this.db.execAsync(`
          UPDATE ${table} 
          SET sync_updated_at = ${now} 
          WHERE sync_updated_at = 0 OR sync_updated_at IS NULL;
        `);
      } catch (error) {
        console.warn(`Error updating sync timestamps for ${table}:`, error);
      }
    }
  }

  private async addMissingColumns(): Promise<void> {
    if (!this.db) return;

    // Define missing columns for each table to support cloud data
    const missingColumns = {
      transactions: [
        "updated_at TEXT NOT NULL DEFAULT (datetime('now'))",
        "linked_debt_payment_id TEXT",
        "account_id TEXT DEFAULT 'default_cash'",
        "to_account_id TEXT",
        "receipt_uri TEXT",
        "recurring_id TEXT",
      ],
      categories: ["icon TEXT", "updated_at TEXT NOT NULL DEFAULT (datetime('now'))"],
      budgets: [
        "period_type TEXT NOT NULL DEFAULT 'monthly'",
        "period_start INTEGER",
        "category_id TEXT",
        "alerts_enabled INTEGER DEFAULT 1",
      ],
      debts: [
        "amount REAL",
        "monthly_payment REAL CHECK (monthly_payment >= 0)",
        "budget_id TEXT",
        "debt_type TEXT DEFAULT 'i_owe'",
      ],
      debt_payments: ["date TEXT", "updated_at TEXT NOT NULL DEFAULT (datetime('now'))", "linked_transaction_id TEXT"],
      settings: ["key TEXT", "value TEXT", "updated_at TEXT NOT NULL DEFAULT (datetime('now'))"],
    };

    // Add missing columns to each table
    for (const [tableName, columns] of Object.entries(missingColumns)) {
      for (const column of columns) {
        try {
          const columnName = column.split(" ")[0];
          await this.db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${column};`);
          console.log(`Added ${columnName} to ${tableName} for cloud compatibility`);
        } catch (error: any) {
          // Column might already exist, ignore duplicate column errors
          if (!error.message?.includes("duplicate column")) {
            console.warn(`Error adding ${column} to ${tableName}:`, error);
          }
        }
      }
    }

    // Add foreign key for budgets.category_id (if it doesn't already exist)
    try {
      // Create a temporary table with proper foreign key constraint
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS budgets_temp AS SELECT * FROM budgets;
      `);
    } catch (error) {
      // Table might already be properly structured
      console.warn("Error creating temporary budgets table:", error);
    }

    // Add foreign key for debts.budget_id (if it doesn't already exist)
    try {
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS debts_temp AS SELECT * FROM debts;
      `);
    } catch (error) {
      // Table might already be properly structured
      console.warn("Error creating temporary debts table:", error);
    }

    // Migration: Fix debt_payments.principal column to allow NULL for cloud compatibility
    try {
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS debt_payments_new (
          id TEXT PRIMARY KEY,
          debt_id TEXT NOT NULL,
          amount REAL NOT NULL CHECK (amount > 0),
          date TEXT NOT NULL,
          payment_date TEXT NOT NULL,
          principal REAL DEFAULT 0 CHECK (principal >= 0),
          interest REAL NOT NULL DEFAULT 0 CHECK (interest >= 0),
          note TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          sync_updated_at INTEGER DEFAULT 0,
          deleted INTEGER DEFAULT 0,
          sync_status TEXT DEFAULT 'pending',
          FOREIGN KEY (debt_id) REFERENCES debts (id) ON DELETE CASCADE
        );
      `);

      // Copy existing data
      await this.db.execAsync(`
        INSERT OR IGNORE INTO debt_payments_new 
        SELECT id, debt_id, amount, date, payment_date, 
               COALESCE(principal, 0) as principal, 
               COALESCE(interest, 0) as interest, 
               note, created_at, updated_at,
               COALESCE(sync_updated_at, 0) as sync_updated_at,
               COALESCE(deleted, 0) as deleted,
               COALESCE(sync_status, 'pending') as sync_status
        FROM debt_payments;
      `);

      // Replace old table
      await this.db.execAsync("DROP TABLE debt_payments;");
      await this.db.execAsync("ALTER TABLE debt_payments_new RENAME TO debt_payments;");

      console.log("✅ Migrated debt_payments table for cloud compatibility");
    } catch (error) {
      // Migration might already be applied
      console.warn("Debt payments migration not needed or already applied:", error);
    }

    console.log("Missing columns migration completed");
  }

  private async insertDefaultData(): Promise<void> {
    if (!this.db) return;

    // Check if default data already exists
    const settingsResult = await this.db.getFirstAsync("SELECT COUNT(*) as count FROM settings");

    // Insert default settings if none exist (initialized to epoch 0 so cloud settings always take precedence)
    if (settingsResult && (settingsResult as any).count === 0) {
      await this.db.runAsync(`
        INSERT INTO settings (id, billing_period_start_day, currency, firebase_sync, theme, created_at, updated_at, sync_updated_at, sync_status)
        VALUES ('default', 1, 'USD', 0, 'dark', '1970-01-01T00:00:00.000Z', '1970-01-01T00:00:00.000Z', 0, 'synced')
      `);
    } else {
      // Fix legacy untouched 28 default to 1 if it was never modified and synced
      try {
        await this.db.runAsync(`
          UPDATE settings 
          SET billing_period_start_day = 1 
          WHERE id = 'default' AND billing_period_start_day = 28 AND (sync_updated_at <= 0 OR sync_updated_at IS NULL);
        `);
      } catch {}
    }

    // Purge any stale sync_log operations attempting to push the legacy 28 default to cloud
    try {
      await this.db.runAsync(`
        DELETE FROM sync_log 
        WHERE table_name = 'settings' AND payload LIKE '%"billingPeriodStartDay":28%';
      `);
    } catch {}

    // Skip inserting default categories - let user create their own
    // Categories will be empty on first run, user can create custom categories
    console.log("🚀 Skipping default categories - user will create custom categories");
  }

  public async resetDatabase(): Promise<void> {
    if (!this.db) return;

    await this.db.execAsync(`
      DROP TABLE IF EXISTS debt_payments;
      DROP TABLE IF EXISTS debts;
      DROP TABLE IF EXISTS wallets;
      DROP TABLE IF EXISTS transactions;
      DROP TABLE IF EXISTS budgets;
      DROP TABLE IF EXISTS categories;
      DROP TABLE IF EXISTS settings;
      DROP TABLE IF EXISTS sync_log;
    `);

    await this.createTables();
    await this.insertDefaultData();

    try {
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      await AsyncStorage.removeItem("financy_categories_seeded_v1_guest");
      await AsyncStorage.removeItem("financy_wallets_seeded_v1_guest");
      const { walletService } = await import("../../features/wallets/services/walletService");
      walletService.clearCache();
    } catch (e) {
      console.warn("Could not clear guest seeded flags or wallet cache on resetDatabase:", e);
    }
  }

  public async clearAllData(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    // Clear all data except categories
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

    console.log("All data cleared except categories");
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
      console.log("Entry counts recalculated successfully");
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
