import * as SQLite from "expo-sqlite";

export const addWalletsTable = async (db: SQLite.SQLiteDatabase): Promise<void> => {
  try {
    // Create wallets table if it doesn't exist
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS wallets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        balance REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        sync_updated_at INTEGER NOT NULL DEFAULT 0,
        deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error'))
      );
    `);

    // Create indexes for better performance
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_wallets_sync_updated ON wallets (sync_updated_at);
      CREATE INDEX IF NOT EXISTS idx_wallets_deleted ON wallets (deleted);
    `);

    // Add wallet_id column to transactions table if it doesn't exist
    try {
      await db.execAsync(`
        ALTER TABLE transactions ADD COLUMN wallet_id TEXT;
      `);
    } catch (error: any) {
      if (!error.message?.includes("duplicate column")) {
        console.warn("Error adding wallet_id column to transactions:", error.message);
      }
    }

    // Add from_wallet_id column to transactions table if it doesn't exist
    try {
      await db.execAsync(`
        ALTER TABLE transactions ADD COLUMN from_wallet_id TEXT;
      `);
    } catch (error: any) {
      if (!error.message?.includes("duplicate column")) {
        console.warn("Error adding from_wallet_id column to transactions:", error.message);
      }
    }

    // Add to_wallet_id column to transactions table if it doesn't exist
    try {
      await db.execAsync(`
        ALTER TABLE transactions ADD COLUMN to_wallet_id TEXT;
      `);
    } catch (error: any) {
      if (!error.message?.includes("duplicate column")) {
        console.warn("Error adding to_wallet_id column to transactions:", error.message);
      }
    }

    console.log("Wallets table migration completed successfully");
  } catch (error) {
    console.error("Error running wallets migration:", error);
    throw error;
  }
};

export default addWalletsTable;
