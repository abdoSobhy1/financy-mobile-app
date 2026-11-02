import { Platform } from "react-native";
import { openDatabaseAsync } from "expo-sqlite";
import type { SQLiteBindValue, SQLiteDatabase, SQLiteRunResult, SQLiteStatement } from "expo-sqlite";

export interface RestoreWriter {
  runAsync(sql: string, params: SQLiteBindValue[]): Promise<SQLiteRunResult>;
  getFirstAsync<T = unknown>(sql: string, params: SQLiteBindValue[]): Promise<T | null>;
}

export type RestoreWrite = (writer: RestoreWriter) => Promise<void>;

// REPLACE deletes the old row before inserting, which can break its references.
function restoreUpsert(sql: string): string {
  const match = sql.match(/^\s*INSERT OR REPLACE INTO (\w+)\s*\(([^)]+)\)/i);
  if (!match) return sql;
  const columns = match[2].split(",").map((column) => column.trim());
  return sql.replace(/INSERT OR REPLACE INTO/i, "INSERT INTO") +
    ` ON CONFLICT(id) DO UPDATE SET ${columns.filter((column) => column !== "id")
      .map((column) => `${column} = excluded.${column}`).join(", ")}`;
}

/** Apply local-only writes; fetching cloud data and remote deletes happen outside. */
export async function applyRestoreBatches(
  database: SQLiteDatabase,
  writes: RestoreWrite[],
  batchSize = 200,
): Promise<void> {
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new Error("Invalid restore batch size");
  if (writes.length === 0) return;
  // Use a dedicated connection so unrelated app writes cannot join these
  // transactions. Configure foreign keys before BEGIN (SQLite ignores changes
  // to that pragma once a transaction has started).
  const path = database.databasePath.replace(/\\/g, "/");
  const separator = path.lastIndexOf("/");
  const connection = Platform.OS === "web" ? database : await openDatabaseAsync(
    path.slice(separator + 1),
    { ...database.options, useNewConnection: true },
    separator < 0 ? undefined : path.slice(0, separator),
  );
  try {
    await connection.execAsync("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    for (let offset = 0; offset < writes.length; offset += batchSize) {
      const batch = writes.slice(offset, offset + batchSize);
      const apply = async (transaction: SQLiteDatabase) => {
        const statements = new Map<string, SQLiteStatement>();
        const referenceIds = new Map<string, Set<string>>();
        const writer: RestoreWriter = {
          async runAsync(sql, params) {
            let statement = statements.get(sql);
            if (!statement) {
              statement = await transaction.prepareAsync(restoreUpsert(sql));
              statements.set(sql, statement);
            }
            return await statement.executeAsync(params);
          },
          async getFirstAsync<T>(sql: string, params: SQLiteBindValue[]): Promise<T | null> {
            const reference = sql.match(/^SELECT id FROM (categories|budgets|debts) WHERE id = \?$/);
            if (!reference) return await transaction.getFirstAsync<T>(sql, params);
            const table = reference[1];
            let ids = referenceIds.get(table);
            if (!ids) {
              const rows = await transaction.getAllAsync<{ id: string }>(`SELECT id FROM ${table}`);
              ids = new Set(rows.map((row) => row.id));
              referenceIds.set(table, ids);
            }
            return ids.has(String(params[0])) ? { id: params[0] } as T : null;
          },
        };
        try {
          for (const write of batch) await write(writer);
        } finally {
          const results = await Promise.allSettled([...statements.values()].map((statement) => statement.finalizeAsync()));
          const failure = results.find((result) => result.status === "rejected");
          if (failure?.status === "rejected") throw failure.reason;
        }
      };
      await connection.withTransactionAsync(() => apply(connection));
    }
  } finally {
    if (connection !== database) await connection.closeAsync();
  }
}
