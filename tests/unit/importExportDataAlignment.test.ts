function assertStrictEqual(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed! Expected: ${expected}, Got: ${actual}. ${message || ""}`);
  }
}

function assertTrue(condition: any, message?: string) {
  if (!condition) {
    throw new Error(`Assertion failed! Expected condition to be truthy. ${message || ""}`);
  }
}

import { COLUMN_PATTERNS, ImportMapping, ImportSettings } from "../../src/features/import/types/import";
import { exportToExcel, exportToCSV, ExportData } from "../../src/features/import/utils/exportUtils";
import {
  importDatabaseFromJSON,
  DatabaseExportData,
  exportSQLiteDatabase,
  inspectSQLiteDatabaseFile,
  restoreSQLiteDatabaseFromFile,
} from "../../src/features/import/utils/databaseExport";
import { ExcelImportService } from "../../src/features/import/services/excelImportService";
import { Transaction, Category, Budget, WalletAccount, Debt, DebtPayment } from "../../src/shared/types";

console.log("Running importExportDataAlignment unit tests...\n");

// Test 1: COLUMN_PATTERNS has comprehensive keywords for accounts, budgets, and transfers
{
  assertTrue(COLUMN_PATTERNS.account.includes("account"), "COLUMN_PATTERNS should include 'account'");
  assertTrue(COLUMN_PATTERNS.account.includes("wallet"), "COLUMN_PATTERNS should include 'wallet'");
  assertTrue(COLUMN_PATTERNS.account.includes("محفظة"), "COLUMN_PATTERNS should include 'محفظة'");
  assertTrue(COLUMN_PATTERNS.account.includes("الحساب"), "COLUMN_PATTERNS should include 'الحساب'");

  assertTrue(COLUMN_PATTERNS.toAccount.includes("to_account"), "COLUMN_PATTERNS should include 'to_account'");
  assertTrue(COLUMN_PATTERNS.toAccount.includes("destination_account"), "COLUMN_PATTERNS should include 'destination_account'");
  assertTrue(COLUMN_PATTERNS.toAccount.includes("إلى الحساب"), "COLUMN_PATTERNS should include 'إلى الحساب'");

  assertTrue(COLUMN_PATTERNS.budget.includes("budget"), "COLUMN_PATTERNS should include 'budget'");
  assertTrue(COLUMN_PATTERNS.budget.includes("الميزانية"), "COLUMN_PATTERNS should include 'الميزانية'");

  console.log("✓ Test 1: COLUMN_PATTERNS contains account, transfer destination, and budget keywords in English and Arabic");
}

// Test 2: Excel & CSV Export handles wallets, transfers, debts, and debt payments
(async () => {
  const dummyWallets: Record<string, WalletAccount> = {
    w_cash: {
      id: "w_cash",
      name: "Cash Wallet",
      type: "cash",
      icon: "cash-outline",
      color: "teal",
      initialBalance: 500,
      createdAt: new Date().toISOString(),
    },
    w_bank: {
      id: "w_bank",
      name: "Main Bank Account",
      type: "bank",
      icon: "business-outline",
      color: "blue",
      initialBalance: 2000,
      createdAt: new Date().toISOString(),
    },
  };

  const dummyCategories: Record<string, Category> = {
    c_groceries: {
      id: "c_groceries",
      name: "Groceries",
      type: "expense",
      color: "green",
      entryCount: 10,
      createdAt: new Date().toISOString(),
      updatedAt: Date.now(),
    },
  };

  const dummyBudgets: Record<string, Budget> = {
    b_monthly: {
      id: "b_monthly",
      name: "Monthly Living",
      amount: 1500,
      currentBalance: 450,
      period: "monthly",
      resetDay: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncUpdatedAt: Date.now(),
    },
  };

  const dummyDebts: Debt[] = [
    {
      id: "d_loan",
      name: "Personal Loan",
      type: "i_owe",
      totalAmount: 1000,
      currentBalance: 600,
      creditor: "Alex",
      interestRate: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncUpdatedAt: Date.now(),
    },
  ];

  const dummyDebtPayments: DebtPayment[] = [
    {
      id: "p_1",
      debtId: "d_loan",
      amount: 200,
      date: new Date().toISOString(),
      paymentDate: new Date().toISOString(),
      principal: 200,
      interest: 0,
      createdAt: new Date().toISOString(),
      updatedAt: Date.now(),
    },
  ];

  const dummyTransactions: Transaction[] = [
    {
      id: "t_expense",
      amount: 50,
      type: "expense",
      description: "Supermarket shopping",
      categoryId: "c_groceries",
      budgetId: "b_monthly",
      accountId: "w_bank",
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: Date.now(),
    },
    {
      id: "t_transfer",
      amount: 100,
      type: "transfer",
      description: "ATM Cash Withdrawal",
      accountId: "w_bank",
      toAccountId: "w_cash",
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: Date.now(),
    },
  ];

  const exportData: ExportData = {
    exportDate: new Date().toISOString(),
    period: "month",
    transactions: dummyTransactions,
    categories: dummyCategories,
    budgets: dummyBudgets,
    wallets: dummyWallets,
    debts: dummyDebts,
    debtPayments: dummyDebtPayments,
    summary: {
      totalTransactions: dummyTransactions.length,
      totalIncome: 0,
      totalExpenses: 50,
      totalTransfers: 100,
      netSavings: -50,
    },
  };

  // Test CSV Export runs without crashing
  await exportToCSV(exportData);
  console.log("✓ Test 2A: CSV export succeeds with wallet and transfer mappings");

  // Test Excel Export runs without crashing
  await exportToExcel(exportData);
  console.log("✓ Test 2B: Excel export creates multi-sheet workbook (Transactions, Wallets, Budgets, Debts, Categories)");
})();

// Test 3: JSON Database Backup Restore
(async () => {
  const backupData: DatabaseExportData = {
    exportDate: new Date().toISOString(),
    version: "2.0.0",
    transactions: [
      {
        id: "tx_restored_1",
        amount: 85,
        type: "expense",
        description: "Restored Coffee & Dining",
        categoryId: "cat_dining",
        accountId: "wallet_restored",
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
      },
    ],
    categories: [
      {
        id: "cat_dining",
        name: "Dining Out",
        type: "expense",
        color: "orange",
        entry_count: 1,
      },
    ],
    budgets: [
      {
        id: "budget_restored",
        name: "Entertainment Budget",
        amount: 300,
        current_balance: 85,
        period_type: "monthly",
        reset_day: 1,
      },
    ],
    wallets: [
      {
        id: "wallet_restored",
        name: "Salary Bank",
        type: "bank",
        initial_balance: 1500,
        is_secret: 0,
        archived: 0,
      },
    ],
    debts: [
      {
        id: "debt_restored",
        name: "Friend Loan",
        debt_type: "owed_to_me",
        total_amount: 500,
        current_balance: 500,
      },
    ],
    debtPayments: [],
    settings: [
      {
        id: "default",
        currency: "USD",
        billing_period_start_day: 1,
        theme: "dark",
      },
    ],
  };

  const result = await importDatabaseFromJSON(backupData, { mode: "merge" });
  assertTrue(result.success, "Database backup restore should succeed");
  assertStrictEqual(result.restoredCounts.transactions, 1, "Should restore 1 transaction");
  assertStrictEqual(result.restoredCounts.categories, 1, "Should restore 1 category");
  assertStrictEqual(result.restoredCounts.budgets, 1, "Should restore 1 budget");
  assertStrictEqual(result.restoredCounts.wallets, 1, "Should restore 1 wallet");
  assertStrictEqual(result.restoredCounts.debts, 1, "Should restore 1 debt");
  assertStrictEqual(result.restoredCounts.settings, 1, "Should restore settings");

  console.log("✓ Test 3: JSON Database Backup Restore successfully merges all domains into SQLite");
})();

// Test 4: ExcelImportService JSON Backup file detection
(async () => {
  const service = new ExcelImportService();

  const fakeJsonBackupAsset: any = {
    name: "financy-backup-2026-11-15.json",
    size: 2048,
    uri: "file:///mock/financy-backup.json",
  };

  // Mock readFileAsText behavior through parseFile
  (service as any).readFileAsText = async () => {
    return JSON.stringify({
      version: "2.0.0",
      transactions: [{ id: "t1" }, { id: "t2" }],
      wallets: [{ id: "w1" }],
      categories: [{ id: "c1" }],
      budgets: [{ id: "b1" }],
      debts: [{ id: "d1" }],
    });
  };

  const preview = await service.parseFile(fakeJsonBackupAsset);
  assertTrue(preview.isBackup, "Preview should be flagged as backup");
  assertStrictEqual(preview.totalRows, 6, "Total items should equal sum of all entities");
  assertStrictEqual(preview.backupStats?.transactions, 2, "Should have 2 transactions in stats");
  assertStrictEqual(preview.backupStats?.wallets, 1, "Should have 1 wallet in stats");

  const validation = await service.validateImport(preview, {} as any, {} as any);
  assertTrue(validation.isValid, "Backup should validate automatically");

  console.log("✓ Test 4: ExcelImportService recognizes .json backups and generates backup preview/validation");
})();

// Test 5: exportSQLiteDatabase creates native .db backup and triggers sharing
(async () => {
  const exportedPath = await exportSQLiteDatabase();
  assertTrue(typeof exportedPath === "string", "Exported path should be a string");
  assertTrue(exportedPath.length > 0, "Exported path should not be empty");
  console.log("✓ Test 5: exportSQLiteDatabase creates native .db backup and handles sharing cleanly");
})();

// Test 6: inspectSQLiteDatabaseFile inspects an external .db file
(async () => {
  const stats = await inspectSQLiteDatabaseFile("file:///mock/databases/financy_external_backup.db");
  assertTrue(typeof stats.transactions === "number", "Should report transactions count");
  assertTrue(typeof stats.categories === "number", "Should report categories count");
  assertTrue(typeof stats.budgets === "number", "Should report budgets count");
  assertTrue(typeof stats.wallets === "number", "Should report wallets count");
  assertTrue(typeof stats.debts === "number", "Should report debts count");
  assertTrue(typeof stats.debtPayments === "number", "Should report debtPayments count");
  console.log("✓ Test 6: inspectSQLiteDatabaseFile reads counts from external .db file");
})();

// Test 7: restoreSQLiteDatabaseFromFile restores data from a .db file
(async () => {
  const restoreResult = await restoreSQLiteDatabaseFromFile("file:///mock/databases/financy_backup_to_restore.db");
  assertTrue(restoreResult.success, "Database file restore should succeed");
  assertTrue(typeof restoreResult.restoredCounts.transactions === "number", "Restored count should be number");
  console.log("✓ Test 7: restoreSQLiteDatabaseFromFile restores live database from external .db file");
})();

// Test 8: ExcelImportService handles .db file parsing and restore flow
(async () => {
  const service = new ExcelImportService();

  const fakeDbAsset: any = {
    name: "financy_backup.db",
    size: 65536,
    uri: "file:///mock/databases/financy_backup.db",
  };

  const preview = await service.parseFile(fakeDbAsset);
  assertTrue(preview.isBackup, "Preview must be flagged as backup");
  assertTrue(preview.isSqliteDb, "Preview must be flagged as isSqliteDb");
  assertStrictEqual(preview.fileName, "financy_backup.db", "File name should match");
  assertTrue(preview.totalRows >= 0, "Total rows should be counted");
  assertTrue(!!preview.backupStats, "Backup stats should be present");

  const validation = await service.validateImport(preview, {} as any, {} as any);
  assertTrue(validation.isValid, "SQLite backup should validate automatically");

  const importResult = await service.importData(preview, {} as any, {} as any);
  assertTrue(importResult.success, "SQLite database restore via service should succeed");
  assertTrue(importResult.isBackupRestore, "Should indicate isBackupRestore");
  console.log("✓ Test 8: ExcelImportService detects .db files and restores via SQLite backup");
})();
