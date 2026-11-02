import { db } from "../../../infrastructure/database/repositories";
import { getDateRangeForBillingPeriod } from "../../../shared/utils";
import { subDays } from "date-fns";

/**
 * Gets the current billing period dates based on app settings
 */
export const getCurrentBillingPeriod = async (): Promise<{ start: Date; end: Date }> => {
  try {
    const settings = await db.settings.getSettings();
    return getDateRangeForBillingPeriod(settings.billingPeriodStartDay);
  } catch (error) {
    // Fallback to calendar month if settings unavailable
    const now = new Date();
    return getDateRangeForBillingPeriod(1, now);
  }
};

/**
 * Gets the previous billing period dates based on app settings
 */
export const getPreviousBillingPeriod = async (): Promise<{ start: Date; end: Date }> => {
  try {
    const settings = await db.settings.getSettings();
    const current = getDateRangeForBillingPeriod(settings.billingPeriodStartDay);

    // The previous billing period ended on the day before current period started
    const prevPeriodEnd = subDays(current.start, 1);
    return getDateRangeForBillingPeriod(settings.billingPeriodStartDay, prevPeriodEnd);
  } catch (error) {
    // Fallback to previous calendar month
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return getDateRangeForBillingPeriod(1, prev);
  }
};

/**
 * Gets billing period that contains a specific date
 */
export const getBillingPeriodForDate = async (date: Date): Promise<{ start: Date; end: Date }> => {
  try {
    const settings = await db.settings.getSettings();
    return getDateRangeForBillingPeriod(settings.billingPeriodStartDay, date);
  } catch (error) {
    // Fallback to calendar month
    return getDateRangeForBillingPeriod(1, date);
  }
};

/**
 * Checks if a date is in the current billing period
 */
export const isDateInCurrentBillingPeriod = async (date: Date): Promise<boolean> => {
  const { start, end } = await getCurrentBillingPeriod();
  return date >= start && date <= end;
};
