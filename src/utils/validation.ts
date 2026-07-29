// Data validation and cleaning utilities for Firebase sync
import { Transaction, TransactionType } from "../types";

/**
 * Validates and cleans transaction data before database operations
 */
export const validateTransactionData = (transaction: Partial<Transaction>): void => {
  if (!transaction.amount || transaction.amount <= 0) {
    throw new Error("Transaction amount must be greater than 0");
  }

  if (!transaction.description?.trim()) {
    throw new Error("Transaction description is required");
  }

  if (transaction.type !== "transfer" && !transaction.categoryId) {
    throw new Error("Transaction category is required");
  }

  if (!transaction.type || !["income", "expense", "debt", "transfer"].includes(transaction.type)) {
    throw new Error("Valid transaction type is required");
  }

  if (transaction.type === "transfer") {
    if (!transaction.fromWalletId || !transaction.toWalletId) {
      throw new Error("Both source and destination wallets are required for transfers");
    }
    if (transaction.fromWalletId === transaction.toWalletId) {
      throw new Error("Cannot transfer to the same wallet");
    }
  }
};

/**
 * Cleans transaction data by removing undefined values and normalizing optional fields
 */
export const cleanTransactionData = (transaction: any): any => {
  const cleaned = {
    ...transaction,
    budgetId: transaction.budgetId || null,
    walletId: transaction.walletId || null,
    fromWalletId: transaction.fromWalletId || null,
    toWalletId: transaction.toWalletId || null,
    categoryId: transaction.categoryId || (transaction.type === "transfer" ? "transfer" : null),
    note: transaction.note?.trim() || null,
    // Ensure numbers are properly typed
    amount: Number(transaction.amount),
  };

  // Handle date fields safely
  const parsedDate = safeParseDate(transaction.date);
  cleaned.date = parsedDate || new Date().toISOString();

  if (transaction.duplicatedAt) {
    const parsedDuplicatedAt = safeParseDate(transaction.duplicatedAt);
    cleaned.duplicatedAt = parsedDuplicatedAt;
  } else {
    cleaned.duplicatedAt = null;
  }

  if (transaction.updatedAt) {
    const parsedUpdatedAt = safeParseDate(transaction.updatedAt);
    cleaned.updatedAt = parsedUpdatedAt ? new Date(parsedUpdatedAt).getTime() : Date.now();
  }

  return cleaned;
};

/**
 * Validates budget data
 */
export const validateBudgetData = (budget: any): void => {
  if (!budget.name?.trim()) {
    throw new Error("Budget name is required");
  }

  if (!budget.amount || budget.amount <= 0) {
    throw new Error("Budget amount must be greater than 0");
  }

  if (budget.resetDay && (budget.resetDay < 1 || budget.resetDay > 31)) {
    throw new Error("Reset day must be between 1 and 31");
  }
};

/**
 * Cleans budget data
 */
export const cleanBudgetData = (budget: any): any => {
  const cleaned = {
    ...budget,
    name: budget.name?.trim() || "",
    amount: Number(budget.amount),
    currentBalance: Number(budget.currentBalance) || Number(budget.amount),
    resetDay: Number(budget.resetDay) || 1,
  };

  // Handle date fields safely
  if (budget.createdAt) {
    const parsedCreatedAt = safeParseDate(budget.createdAt);
    cleaned.createdAt = parsedCreatedAt || new Date().toISOString();
  }

  if (budget.updatedAt) {
    const parsedUpdatedAt = safeParseDate(budget.updatedAt);
    cleaned.updatedAt = parsedUpdatedAt || new Date().toISOString();
  }

  if (budget.syncUpdatedAt) {
    const parsedSyncUpdatedAt = safeParseDate(budget.syncUpdatedAt);
    cleaned.syncUpdatedAt = parsedSyncUpdatedAt ? new Date(parsedSyncUpdatedAt).getTime() : Date.now();
  }

  return cleaned;
};

/**
 * Validates wallet data
 */
export const validateWalletData = (wallet: any): void => {
  if (!wallet.name?.trim()) {
    throw new Error("Wallet name is required");
  }
  if (wallet.balance !== undefined && isNaN(Number(wallet.balance))) {
    throw new Error("Wallet balance must be a valid number");
  }
};

/**
 * Cleans wallet data
 */
export const cleanWalletData = (wallet: any): any => {
  return {
    ...wallet,
    name: wallet.name?.trim() || "",
    balance: Number(wallet.balance || 0),
    icon: wallet.icon || "wallet",
    color: wallet.color || "#10B981",
  };
};

