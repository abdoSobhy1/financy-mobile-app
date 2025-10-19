// App-wide constants for the Finance Management App

export const DATABASE = {
  NAME: "financy.db",
  VERSION: 1,
} as const;

export const TRANSACTION_TYPES = {
  INCOME: "income",
  EXPENSE: "expense",
  DEBT: "debt",
} as const;

export const CATEGORY_TYPES = {
  INCOME: "income",
  EXPENSE: "expense",
} as const;

export const UI = {
  CARD_RADIUS: 12,
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
  },
  COLORS: {
    // Dark theme colors with frosted glass effect
    BACKGROUND: "#0F0F23",
    SURFACE: "#1A1A2E",
    SURFACE_BLUR: "rgba(26, 26, 46, 0.8)",
    CARD: "#16213E",
    CARD_BLUR: "rgba(22, 33, 62, 0.9)",
    PRIMARY: "#4F46E5",
    PRIMARY_LIGHT: "#6366F1",
    ACCENT: "#10B981",
    ERROR: "#EF4444",
    WARNING: "#F59E0B",
    SUCCESS: "#10B981",
    TEXT_PRIMARY: "#F8FAFC",
    TEXT_SECONDARY: "#CBD5E1",
    TEXT_MUTED: "#64748B",
    BORDER: "#334155",
    INPUT_BACKGROUND: "#1E293B",
  },
  FONTS: {
    REGULAR: "System",
    MEDIUM: "System",
    BOLD: "System",
  },
} as const;

export const CURRENCY = {
  DEFAULT: "USD",
  SYMBOL: "$",
  LOCALE: "en-US",
} as const;

export const DATE_FORMATS = {
  DISPLAY: "MMM dd, yyyy",
  INPUT: "yyyy-MM-dd",
  STORAGE: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
} as const;

export const BILLING_PERIOD = {
  DEFAULT_START_DAY: 1,
  MIN_DAY: 1,
  MAX_DAY: 31,
} as const;

export const VALIDATION = {
  TRANSACTION: {
    MIN_AMOUNT: 0.01,
    MAX_AMOUNT: 999999.99,
    MAX_DESCRIPTION_LENGTH: 100,
    MAX_NOTE_LENGTH: 500,
  },
  BUDGET: {
    MIN_AMOUNT: 0.01,
    MAX_AMOUNT: 999999.99,
    MAX_NAME_LENGTH: 50,
  },
  BILL: {
    MIN_AMOUNT: 0.01,
    MAX_AMOUNT: 999999.99,
    MAX_NAME_LENGTH: 50,
  },
  CATEGORY: {
    MAX_NAME_LENGTH: 30,
    MIN_NAME_LENGTH: 1,
  },
} as const;

export const EXPORT = {
  FORMATS: ["JSON", "CSV"] as const,
  MAX_RECORDS: 10000,
} as const;

// Navigation constants
export const SCREENS = {
  TRANSACTIONS: "Transactions",
  BUDGETS: "Budgets",
  BILLS: "Bills",
  SETTINGS: "Settings",
} as const;

// Animation constants
export const ANIMATION = {
  DURATION: {
    SHORT: 200,
    MEDIUM: 300,
    LONG: 500,
  },
  EASING: {
    EASE_OUT: "ease-out",
    EASE_IN: "ease-in",
    EASE_IN_OUT: "ease-in-out",
  },
} as const;
