import { Budget } from "../types";

/**
 * Finds the first budget whose categoryId matches the given category ID.
 * Supports both a Record<string, Budget> (as stored in Redux) or an array of Budgets.
 *
 * @param budgets - The budgets collection from Redux state or an array of Budget objects
 * @param categoryId - The category ID to look for a matching budget
 * @returns The matching Budget if found, otherwise undefined
 */
export function findMatchingBudgetForCategory(
  budgets: Record<string, Budget> | Budget[] | null | undefined,
  categoryId?: string | null,
): Budget | undefined {
  if (!budgets || !categoryId) return undefined;
  const list = Array.isArray(budgets) ? budgets : Object.values(budgets);
  return list.find((b) => b && b.categoryId === categoryId);
}
