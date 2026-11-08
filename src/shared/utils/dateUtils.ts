import {
  addDays,
  addMonths,
  addYears,
  format as formatDateFns,
  isSameDay as isSameDayFns,
  isValid as isValidFns,
  parseISO,
  startOfDay,
  subDays,
  subMonths,
  subYears,
} from "date-fns";

export type DateManipulateUnit = "day" | "days" | "month" | "months" | "year" | "years";

const normalizeFormatPattern = (pattern: string): string =>
  pattern.replace(/YYYY/g, "yyyy").replace(/DD/g, "dd");

/**
 * Centralized date utility functions for consistent date handling across the app.
 */
export class DateUtils {
  static readonly DB_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'";
  static readonly DISPLAY_FORMAT = "MMM dd, yyyy";
  static readonly INPUT_FORMAT = "yyyy-MM-dd";

  static parse(input: Date | string | number | null | undefined): Date | null {
    if (input === null || input === undefined || input === "") return null;

    try {
      if (input instanceof Date) {
        return isValidFns(input) ? input : null;
      }
      if (typeof input === "number") {
        const fromEpoch = new Date(input);
        return isValidFns(fromEpoch) ? fromEpoch : null;
      }
      const isoParsed = parseISO(input);
      if (isValidFns(isoParsed)) {
        return isoParsed;
      }
      const fallbackParsed = new Date(input);
      return isValidFns(fallbackParsed) ? fallbackParsed : null;
    } catch {
      return null;
    }
  }

  static toDate(input: Date | string | number | null | undefined, fallback?: Date): Date {
    const parsed = DateUtils.parse(input);
    return parsed ?? fallback ?? new Date();
  }

  static toISOString(input: Date | string | number | null | undefined, fallback?: Date): string {
    return DateUtils.toDate(input, fallback).toISOString();
  }

  static formatDisplay(input: Date | string | number | null | undefined, customFormat?: string): string {
    const parsed = DateUtils.parse(input);
    if (!parsed) return "Invalid Date";

    const pattern = customFormat
      ? normalizeFormatPattern(customFormat)
      : DateUtils.DISPLAY_FORMAT;
    return formatDateFns(parsed, pattern);
  }

  static formatInput(input: Date | string | number | null | undefined): string {
    const parsed = DateUtils.parse(input) ?? new Date();
    return formatDateFns(parsed, DateUtils.INPUT_FORMAT);
  }

  static fromInput(dateString: string, timeString?: string): Date {
    if (timeString) {
      const parsed = DateUtils.parse(`${dateString}T${timeString}`);
      return parsed ?? new Date();
    }
    const parsed = DateUtils.parse(dateString);
    return parsed ? startOfDay(parsed) : new Date();
  }

  static isValid(input: Date | string | number | null | undefined): boolean {
    return DateUtils.parse(input) !== null;
  }

  static now(): string {
    return new Date().toISOString();
  }

  static today(): Date {
    return startOfDay(new Date());
  }

  static add(input: Date | string | number, amount: number, unit: DateManipulateUnit): Date {
    const base = DateUtils.parse(input) ?? new Date();
    switch (unit) {
      case "day":
      case "days":
        return addDays(base, amount);
      case "month":
      case "months":
        return addMonths(base, amount);
      case "year":
      case "years":
        return addYears(base, amount);
    }
  }

  static subtract(input: Date | string | number, amount: number, unit: DateManipulateUnit): Date {
    const base = DateUtils.parse(input) ?? new Date();
    switch (unit) {
      case "day":
      case "days":
        return subDays(base, amount);
      case "month":
      case "months":
        return subMonths(base, amount);
      case "year":
      case "years":
        return subYears(base, amount);
    }
  }

  static isSameDay(date1: Date | string | number, date2: Date | string | number): boolean {
    const parsed1 = DateUtils.parse(date1);
    const parsed2 = DateUtils.parse(date2);
    if (!parsed1 || !parsed2) return false;
    return isSameDayFns(parsed1, parsed2);
  }
}

export const formatDate = DateUtils.formatDisplay;
export const formatDateInput = DateUtils.formatInput;
export const parseDate = DateUtils.parse;
export const isValidDate = DateUtils.isValid;
export const toISOString = DateUtils.toISOString;
export const fromDateInput = DateUtils.fromInput;
