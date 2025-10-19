import dayjs from "dayjs";

// Configure dayjs with plugins if needed
// import utc from 'dayjs/plugin/utc';
// import timezone from 'dayjs/plugin/timezone';
// dayjs.extend(utc);
// dayjs.extend(timezone);

/**
 * Centralized date utility functions for consistent date handling across the app
 */
export class DateUtils {
  // Standard format for storing dates in the database (ISO string)
  static readonly DB_FORMAT = "YYYY-MM-DDTHH:mm:ss.SSS[Z]";

  // Format for displaying dates to users
  static readonly DISPLAY_FORMAT = "MMM DD, YYYY";

  // Format for date inputs (HTML date input compatible)
  static readonly INPUT_FORMAT = "YYYY-MM-DD";

  /**
   * Creates a dayjs instance from various input types
   * @param input - Date, string, or dayjs instance
   * @returns dayjs instance or null if invalid
   */
  static parse(input: Date | string | dayjs.Dayjs | null | undefined): dayjs.Dayjs | null {
    if (!input) return null;

    try {
      const parsed = dayjs(input);
      return parsed.isValid() ? parsed : null;
    } catch (error) {
      console.warn("DateUtils.parse: Invalid date input:", input, error);
      return null;
    }
  }

  /**
   * Safely converts any date input to a Date object
   * @param input - Date, string, or dayjs instance
   * @param fallback - Fallback date if parsing fails (defaults to current date)
   * @returns Date object
   */
  static toDate(input: Date | string | dayjs.Dayjs | null | undefined, fallback?: Date): Date {
    if (input instanceof Date && !isNaN(input.getTime())) {
      return input;
    }

    const parsed = this.parse(input);
    if (parsed) {
      return parsed.toDate();
    }

    return fallback || new Date();
  }

  /**
   * Converts any date input to ISO string for database storage
   * @param input - Date, string, or dayjs instance
   * @param fallback - Fallback date if parsing fails (defaults to current date)
   * @returns ISO string
   */
  static toISOString(input: Date | string | dayjs.Dayjs | null | undefined, fallback?: Date): string {
    const date = this.toDate(input, fallback);
    return date.toISOString();
  }

  /**
   * Formats date for display to users
   * @param input - Date, string, or dayjs instance
   * @param format - Custom format (optional, defaults to DISPLAY_FORMAT)
   * @returns Formatted date string
   */
  static formatDisplay(input: Date | string | dayjs.Dayjs | null | undefined, format?: string): string {
    const parsed = this.parse(input);
    if (!parsed) return "Invalid Date";

    return parsed.format(format || this.DISPLAY_FORMAT);
  }

  /**
   * Formats date for HTML date inputs (YYYY-MM-DD)
   * @param input - Date, string, or dayjs instance
   * @returns Date string in YYYY-MM-DD format
   */
  static formatInput(input: Date | string | dayjs.Dayjs | null | undefined): string {
    const parsed = this.parse(input);
    if (!parsed) return dayjs().format(this.INPUT_FORMAT);

    return parsed.format(this.INPUT_FORMAT);
  }

  /**
   * Creates a date from YYYY-MM-DD input format (typically from HTML date inputs)
   * @param dateString - Date string in YYYY-MM-DD format
   * @param timeString - Optional time string (defaults to start of day)
   * @returns Date object
   */
  static fromInput(dateString: string, timeString?: string): Date {
    try {
      if (timeString) {
        const combined = `${dateString}T${timeString}`;
        const parsed = dayjs(combined);
        return parsed.isValid() ? parsed.toDate() : new Date();
      } else {
        // For date-only inputs, use start of day in local timezone
        const parsed = dayjs(dateString);
        return parsed.isValid() ? parsed.startOf("day").toDate() : new Date();
      }
    } catch (error) {
      console.warn("DateUtils.fromInput: Error parsing date input:", dateString, timeString, error);
      return new Date();
    }
  }

  /**
   * Validates if a date input is valid
   * @param input - Date, string, or dayjs instance
   * @returns boolean indicating if date is valid
   */
  static isValid(input: Date | string | dayjs.Dayjs | null | undefined): boolean {
    if (!input) return false;

    if (input instanceof Date) {
      return !isNaN(input.getTime());
    }

    const parsed = this.parse(input);
    return parsed !== null;
  }

  /**
   * Gets the current date/time as ISO string
   * @returns Current date as ISO string
   */
  static now(): string {
    return dayjs().toISOString();
  }

  /**
   * Gets today's date at start of day
   * @returns Today's date at 00:00:00
   */
  static today(): Date {
    return dayjs().startOf("day").toDate();
  }

  /**
   * Adds time to a date
   * @param input - Base date
   * @param amount - Amount to add
   * @param unit - Unit to add (days, months, years, etc.)
   * @returns New date
   */
  static add(input: Date | string | dayjs.Dayjs, amount: number, unit: dayjs.ManipulateType): Date {
    const parsed = this.parse(input);
    if (!parsed) return new Date();

    return parsed.add(amount, unit).toDate();
  }

  /**
   * Subtracts time from a date
   * @param input - Base date
   * @param amount - Amount to subtract
   * @param unit - Unit to subtract (days, months, years, etc.)
   * @returns New date
   */
  static subtract(input: Date | string | dayjs.Dayjs, amount: number, unit: dayjs.ManipulateType): Date {
    const parsed = this.parse(input);
    if (!parsed) return new Date();

    return parsed.subtract(amount, unit).toDate();
  }

  /**
   * Checks if two dates are the same day
   * @param date1 - First date
   * @param date2 - Second date
   * @returns boolean indicating if dates are same day
   */
  static isSameDay(date1: Date | string | dayjs.Dayjs, date2: Date | string | dayjs.Dayjs): boolean {
    const parsed1 = this.parse(date1);
    const parsed2 = this.parse(date2);

    if (!parsed1 || !parsed2) return false;

    return parsed1.format("YYYY-MM-DD") === parsed2.format("YYYY-MM-DD");
  }
}

// Convenience exports for common operations
export const formatDate = DateUtils.formatDisplay;
export const formatDateInput = DateUtils.formatInput;
export const parseDate = DateUtils.parse;
export const isValidDate = DateUtils.isValid;
export const toISOString = DateUtils.toISOString;
export const fromDateInput = DateUtils.fromInput;
