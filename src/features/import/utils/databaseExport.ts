import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as SQLite from "expo-sqlite";
import { db } from "../../../infrastructure/database/repositories";
import { DatabaseManager } from "../../../infrastructure/database";
import { DATABASE } from "../../../shared/constants";
import { walletService } from "../../wallets/services/walletService";
import { Platform } from "react-native";

export interface DatabaseExportData {
  exportDate: string;
  version: string;
  transactions: any[];
  categories: any[];
  budgets: any[];
  debts: any[];
  debtPayments?: any[];
  wallets?: any[];
  settings?: any[];
}

export interface DatabaseImportResult {
  success: boolean;
  restoredCounts: {
    transactions: number;
    categories: number;
    budgets: number;
    debts: number;
    debtPayments: number;
    wallets: number;
    settings: number;
  };
  errors: string[];
}

/**
 * Creates a file in Documents directory and returns the file URI
 */
const createExportFile = async (filename: string, content: string): Promise<string> => {
  try {
    // Get the document directory
    const documentDir = FileSystem.Paths.document;

    // Create the file
    const file = new FileSystem.File(documentDir, filename);

    // Create and write content to file
    await file.create({ overwrite: true });

    // Use WritableStream to write content
    const writableStream = file.writableStream();
    const writer = writableStream.getWriter();
    const encoder = new TextEncoder();
    await writer.write(encoder.encode(content));
    await writer.close();

    return file.uri;
  } catch (error) {
    console.error("Error creating export file:", error);
    throw new Error(`Failed to create export file: ${error}`);
  }
};

/**
 * Exports the SQLite database as an actual .db file by creating a new database
 */
export const exportSQLiteDatabase = async (): Promise<string> => {
  try {
    const sourceDb = await SQLite.openDatabaseAsync(DATABASE.NAME);

    // Flush WAL checkpoint to ensure all latest data is written to disk
    try {
      await sourceDb.execAsync("PRAGMA wal_checkpoint(FULL);");
    } catch (walErr) {
      console.warn("Checkpoint before backup warning:", walErr);
    }

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
    const filename = `financy-backup-${timestamp}.db`;

    // Create new database to receive backup
    const exportDb = await SQLite.openDatabaseAsync(filename);

    // Use native SQLite online backup API if available, else copy tables
    if (typeof (SQLite as any).backupDatabaseAsync === "function") {
      await (SQLite as any).backupDatabaseAsync({
        sourceDatabase: sourceDb,
        destDatabase: exportDb,
      });
    } else {
      // Get all tables from source
      const tables = (await sourceDb.getAllAsync(`
        SELECT name, sql FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `)) as { name: string; sql: string }[];


      // Create tables in export database
      for (const table of tables) {
        await exportDb.execAsync(table.sql);
      }

      // Copy all data
      for (const table of tables) {
        const rows = await sourceDb.getAllAsync(`SELECT * FROM ${table.name}`);

        if (rows.length > 0) {
          const firstRow = rows[0] as Record<string, any>;
          const columns = Object.keys(firstRow);
          const placeholders = columns.map(() => "?").join(",");

          const stmt = await exportDb.prepareAsync(
            `INSERT INTO ${table.name} (${columns.join(",")}) VALUES (${placeholders})`
          );

          for (const row of rows) {
            const rowData = row as Record<string, any>;
            const values = columns.map((col) => rowData[col]);
            await stmt.executeAsync(values);
          }

          await stmt.finalizeAsync();
        }
      }
    }

    // Capture the physical .db file path before closing
    const dbFilePath = exportDb.databasePath;
    await exportDb.closeAsync();


    // Share the actual .db file
    if (dbFilePath && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(dbFilePath, {
        mimeType: "application/vnd.sqlite3",
        dialogTitle: "SQLite Database Backup (.db)",
        UTI: "public.database",
      });
      return dbFilePath;
    }

    if (!dbFilePath) {
      await exportSQLiteDatabaseAsSQLDump();
    }

    return dbFilePath || filename;
  } catch (error) {
    console.error("Error exporting SQLite database:", error);
    await exportSQLiteDatabaseAsSQLDump();
    throw error;
  }
};

/**
 * Inspects an SQLite .db file and returns counts of records in it
 */
