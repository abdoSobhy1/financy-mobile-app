import { DatabaseManager } from "../database";
import { syncService } from "../services/syncService";
import { COLLECTIONS, CollectionName } from "../types";

const TABLE_TO_COLLECTION: Record<string, CollectionName> = {
  transactions: COLLECTIONS.TRANSACTIONS,
  categories: COLLECTIONS.CATEGORIES,
  budgets: COLLECTIONS.BUDGETS,
  debts: COLLECTIONS.DEBTS,
  debt_payments: COLLECTIONS.DEBT_PAYMENTS,
  settings: COLLECTIONS.SETTINGS,
  wallets: COLLECTIONS.WALLETS,
};

/**
 * Testing helper: apply a remote document via the SyncService test helper and
 * then return the number of new sync_log entries for the corresponding table.
 * Useful to assert that applying remote documents does not create local sync_log entries.
 */
export async function applyRemoteAndCheckNoLog(
  tableName: string,
  docId: string,
  docData: any,
): Promise<{ newLogCount: number; error?: string }> {
  try {
    const db = DatabaseManager.getInstance();
    await db.ensureInitialized();
    const database = db.getDatabase();
    const beforeRow = (await database.getFirstAsync(
      `SELECT COUNT(*) as count FROM sync_log WHERE table_name = ?`,
      [tableName],
    )) as { count: number } | null;
    const before = beforeRow?.count || 0;

    const collectionName = TABLE_TO_COLLECTION[tableName];
    if (!collectionName) {
      throw new Error(`Unknown table name: ${tableName}`);
    }

    await syncService.applyRemoteDocumentForTest(
      collectionName,
      docId,
      docData as any,
    );

    const afterRow = (await database.getFirstAsync(
      `SELECT COUNT(*) as count FROM sync_log WHERE table_name = ?`,
      [tableName],
    )) as { count: number } | null;
    const after = afterRow?.count || 0;

    const newLogCount = after - before;
    return { newLogCount };
  } catch (error: any) {
    return { newLogCount: -1, error: error?.message || String(error) };
  }
}

export async function runSyncApplyTest() {
  console.log("runSyncApplyTest: starting");
  const fakeDebt = {
    id: "test-debt-1",
    name: "Test Debt from Remote",
    amount: 100,
    totalAmount: 100,
    currentBalance: 100,
    updatedAt: Date.now(),
  } as any;

  try {
    const res = await applyRemoteAndCheckNoLog("debts", fakeDebt.id, fakeDebt);
    console.log("runSyncApplyTest result:", res);
    return res;
  } catch (err) {
    console.error("runSyncApplyTest error:", err);
    throw err;
  }
}

export async function runAllSyncApplyTests() {
  console.log("runAllSyncApplyTests: starting");
  const tables = [
    "categories",
    "budgets",
    "transactions",
    "debts",
    "debt_payments",
    "settings",
  ];
  const results: Record<string, { newLogCount: number; error?: string }> = {};

  for (const table of tables) {
    try {
      const id = `test-${table}-${Date.now()}`;
      // Minimal fake payload per table
      const payload: any = { id, updatedAt: Date.now() };
      switch (table) {
        case "categories":
          payload.name = "Test Category";
          payload.type = "expense";
          break;
        case "budgets":
          payload.name = "Test Budget";
          payload.amount = 1;
          payload.resetDay = 1;
          break;
        case "transactions":
          payload.amount = 1;
          payload.type = "expense";
          payload.categoryId = null;
          payload.date = new Date().toISOString();
          payload.description = "Test Transaction";
          break;
        case "debts":
          payload.name = "Test Debt";
          payload.amount = 1;
          payload.totalAmount = 1;
          payload.currentBalance = 1;
          break;
        case "debt_payments":
          payload.debtId = payload.debtId || "test-debt-1";
          payload.amount = 1;
          payload.paymentDate = new Date().toISOString();
          payload.principal = 1;
          break;
        case "settings":
          payload.billingPeriodStartDay = 1;
          payload.currency = "USD";
          payload.firebaseSync = 0;
          break;
      }

      const res = await applyRemoteAndCheckNoLog(table, id, payload as any);
      results[table] = res;
      console.log(`runAll: ${table} ->`, res);
    } catch (err: any) {
      console.error(`runAll error for ${table}:`, err);
      results[table] = { newLogCount: -1, error: err?.message || String(err) };
    }
    // small delay to avoid tight loop
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log("runAllSyncApplyTests result:", results);
  return results;
}
