import { Bill } from "./index";

export type RecurrenceFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "bimonthly" | "quarterly" | "semiannually" | "annually";

export type BillStatus = "upcoming" | "due" | "overdue" | "paid" | "skipped";

export interface EnhancedBill extends Bill {
  // Enhanced recurring features
  recurrenceFrequency?: RecurrenceFrequency;
  recurrenceEndDate?: string; // When to stop recurring (optional)
  customRecurrencePattern?: {
    interval: number; // Every X periods
    dayOfMonth?: number; // For monthly bills (1-31)
    dayOfWeek?: number; // For weekly bills (0-6)
    months?: number[]; // For yearly bills (1-12)
  };

  // Auto-payment features
  autoMarkAsPaid?: boolean;
  reminderDaysBefore?: number;

  // Bill tracking
  lastPaidDate?: string;
  nextDueDate?: string; // Calculated next due date
  skipNextOccurrence?: boolean;

  // Additional metadata
  tags?: string[];
  notes?: string;
  attachments?: string[]; // File URIs
}

export interface BillTemplate {
  id: string;
  name: string;
  description?: string;
  defaultAmount?: number;
  defaultCategoryId?: string;
  defaultBudgetId?: string;
  defaultRecurrence?: {
    frequency: RecurrenceFrequency;
    interval: number;
  };
  icon?: string;
  color?: string;
}

export interface BillReminder {
  id: string;
  billId: string;
  reminderDate: string;
  message: string;
  sent: boolean;
  type: "due_soon" | "overdue" | "payment_reminder";
}

export interface BillPayment {
  id: string;
  billId: string;
  amount: number;
  paidDate: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
}

export interface BillStats {
  totalMonthlyBills: number;
  totalMonthlyAmount: number;
  paidThisMonth: number;
  pendingThisMonth: number;
  overdueCount: number;
  overdueAmount: number;
  upcomingCount: number;
  upcomingAmount: number;
  averageMonthlySpend: number;
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    count: number;
    amount: number;
  }>;
}

// Utility functions for bill calculations
export const calculateNextDueDate = (
  lastDueDate: Date,
  frequency: RecurrenceFrequency,
  interval: number = 1,
  customPattern?: EnhancedBill["customRecurrencePattern"]
): Date => {
  const nextDate = new Date(lastDueDate);

  switch (frequency) {
    case "daily":
      nextDate.setDate(nextDate.getDate() + interval);
      break;
    case "weekly":
      nextDate.setDate(nextDate.getDate() + 7 * interval);
      break;
    case "biweekly":
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case "monthly":
      if (customPattern?.dayOfMonth) {
        nextDate.setMonth(nextDate.getMonth() + interval);
        nextDate.setDate(customPattern.dayOfMonth);
      } else {
        nextDate.setMonth(nextDate.getMonth() + interval);
      }
      break;
    case "bimonthly":
      nextDate.setMonth(nextDate.getMonth() + 2);
      break;
    case "quarterly":
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case "semiannually":
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case "annually":
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      break;
  }

  return nextDate;
};

export const getBillStatus = (bill: EnhancedBill): BillStatus => {
  if (bill.paid) return "paid";
  if (bill.skipNextOccurrence) return "skipped";

  const now = new Date();
  const dueDate = new Date(bill.dueDate);
  const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

  if (daysDiff < 0) return "overdue";
  if (daysDiff === 0) return "due";
  if (daysDiff <= 7) return "upcoming";

  return "upcoming";
};

export const getRecurrenceDescription = (
  frequency: RecurrenceFrequency,
  interval: number = 1,
  customPattern?: EnhancedBill["customRecurrencePattern"]
): string => {
  const intervalText = interval > 1 ? `Every ${interval} ` : "Every ";

  switch (frequency) {
    case "daily":
      return interval > 1 ? `${intervalText}days` : "Daily";
    case "weekly":
      return interval > 1 ? `${intervalText}weeks` : "Weekly";
    case "biweekly":
      return "Every 2 weeks";
    case "monthly":
      if (customPattern?.dayOfMonth) {
        return `Monthly on the ${customPattern.dayOfMonth}${getOrdinalSuffix(customPattern.dayOfMonth)}`;
      }
      return interval > 1 ? `${intervalText}months` : "Monthly";
    case "bimonthly":
      return "Every 2 months";
    case "quarterly":
      return "Quarterly";
    case "semiannually":
      return "Semi-annually";
    case "annually":
      return interval > 1 ? `${intervalText}years` : "Annually";
    default:
      return "One-time";
  }
};

const getOrdinalSuffix = (day: number): string => {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

export interface BillPayment {
  id: string;
  billId: string;
  amount: number;
  paymentDate: string; // ISO date string
  paymentMethod?: string;
  transactionId?: string; // Link to associated transaction
  note?: string;
  createdAt: string;
  updatedAt: string;
  // Sync fields
  syncUpdatedAt: number;
  deleted?: boolean;
  syncStatus?: "pending" | "synced" | "error";
}

export interface BillPaymentHistory {
  billId: string;
  payments: BillPayment[];
  totalPaid: number;
  lastPaymentDate?: string;
  upcomingPayments: {
    dueDate: string;
    amount: number;
    status: BillStatus;
  }[];
}