export const inspectSQLiteDatabaseFile = async (
  fileUri: string
): Promise<{
  transactions: number;
  categories: number;
  budgets: number;
  wallets: number;
  debts: number;
  debtPayments: number;
}> => {
  const tempDbName = `temp_inspect_${Date.now()}.db`;
  try {
    const tempDb = await SQLite.openDatabaseAsync(tempDbName);
    const targetPath = tempDb.databasePath;

    // Copy source file to tempDb location
    try {
      const { copyAsync } = await import("expo-file-system/legacy");
      await copyAsync({ from: fileUri, to: targetPath });
    } catch {
      const { File } = await import("expo-file-system");
      const src = new File(fileUri);
      const dst = new File(targetPath);
      await src.readableStream().pipeTo(dst.writableStream());
    }

    const inspectDb = await SQLite.openDatabaseAsync(tempDbName);

    const getCount = async (tableName: string): Promise<number> => {
      try {
        const row = await inspectDb.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) as count FROM ${tableName}`
        );
        return row?.count || 0;
      } catch {
        return 0;
      }
    };

    const stats = {
      transactions: await getCount("transactions"),
      categories: await getCount("categories"),
      budgets: await getCount("budgets"),
      wallets: await getCount("wallets"),
      debts: await getCount("debts"),
      debtPayments: await getCount("debt_payments"),
    };

    await inspectDb.closeAsync();
    await SQLite.deleteDatabaseAsync(tempDbName);

    return stats;
  } catch (err) {
    console.warn("inspectSQLiteDatabaseFile error:", err);
    try {
      await SQLite.deleteDatabaseAsync(tempDbName);
    } catch {}
    return {
      transactions: 0,
      categories: 0,
      budgets: 0,
      wallets: 0,
      debts: 0,
      debtPayments: 0,
    };
  }
};

/**
 * Restores the live application database from an actual SQLite .db file
 */
export const restoreSQLiteDatabaseFromFile = async (
  fileUri: string
): Promise<DatabaseImportResult> => {
  const result: DatabaseImportResult = {
    success: false,
    restoredCounts: {
      transactions: 0,
      categories: 0,
      budgets: 0,
      debts: 0,
      debtPayments: 0,
      wallets: 0,
      settings: 0,
    },
    errors: [],
  };

  const tempDbName = `temp_restore_${Date.now()}.db`;
  try {
    const tempDb = await SQLite.openDatabaseAsync(tempDbName);
    const targetPath = tempDb.databasePath;

    // Copy source file to tempDb location
    try {
      const { copyAsync } = await import("expo-file-system/legacy");
      await copyAsync({ from: fileUri, to: targetPath });
    } catch {
      const { File } = await import("expo-file-system");
      const src = new File(fileUri);
      const dst = new File(targetPath);
      await src.readableStream().pipeTo(dst.writableStream());
    }

    const sourceBackupDb = await SQLite.openDatabaseAsync(tempDbName);

    const getCount = async (tableName: string): Promise<number> => {
      try {
        const row = await sourceBackupDb.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) as count FROM ${tableName}`
        );
        return row?.count || 0;
      } catch {
        return 0;
      }
    };

    result.restoredCounts.transactions = await getCount("transactions");
    result.restoredCounts.categories = await getCount("categories");
    result.restoredCounts.budgets = await getCount("budgets");
    result.restoredCounts.wallets = await getCount("wallets");
    result.restoredCounts.debts = await getCount("debts");
    result.restoredCounts.debtPayments = await getCount("debt_payments");
    result.restoredCounts.settings = await getCount("settings");

    const liveDb = await SQLite.openDatabaseAsync(DATABASE.NAME);

    // Use native SQLite backup if available
    if (typeof (SQLite as any).backupDatabaseAsync === "function") {
      await (SQLite as any).backupDatabaseAsync({
        sourceDatabase: sourceBackupDb,
        destDatabase: liveDb,
      });
    } else {
      // Fallback: Copy tables
      const tables = (await sourceBackupDb.getAllAsync(`
        SELECT name, sql FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `)) as { name: string; sql: string }[];

      await liveDb.execAsync("PRAGMA foreign_keys = OFF; BEGIN TRANSACTION;");
      for (const t of tables) {
        await liveDb.execAsync(`DELETE FROM ${t.name};`);
        const rows = await sourceBackupDb.getAllAsync<any>(`SELECT * FROM ${t.name}`);
        if (rows.length > 0) {
          const cols = Object.keys(rows[0]);
          const placeholders = cols.map(() => "?").join(",");
          const stmt = await liveDb.prepareAsync(
            `INSERT OR REPLACE INTO ${t.name} (${cols.join(",")}) VALUES (${placeholders})`
          );
          for (const row of rows) {
            await stmt.executeAsync(cols.map((c) => row[c]));
          }
          await stmt.finalizeAsync();
        }
      }
      await liveDb.execAsync("COMMIT; PRAGMA foreign_keys = ON;");
    }

    await sourceBackupDb.closeAsync();
    await SQLite.deleteDatabaseAsync(tempDbName);

    // Recalculate entry counts & refresh wallet cache
    const dbManager = DatabaseManager.getInstance();
    await dbManager.recalculateEntryCounts();
    walletService.clearCache();
    await walletService.refreshCache();

    result.success = true;
    return result;
  } catch (error: any) {
    console.error("Error restoring SQLite database from file:", error);
    try {
      await SQLite.deleteDatabaseAsync(tempDbName);
    } catch {}
    result.errors.push(error?.message || "Failed to restore database from .db file");
    return result;
  }
};

