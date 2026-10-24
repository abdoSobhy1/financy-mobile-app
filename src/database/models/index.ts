import { Transaction, Category, Budget, Settings, Debt, DebtPayment, WalletAccount, WalletType } from "../../types";
import { DateUtils } from "../../utils/dateUtils";

// Database table schemas
export interface WalletTable {
  id: string;
  name: string;
  type: string;
  icon?: string;
  color?: string;
  initial_balance: number;
  is_secret: number;
  archived: number;
  created_at: string;
  updated_at: number; // ms timestamp
  deleted: number;
  sync_status: string;
}

export interface TransactionTable {
  id: string;
  amount: number;
  type: string;
  category_id?: string | null;
  budget_id?: string;
  account_id?: string;
  to_account_id?: string | null;
  receipt_uri?: string;
  description: string;
  date: string;
  note?: string;
  linked_debt_payment_id?: string;
  created_at: string;
  duplicated_at?: string;
  // Sync fields
  sync_updated_at: number;
  deleted: number;
  sync_status: string;
}

export interface CategoryTable {
  id: string;
  name: string;
  type: string;
  color?: string;
  icon?: string;
  entry_count: number;
  created_at: string;
  // Sync fields
  sync_updated_at: number;
  deleted: number;
  sync_status: string;
}

export interface BudgetTable {
  id: string;
  name: string;
  amount: number;
  current_balance: number;
  period_type?: string;
  alerts_enabled?: number;
  reset_day: number;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  // Sync fields
  sync_updated_at: number;
  deleted: number;
  sync_status: string;
}

export interface SettingsTable {
  id: string;
  billing_period_start_day: number;
  currency: string;
  firebase_sync: number; // SQLite boolean (0/1)
  theme: string;
  created_at: string;
  updated_at: string;
  // Sync fields
  sync_updated_at: number;
  deleted: number;
  sync_status: string;
}

export interface DebtTable {
  id: string;
  name: string;
  debt_type?: string | null;
  amount: number; // Total debt amount (same as total_amount for compatibility)
  total_amount: number;
  current_balance: number;
  interest_rate: number | null;
  minimum_payment: number | null;
  due_date: string | null;
  creditor: string | null;
  description: string | null;
  category_id: string | null;
  budget_id: string | null;
  created_at: string;
  updated_at: string;
  // Sync fields
  sync_updated_at: number;
  deleted: number;
  sync_status: string;
}

export interface DebtPaymentTable {
  id: string;
  debt_id: string;
  amount: number;
  date: string; // Add date field to match database schema
  payment_date: string;
  principal: number;
  interest: number;
  note: string | null;
  linked_transaction_id?: string;
  created_at: string;
  // Sync fields
  updated_at: string | number; // Allow both string (ISO) and number (timestamp)
  deleted: number;
  sync_status: string;
}

// Model transformation functions
export const transformTransaction = (row: TransactionTable): Transaction => ({
  id: row.id,
  amount: row.amount,
  type: row.type as Transaction["type"],
  categoryId: row.category_id || undefined,
  budgetId: row.budget_id,
  accountId: row.account_id || undefined,
  toAccountId: row.to_account_id || undefined,
  receiptUri: row.receipt_uri || undefined,
  description: row.description,
  date: row.date,
  note: row.note,
  linkedDebtPaymentId: row.linked_debt_payment_id,
  createdAt: row.created_at,
  duplicatedAt: row.duplicated_at,
  // Sync fields
  updatedAt: row.sync_updated_at,
  deleted: Boolean(row.deleted),
  syncStatus: row.sync_status as "pending" | "synced" | "error",
});

export const transformCategory = (row: CategoryTable): Category => ({
  id: row.id,
  name: row.name,
  type: row.type as "income" | "expense",
  color: row.color,
  icon: row.icon,
  entryCount: row.entry_count,
  createdAt: row.created_at,
  // Sync fields
  updatedAt: row.sync_updated_at,
  deleted: Boolean(row.deleted),
  syncStatus: row.sync_status as "pending" | "synced" | "error",
});

