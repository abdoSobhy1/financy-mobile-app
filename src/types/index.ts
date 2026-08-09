// Global TypeScript types for the Finance Management App

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  budgetId?: string;
  description: string;
  date: string; // ISO date string
  note?: string;
  // Linking fields for bills and debt payments
  linkedBillId?: string; // ID of associated bill payment
  linkedDebtPaymentId?: string; // ID of associated debt payment
  createdAt: string; // ISO date string
  duplicatedAt?: string; // ISO date string for duplicated transactions
  // Sync fields
  updatedAt: number; // Timestamp in ms for conflict resolution
  deleted?: boolean; // Soft delete flag
  syncStatus?: "pending" | "synced" | "error"; // Local sync status
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color?: string;
  icon?: string;
  entryCount: number;
  createdAt: string;
  // Sync fields
  updatedAt: number; // Timestamp in ms for conflict resolution
  deleted?: boolean; // Soft delete flag
  syncStatus?: "pending" | "synced" | "error"; // Local sync status
}

export interface Budget {
  id: string;
  name: string;
  amount: number;
  currentBalance: number;
  resetDay: number; // Day of month (1-31)
  alertsEnabled?: boolean; // Overspending alerts toggle
  createdAt: string;
  updatedAt: string;
  // Sync fields
  syncUpdatedAt: number; // Timestamp in ms for conflict resolution
  deleted?: boolean; // Soft delete flag
  syncStatus?: "pending" | "synced" | "error"; // Local sync status
}

export interface Bill {
  id: string;
  name: string;
  // Bills removed from types; placeholder kept for compatibility
}

export interface Debt {
  id: string;
  name: string;
  totalAmount: number;
  currentBalance: number;
  interestRate?: number; // Annual percentage rate
  minimumPayment?: number;
  dueDate?: string; // ISO date string
  creditor?: string;
  description?: string;
  categoryId?: string;
  budgetId?: string;
  createdAt: string;
  updatedAt: string;
  // Sync fields
  syncUpdatedAt: number; // Timestamp in ms for conflict resolution
  deleted?: boolean; // Soft delete flag
  syncStatus?: "pending" | "synced" | "error"; // Local sync status
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  date: string; // ISO date string - main date field
  paymentDate: string; // ISO date string - specific payment date (often same as date)
  principal: number; // Amount towards principal
  interest: number; // Amount towards interest
  note?: string;
  linkedTransactionId?: string; // ID of associated transaction
  createdAt: string;
  // Sync fields
  updatedAt: string | number; // Allow both string (ISO) and number (timestamp) for flexibility
  deleted?: boolean; // Soft delete flag
  syncStatus?: "pending" | "synced" | "error"; // Local sync status
}

export interface Settings {
  id: string;
  billingPeriodStartDay: number; // Day of month (1-31)
  currency: string;
  firebaseSync: boolean;
  theme: "dark" | "light";
  createdAt: string;
  updatedAt: string;
  // Sync fields
  syncUpdatedAt: number; // Timestamp in ms for conflict resolution
  deleted?: boolean; // Soft delete flag
  syncStatus?: "pending" | "synced" | "error"; // Local sync status
}

// Filter and UI types
export interface TransactionFilters {
  categoryId?: string;
  budgetId?: string;
  type?: TransactionType;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface BillingPeriod {
  start: Date;
  end: Date;
  current: boolean;
}

// Form data types
export interface DebtFormData {
  name: string;
  totalAmount: number;
  interestRate?: number;
  minimumPayment?: number;
  dueDate?: string;
  creditor?: string;
  description?: string;
  categoryId?: string;
  budgetId?: string;
}

export interface DebtPaymentFormData {
  amount: number;
  date: string; // Main date field
  paymentDate?: string; // Optional payment date (defaults to date if not provided)
  principal?: number;
  interest?: number;
  note?: string;
}

// Form types
export interface TransactionFormData {
  amount: string;
  type: TransactionType;
  categoryId: string;
  budgetId?: string;
  description: string;
  date: Date;
  note?: string;
}

export interface ParsedTransaction {
  amount?: number;
  type?: TransactionType;
  description?: string;
  date?: Date;
  note?: string;
  categoryHint?: string; // fuzzy match to existing categories
  confidence: number; // 0–1
  rawText: string; // original voice/OCR text
  categoryId?: string;
  budgetId?: string;
}

export interface BudgetFormData {
  name: string;
  amount: string;
  resetDay: number;
  alertsEnabled?: boolean;
}

export interface BillFormData {
  name: string;
  // Simplified bill data is handled as transactions now; keep minimal shape
  budgetId?: string;
  categoryId?: string;
}

export interface CategoryFormData {
  name: string;
  type: "income" | "expense";
  color?: string;
  icon?: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Navigation types
export type RootStackParamList = {
  Main: undefined;
  AddTransaction: { editTransaction?: Transaction };
  AddBudget: undefined;
};

export type RootTabParamList = {
  Transactions: undefined;
  Budgets: undefined;
  Debts: undefined;
  Analysis: undefined;
  Settings: undefined;
};

export type TransactionStackParamList = {
  TransactionList: undefined;
  AddTransaction: { editTransaction?: Transaction; prefilledData?: ParsedTransaction; categoryId?: string };
  Dashboard: undefined;
  VoiceInput: undefined;
  VoiceVerify: { parsedTransactions: ParsedTransaction[] };
};

export type BudgetStackParamList = {
  BudgetList: undefined;
  BudgetDetails: { budgetId: string };
  BudgetForm: { budgetId?: string };
};

// Bill navigation stack removed

export type DebtStackParamList = {
  DebtList: undefined;
  DebtForm: { debtId?: string };
};

export type SettingsStackParamList = {
  SettingsList: undefined;
  CategoryManagement: undefined;
  ExportData: undefined;
  BillingPeriodSettings: undefined;
  Import: undefined;
};

export type AnalysisStackParamList = {
  AnalysisHome: undefined;
  CreateCustomChart: { chartId?: string; isEditing?: boolean } | undefined;
};

// Firebase and Auth types
export interface User {
  uid: string;
  email: string | null;
  displayName?: string | null;
  emailVerified: boolean;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export interface SyncState {
  isOnline: boolean;
  lastSync: number | null;
  pendingOperations: number;
  syncInProgress: boolean;
  error: string | null;
}

// Firestore document structure
export interface FirestoreDocument<T> {
  id: string;
  data: T;
  updatedAt: number;
  deleted?: boolean;
}

// Sync operation types
export type SyncOperation = "create" | "update" | "delete";

export interface PendingSyncOperation {
  id: string;
  collection: string;
  documentId: string;
  operation: SyncOperation;
  data?: any;
  timestamp: number;
  retryCount: number;
}

// Collection names for Firestore
export const COLLECTIONS = {
  TRANSACTIONS: "transactions",
  CATEGORIES: "categories",
  BUDGETS: "budgets",
  // BILLS removed
  DEBTS: "debts",
  DEBT_PAYMENTS: "debt_payments",
  SETTINGS: "settings",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

// Sync-enabled data types
export type SyncableEntity =
  | Transaction
  | Category
  | Budget
  | Debt
  | DebtPayment
  | Settings;

// Generic sync document type
export interface SyncDocument {
  id: string;
  updatedAt: number;
  deleted?: boolean; // Sync fields
  syncStatus?: "pending" | "synced" | "error";
}
