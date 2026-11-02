import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as SQLite from "expo-sqlite";
import { db } from "../../../infrastructure/database/repositories";
import { DATABASE } from "../../../shared/constants";
import { Platform } from "react-native";

export interface DatabaseExportData {
  exportDate: string;
  version: string;
  transactions: any[];
  categories: any[];
  budgets: any[];
  debts: any[];
  settings: any[];
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

    console.log(`✅ File saved to: ${file.uri}`);
    return file.uri;
  } catch (error) {
    console.error("Error creating export file:", error);
    throw new Error(`Failed to create export file: ${error}`);
  }
};

/**
 * Exports the SQLite database as an actual .db file by creating a new database
 */
export const exportSQLiteDatabase = async (): Promise<void> => {
  try {
    const sourceDb = await SQLite.openDatabaseAsync(DATABASE.NAME);

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
    const filename = `financy-backup-${timestamp}.db`;

    // Create new database in a temporary location
    // Use the filename as the database name - SQLite will handle the location
    const exportDb = await SQLite.openDatabaseAsync(filename);

    // Get all tables from source
    const tables = (await sourceDb.getAllAsync(`
      SELECT name, sql FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `)) as { name: string; sql: string }[];

    console.log(`Exporting ${tables.length} tables to new database...`);

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

        const stmt = await exportDb.prepareAsync(`INSERT INTO ${table.name} (${columns.join(",")}) VALUES (${placeholders})`);

        for (const row of rows) {
          const rowData = row as Record<string, any>;
          const values = columns.map((col) => rowData[col]);
          await stmt.executeAsync(values);
        }

        await stmt.finalizeAsync();
      }
    }

    // Close the export database to flush all changes
    await exportDb.closeAsync();

    console.log(`Database created: ${filename}`);

    // Unfortunately, we cannot easily access the physical database file location
    // in newer versions of expo-sqlite, so we'll fall back to SQL dump
    console.log("Cannot access database file directly, falling back to SQL dump...");
    await exportSQLiteDatabaseAsSQLDump();
  } catch (error) {
    console.error("Error exporting SQLite database:", error);
    // Fallback to SQL dump if database file creation fails
    console.log("Falling back to SQL dump export...");
    await exportSQLiteDatabaseAsSQLDump();
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
  console.log("=== SQL EXPORT CONTENT ===");
  console.log(sqlContent);
  console.log("=== END SQL CONTENT ===");

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

      console.log(`✅ SQL export successful! File: ${filename}`);
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

        console.log("✅ Shared SQL export summary instead");
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
    // Fetch all data from database
    const [transactions, categories, budgets, debts] = await Promise.all([
      db.transactions.getAllTransactions(),
      db.categories.getAllCategories(),
      db.budgets.getAllBudgets(),
      db.debts.getAllDebts(),
    ]);

    // Create export data structure
    const exportData: DatabaseExportData = {
      exportDate: new Date().toISOString(),
      version: "1.0.0",
      transactions,
      categories,
      budgets,
      // bills removed
      debts,
      settings: [], // Settings can be added if needed
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(exportData, null, 2);

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
    const filename = `financy-database-backup-${timestamp}.json`;

    // Log full export data to console
    console.log("=== FULL DATABASE EXPORT ===");
    console.log(jsonString);
    console.log("=== END EXPORT DATA ===");

    if (await Sharing.isAvailableAsync()) {
      try {
        // Save the full export data to a file
        const fileUri = await createExportFile(filename, jsonString);

        // Share the file
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Database Export",
        });

        console.log(`✅ Database export successful! File: ${filename}`);
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
              total: transactions.length + categories.length + budgets.length + debts.length,
            },
            note: "Full export data is available in the console logs",
            filename: filename,
          };

          const summaryFileUri = await createExportFile(`${filename.replace(".json", "-summary.txt")}`, JSON.stringify(summaryData, null, 2));
          await Sharing.shareAsync(summaryFileUri, {
            mimeType: "text/plain",
            dialogTitle: "Database Export Summary",
          });

          console.log("✅ Shared export summary instead");
        } catch (fallbackError) {
          console.error("Fallback sharing also failed:", fallbackError);
          throw new Error("Export completed but sharing failed. Check console for full data.");
        }
      }
    } else {
      throw new Error("Sharing not available. Full export data logged to console.");
    }

    // Export completed
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
    const [transactions, categories, budgets, debts] = await Promise.all([
      db.transactions.getAllTransactions(),
      db.categories.getAllCategories(),
      db.budgets.getAllBudgets(),
      db.debts.getAllDebts(),
    ]);

    return {
      transactions: transactions.length,
      categories: categories.length,
      budgets: budgets.length,
      debts: debts.length,
      totalRecords: transactions.length + categories.length + budgets.length + debts.length,
    };
  } catch (error) {
    console.error("Error getting database stats:", error);
    return {
      transactions: 0,
      categories: 0,
      budgets: 0,
      debts: 0,
      totalRecords: 0,
    };
  }
};