export const transformBudget = (row: BudgetTable): Budget => ({
  id: row.id,
  name: row.name,
  amount: row.amount,
  currentBalance: row.current_balance,
  period: (row.period_type as "weekly" | "monthly") || "monthly",
  alertsEnabled: row.alerts_enabled !== undefined && row.alerts_enabled !== null ? Boolean(row.alerts_enabled) : true,
  resetDay: row.reset_day,
  categoryId: row.category_id || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  // Sync fields
  syncUpdatedAt: row.sync_updated_at,
  deleted: Boolean(row.deleted),
  syncStatus: row.sync_status as "pending" | "synced" | "error",
});

export const transformSettings = (row: SettingsTable): Settings => ({
  id: row.id,
  billingPeriodStartDay: row.billing_period_start_day,
  currency: row.currency,
  firebaseSync: Boolean(row.firebase_sync),
  theme: row.theme as Settings["theme"],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  // Sync fields
  syncUpdatedAt: row.sync_updated_at,
  deleted: Boolean(row.deleted),
  syncStatus: row.sync_status as "pending" | "synced" | "error",
});

// Table conversion functions (for inserts/updates)
export const toTransactionTable = (transaction: Omit<Transaction, "id" | "createdAt">): Omit<TransactionTable, "id" | "created_at"> => ({
  amount: transaction.amount,
  type: transaction.type,
  category_id: transaction.categoryId || null,
  budget_id: transaction.budgetId,
  account_id: transaction.accountId,
  to_account_id: transaction.toAccountId || null,
  receipt_uri: transaction.receiptUri,
  description: transaction.description,
  date: transaction.date,
  note: transaction.note,
  linked_debt_payment_id: transaction.linkedDebtPaymentId,
  duplicated_at: transaction.duplicatedAt,
  // Sync fields
  sync_updated_at: transaction.updatedAt || Date.now(),
  deleted: transaction.deleted ? 1 : 0,
  sync_status: transaction.syncStatus || "pending",
});

export const toCategoryTable = (category: Omit<Category, "id" | "createdAt">): Omit<CategoryTable, "id" | "created_at"> => ({
  name: category.name,
  type: category.type,
  color: category.color,
  icon: category.icon,
  entry_count: category.entryCount,
  // Sync fields
  sync_updated_at: category.updatedAt || Date.now(),
  deleted: category.deleted ? 1 : 0,
  sync_status: category.syncStatus || "pending",
});

export const toBudgetTable = (budget: Omit<Budget, "id" | "createdAt" | "updatedAt">): Omit<BudgetTable, "id" | "created_at" | "updated_at"> => ({
  name: budget.name,
  amount: budget.amount,
  current_balance: budget.currentBalance,
  period_type: budget.period || "monthly",
  alerts_enabled: budget.alertsEnabled === false ? 0 : 1,
  reset_day: budget.resetDay,
  category_id: budget.categoryId || null,
  // Sync fields
  sync_updated_at: budget.syncUpdatedAt || Date.now(),
  deleted: budget.deleted ? 1 : 0,
  sync_status: budget.syncStatus || "pending",
});


export const toSettingsTable = (
  settings: Omit<Settings, "id" | "createdAt" | "updatedAt">
): Omit<SettingsTable, "id" | "created_at" | "updated_at"> => ({
  billing_period_start_day: settings.billingPeriodStartDay,
  currency: settings.currency,
  firebase_sync: settings.firebaseSync ? 1 : 0,
  theme: settings.theme,
  // Sync fields
  sync_updated_at: settings.syncUpdatedAt || Date.now(),
  deleted: settings.deleted ? 1 : 0,
  sync_status: settings.syncStatus || "pending",
});