/**
 * Fallback method: Export as SQL dump if database file creation fails
 */
const exportSQLiteDatabaseAsSQLDump = async (): Promise<void> => {
  const sourceDatabase = await SQLite.openDatabaseAsync(DATABASE.NAME);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
  const filename = `financy-backup-${timestamp}.sql`;

  const tables = (await sourceDatabase.getAllAsync(`
    SELECT name, sql FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `)) as { name: string; sql: string }[];

  let sqlContent = `-- Complete SQLite Database Export\n`;
  sqlContent += `-- File: ${filename}\n`;
  sqlContent += `-- Generated: ${new Date().toISOString()}\n\n`;
  sqlContent += `PRAGMA foreign_keys=OFF;\nBEGIN TRANSACTION;\n\n`;

  for (const table of tables) {
    sqlContent += `DROP TABLE IF EXISTS ${table.name};\n`;
    sqlContent += `${table.sql};\n\n`;

    const rows = await sourceDatabase.getAllAsync(`SELECT * FROM ${table.name}`);

    if (rows.length > 0) {
      const columns = Object.keys(rows[0] as Record<string, any>);

      for (const row of rows) {
        const rowData = row as Record<string, any>;
        const values = columns.map((col) => {
          const val = rowData[col];
          if (val === null || val === undefined) return "NULL";
          if (typeof val === "string") return `'${val.replace(/'/g, "''")}'`;
          return val;
        });

        sqlContent += `INSERT INTO ${table.name} VALUES (${values.join(",")});\n`;
      }
      sqlContent += "\n";
    }
  }

  sqlContent += `COMMIT;\n`;

  // Log the SQL content to console

  // Try to share the SQL file
  try {
    if (await Sharing.isAvailableAsync()) {
      // Save the SQL content to a file
      const fileUri = await createExportFile(filename, sqlContent);

      // Share the file
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/sql",
        dialogTitle: "SQL Database Export",
      });

    }
  } catch (shareError) {
    console.error("SQL file sharing failed:", shareError);

    // Fallback: Create a summary file
    try {
      const sqlSummary = {
        message: "SQLite Database Export Completed",
        filename: filename,
        timestamp: new Date().toISOString(),
        tables: tables.length,
        totalStatements: sqlContent.split("\n").length,
        note: "Full SQL export content is logged to console above. Copy from console to create your .sql file.",
      };

      const summaryFileName = filename.replace(".sql", "-summary.txt");
      const summaryFileUri = await createExportFile(summaryFileName, JSON.stringify(sqlSummary, null, 2));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(summaryFileUri, {
          mimeType: "text/plain",
          dialogTitle: "SQL Export Summary",
        });

      }
    } catch (fallbackError) {
      console.error("Even summary sharing failed:", fallbackError);
    }
  }
};

/**
 * Exports the entire database as a JSON file for backup/sharing purposes
 */
