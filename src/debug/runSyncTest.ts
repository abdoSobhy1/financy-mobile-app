import { offlineFirstSync } from "../services/OfflineFirstSync";

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
    const res = await offlineFirstSync.applyRemoteAndCheckNoLog("debts", fakeDebt.id, fakeDebt);
    console.log("runSyncApplyTest result:", res);
    return res;
  } catch (err) {
    console.error("runSyncApplyTest error:", err);
    throw err;
  }
}

export async function runAllSyncApplyTests() {
  console.log("runAllSyncApplyTests: starting");
  const tables = ["categories", "budgets", "transactions", "bills", "debts", "debt_payments", "settings"];
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
          payload.categoryId = null; // No default categories
          payload.date = new Date().toISOString();
          payload.description = "Test Transaction";
          break;
        case "bills":
          payload.name = "Test Bill";
          payload.amount = 1;
          payload.dueDate = new Date().toISOString();
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
          payload.billingPeriodStartDay = 28;
          payload.currency = "USD";
          payload.firebaseSync = 0;
          break;
      }

      const res = await offlineFirstSync.applyRemoteAndCheckNoLog(table, id, payload as any);
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