export const toDebtTable = (debt: Omit<Debt, "id" | "createdAt" | "updatedAt">): Omit<DebtTable, "id" | "created_at" | "updated_at"> => ({
  name: debt.name,
  debt_type: debt.type || "i_owe",
  amount: debt.totalAmount, // Use totalAmount for amount field
  total_amount: debt.totalAmount,
  current_balance: debt.currentBalance,
  interest_rate: debt.interestRate ?? null,
  minimum_payment: debt.minimumPayment ?? null,
  due_date: debt.dueDate ?? null,
  creditor: debt.creditor ?? null,
  description: debt.description ?? null,
  category_id: debt.categoryId ?? null,
  budget_id: debt.budgetId ?? null,
  // Sync fields
  sync_updated_at: debt.syncUpdatedAt || Date.now(),
  deleted: debt.deleted ? 1 : 0,
  sync_status: debt.syncStatus || "pending",
});

export const toDebtPaymentTable = (payment: Omit<DebtPayment, "id" | "createdAt">): Omit<DebtPaymentTable, "id" | "created_at"> => ({
  debt_id: payment.debtId,
  amount: payment.amount,
  date: payment.date, // Include date field
  payment_date: payment.paymentDate || payment.date, // Use paymentDate or fallback to date
  principal: payment.principal,
  interest: payment.interest,
  note: payment.note ?? null,
  // Don't include linked_transaction_id as it's not in the base schema
  // Sync fields
  updated_at: payment.updatedAt || new Date().toISOString(),
  deleted: payment.deleted ? 1 : 0,
  sync_status: payment.syncStatus || "pending",
});

export const fromDebtTable = (row: DebtTable): Debt => ({
  id: row.id,
  name: row.name,
  type: (row.debt_type === "owed_to_me" ? "owed_to_me" : "i_owe"),
  totalAmount: row.total_amount,
  currentBalance: row.current_balance,
  interestRate: row.interest_rate ?? undefined,
  minimumPayment: row.minimum_payment ?? undefined,
  dueDate: row.due_date ?? undefined,
  creditor: row.creditor ?? undefined,
  description: row.description ?? undefined,
  budgetId: row.budget_id ?? undefined,
  categoryId: row.category_id ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  // Sync fields
  syncUpdatedAt: row.sync_updated_at,
  deleted: Boolean(row.deleted),
  syncStatus: row.sync_status as "pending" | "synced" | "error",
});

export const fromDebtPaymentTable = (row: DebtPaymentTable): DebtPayment => ({
  id: row.id,
  debtId: row.debt_id,
  amount: row.amount,
  date: row.date, // Add date field
  paymentDate: row.payment_date,
  principal: row.principal,
  interest: row.interest,
  note: row.note ?? undefined,
  linkedTransactionId: row.linked_transaction_id,
  createdAt: row.created_at,
  // Sync fields
  updatedAt: typeof row.updated_at === "string" ? Date.parse(row.updated_at) : row.updated_at,
  deleted: Boolean(row.deleted),
  syncStatus: row.sync_status as "pending" | "synced" | "error",
});

export const transformWallet = (row: WalletTable): WalletAccount => ({
  id: row.id,
  name: row.name,
  type: row.type as WalletType,
  icon: row.icon || "wallet-outline",
  color: row.color || "teal",
  initialBalance: row.initial_balance ?? 0,
  isSecret: Boolean(row.is_secret),
  archived: Boolean(row.archived),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deleted: Boolean(row.deleted),
  syncStatus: row.sync_status as "pending" | "synced" | "error",
});

export const toWalletTable = (
  wallet: Omit<WalletAccount, "id" | "createdAt">,
): Omit<WalletTable, "id" | "created_at"> => ({
  name: wallet.name,
  type: wallet.type,
  icon: wallet.icon || "wallet-outline",
  color: wallet.color || "teal",
  initial_balance: wallet.initialBalance ?? 0,
  is_secret: wallet.isSecret ? 1 : 0,
  archived: wallet.archived ? 1 : 0,
  updated_at: wallet.updatedAt || Date.now(),
  deleted: wallet.deleted ? 1 : 0,
  sync_status: wallet.syncStatus || "pending",
});
