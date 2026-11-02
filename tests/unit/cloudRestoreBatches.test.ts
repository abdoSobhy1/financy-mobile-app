import assert from "node:assert/strict";
import Module from "node:module";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RestoreWrite } from "../../src/infrastructure/sync/restoreBatches";

const sqlitePath = join(tmpdir(), `financy-restore-test-${randomUUID()}.db`);
const sqlite = new DatabaseSync(sqlitePath, { enableDoubleQuotedStringLiterals: true });
const metrics = { commits: 0, rollbacks: 0, prepared: 0, finalized: 0, referenceReads: 0, pointReads: 0 };
let inTransaction = false;
function adapter(handle: DatabaseSync): any {
  const transaction = async (task: (database: any) => Promise<void>) => {
    assert.equal(inTransaction, false);
    handle.exec("BEGIN");
    inTransaction = true;
    try {
      await task(connection);
      handle.exec("COMMIT");
      metrics.commits++;
    } catch (error) {
      handle.exec("ROLLBACK");
      metrics.rollbacks++;
      throw error;
    } finally {
      inTransaction = false;
    }
  };
  const connection: any = {
    databasePath: sqlitePath,
    options: {},
    closeAsync: async () => handle.close(),
    execAsync: async (sql: string) => handle.exec(sql),
    runAsync: async (sql: string, params: any[] = []) => handle.prepare(sql).run(...params),
    getAllAsync: async (sql: string, params: any[] = []) => {
      if (/^SELECT id FROM /.test(sql)) metrics.referenceReads++;
      return handle.prepare(sql).all(...params);
    },
    getFirstAsync: async (sql: string, params: any[] = []) => {
      if (/^SELECT id FROM (categories|budgets|debts) WHERE/.test(sql)) metrics.pointReads++;
      return handle.prepare(sql).get(...params) ?? null;
    },
    prepareAsync: async (sql: string) => {
      metrics.prepared++;
      assert.equal(handle.prepare("PRAGMA foreign_keys").get()!.foreign_keys, 1,
        "The dedicated restore connection must enable foreign keys before BEGIN");
      const statement = handle.prepare(sql);
      return {
        executeAsync: async (params: any[]) => statement.run(...params),
        finalizeAsync: async () => { metrics.finalized++; },
      };
    },
    withExclusiveTransactionAsync: transaction,
    withTransactionAsync: async (task: () => Promise<void>) => transaction(task),
  };
  return connection;
}
const database = adapter(sqlite);

const loader = Module as any;
const originalLoad = loader._load;
const collections: Record<string, any[]> = {};
const fetched: string[] = [];
const removed: string[] = [];
const remote = {
  clearFailedInserts: () => {},
  getFailedInserts: () => [],
  getAllDocumentsFromCollection: async (collection: string) => {
    assert.equal(inTransaction, false, "Cloud reads must not hold a database transaction");
    fetched.push(collection);
    return collections[collection] ?? [];
  },
  syncLocalChanges: async (_collection: string, operation: string, id: string) => {
    assert.equal(inTransaction, false, "Cloud deletes must happen after local commits");
    assert.equal(operation, "delete");
    removed.push(id);
  },
};
loader._load = function(request: string, parent: any, isMain: boolean) {
  if (request === "expo-sqlite") return { openDatabaseAsync: async () =>
    adapter(new DatabaseSync(sqlitePath, { enableDoubleQuotedStringLiterals: true })) };
  if (request.endsWith("/database")) return { DatabaseManager: { getInstance: () => ({
    ensureInitialized: async () => {}, getDatabase: () => database, isReady: () => true,
  }) } };
  if (request.endsWith("/authService")) return { authService: { isCloudSyncAllowedAsync: async () => true } };
  if (request === "./syncService") return { syncService: remote };
  if (request.endsWith("/notificationService")) return { __esModule: true, default: {} };
  if (request.endsWith("/deviceTracking")) return { addDeviceTracking: async (value: any) => value };
  if (request.endsWith("/app/store")) return { store: { dispatch: () => {
    assert.equal(inTransaction, false, "UI refresh must happen after commit");
  } } };
  if (request.endsWith("/settings/store/settingsSlice")) return { fetchSettings: () => ({ type: "settings/fetch" }) };
  if (request.endsWith("/debts/repositories/debtsRepository")) return { DebtRepository: class {
    async reconcileDebtBalances() {}
  } };
  return originalLoad.call(this, request, parent, isMain);
};