export const exportDatabaseToJSON = async (): Promise<void> => {
  try {
    // Fetch all data from database across all domains
    const [transactions, categories, budgets, debts, debtPayments, wallets, currentSettings] =
      await Promise.all([
        db.transactions.getAllTransactions(),
        db.categories.getAllCategories(),
        db.budgets.getAllBudgets(),
        db.debts.getAllDebts(),
        db.debts.getPaymentHistory(),
        db.wallets.getAllWallets({ includeArchived: true }),
        db.settings.getSettings().catch(() => null),
      ]);

    // Create export data structure
    const exportData: DatabaseExportData = {
      exportDate: new Date().toISOString(),
      version: "2.0.0",
      transactions,
      categories,
      budgets,
      debts,
      debtPayments,
      wallets,
      settings: currentSettings ? [currentSettings] : [],
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(exportData, null, 2);

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
    const filename = `financy-database-backup-${timestamp}.json`;

    // Log full export data to console

    if (await Sharing.isAvailableAsync()) {
      try {
        // Save the full export data to a file
        const fileUri = await createExportFile(filename, jsonString);

        // Share the file
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Database Export",
        });

      } catch (shareError) {
        console.error("Sharing failed:", shareError);

        // Fallback: Create a summary file instead
        try {
          const summaryData = {
            message: "Database export summary",
            timestamp: new Date().toISOString(),
            stats: {
              transactions: transactions.length,
              categories: categories.length,
              budgets: budgets.length,
              debts: debts.length,
              debtPayments: debtPayments.length,
              wallets: wallets.length,
              total:
                transactions.length +
                categories.length +
                budgets.length +
                debts.length +
                debtPayments.length +
                wallets.length,
            },
            note: "Full export data is available in the console logs",
            filename: filename,
          };

          const summaryFileUri = await createExportFile(
            `${filename.replace(".json", "-summary.txt")}`,
            JSON.stringify(summaryData, null, 2),
          );
          await Sharing.shareAsync(summaryFileUri, {
            mimeType: "text/plain",
            dialogTitle: "Database Export Summary",
          });

        } catch (fallbackError) {
          console.error("Fallback sharing also failed:", fallbackError);
          throw new Error("Export completed but sharing failed. Check console for full data.");
        }
      }
    } else {
      throw new Error("Sharing not available. Full export data logged to console.");
    }
  } catch (error) {
    console.error("Error exporting database:", error);
    throw error;
  }
};

/**
 * Gets database statistics for display
 */
export const getDatabaseStats = async () => {
  try {
    const [transactions, categories, budgets, debts, debtPayments, wallets] = await Promise.all([
      db.transactions.getAllTransactions(),
      db.categories.getAllCategories(),
      db.budgets.getAllBudgets(),
      db.debts.getAllDebts(),
      db.debts.getPaymentHistory(),
      db.wallets.getAllWallets({ includeArchived: true }),
    ]);

    return {
      transactions: transactions.length,
      categories: categories.length,
      budgets: budgets.length,
      debts: debts.length,
      debtPayments: debtPayments.length,
      wallets: wallets.length,
      totalRecords:
        transactions.length +
        categories.length +
        budgets.length +
        debts.length +
        debtPayments.length +
        wallets.length,
    };
  } catch (error) {
    console.error("Error getting database stats:", error);
    return {
      transactions: 0,
      categories: 0,
      budgets: 0,
      debts: 0,
      debtPayments: 0,
      wallets: 0,
      totalRecords: 0,
    };
  }
};

/**
 * Restores a full database backup from JSON data
 */
