function assertStrictEqual(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed! Expected: ${expected}, Got: ${actual}. ${message || ""}`);
  }
}

import { walletService } from "../../src/features/wallets/services/walletService";
import { Transaction, WalletAccount } from "../../src/shared/types";
import { validateTransactionData } from "../../src/shared/utils/validation";

console.log("Running calculateWalletBalances unit tests...\n");

const wallets: WalletAccount[] = [
  {
    id: "cash_1",
    name: "Cash",
    type: "cash",
    icon: "cash-outline",
    color: "teal",
    initialBalance: 100,
    isSecret: false,
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "bank_1",
    name: "Bank",
    type: "bank",
    icon: "business-outline",
    color: "blue",
    initialBalance: 500,
    isSecret: false,
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "secret_1",
    name: "Secret Stash",
    type: "cash",
    icon: "lock-closed-outline",
    color: "gray",
    initialBalance: 50,
    isSecret: true,
    createdAt: "2025-01-01T00:00:00.000Z",
  },
];

// Test 1: Initial balances without transactions
{
  const balances = walletService.calculateWalletBalances(wallets, []);
  assertStrictEqual(balances["cash_1"], 100);
  assertStrictEqual(balances["bank_1"], 500);
  assertStrictEqual(balances["secret_1"], 50);
  console.log("✓ Test 1: Initial balances without transactions passed");
}

// Test 2: Income adds to wallet balance
{
  const txs: Transaction[] = [
    {
      id: "tx_1",
      amount: 50,
      type: "income",
      accountId: "cash_1",
      description: "Salary tip",
      date: "2025-01-05T00:00:00.000Z",
      createdAt: "2025-01-05T00:00:00.000Z",
      updatedAt: 12345,
    },
  ];
  const balances = walletService.calculateWalletBalances(wallets, txs);
  assertStrictEqual(balances["cash_1"], 150);
  assertStrictEqual(balances["bank_1"], 500);
  console.log("✓ Test 2: Income adds to wallet balance passed");
}

// Test 3: Expense subtracts from wallet balance
{
  const txs: Transaction[] = [
    {
      id: "tx_2",
      amount: 30,
      type: "expense",
      accountId: "cash_1",
      description: "Groceries",
      date: "2025-01-06T00:00:00.000Z",
      createdAt: "2025-01-06T00:00:00.000Z",
      updatedAt: 12345,
    },
  ];
  const balances = walletService.calculateWalletBalances(wallets, txs);
  assertStrictEqual(balances["cash_1"], 70);
  console.log("✓ Test 3: Expense subtracts from wallet balance passed");
}

// Test 4: Transfer subtracts from source and adds to destination
{
  const txs: Transaction[] = [
    {
      id: "tx_3",
      amount: 200,
      type: "transfer",
      accountId: "bank_1",
      toAccountId: "cash_1",
      description: "ATM withdrawal",
      date: "2025-01-07T00:00:00.000Z",
      createdAt: "2025-01-07T00:00:00.000Z",
      updatedAt: 12345,
    },
  ];
  const balances = walletService.calculateWalletBalances(wallets, txs);
  assertStrictEqual(balances["bank_1"], 300); // 500 - 200
  assertStrictEqual(balances["cash_1"], 300); // 100 + 200
  console.log("✓ Test 4: Transfer subtracts from source and adds to destination passed");
}

// Test 5: PeriodOnly ignores initialBalance and calculates period delta
{
  const txs: Transaction[] = [
    {
      id: "tx_4",
      amount: 40,
      type: "income",
      accountId: "cash_1",
      description: "Bonus",
      date: "2025-01-08T00:00:00.000Z",
      createdAt: "2025-01-08T00:00:00.000Z",
      updatedAt: 12345,
    },
    {
      id: "tx_5",
      amount: 10,
      type: "expense",
      accountId: "cash_1",
      description: "Coffee",
      date: "2025-01-09T00:00:00.000Z",
      createdAt: "2025-01-09T00:00:00.000Z",
      updatedAt: 12345,
    },
    {
      id: "tx_6",
      amount: 50,
      type: "transfer",
      accountId: "bank_1",
      toAccountId: "cash_1",
      description: "Transfer",
      date: "2025-01-10T00:00:00.000Z",
      createdAt: "2025-01-10T00:00:00.000Z",
      updatedAt: 12345,
    },
  ];
  const balances = walletService.calculateWalletBalances(wallets, txs, { periodOnly: true });
  // cash_1: 0 (initial) + 40 (income) - 10 (expense) + 50 (transfer in) = 80
  assertStrictEqual(balances["cash_1"], 80);
  // bank_1: 0 (initial) - 50 (transfer out) = -50
  assertStrictEqual(balances["bank_1"], -50);
  // secret_1: 0 (initial)
  assertStrictEqual(balances["secret_1"], 0);
  console.log("✓ Test 5: PeriodOnly calculation passed");
}

// Test 6: Deleted transactions are ignored
{
  const txs: Transaction[] = [
    {
      id: "tx_7",
      amount: 100,
      type: "income",
      accountId: "cash_1",
      description: "Cancelled income",
      deleted: true,
      date: "2025-01-11T00:00:00.000Z",
      createdAt: "2025-01-11T00:00:00.000Z",
      updatedAt: 12345,
    },
    {
      id: "tx_8",
      amount: 50,
      type: "transfer",
      accountId: "cash_1",
      toAccountId: "bank_1",
      description: "Cancelled transfer",
      deleted: true,
      date: "2025-01-12T00:00:00.000Z",
      createdAt: "2025-01-12T00:00:00.000Z",
      updatedAt: 12345,
    },
  ];
  const balances = walletService.calculateWalletBalances(wallets, txs);
  assertStrictEqual(balances["cash_1"], 100);
  assertStrictEqual(balances["bank_1"], 500);
  console.log("✓ Test 6: Deleted transactions are ignored passed");
}

// Test 7: Secret wallet balance calculation and transfer to/from secret wallet
{
  const txs: Transaction[] = [
    {
      id: "tx_9",
      amount: 100,
      type: "income",
      accountId: "secret_1",
      description: "Secret cash deposit",
      date: "2025-01-13T00:00:00.000Z",
      createdAt: "2025-01-13T00:00:00.000Z",
      updatedAt: 12345,
    },
    {
      id: "tx_10",
      amount: 25,
      type: "transfer",
      accountId: "secret_1",
      toAccountId: "cash_1",
      description: "Transfer from secret to cash",
      date: "2025-01-14T00:00:00.000Z",
      createdAt: "2025-01-14T00:00:00.000Z",
      updatedAt: 12345,
    },
  ];
  const balances = walletService.calculateWalletBalances(wallets, txs);
  // secret_1: 50 + 100 - 25 = 125
  assertStrictEqual(balances["secret_1"], 125);
  // cash_1: 100 + 25 = 125
  assertStrictEqual(balances["cash_1"], 125);
  console.log("✓ Test 7: Secret wallet transactions passed");
}

// Test 8: Unknown accountId falls back to cash wallet
{
  const txs: Transaction[] = [
    {
      id: "tx_11",
      amount: 80,
      type: "expense",
      accountId: "non_existent_wallet",
      description: "Old orphaned expense",
      date: "2025-01-15T00:00:00.000Z",
      createdAt: "2025-01-15T00:00:00.000Z",
      updatedAt: 12345,
    },
  ];
  const balances = walletService.calculateWalletBalances(wallets, txs);
  // cash_1: 100 - 80 = 20 (cleanly falls back to cash wallet!)
  assertStrictEqual(balances["cash_1"], 20);
  assertStrictEqual(balances["unassigned"], undefined);
  console.log("✓ Test 8: Unknown accountId falls back to cash wallet passed");
}

// Test 9: Secret wallet helper functions (isSecretWallet, isSecretTransaction, isSecretTransactionExcluded, getVisibleWallets)
{
  const secretIds = walletService.getSecretWalletIds(wallets);
  assertStrictEqual(secretIds.has("secret_1"), true);
  assertStrictEqual(secretIds.has("cash_1"), false);

  const visible = walletService.getVisibleWallets(wallets);
  assertStrictEqual(visible.length, 2);
  assertStrictEqual(visible.some((w) => w.id === "secret_1"), false);

  const normalTx: Transaction = {
    id: "tx_norm",
    amount: 50,
    type: "expense",
    description: "Groceries",
    accountId: "cash_1",
    date: "2025-01-16T00:00:00.000Z",
    createdAt: "2025-01-16T00:00:00.000Z",
    updatedAt: 12345,
  };
  const secretSourceTx: Transaction = {
    id: "tx_sec_1",
    amount: 50,
    type: "expense",
    description: "Secret item",
    accountId: "secret_1",
    date: "2025-01-16T00:00:00.000Z",
    createdAt: "2025-01-16T00:00:00.000Z",
    updatedAt: 12345,
  };
  const secretBudgetedTx: Transaction = {
    id: "tx_sec_b",
    amount: 50,
    type: "expense",
    description: "Secret budgeted item",
    accountId: "secret_1",
    budgetId: "budget_groceries",
    date: "2025-01-16T00:00:00.000Z",
    createdAt: "2025-01-16T00:00:00.000Z",
    updatedAt: 12345,
  };
  const transferToSecretTx: Transaction = {
    id: "tx_sec_2",
    amount: 50,
    type: "transfer",
    description: "Move to secret",
    accountId: "cash_1",
    toAccountId: "secret_1",
    date: "2025-01-16T00:00:00.000Z",
    createdAt: "2025-01-16T00:00:00.000Z",
    updatedAt: 12345,
  };
  const transferToSecretWithBudgetTx: Transaction = {
    id: "tx_sec_tb",
    amount: 50,
    type: "transfer",
    description: "Move to secret with budget",
    accountId: "cash_1",
    toAccountId: "secret_1",
    budgetId: "budget_savings",
    date: "2025-01-16T00:00:00.000Z",
    createdAt: "2025-01-16T00:00:00.000Z",
    updatedAt: 12345,
  };

  assertStrictEqual(walletService.isSecretTransaction(normalTx, secretIds), false);
  assertStrictEqual(walletService.isSecretTransaction(secretSourceTx, secretIds), true);
  assertStrictEqual(walletService.isSecretTransaction(transferToSecretTx, secretIds), true);

  // Excluded from totals when NO budget:
  assertStrictEqual(walletService.isSecretTransactionExcluded(normalTx, secretIds), false);
  assertStrictEqual(walletService.isSecretTransactionExcluded(secretSourceTx, secretIds), true);
  assertStrictEqual(walletService.isSecretTransactionExcluded(transferToSecretTx, secretIds), true);

  // Affects totals (NOT excluded) when it HAS a budget:
  assertStrictEqual(walletService.isSecretTransactionExcluded(secretBudgetedTx, secretIds), false);
  assertStrictEqual(walletService.isSecretTransactionExcluded(transferToSecretWithBudgetTx, secretIds), false);

  console.log("✓ Test 9: Secret wallet helper functions passed");
}

// Test 10: Balance adjustment transactions carry over and update balances
{
  const newAccount: WalletAccount = {
    id: "bank_new",
    name: "New Bank",
    type: "bank",
    icon: "business-outline",
    color: "blue",
    initialBalance: 0,
    isSecret: false,
    createdAt: "2025-01-01T00:00:00.000Z",
  };

  // Adding 5000 via Balance adjustment
  const adjustmentTx: Transaction = {
    id: "tx_adj_1",
    amount: 5000,
    type: "income",
    accountId: "bank_new",
    description: "Balance adjustment",
    date: "2025-01-01T00:00:00.000Z",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: 12345,
  };

  const balances = walletService.calculateWalletBalances([newAccount], [adjustmentTx]);
  assertStrictEqual(balances["bank_new"], 5000, "Balance is 5000 after initial adjustment");

  // Reconciling down by 1000 in a later transaction
  const reconcileDownTx: Transaction = {
    id: "tx_adj_2",
    amount: 1000,
    type: "expense",
    accountId: "bank_new",
    description: "Balance adjustment",
    date: "2025-01-15T00:00:00.000Z",
    createdAt: "2025-01-15T00:00:00.000Z",
    updatedAt: 12346,
  };

  const reconciledBalances = walletService.calculateWalletBalances([newAccount], [adjustmentTx, reconcileDownTx]);
  assertStrictEqual(reconciledBalances["bank_new"], 4000, "Balance is 4000 after reconcile down adjustment");

  // Verify that balance adjustments do not distort income/expense if filtered
  const isAdjustment = (t: Transaction) => t.description === "Balance adjustment";
  const regularIncome = [adjustmentTx, reconcileDownTx].filter(t => t.type === "income" && !isAdjustment(t));
  assertStrictEqual(regularIncome.length, 0, "Balance adjustments are excluded from regular income");

  console.log("✓ Test 10: Balance adjustment transactions carry over and update balances passed");
}

{
  // Test 11: validateTransactionData permits Balance adjustment transactions without category
  const regularTxNoCat = {
    amount: 100,
    type: "expense" as const,
    description: "Groceries",
    accountId: "bank_1",
    date: new Date().toISOString(),
  };

  let caughtError: string | null = null;
  try {
    validateTransactionData(regularTxNoCat, true);
  } catch (e: any) {
    caughtError = e.message;
  }
  assertStrictEqual(caughtError, "Transaction category is required", "Regular transaction without category throws error");

  // Balance adjustment transaction without category must NOT throw
  const balanceAdjustmentTx = {
    amount: 100,
    type: "income" as const,
    description: "Balance adjustment",
    accountId: "bank_1",
    date: new Date().toISOString(),
  };

  let adjustmentError: string | null = null;
  try {
    validateTransactionData(balanceAdjustmentTx, true);
  } catch (e: any) {
    adjustmentError = e.message;
  }
  assertStrictEqual(adjustmentError, null, "Balance adjustment transaction does not require category");

  // Transfer transaction without category must NOT throw
  const transferTx = {
    amount: 100,
    type: "transfer" as const,
    description: "Transfer to bank",
    accountId: "cash_1",
    toAccountId: "bank_1",
    date: new Date().toISOString(),
  };

  let transferError: string | null = null;
  try {
    validateTransactionData(transferTx, true);
  } catch (e: any) {
    transferError = e.message;
  }
  assertStrictEqual(transferError, null, "Transfer transaction does not require category");

  console.log("✓ Test 11: validateTransactionData permits Balance adjustment transactions without category passed");
}

console.log("\nAll calculateWalletBalances unit tests passed successfully! 🎉");