/**
 * Validates category data
 */
export const validateCategoryData = (category: any): void => {
  if (!category.name?.trim()) {
    throw new Error("Category name is required");
  }

  if (!category.type || !["income", "expense"].includes(category.type)) {
    throw new Error("Valid category type is required");
  }
};

/**
 * Safe date parsing helper
 */
import { parse, isValid } from "date-fns";

const safeParseDate = (dateValue: any): string | null => {
  if (!dateValue) return null;

  try {
    // Handle Firestore Timestamp
    if (dateValue && typeof dateValue === "object" && "toDate" in dateValue) {
      return dateValue.toDate().toISOString();
    }

    // Handle epoch timestamp (number)
    if (typeof dateValue === "number") {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
        return date.toISOString();
      }
    }

    // Handle string dates
    if (typeof dateValue === "string") {
      // First try native Date parsing (covers ISO and many formats)
      const nativeDate = new Date(dateValue);
      if (!isNaN(nativeDate.getTime()) && nativeDate.getFullYear() > 1900 && nativeDate.getFullYear() < 2100) {
        return nativeDate.toISOString();
      }

      // Try several common human-friendly formats (e.g. 'Oct 06, 2025' or 'October 6, 2025')
      const formats = ["MMM dd, yyyy", "MMM d, yyyy", "MMMM dd, yyyy", "MMMM d, yyyy", "MM/dd/yyyy", "M/d/yyyy"];

      for (const fmt of formats) {
        try {
          const parsed = parse(dateValue, fmt, new Date());
          if (isValid(parsed) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
            return parsed.toISOString();
          }
        } catch (e) {
          // ignore and try next format
        }
      }
    }

    return null;
  } catch (error) {
    console.warn("Date parsing failed:", dateValue, error);
    return null;
  }
};

/**
 * Cleans category data
 */
export const cleanCategoryData = (category: any): any => {
  const cleaned = {
    ...category,
    name: category.name?.trim() || "",
    type: category.type,
    color: category.color || null,
    entryCount: Number(category.entryCount) || 0,
  };

  // Handle date fields safely
  if (category.createdAt) {
    const parsedCreatedAt = safeParseDate(category.createdAt);
    cleaned.createdAt = parsedCreatedAt || new Date().toISOString();
  }

  if (category.updatedAt) {
    const parsedUpdatedAt = safeParseDate(category.updatedAt);
    cleaned.updatedAt = parsedUpdatedAt ? new Date(parsedUpdatedAt).getTime() : Date.now();
  }

  return cleaned;
};

/**
 * Validates bill data
 */
export const validateBillData = (bill: any): void => {
  if (!bill.name?.trim()) {
    throw new Error("Bill name is required");
  }

  // Amount: allow zero for bills (amount may be recorded at payment time). If provided, it must be >= 0
  if (bill.amount !== undefined && (isNaN(Number(bill.amount)) || Number(bill.amount) < 0)) {
    throw new Error("Bill amount must be a number >= 0");
  }

  // Due date is optional for minimal bill records; require it only if an explicit non-empty value is provided and it's invalid
  if (bill.dueDate !== undefined && bill.dueDate !== null && !safeParseDate(bill.dueDate)) {
    throw new Error("Bill due date is invalid");
  }

  // CategoryId is optional for bills
  // if (!bill.categoryId) {
  //   throw new Error('Bill category is required');
  // }
};

/**
 * Cleans bill data
 */
export const cleanBillData = (bill: any): any => {
  const cleaned: any = {};

  // Only clean fields that are actually provided
  if (bill.name !== undefined) {
    cleaned.name = bill.name?.trim() || "";
  }

  if (bill.amount !== undefined) {
    cleaned.amount = Number(bill.amount);
  }

  if (bill.dueDate !== undefined) {
    const parsedDueDate = safeParseDate(bill.dueDate);
    cleaned.dueDate = parsedDueDate ? new Date(parsedDueDate) : new Date();
  }

  if (bill.paid !== undefined) {
    cleaned.paid = Boolean(bill.paid);
  }

  if (bill.budgetId !== undefined) {
    cleaned.budgetId = bill.budgetId || null;
  }

  if (bill.categoryId !== undefined) {
    cleaned.categoryId = bill.categoryId;
  }

  if (bill.recurring !== undefined) {
    cleaned.recurring = Boolean(bill.recurring);
  }

  if (bill.recurringType !== undefined) {
    cleaned.recurringType = bill.recurringType || null;
  }

  // Handle sync date fields safely
  if (bill.createdAt !== undefined) {
    const parsedCreatedAt = safeParseDate(bill.createdAt);
    cleaned.createdAt = parsedCreatedAt || new Date().toISOString();
  }

  if (bill.updatedAt !== undefined) {
    const parsedUpdatedAt = safeParseDate(bill.updatedAt);
    cleaned.updatedAt = parsedUpdatedAt || new Date().toISOString();
  }

  return cleaned;
};

