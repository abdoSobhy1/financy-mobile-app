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
  CARD_RADIUS: 16,
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
  },
  COLORS: {
    // Dark premium palette – deep indigo base
    BACKGROUND: "#0B0B1E",
    SURFACE: "#141432",
    SURFACE_BLUR: "rgba(20, 20, 50, 0.85)",
    CARD: "#1B1B3A",
    CARD_BLUR: "rgba(27, 27, 58, 0.9)",

    // Brand
    PRIMARY: "#6C5CE7",
    PRIMARY_LIGHT: "#A29BFE",
    PRIMARY_DARK: "#4834D4",

    // Semantic
    ACCENT: "#00D2D3",
    ERROR: "#FF6B6B",
    WARNING: "#FECA57",
    SUCCESS: "#2ED573",

    // Text
    TEXT_PRIMARY: "#F0F0FF",
    TEXT_SECONDARY: "#A0A0C8",
    TEXT_MUTED: "#5E5E80",

    // Chrome
    BORDER: "#2A2A4A",
    INPUT_BACKGROUND: "#1A1A3E",
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
