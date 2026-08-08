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
  COLORS: {
    PRIMARY: "#6C5CE7",
    PRIMARY_LIGHT: "#8B7CF0",
    PRIMARY_DARK: "#5244C4",
    SECONDARY: "#00CE9F",
    BACKGROUND: "#0B0B1E",
    CARD: "#1A1A2E",
    SURFACE: "#1A1A2E",
    ERROR: "#FF7675",
    SUCCESS: "#00B894",
    WARNING: "#FDCB6E",
    ACCENT: "#6C5CE7",
    TEXT_PRIMARY: "#FFFFFF",
    TEXT_SECONDARY: "#A0A0B0",
    TEXT_MUTED: "#666677",
    BORDER: "rgba(255,255,255,0.1)",
  },
  CARD_RADIUS: 16,
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
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
    MIN_DESCRIPTION_LENGTH: 2,
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
