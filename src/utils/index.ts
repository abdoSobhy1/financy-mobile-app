import { format, parseISO, startOfDay, endOfDay, isValid, subDays } from "date-fns";
import { CURRENCY, DATE_FORMATS } from "../constants";

// Export date utilities
export * from "./dateUtils";

// Dynamic active currency state (synced with Redux settingsSlice)
let activeCurrencyCode: string = CURRENCY.DEFAULT;

export const CURRENCY_METADATA: Record<
  string,
  { symbol: string; name: string; locale: string }
> = {
  USD: { symbol: "$", name: "US Dollar", locale: "en-US" },
  EGP: { symbol: "E£", name: "Egyptian Pound", locale: "en-EG" },
  EUR: { symbol: "€", name: "Euro", locale: "de-DE" },
  GBP: { symbol: "£", name: "British Pound", locale: "en-GB" },
  SAR: { symbol: "SAR ", name: "Saudi Riyal", locale: "en-SA" },
  AED: { symbol: "AED ", name: "UAE Dirham", locale: "en-AE" },
};

export const setActiveCurrency = (code?: string | null) => {
  if (code && typeof code === "string") {
    activeCurrencyCode = code.toUpperCase();
  }
};

export const getActiveCurrency = (): string => activeCurrencyCode;

export const getCurrencySymbol = (code: string = activeCurrencyCode): string => {
  const upper = (code || activeCurrencyCode).toUpperCase();
  return CURRENCY_METADATA[upper]?.symbol || `${upper} `;
};

// Currency formatting utilities
export const formatCurrency = (
  amount: number,
  currency: string = activeCurrencyCode,
  locale?: string
): string => {
  const code = (currency || activeCurrencyCode || CURRENCY.DEFAULT).toUpperCase();
  const meta = CURRENCY_METADATA[code];
  const resolvedLocale = locale || meta?.locale || CURRENCY.LOCALE;

  if (code === "EGP" || code === "SAR" || code === "AED") {
    const absFormatted = Math.abs(amount).toLocaleString("en-US", {
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
    const sign = amount < 0 ? "-" : "";
    return `${sign}${meta?.symbol || code + " "}${absFormatted}`;
  }

  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: "currency",
      currency: code,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback to basic formatting if Intl fails
    const sym = getCurrencySymbol(code);
    return `${sym}${amount.toFixed(2)}`;
  }
};

export const parseCurrencyInput = (input: string): number => {
  // Remove currency symbols and formatting
  const cleaned = input.replace(/[^0-9.-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.abs(parsed); // Always return positive
};

// Date formatting utilities
export const formatDate = (date: Date | string, formatStr: string = DATE_FORMATS.DISPLAY): string => {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      return "Invalid Date";
    }
    return format(dateObj, formatStr);
  } catch (error) {
    return "Invalid Date";
  }
};

export const formatDateForInput = (date: Date | string): string => {
  return formatDate(date, DATE_FORMATS.INPUT);
};

export const formatDateForDisplay = (date: Date | string): string => {
  return formatDate(date, DATE_FORMATS.DISPLAY);
};

export const formatRelativeTime = (dateInput: Date | string | number): string => {
  try {
    const dateObj =
      typeof dateInput === "string"
        ? parseISO(dateInput)
        : typeof dateInput === "number"
        ? new Date(dateInput)
        : dateInput;
    if (!isValid(dateObj)) return "Recently";
    const diffMs = Date.now() - dateObj.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return format(dateObj, "MMM d, yyyy");
  } catch {
    return "Recently";
  }
};

export const formatDateForStorage = (date: Date): string => {
  return date.toISOString();
};

export const parseStoredDate = (dateString: string): Date => {
  return parseISO(dateString);
};

// Date comparison utilities
export const isDateOverdue = (dueDate: Date | string): boolean => {
  try {
    const dateObj = typeof dueDate === "string" ? parseISO(dueDate) : dueDate;
    const today = startOfDay(new Date());
    const dueDateStart = startOfDay(dateObj);
    return dueDateStart < today;
  } catch (error) {
    return false;
  }
};

export const isDateUpcoming = (dueDate: Date | string, days: number = 7): boolean => {
  try {
    const dateObj = typeof dueDate === "string" ? parseISO(dueDate) : dueDate;
    const today = startOfDay(new Date());
    const dueDateStart = startOfDay(dateObj);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStart = startOfDay(futureDate);

    return dueDateStart >= today && dueDateStart <= futureDateStart;
  } catch (error) {
    return false;
  }
};

// Date range utilities

/**
 * Safely computes the start day of a billing cycle for a given month,
 * clamping for shorter months (e.g. February has 28 days or 29 in leap years).
 * If startDay is 30, in February it clamps to Feb 28 (or Feb 29 in leap years).
 */
export const getBillingCycleStartForMonth = (
  year: number,
  month: number,
  targetDay: number
): Date => {
  // Day 0 of next month is the last day of current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(Math.max(1, targetDay), daysInMonth);
  return new Date(year, month, clampedDay);
};

export const getDateRangeForBillingPeriod = (
  startDay: number,
  referenceDate: Date = new Date()
): { start: Date; end: Date } => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  // The cycle start date for this month (clamped if needed, e.g. Feb 28 for targetDay 30)
  const thisMonthCycleStart = getBillingCycleStartForMonth(year, month, startDay);
  const refStart = startOfDay(referenceDate);

  let periodStart: Date;
  let nextCycleStart: Date;

  if (refStart >= startOfDay(thisMonthCycleStart)) {
    // Current period started this month
    periodStart = thisMonthCycleStart;
    // Next period starts next month (clamped for February / shorter months)
    nextCycleStart = getBillingCycleStartForMonth(year, month + 1, startDay);
  } else {
    // Current period started last month
    periodStart = getBillingCycleStartForMonth(year, month - 1, startDay);
    nextCycleStart = thisMonthCycleStart;
  }

  // End date is 23:59:59.999 of the day before the next cycle begins
  const periodEnd = subDays(nextCycleStart, 1);

  return {
    start: startOfDay(periodStart),
    end: endOfDay(periodEnd),
  };
};