/**
 * Generic function to clean any data for Firestore
 */
export const cleanDataForFirestore = (data: any): any => {
  if (data === null || data === undefined) {
    return null;
  }

  if (Array.isArray(data)) {
    return data.map((item) => cleanDataForFirestore(item));
  }

  if (typeof data === "object") {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanDataForFirestore(value);
      }
    }
    return cleaned;
  }

  return data;
};

/**
 * Cleans settings data by removing undefined values and ensuring proper types
 */
export const cleanSettingsData = (settings: any): any => {
  const cleaned = {
    ...settings,
    // Ensure numeric fields are properly typed
    billingPeriodStartDay: Number(settings.billingPeriodStartDay || settings.billing_period_start_day || 28),
    // Ensure boolean fields are properly typed
    firebaseSync: Boolean(settings.firebaseSync || settings.firebase_sync || false),
    // Ensure string fields are properly typed
    currency: String(settings.currency || "USD"),
    theme: settings.theme === "light" ? "light" : "dark", // Default to dark
    id: settings.id || "default",
  };

  // Handle date fields safely
  if (settings.createdAt) {
    const parsedCreatedAt = safeParseDate(settings.createdAt);
    cleaned.createdAt = parsedCreatedAt || new Date().toISOString();
  } else {
    cleaned.createdAt = new Date().toISOString();
  }

  if (settings.updatedAt) {
    const parsedUpdatedAt = safeParseDate(settings.updatedAt);
    cleaned.updatedAt = parsedUpdatedAt || new Date().toISOString();
  } else {
    cleaned.updatedAt = new Date().toISOString();
  }

  // Handle sync fields
  cleaned.syncUpdatedAt = Number(settings.syncUpdatedAt || Date.now());
  cleaned.deleted = Boolean(settings.deleted || false);
  cleaned.syncStatus = settings.syncStatus || "pending";

  // Remove any undefined values
  Object.keys(cleaned).forEach((key) => {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });

  return cleaned;
};

/**
 * Cleans debt data by removing undefined values and ensuring required fields
 */
export const cleanDebtData = (debt: any): any => {
  const cleaned = {
    ...debt,
    // Ensure required numeric fields are properly typed and have valid values
    totalAmount: Number(debt.totalAmount || debt.total_amount || debt.amount || 0),
    currentBalance: Number(debt.currentBalance || debt.current_balance || debt.totalAmount || debt.total_amount || debt.amount || 0),
    // Ensure optional numeric fields are properly typed
    interestRate: debt.interestRate !== undefined ? Number(debt.interestRate) : debt.interest_rate !== undefined ? Number(debt.interest_rate) : null,
    minimumPayment:
      debt.minimumPayment !== undefined ? Number(debt.minimumPayment) : debt.minimum_payment !== undefined ? Number(debt.minimum_payment) : null,
    // Ensure string fields are properly typed
    name: String(debt.name || "Unnamed Debt"),
    creditor: debt.creditor ? String(debt.creditor) : null,
    description: debt.description ? String(debt.description) : null,
    categoryId: debt.categoryId || debt.category_id || null,
    budgetId: debt.budgetId || debt.budget_id || null,
    id: debt.id || `debt_${Date.now()}`,
  };

  // Handle date fields safely
  if (debt.dueDate || debt.due_date) {
    const parsedDueDate = safeParseDate(debt.dueDate || debt.due_date);
    cleaned.dueDate = parsedDueDate;
  } else {
    cleaned.dueDate = null;
  }

  if (debt.createdAt || debt.created_at) {
    const parsedCreatedAt = safeParseDate(debt.createdAt || debt.created_at);
    cleaned.createdAt = parsedCreatedAt || new Date().toISOString();
  } else {
    cleaned.createdAt = new Date().toISOString();
  }

  if (debt.updatedAt || debt.updated_at) {
    const parsedUpdatedAt = safeParseDate(debt.updatedAt || debt.updated_at);
    cleaned.updatedAt = parsedUpdatedAt || new Date().toISOString();
  } else {
    cleaned.updatedAt = new Date().toISOString();
  }

  // Handle sync fields
  cleaned.syncUpdatedAt = Number(debt.syncUpdatedAt || debt.sync_updated_at || Date.now());
  cleaned.deleted = Boolean(debt.deleted || false);
  cleaned.syncStatus = debt.syncStatus || debt.sync_status || "pending";

  // Validation: ensure totalAmount is greater than 0
  if (cleaned.totalAmount <= 0) {
    console.warn(`⚠️ Invalid totalAmount for debt ${cleaned.id}: ${cleaned.totalAmount}, setting to 1`);
    cleaned.totalAmount = 1; // Set minimum valid value
  }

  // Validation: ensure currentBalance is not negative
  if (cleaned.currentBalance < 0) {
    console.warn(`⚠️ Invalid currentBalance for debt ${cleaned.id}: ${cleaned.currentBalance}, setting to 0`);
    cleaned.currentBalance = 0;
  }

  // Validation: currentBalance should not exceed totalAmount
  if (cleaned.currentBalance > cleaned.totalAmount) {
    console.warn(`⚠️ currentBalance (${cleaned.currentBalance}) exceeds totalAmount (${cleaned.totalAmount}) for debt ${cleaned.id}, adjusting`);
    cleaned.currentBalance = cleaned.totalAmount;
  }

  // Remove any undefined values
  Object.keys(cleaned).forEach((key) => {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });

  return cleaned;
};

