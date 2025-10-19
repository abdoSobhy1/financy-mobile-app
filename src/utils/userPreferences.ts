import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_USED_CATEGORY_KEY = "@financy/last_used_category";
const LAST_USED_BUDGET_KEY = "@financy/last_used_budget";

export interface UserPreferences {
  lastUsedCategoryId?: string;
  lastUsedBudgetId?: string;
}

/**
 * Get the last used category ID for transaction forms
 */
export async function getLastUsedCategoryId(): Promise<string | null> {
  try {
    const categoryId = await AsyncStorage.getItem(LAST_USED_CATEGORY_KEY);
    return categoryId;
  } catch (error) {
    console.warn("Failed to get last used category ID:", error);
    return null;
  }
}

/**
 * Set the last used category ID for transaction forms
 */
export async function setLastUsedCategoryId(categoryId: string | null): Promise<void> {
  try {
    if (categoryId) {
      await AsyncStorage.setItem(LAST_USED_CATEGORY_KEY, categoryId);
    } else {
      await AsyncStorage.removeItem(LAST_USED_CATEGORY_KEY);
    }
  } catch (error) {
    console.warn("Failed to set last used category ID:", error);
  }
}

/**
 * Get the last used budget ID for transaction forms
 */
export async function getLastUsedBudgetId(): Promise<string | null> {
  try {
    const budgetId = await AsyncStorage.getItem(LAST_USED_BUDGET_KEY);
    return budgetId;
  } catch (error) {
    console.warn("Failed to get last used budget ID:", error);
    return null;
  }
}

/**
 * Set the last used budget ID for transaction forms
 */
export async function setLastUsedBudgetId(budgetId: string | null): Promise<void> {
  try {
    if (budgetId) {
      await AsyncStorage.setItem(LAST_USED_BUDGET_KEY, budgetId);
    } else {
      await AsyncStorage.removeItem(LAST_USED_BUDGET_KEY);
    }
  } catch (error) {
    console.warn("Failed to set last used budget ID:", error);
  }
}

/**
 * Clear all user preferences
 */
export async function clearUserPreferences(): Promise<void> {
  try {
    await Promise.all([AsyncStorage.removeItem(LAST_USED_CATEGORY_KEY), AsyncStorage.removeItem(LAST_USED_BUDGET_KEY)]);
  } catch (error) {
    console.warn("Failed to clear user preferences:", error);
  }
}
