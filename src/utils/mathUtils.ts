/**
 * Safely evaluates basic math expressions (+, -, *, /)
 * Returns the result as a string or the original input if evaluation fails
 */
export const evaluateMathExpression = (expression: string): string => {
  if (!expression.trim()) return expression;

  // Remove spaces
  const cleanExpression = expression.replace(/\s/g, "");

  // Check if it contains only valid characters (numbers, +, -, *, /, ., parentheses)
  const validPattern = /^[0-9+\-*/.() ]+$/;
  if (!validPattern.test(cleanExpression)) {
    return expression; // Return original if contains invalid characters
  }

  // Additional security: check for dangerous patterns
  if (
    cleanExpression.includes("eval") ||
    cleanExpression.includes("function") ||
    cleanExpression.includes("return") ||
    cleanExpression.includes("[") ||
    cleanExpression.includes("]")
  ) {
    return expression;
  }

  try {
    // Use Function constructor as a safer alternative to eval
    const result = new Function(`"use strict"; return (${cleanExpression})`)();

    // Check if result is a valid number
    if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
      // Format to 2 decimal places and remove trailing zeros
      return parseFloat(result.toFixed(2)).toString();
    } else {
      return expression; // Return original if result is not a valid number
    }
  } catch (error) {
    // If evaluation fails, return the original expression
    return expression;
  }
};

/**
 * Example usage:
 * evaluateMathExpression("10+5") => "15"
 * evaluateMathExpression("100-25*2") => "50"
 * evaluateMathExpression("(100+50)/3") => "50"
 * evaluateMathExpression("invalid") => "invalid"
 */

/**
 * Normalizes Arabic and Persian numerals to Western numerals (0-9).
 * Useful for handling input from keyboards with different numeral systems.
 */
export const normalizeNumerals = (input: string): string => {
  if (!input) return input;
  return input
    .replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d) => (d.charCodeAt(0) - 1632).toString())
    .replace(/[۰۱۲۳۴۵۶۷۸۹]/g, (d) => (d.charCodeAt(0) - 1776).toString());
};