export const isDateInRange = (date: Date | string, startDate: Date | string, endDate: Date | string): boolean => {
  try {
    const checkDate = typeof date === "string" ? parseISO(date) : date;
    const rangeStart = typeof startDate === "string" ? parseISO(startDate) : startDate;
    const rangeEnd = typeof endDate === "string" ? parseISO(endDate) : endDate;

    return checkDate >= rangeStart && checkDate <= rangeEnd;
  } catch (error) {
    return false;
  }
};

// Validation utilities
export const validateAmount = (amount: string | number): boolean => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return !isNaN(num) && num > 0 && num <= 999999.99;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateRequired = (value: string | undefined | null): boolean => {
  return value !== undefined && value !== null && value.trim().length > 0;
};

// String utilities
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
};

export const capitalizeFirst = (text: string): string => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const isWalletRelatedTransaction = (transaction: {
  type?: string;
  description?: string;
  category?: string;
}): boolean => {
  if (transaction.type === "transfer") return true;
  if (
    transaction.description === "Balance adjustment" ||
    transaction.description?.toLowerCase().includes("balance adjustment") ||
    transaction.description?.toLowerCase().includes("reconcil") ||
    transaction.category === "Adjustment"
  ) {
    return true;
  }
  return false;
};

// Array utilities
export const groupBy = <T>(array: T[], key: keyof T | ((item: T) => string)): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const groupKey = typeof key === "function" ? key(item) : String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

export const sortBy = <T>(array: T[], key: keyof T | ((item: T) => any), direction: "asc" | "desc" = "asc"): T[] => {
  return [...array].sort((a, b) => {
    const aValue = typeof key === "function" ? key(a) : a[key];
    const bValue = typeof key === "function" ? key(b) : b[key];

    if (aValue < bValue) return direction === "asc" ? -1 : 1;
    if (aValue > bValue) return direction === "asc" ? 1 : -1;
    return 0;
  });
};

// Number utilities
export const roundToTwo = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

export const percentage = (part: number, total: number): number => {
  if (total === 0) return 0;
  return roundToTwo((part / total) * 100);
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

// Budget calculation utilities
export const calculateBudgetProgress = (spent: number, budgetAmount: number) => {
  const remaining = Math.max(0, budgetAmount - spent);
  const percentageUsed = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
  const isOverBudget = spent > budgetAmount;

  return {
    spent: roundToTwo(spent),
    remaining: roundToTwo(remaining),
    percentageUsed: roundToTwo(percentageUsed),
    isOverBudget,
  };
};

// Color utilities for categories
export const getContrastColor = (hexColor: string): string => {
  if (!hexColor || hexColor.length !== 7) {
    return "#FFFFFF"; // Default to white
  }

  // Remove the hash
  const hex = hexColor.replace("#", "");

  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#000000" : "#FFFFFF";
};

// Deep clone utility
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => void>(func: T, wait: number): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Export functionality
export const exportTransactions = async (period: string) => {
  try {
    const transactions = await getTransactionsForPeriod(period);
    const exportData = {
      exportDate: new Date().toISOString(),
      period,
      totalTransactions: transactions.length,
      data: transactions,
    };

    // In a real app, you would save this to device files
    // For now, we'll just simulate the export
    const fileName = `financy_export_${period}_${new Date().getTime()}.json`;
    const filePath = `/device/storage/${fileName}`;

    console.log("Export data:", JSON.stringify(exportData, null, 2));

    return {
      success: true,
      path: filePath,
      data: exportData,
    };
  } catch (error) {
    // Export failed
    throw error;
  }
};

// Get transactions for export period (mock implementation)
const getTransactionsForPeriod = async (period: string) => {
  const now = Date.now();
  let startDate: number;

  switch (period) {
    case "month":
      startDate = now - 30 * 24 * 60 * 60 * 1000; // 30 days ago
      break;
    case "quarter":
      startDate = now - 90 * 24 * 60 * 60 * 1000; // 90 days ago
      break;
    case "all":
    default:
      startDate = 0; // All time
      break;
  }

  // This would typically query the database
  // For now, return mock data
  return [
    {
      id: "1",
      amount: 100,
      type: "expense",
      description: "Sample transaction",
      date: new Date().toISOString(),
    },
  ];
};