/**
 * Cleans debt payment data by removing undefined values and ensuring required fields
 */
export const cleanDebtPaymentData = (payment: any): any => {
  const cleaned = {
    ...payment,
    // Ensure required numeric fields are properly typed and have valid values
    amount: Number(payment.amount || 0),
    principal: Number(payment.principal || payment.amount || 0),
    interest: Number(payment.interest || 0),
    // Ensure required string fields
    debtId: payment.debtId || payment.debt_id || "",
    id: payment.id || `payment_${Date.now()}`,
    // Optional fields
    note: payment.note ? String(payment.note) : null,
    linkedTransactionId: payment.linkedTransactionId || payment.linked_transaction_id || null,
  };

  // Handle date fields safely
  if (payment.date) {
    const parsedDate = safeParseDate(payment.date);
    cleaned.date = parsedDate || new Date().toISOString();
  } else {
    cleaned.date = new Date().toISOString();
  }

  if (payment.paymentDate || payment.payment_date) {
    const parsedPaymentDate = safeParseDate(payment.paymentDate || payment.payment_date);
    cleaned.paymentDate = parsedPaymentDate || cleaned.date;
  } else {
    cleaned.paymentDate = cleaned.date;
  }

  if (payment.createdAt || payment.created_at) {
    const parsedCreatedAt = safeParseDate(payment.createdAt || payment.created_at);
    cleaned.createdAt = parsedCreatedAt || new Date().toISOString();
  } else {
    cleaned.createdAt = new Date().toISOString();
  }

  if (payment.updatedAt || payment.updated_at) {
    const parsedUpdatedAt = safeParseDate(payment.updatedAt || payment.updated_at);
    cleaned.updatedAt = parsedUpdatedAt || new Date().toISOString();
  } else {
    cleaned.updatedAt = new Date().toISOString();
  }

  // Handle sync fields
  cleaned.syncUpdatedAt = Number(payment.syncUpdatedAt || payment.sync_updated_at || Date.now());
  cleaned.deleted = Boolean(payment.deleted || false);
  cleaned.syncStatus = payment.syncStatus || payment.sync_status || "pending";

  // Validation: ensure amount is greater than 0
  if (cleaned.amount <= 0) {
    console.warn(`⚠️ Invalid amount for debt payment ${cleaned.id}: ${cleaned.amount}, setting to 1`);
    cleaned.amount = 1;
    cleaned.principal = 1;
  }

  // Validation: ensure principal + interest equals amount
  if (Math.abs(cleaned.principal + cleaned.interest - cleaned.amount) > 0.01) {
    console.warn(
      `⚠️ Principal (${cleaned.principal}) + Interest (${cleaned.interest}) != Amount (${cleaned.amount}) for payment ${cleaned.id}, adjusting`
    );
    // Prioritize principal, set interest to remaining
    cleaned.principal = cleaned.amount - cleaned.interest;
    if (cleaned.principal < 0) {
      cleaned.principal = cleaned.amount;
      cleaned.interest = 0;
    }
  }

  // Validation: ensure debtId is provided
  if (!cleaned.debtId) {
    throw new Error(`Debt payment ${cleaned.id} is missing required debtId field`);
  }

  // Remove any undefined values
  Object.keys(cleaned).forEach((key) => {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });

  return cleaned;
};