export const importDatabaseFromJSON = async (
  input: string | DatabaseExportData,
  options: { mode?: "replace" | "merge" } = { mode: "merge" },
): Promise<DatabaseImportResult> => {
  const result: DatabaseImportResult = {
    success: false,
    restoredCounts: {
      transactions: 0,
      categories: 0,
      budgets: 0,
      debts: 0,
      debtPayments: 0,
      wallets: 0,
      settings: 0,
    },
    errors: [],
  };

  try {
    let data: DatabaseExportData;
    if (typeof input === "string") {
      data = JSON.parse(input);
    } else {
      data = input;
    }

    if (!data || typeof data !== "object") {
      throw new Error("Invalid backup format: data must be a JSON object");
    }

    const dbManager = DatabaseManager.getInstance();
    await dbManager.ensureInitialized();
    const database = dbManager.getDatabase();

    await database.execAsync("PRAGMA foreign_keys = OFF;");
    await database.execAsync("BEGIN TRANSACTION;");

    const columnCache = new Map<string, Set<string>>();
    const getTableColumns = async (tableName: string): Promise<Set<string>> => {
      if (columnCache.has(tableName)) return columnCache.get(tableName)!;
      try {
        const rows = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName});`);
        const set = new Set(rows.map((r) => r.name));
        columnCache.set(tableName, set);
        return set;
      } catch {
        const empty = new Set<string>();
        columnCache.set(tableName, empty);
        return empty;
      }
    };

    const runInsertDynamic = async (tableName: string, rowMap: Record<string, any>) => {
      const tableCols = await getTableColumns(tableName);
      const validCols: string[] = [];
      const validVals: any[] = [];
      for (const [col, val] of Object.entries(rowMap)) {
        if (tableCols.has(col)) {
          validCols.push(col);
          validVals.push(val);
        }
      }
      if (validCols.length === 0) return;
      const placeholders = validCols.map(() => "?").join(", ");
      const sql = `INSERT OR REPLACE INTO ${tableName} (${validCols.join(", ")}) VALUES (${placeholders});`;
      await database.runAsync(sql, validVals);
    };

    try {
      if (options.mode === "replace") {
        await database.execAsync(`
          DELETE FROM debt_payments;
          DELETE FROM debts;
          DELETE FROM transactions;
          DELETE FROM budgets;
          DELETE FROM categories;
          DELETE FROM wallets;
        `);
      }

      // 1. Restore Categories
      if (Array.isArray(data.categories)) {
        for (const cat of data.categories) {
          if (!cat.id || !cat.name) continue;
          await runInsertDynamic("categories", {
            id: cat.id,
            name: cat.name,
            type: cat.type || "expense",
            color: cat.color || null,
            icon: cat.icon || null,
            entry_count: cat.entryCount ?? cat.entry_count ?? 0,
            created_at: cat.createdAt || cat.created_at || new Date().toISOString(),
            updated_at: cat.updatedAt ? (typeof cat.updatedAt === "number" ? new Date(cat.updatedAt).toISOString() : cat.updatedAt) : new Date().toISOString(),
            sync_updated_at: typeof cat.updatedAt === "number" ? cat.updatedAt : Date.now(),
            deleted: cat.deleted ? 1 : 0,
            sync_status: cat.syncStatus || "pending",
          });
          result.restoredCounts.categories++;
        }
      }

      // 2. Restore Wallets
      if (Array.isArray(data.wallets)) {
        for (const wallet of data.wallets) {
          if (!wallet.id || !wallet.name) continue;
          await runInsertDynamic("wallets", {
            id: wallet.id,
            name: wallet.name,
            type: wallet.type || "cash",
            icon: wallet.icon || "wallet-outline",
            color: wallet.color || "teal",
            initial_balance: wallet.initialBalance ?? wallet.initial_balance ?? 0,
            is_secret: wallet.isSecret ?? wallet.is_secret ? 1 : 0,
            archived: wallet.archived ? 1 : 0,
            created_at: wallet.createdAt || wallet.created_at || new Date().toISOString(),
            updated_at: wallet.updatedAt || Date.now(),
            sync_updated_at: wallet.syncUpdatedAt || Date.now(),
            deleted: wallet.deleted ? 1 : 0,
            sync_status: wallet.syncStatus || "pending",
          });
          result.restoredCounts.wallets++;
        }
      }

      // 3. Restore Budgets
      if (Array.isArray(data.budgets)) {
        for (const budget of data.budgets) {
          if (!budget.id || !budget.name) continue;
          await runInsertDynamic("budgets", {
            id: budget.id,
            name: budget.name,
            amount: budget.amount ?? 0,
            current_balance: budget.currentBalance ?? budget.current_balance ?? 0,
            period_type: budget.period || budget.period_type || "monthly",
            category_id: budget.categoryId || budget.category_id || null,
            reset_day: budget.resetDay ?? budget.reset_day ?? 1,
            created_at: budget.createdAt || budget.created_at || new Date().toISOString(),
            updated_at: budget.updatedAt || budget.updated_at || new Date().toISOString(),
            sync_updated_at: budget.syncUpdatedAt || Date.now(),
            deleted: budget.deleted ? 1 : 0,
            sync_status: budget.syncStatus || "pending",
          });
          result.restoredCounts.budgets++;
        }
      }

      // 4. Restore Debts
      if (Array.isArray(data.debts)) {
        for (const debt of data.debts) {
          if (!debt.id || !debt.name) continue;
          await runInsertDynamic("debts", {
            id: debt.id,
            name: debt.name,
            debt_type: debt.type || debt.debt_type || "i_owe",
            amount: debt.totalAmount ?? debt.total_amount ?? debt.amount ?? 0,
            total_amount: debt.totalAmount ?? debt.total_amount ?? debt.amount ?? 0,
            current_balance: debt.currentBalance ?? debt.current_balance ?? 0,
            monthly_payment: debt.monthlyPayment ?? debt.monthly_payment ?? null,
            interest_rate: debt.interestRate ?? debt.interest_rate ?? null,
            minimum_payment: debt.minimumPayment ?? debt.minimum_payment ?? null,
            due_date: debt.dueDate || debt.due_date || null,
            creditor: debt.creditor || null,
            description: debt.description || null,
            category_id: debt.categoryId || debt.category_id || null,
            budget_id: debt.budgetId || debt.budget_id || null,
            created_at: debt.createdAt || debt.created_at || new Date().toISOString(),
            updated_at: debt.updatedAt || debt.updated_at || new Date().toISOString(),
            sync_updated_at: debt.syncUpdatedAt || Date.now(),
            deleted: debt.deleted ? 1 : 0,
            sync_status: debt.syncStatus || "pending",
          });
          result.restoredCounts.debts++;
        }
      }

      // 5. Restore Debt Payments
      if (Array.isArray(data.debtPayments)) {
        for (const payment of data.debtPayments) {
          if (!payment.id || (!payment.debtId && !payment.debt_id)) continue;
          await runInsertDynamic("debt_payments", {
            id: payment.id,
            debt_id: payment.debtId || payment.debt_id,
            amount: payment.amount ?? 0,
            date: payment.date || payment.paymentDate || payment.payment_date || new Date().toISOString(),
            payment_date: payment.paymentDate || payment.payment_date || payment.date || new Date().toISOString(),
            principal: payment.principal ?? payment.amount ?? 0,
            interest: payment.interest ?? 0,
            note: payment.note || null,
            created_at: payment.createdAt || payment.created_at || new Date().toISOString(),
            updated_at: typeof payment.updatedAt === "number" ? payment.updatedAt : Date.now(),
            sync_updated_at: typeof payment.updatedAt === "number" ? payment.updatedAt : Date.now(),
            deleted: payment.deleted ? 1 : 0,
            sync_status: payment.syncStatus || "pending",
          });
          result.restoredCounts.debtPayments++;
        }
      }

      // 6. Restore Transactions
      if (Array.isArray(data.transactions)) {
        for (const tx of data.transactions) {
          if (!tx.id || !tx.amount) continue;
          await runInsertDynamic("transactions", {
            id: tx.id,
            amount: tx.amount,
            type: tx.type || "expense",
            category_id: tx.categoryId || tx.category_id || null,
            budget_id: tx.budgetId || tx.budget_id || null,
            account_id: tx.accountId || tx.account_id || "default_cash",
            to_account_id: tx.toAccountId || tx.to_account_id || null,
            receipt_uri: tx.receiptUri || tx.receipt_uri || null,
            description: tx.description || "Restored transaction",
            date: tx.date || new Date().toISOString(),
            note: tx.note || null,
            linked_debt_payment_id: tx.linkedDebtPaymentId || tx.linked_debt_payment_id || null,
            created_at: tx.createdAt || tx.created_at || new Date().toISOString(),
            updated_at: typeof tx.updatedAt === "number" ? tx.updatedAt : Date.now(),
            duplicated_at: tx.duplicatedAt || tx.duplicated_at || null,
            sync_updated_at: typeof tx.updatedAt === "number" ? tx.updatedAt : Date.now(),
            deleted: tx.deleted ? 1 : 0,
            sync_status: tx.syncStatus || "pending",
          });
          result.restoredCounts.transactions++;
        }
      }

      // 7. Restore Settings
      if (Array.isArray(data.settings) && data.settings.length > 0) {
        const s = data.settings[0];
        if (s) {
          await database.runAsync(
            `UPDATE settings SET
              billing_period_start_day = ?,
              currency = ?,
              firebase_sync = ?,
              theme = ?,
              updated_at = ?
            WHERE id = 'default'`,
            [
              s.billingPeriodStartDay ?? s.billing_period_start_day ?? 1,
              s.currency || "USD",
              s.firebaseSync ?? s.firebase_sync ? 1 : 0,
              s.theme || "dark",
              new Date().toISOString(),
            ],
          );
          result.restoredCounts.settings++;
        }
      }

      await database.execAsync("COMMIT;");
      result.success = true;
    } catch (innerError) {
      await database.execAsync("ROLLBACK;");
      throw innerError;
    } finally {
      await database.execAsync("PRAGMA foreign_keys = ON;");
    }

    // Recalculate entry counts & refresh wallet balances cache
    try {
      await dbManager.recalculateEntryCounts();
      walletService.clearCache();
      await walletService.refreshCache();
    } catch (refreshErr) {
      console.warn("Post-restore refresh non-fatal error:", refreshErr);
    }

    return result;
  } catch (error: any) {
    console.error("Failed to restore database from backup:", error);
    result.errors.push(error?.message || "Unknown restore error");
    return result;
  }
};
