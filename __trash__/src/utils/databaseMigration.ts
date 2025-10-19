// Database Migration Utility for Cloud Data Compatibility
import { DatabaseManager } from "../database";

export class DatabaseMigration {
  private db = DatabaseManager.getInstance();

  /**
   * Run all necessary migrations to make database compatible with cloud data
   */
  async runCloudCompatibilityMigrations(): Promise<void> {
    try {
      console.log("🔧 Starting database migrations for cloud compatibility...");

      await this.db.ensureInitialized();
      const database = this.db.getDatabase();

      // Migration 1: Add missing columns
      await this.addMissingColumns(database);

      // Migration 2: Update default values
      await this.updateDefaultValues(database);

      // Migration 3: Clean up data
      await this.cleanupData(database);

      console.log("✅ Database migrations completed successfully!");
    } catch (error) {
      console.error("❌ Database migration failed:", error);
      throw error;
    }
  }

  private async addMissingColumns(database: any): Promise<void> {
    console.log("🔧 Adding missing columns...");

    const migrations = [
      // Transactions table
      { table: "transactions", column: "updated_at", definition: "TEXT NOT NULL DEFAULT (datetime('now'))" },

      // Categories table
      { table: "categories", column: "icon", definition: "TEXT" },
      { table: "categories", column: "updated_at", definition: "TEXT NOT NULL DEFAULT (datetime('now'))" },

      // Budgets table
      { table: "budgets", column: "period_type", definition: "TEXT NOT NULL DEFAULT 'monthly'" },
      { table: "budgets", column: "period_start", definition: "INTEGER" },
      { table: "budgets", column: "category_id", definition: "TEXT" },

      // Bills table
      { table: "bills", column: "is_recurring", definition: "INTEGER NOT NULL DEFAULT 0 CHECK (is_recurring IN (0, 1))" },

      // Debts table
      { table: "debts", column: "amount", definition: "REAL" },
      { table: "debts", column: "monthly_payment", definition: "REAL CHECK (monthly_payment >= 0)" },
      { table: "debts", column: "budget_id", definition: "TEXT" },

      // Debt payments table
      { table: "debt_payments", column: "date", definition: "TEXT" },
      { table: "debt_payments", column: "updated_at", definition: "TEXT NOT NULL DEFAULT (datetime('now'))" },

      // Settings table sync fields migration
      { table: "settings", column: "sync_updated_at", definition: "INTEGER NOT NULL DEFAULT 0" },
      { table: "settings", column: "deleted", definition: "INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1))" },
      {
        table: "settings",
        column: "sync_status",
        definition: "TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error'))",
      },
    ];

    for (const migration of migrations) {
      try {
        await database.execAsync(`ALTER TABLE ${migration.table} ADD COLUMN ${migration.column} ${migration.definition};`);
        console.log(`✅ Added ${migration.column} to ${migration.table}`);
      } catch (error: any) {
        if (error.message?.includes("duplicate column")) {
          console.log(`ℹ️ Column ${migration.column} already exists in ${migration.table}`);
        } else {
          console.warn(`⚠️ Failed to add ${migration.column} to ${migration.table}:`, error.message);
        }
      }
    }
  }

  private async updateDefaultValues(database: any): Promise<void> {
    console.log("🔧 Updating default values...");

    try {
      // Set default period_type for budgets
      await database.execAsync(`
        UPDATE budgets 
        SET period_type = 'monthly' 
        WHERE period_type IS NULL OR period_type = '';
      `);

      // Set default updated_at for tables that don't have it
      const now = new Date().toISOString();
      const tables = ["transactions", "categories", "budgets", "bills", "debts", "debt_payments", "settings"];

      for (const table of tables) {
        try {
          await database.execAsync(`
            UPDATE ${table} 
            SET updated_at = '${now}' 
            WHERE updated_at IS NULL OR updated_at = '';
          `);
        } catch (error) {
          // Table might not have updated_at column yet
          console.warn(`Could not update updated_at for ${table}:`, error);
        }
      }

      // Copy payment_date to date for debt_payments if date is missing
      await database.execAsync(`
        UPDATE debt_payments 
        SET date = payment_date 
        WHERE date IS NULL AND payment_date IS NOT NULL;
      `);

      console.log("✅ Default values updated");
    } catch (error) {
      console.warn("⚠️ Some default value updates failed:", error);
    }
  }

  private async cleanupData(database: any): Promise<void> {
    console.log("🔧 Cleaning up data...");

    try {
      // Remove any sync log entries that might be corrupted
      await database.execAsync(`
        DELETE FROM sync_log 
        WHERE created_at < ${Date.now() - 7 * 24 * 60 * 60 * 1000};
      `);
      console.log("✅ Cleaned up old sync log entries");
    } catch (error) {
      console.warn("⚠️ Data cleanup had some issues:", error);
    }
  }

  /**
   * Check if database needs migrations
   */
  async needsMigrations(): Promise<boolean> {
    try {
      await this.db.ensureInitialized();
      const database = this.db.getDatabase();

      // Check for a few key missing columns
      const checkColumns = [
        { table: "transactions", column: "updated_at" },
        { table: "categories", column: "icon" },
        { table: "budgets", column: "period_type" },
        { table: "bills", column: "is_recurring" },
      ];

      for (const check of checkColumns) {
        try {
          await database.getFirstAsync(`SELECT ${check.column} FROM ${check.table} LIMIT 1`);
        } catch (error: any) {
          if (error.message?.includes("no such column")) {
            console.log(`Missing column detected: ${check.table}.${check.column}`);
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error("Error checking for needed migrations:", error);
      return true; // Assume migrations needed if we can't check
    }
  }
}

export const databaseMigration = new DatabaseMigration();
