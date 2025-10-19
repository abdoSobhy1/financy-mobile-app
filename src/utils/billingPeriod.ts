import { db } from "../database/queries";
import { getDateRangeForBillingPeriod } from "./index";

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

    // Go back one billing period
    const previousMonthRef = new Date(current.start);
    previousMonthRef.setMonth(previousMonthRef.getMonth() - 1);

    return getDateRangeForBillingPeriod(settings.billingPeriodStartDay, previousMonthRef);
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
