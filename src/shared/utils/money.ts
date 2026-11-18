/**
 * Minor-unit (integer qirsh / cents) money utilities.
 *
 * All currency arithmetic is performed on exact integer minor units (1 major unit = 100 minor units).
 * Conversions between major decimal values and integer minor units use base-10 scientific notation
 * shifting (`e2` / `e-2`) rather than binary floating-point `* 100` / `/ 100`, preventing
 * IEEE-754 representation drift such as `24.999999999` or `1.005 * 100 -> 100.49999999999999`.
 */

/**
 * Converts Arabic-Indic (`٠-٩`) and Eastern Arabic-Indic (`۰-۹`) digits and separators
 * into standard Western ASCII digits and decimal point.
 */
export function arabicToWesternDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".")
    .replace(/[٬،]/g, ",");
}

/**
 * Converts a major currency value (number or string, e.g. `25.5` or `"24.999999"`)
 * into exact integer minor units (e.g. `2550` or `2500`).
 */
export function toMinorUnits(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "string") {
    const normalized = arabicToWesternDigits(value)
      .trim()
      .replace(/,/g, "")
      .replace(/[^0-9.+\-eE]/g, "");
    if (!normalized || normalized === "-" || normalized === "+" || normalized === ".") {
      return 0;
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    if (/^[+-]?\d+(\.\d+)?$/.test(normalized)) {
      const shifted = Math.round(Number(`${normalized}e2`));
      return shifted === 0 ? 0 : shifted;
    }
    const shifted = Math.round(Number(`${parsed.toFixed(6)}e2`));
    return shifted === 0 ? 0 : shifted;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  const str = String(value);
  const shifted =
    str.includes("e") || str.includes("E")
      ? Math.round(Number(`${value.toFixed(6)}e2`))
      : Math.round(Number(`${str}e2`));

  return shifted === 0 ? 0 : shifted;
}

/**
 * Converts integer minor units (e.g. `2550` or `2500`) back to a major currency number (`25.5` or `25`)
 * using base-10 exponent shifting (`e-2`) without binary float division.
 */
export function fromMinorUnits(minorUnits: number): number {
  if (!Number.isFinite(minorUnits)) {
    return 0;
  }
  const intMinor = Math.round(minorUnits);
  if (intMinor === 0) {
    return 0;
  }
  return Number(`${intMinor}e-2`);
}

/**
 * Normalizes any numeric or string money value to an exact 2-decimal major currency number.
 * Example: `24.999999` -> `25`, `1.005` -> `1.01`.
 */
export function normalizeMoney(value: number | string | null | undefined): number {
  return fromMinorUnits(toMinorUnits(value));
}

/**
 * Adds multiple money values using exact integer minor-unit arithmetic.
 */
export function addMoney(...values: Array<number | string | null | undefined>): number {
  let totalMinor = 0;
  for (const val of values) {
    totalMinor += toMinorUnits(val);
  }
  return fromMinorUnits(totalMinor);
}

/**
 * Subtracts `b` from `a` (`a - b`) using exact integer minor-unit arithmetic.
 */
export function subtractMoney(
  a: number | string | null | undefined,
  b: number | string | null | undefined,
): number {
  return fromMinorUnits(toMinorUnits(a) - toMinorUnits(b));
}

/**
 * Sums an array of items by selector using exact integer minor-unit accumulation.
 */
export function sumMoney<T>(
  items: readonly T[],
  selector: (item: T) => number | string | null | undefined,
): number {
  let totalMinor = 0;
  for (const item of items) {
    totalMinor += toMinorUnits(selector(item));
  }
  return fromMinorUnits(totalMinor);
}

/**
 * Returns true if the money value is zero in minor units (`0` qirsh/cents).
 */
export function isZeroMoney(value: number | string | null | undefined): boolean {
  return toMinorUnits(value) === 0;
}

/**
 * Parses user-entered currency input string into a normalized major currency number.
 */
export function parseMoneyInput(input: string | number | null | undefined): number {
  return normalizeMoney(input);
}

/**
 * Formats a money number/string for display inside a text input without trailing float noise.
 * Example: `24.999999` -> `"25"`, `25.5` -> `"25.5"`, `0` -> `"0"`.
 */
export function formatMoneyInput(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  return String(normalizeMoney(value));
}
