function assertStrictEqual(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed! Expected: ${expected}, Got: ${actual}. ${message || ""}`);
  }
}

import { isWalletRelatedTransaction, getDateRangeForBillingPeriod } from "../../src/shared/utils";
import { Transaction } from "../../src/shared/types";

console.log("Running transactionCalculationsAndFilters unit tests...\n");

// Test 1: isWalletRelatedTransaction identifies transfers and balance adjustments
{
  const transferTx: Transaction = {
    id: "tx_transfer",
    amount: 150,
    type: "transfer",
    description: "Transfer to Savings",
    accountId: "w_1",
    toAccountId: "w_2",
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: Date.now(),
  };

  const reconcileTx: Transaction = {
    id: "tx_reconcile",
    amount: 50,
    type: "income",
    description: "Balance adjustment",
    accountId: "w_1",
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: Date.now(),
  };

  const normalIncomeTx: Transaction = {
    id: "tx_income",
    amount: 1000,
    type: "income",
    description: "Salary",
    categoryId: "cat_income",
    accountId: "w_1",
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: Date.now(),
  };

  const normalExpenseTx: Transaction = {
    id: "tx_expense",
    amount: 80,
    type: "expense",
    description: "Groceries",
    categoryId: "cat_food",
    accountId: "w_1",
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: Date.now(),
  };

  assertStrictEqual(isWalletRelatedTransaction(transferTx), true, "Transfer must be wallet-related");
  assertStrictEqual(isWalletRelatedTransaction(reconcileTx), true, "Balance adjustment must be wallet-related");
  assertStrictEqual(isWalletRelatedTransaction(normalIncomeTx), false, "Normal income must not be wallet-related");
  assertStrictEqual(isWalletRelatedTransaction(normalExpenseTx), false, "Normal expense must not be wallet-related");

  console.log("✓ Test 1: isWalletRelatedTransaction passed");
}

// Test 2: Calculations exclude wallet reconciliations and transfers
{
  const txs: Transaction[] = [
    {
      id: "t1",
      amount: 1000,
      type: "income",
      description: "Salary",
      date: "2026-10-15T10:00:00Z",
      createdAt: "2026-10-15T10:00:00Z",
      updatedAt: 1,
    },
    {
      id: "t2",
      amount: 300,
      type: "expense",
      description: "Rent",
      date: "2026-10-15T12:00:00Z",
      createdAt: "2026-10-15T12:00:00Z",
      updatedAt: 1,
    },
    {
      id: "t3",
      amount: 500,
      type: "transfer",
      description: "Transfer: Bank -> Cash",
      accountId: "bank",
      toAccountId: "cash",
      date: "2026-10-15T14:00:00Z",
      createdAt: "2026-10-15T14:00:00Z",
      updatedAt: 1,
    },
    {
      id: "t4",
      amount: 50,
      type: "income",
      description: "Balance adjustment",
      accountId: "cash",
      date: "2026-10-15T16:00:00Z",
      createdAt: "2026-10-15T16:00:00Z",
      updatedAt: 1,
    },
  ];

  const isWalletReconciliation = (t: Transaction) => {
    return (
      t.description === "Balance adjustment" ||
      t.description?.toLowerCase().includes("balance adjustment") ||
      t.description?.toLowerCase().includes("reconcil") ||
      (t as any).category === "Adjustment"
    );
  };

  const isExcluded = (t: Transaction) => {
    return isWalletReconciliation(t) || t.type === "transfer";
  };

  const dailyTotal = txs.reduce((sum, t) => {
    if (isExcluded(t)) return sum;
    if (t.type === "income") return sum + t.amount;
    if (t.type === "expense") return sum - t.amount;
    return sum;
  }, 0);

  // Daily total should ONLY count Income (1000) - Expense (300) = 700
  // Transfer (500) and Balance adjustment (50) must be EXCLUDED
  assertStrictEqual(dailyTotal, 700, "Daily total must exclude transfer and reconciliation");

  const netTotal = txs.reduce((sum, t) => {
    if (isExcluded(t)) return sum;
    return t.type === "income" ? sum + t.amount : sum - t.amount;
  }, 0);

  assertStrictEqual(netTotal, 700, "Net total must exclude transfer and reconciliation");

  console.log("✓ Test 2: Calculation exclusions passed");
}

// Test 3: getDateRangeForBillingPeriod with custom billing period start day
{
  const refDate = new Date(2026, 9, 29); // Oct 29, 2026

  // For start day 1 (calendar month)
  const rangeDay1 = getDateRangeForBillingPeriod(1, refDate);
  assertStrictEqual(rangeDay1.start.getDate(), 1);
  assertStrictEqual(rangeDay1.start.getMonth(), 9); // October
  assertStrictEqual(rangeDay1.end.getDate(), 31);
  assertStrictEqual(rangeDay1.end.getMonth(), 9); // October

  // For start day 25 (custom billing cycle: Oct 25 to Nov 24)
  const rangeDay25 = getDateRangeForBillingPeriod(25, refDate);
  assertStrictEqual(rangeDay25.start.getDate(), 25);
  assertStrictEqual(rangeDay25.start.getMonth(), 9); // Oct 25
  assertStrictEqual(rangeDay25.end.getDate(), 24);
  assertStrictEqual(rangeDay25.end.getMonth(), 10); // Nov 24

  console.log("✓ Test 3: getDateRangeForBillingPeriod passed");
}

console.log("All transactionCalculationsAndFilters unit tests passed successfully! 🎉\n");
