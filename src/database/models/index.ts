import { Transaction, Category, Budget, Bill, Settings, Debt, DebtPayment } from "../../types";
import { DateUtils } from "../../utils/dateUtils";

// Database table schemas
export interface TransactionTable {
  id: string;
  amount: number;
  type: string;
  category_id: string;
  budget_id?: string;
  description: string;
  date: string;
  note?: string;
  linked_bill_id?: string;
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
  reset_day: number;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  // Sync fields
  sync_updated_at: number;
  deleted: number;
  sync_status: string;
}

export interface BillTable {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  paid: number; // SQLite boolean (0/1)
  budget_id?: string;
  category_id?: string;
  linked_transaction_id?: string;
  recurring: number; // SQLite boolean (0/1)
  recurring_type?: string;
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
  categoryId: row.category_id,
  budgetId: row.budget_id,
  description: row.description,
  date: row.date,
  note: row.note,
  linkedBillId: row.linked_bill_id,
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
  type: row.type as Category["type"],
  color: row.color,
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
  resetDay: row.reset_day,
  categoryId: row.category_id || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  // Sync fields
  syncUpdatedAt: row.sync_updated_at,
  deleted: Boolean(row.deleted),
  syncStatus: row.sync_status as "pending" | "synced" | "error",
});

export const transformBill = (row: BillTable): Bill => {
  // Use DateUtils for consistent and safe date handling
  const safeDueDate = DateUtils.toISOString(row.due_date, DateUtils.today());

  // Log any date conversion issues for debugging
  if (!DateUtils.isValid(row.due_date)) {
    console.warn("transformBill: Invalid due_date detected, using fallback", {
      billId: row.id,
      originalDueDate: row.due_date,
      convertedDueDate: safeDueDate,
    });
  }

  const transformedBill = {
    id: row.id,
    name: row.name,
    amount: row.amount,
    dueDate: safeDueDate,
    paid: Boolean(row.paid),
    budgetId: row.budget_id,
    categoryId: row.category_id,
    linkedTransactionId: row.linked_transaction_id,
    recurring: Boolean(row.recurring),
    recurringType: row.recurring_type as Bill["recurringType"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Sync fields
    syncUpdatedAt: row.sync_updated_at,
    deleted: Boolean(row.deleted),
    syncStatus: row.sync_status as "pending" | "synced" | "error",
  };

  console.log("transformBill: Transformed bill from database row", {
    billId: row.id,
    original_due_date: row.due_date,
    transformed_dueDate: transformedBill.dueDate,
    original_recurring: row.recurring,
    transformed_recurring: transformedBill.recurring,
    original_recurring_type: row.recurring_type,
    transformed_recurringType: transformedBill.recurringType,
  });

  return transformedBill;
};

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
  category_id: transaction.categoryId,
  budget_id: transaction.budgetId,
  description: transaction.description,
  date: transaction.date,
  note: transaction.note,
  linked_bill_id: transaction.linkedBillId,
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
  reset_day: budget.resetDay,
  category_id: budget.categoryId || null,
  // Sync fields
  sync_updated_at: budget.syncUpdatedAt || Date.now(),
  deleted: budget.deleted ? 1 : 0,
  sync_status: budget.syncStatus || "pending",
});

export const toBillTable = (bill: Omit<Bill, "id" | "createdAt" | "updatedAt">): Omit<BillTable, "id" | "created_at" | "updated_at"> => {
  // Ensure dueDate is always stored as ISO string in database
  const dueDateString = DateUtils.isValid(bill.dueDate) ? DateUtils.toISOString(bill.dueDate) : bill.dueDate;

  console.log("toBillTable: Converting bill for database storage", {
    originalDueDate: bill.dueDate,
    originalDueDateType: typeof bill.dueDate,
    convertedDueDate: dueDateString,
    isValidOriginal: DateUtils.isValid(bill.dueDate),
  });

  return {
    name: bill.name,
    amount: bill.amount,
    due_date: dueDateString,
    paid: bill.paid ? 1 : 0,
    budget_id: bill.budgetId,
    category_id: bill.categoryId || undefined,
    linked_transaction_id: bill.linkedTransactionId,
    recurring: bill.recurring ? 1 : 0,
    recurring_type: bill.recurringType,
    // Sync fields
    sync_updated_at: bill.syncUpdatedAt || Date.now(),
    deleted: bill.deleted ? 1 : 0,
    sync_status: bill.syncStatus || "pending",
  };
};

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
