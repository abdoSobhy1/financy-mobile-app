import * as SQLite from "expo-sqlite";

export const addBillPaymentsTable = async (db: SQLite.SQLiteDatabase): Promise<void> => {
  try {
    // Create bill_payments table if it doesn't exist
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS bill_payments (
        id TEXT PRIMARY KEY,
        bill_id TEXT NOT NULL,
        amount REAL NOT NULL CHECK (amount > 0),
        payment_date TEXT NOT NULL,
        payment_method TEXT,
        transaction_id TEXT,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        sync_updated_at INTEGER NOT NULL DEFAULT 0,
        deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error')),
        FOREIGN KEY (bill_id) REFERENCES bills (id) ON DELETE CASCADE
      );
    `);

    // Create indexes for better performance
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_bill_payments_bill_id ON bill_payments (bill_id);
      CREATE INDEX IF NOT EXISTS idx_bill_payments_date ON bill_payments (payment_date);
      CREATE INDEX IF NOT EXISTS idx_bill_payments_sync_updated ON bill_payments (sync_updated_at);
    `);

    // Add last_paid_date column to bills table if it doesn't exist
    try {
      await db.execAsync(`
        ALTER TABLE bills ADD COLUMN last_paid_date TEXT;
      `);
    } catch (error: any) {
      // Column might already exist, ignore error
      if (!error.message?.includes("duplicate column")) {
        console.warn("Error adding last_paid_date column to bills:", error.message);
      }
    }

    console.log("Bill payments table migration completed successfully");
  } catch (error) {
    console.error("Error running bill payments migration:", error);
    throw error;
  }
};

export default addBillPaymentsTable;