async function run() {
  const { applyRestoreBatches }: typeof import("../../src/infrastructure/sync/restoreBatches") =
    require("../../src/infrastructure/sync/restoreBatches");
  // Build the app's actual schema, including its foreign key constraints.
  const { DatabaseManager } = require("../../src/infrastructure/database/index");
  const manager = DatabaseManager.getInstance() as any;
  manager.db = database;
  await manager.createTables();

  const sql = "INSERT OR REPLACE INTO categories (id, name, type) VALUES (?, ?, ?)";
  const writes: RestoreWrite[] = Array.from({ length: 451 }, (_, index) => async (writer) => {
    await writer.runAsync(sql, [`c${index}`, `Category ${index}`, "expense"]);
  });
  await applyRestoreBatches(database, writes);
  assert.equal(metrics.commits, 3, "451 rows should commit in three bounded batches");
  assert.equal(metrics.prepared, 3, "One prepared insert is reused for all rows in each batch");
  assert.equal(metrics.finalized, 3);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM categories").get()!.count, 451);

  await assert.rejects(applyRestoreBatches(database, [
    async (writer) => { await writer.runAsync(sql, ["rolled-back", "Valid", "expense"]); },
    async (writer) => { await writer.runAsync(sql, ["invalid", null, "expense"]); },
  ]), /NOT NULL/);
  assert.equal(sqlite.prepare("SELECT id FROM categories WHERE id = 'rolled-back'").get(), undefined);
  assert.equal(metrics.rollbacks, 1, "A failed row rolls back the complete batch");
  assert.equal(metrics.prepared, metrics.finalized, "Statements are released after rollback too");

  await database.runAsync(`INSERT INTO transactions (id, amount, type, category_id, description, date)
    VALUES ('existing-tx', 10, 'expense', 'c0', 'Keep this link', '2026-11-02')`);
  await applyRestoreBatches(database, [async (writer) => {
    await writer.runAsync(sql, ["c0", "Updated without deleting", "expense"]);
  }]);
  assert.equal(sqlite.prepare("SELECT category_id FROM transactions WHERE id = 'existing-tx'").get()!.category_id, "c0");

  await database.runAsync("UPDATE categories SET name = 'Local edit', sync_updated_at = 900 WHERE id = 'c1'");
  await database.runAsync("UPDATE categories SET deleted = 1 WHERE id = 'c2'");
  await database.runAsync(`INSERT INTO sync_log (table_name, record_id, operation, payload, created_at)
    VALUES ('categories', 'pending-delete', 'delete', '{}', 1)`);
  collections.categories = [
    { id: "c0", name: "Cloud edit", type: "expense", updatedAt: 1000 },
    { id: "c1", name: "Old cloud edit", type: "expense", updatedAt: 100 },
    { id: "c2", name: "Locally deleted", type: "expense", updatedAt: 1000 },
    { id: "c3", deleted: true },
    { id: "pending-delete", name: "Do not resurrect", type: "expense" },
    { id: "new-category", name: "New", type: "expense", updatedAt: 1000 },
  ];
  collections.settings = [{ id: "default", currency: "EGP", theme: "dark", billingPeriodStartDay: 15, updatedAt: 1000 }];
  collections.wallets = [{ id: "wallet", name: "Cash", type: "cash", updatedAt: 1000 }];
  const smsConfig = { bankSenders: ["CUSTOM-BANK"], incomeKeywords: [], expenseKeywords: ["paid"],
    atmKeywords: [], currencyKeywords: ["EGP"], ignoreAtmWithdrawals: false };
  collections.sms_settings = [{ id: "default", config: smsConfig, enabled: false, updatedAt: 1000 }];
  collections.budgets = [{ id: "budget", name: "Food", amount: 100, categoryId: "c0", updatedAt: 1000 }];
  collections.transactions = [0, 1].map((index) => ({
    id: `new-tx-${index}`, amount: 10, type: "expense", categoryId: "c0", budgetId: "budget",
    description: "Restored", date: "2026-11-02", updatedAt: 1000,
  }));
  collections.debts = [{ id: "debt", name: "Loan", type: "i_owe", totalAmount: 100, currentBalance: 100, updatedAt: 1000 }];
  collections.debt_payments = [{ id: "payment", debtId: "debt", amount: 10, date: "2026-11-02", updatedAt: 1000 }];
  const { offlineFirstSync } = require("../../src/infrastructure/sync/OfflineFirstSync");
  const result = await offlineFirstSync.executePhasedCloudRestore();
  assert.deepEqual(result.errors, []);
  assert.deepEqual(fetched, ["categories", "settings", "wallets", "sms_settings", "budgets", "transactions", "debts", "debt_payments"]);
  assert.equal(result.itemsCreated, 9);
  assert.equal(result.itemsUpdated, 2);
  assert.equal(sqlite.prepare("SELECT name FROM categories WHERE id = 'c1'").get()!.name, "Local edit");
  assert.equal(sqlite.prepare("SELECT id FROM categories WHERE id = 'pending-delete'").get(), undefined);
  assert.equal(sqlite.prepare("SELECT id FROM categories WHERE id = 'c3'").get(), undefined);
  assert.deepEqual(removed.sort(), ["c2", "c3", "pending-delete"]);
  assert.equal(sqlite.prepare("SELECT category_id FROM transactions WHERE id = 'existing-tx'").get()!.category_id, "c0");
  assert.equal(sqlite.prepare("SELECT budget_id FROM transactions WHERE id = 'new-tx-0'").get()!.budget_id, "budget");
  assert.equal(sqlite.prepare("SELECT sync_updated_at FROM settings WHERE id = 'default'").get()!.sync_updated_at, 1000);
  assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
  assert.equal(metrics.referenceReads, 4, "Reference IDs are loaded once per table per batch");
  assert.equal(metrics.pointReads, 0, "Repeated reference checks must not make per-row database calls");
  assert.equal(metrics.prepared, metrics.finalized);
  const storage = require("@react-native-async-storage/async-storage").default;
  const sms = require("../../src/features/sms/services/smsConfigService");
  assert.deepEqual(await sms.getSmsConfig(), smsConfig, "Cloud restore must refresh the parser's cached rules");
  assert.equal(await storage.getItem("sms_detection_enabled"), "false");
  const { SmsSettingsRepository } = require("../../src/features/sms/services/smsSettingsRepository");
  const logged: any[] = [];
  offlineFirstSync.logOperation = async (...args: any[]) => { logged.push(args); };
  await sms.saveSmsConfig({ ...smsConfig, bankSenders: [] });
  assert.equal(logged[0][0], "sms_settings");
  assert.deepEqual(logged[0][3].config.bankSenders, [], "Deleting all senders must sync an empty list");
  assert.equal(sqlite.prepare("SELECT sync_status FROM sms_settings").get()!.sync_status, "pending");
  await new SmsSettingsRepository().applyRemote({ config: smsConfig, enabled: true, updatedAt: 2000 });
  assert.equal(logged.length, 1, "Applying cloud rules must not queue another upload");
  assert.equal(await storage.getItem("sms_detection_enabled"), "true");
  await database.runAsync("DELETE FROM sms_settings");
  await new SmsSettingsRepository().migrateLegacy();
  assert.equal(sqlite.prepare("SELECT sync_updated_at FROM sms_settings").get()!.sync_updated_at, 0,
    "Legacy SMS rules must not be given a fresh edit time that could overwrite existing cloud rules");
  assert.equal(sqlite.prepare("SELECT sync_status FROM sms_settings").get()!.sync_status, "pending",
    "Previously saved device rules must be included in the next cloud backup");

  fetched.length = 0;
  const removedBeforeFailure = removed.length;
  collections.categories = [
    { id: "batch-before-failure", name: "Must roll back", type: "expense", updatedAt: 1000 },
    { id: "invalid-category", name: "Invalid type", type: "invalid", updatedAt: 1000 },
    { id: "pending-delete", name: "Defer remote delete", type: "expense" },
  ];
  const failed = await offlineFirstSync.executePhasedCloudRestore();
  assert.equal(failed.errors.length, 1);
  assert.deepEqual(fetched, ["categories"], "A failed category batch must stop dependent collection restores");
  assert.equal(sqlite.prepare("SELECT id FROM categories WHERE id = 'batch-before-failure'").get(), undefined);
  assert.equal(removed.length, removedBeforeFailure, "Remote deletes must not run after a local batch failure");
  console.log("Cloud restore batch tests passed (451 rows: 3 transactions and 3 prepared inserts).");
}

run().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => {
    loader._load = originalLoad;
    sqlite.close();
    for (const path of [sqlitePath, `${sqlitePath}-wal`, `${sqlitePath}-shm`]) {
      if (existsSync(path)) unlinkSync(path);
    }
  });
