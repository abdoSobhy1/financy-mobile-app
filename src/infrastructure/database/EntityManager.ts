// Centralized Entity Manager - Single Source of Truth for all data operations
import { db } from "./repositories";
import { offlineFirstSync } from "../sync/OfflineFirstSync";
import { Debt, Budget, Category, DebtPayment, Transaction } from "../../shared/types";
import { generateId } from "../../shared/utils";
import { cleanDebtData, cleanBudgetData, cleanCategoryData } from "../../shared/utils/validation";

export class EntityManager {
  private static instance: EntityManager;

  private constructor() {}

  public static getInstance(): EntityManager {
    if (!EntityManager.instance) {
      EntityManager.instance = new EntityManager();
    }
    return EntityManager.instance;
  }

  // ===== DEBT OPERATIONS =====
  async createDebt(debt: Omit<Debt, "id" | "createdAt" | "updatedAt">, options: { skipSync?: boolean; useProvidedId?: string } = {}): Promise<Debt> {
    const id = options.useProvidedId || generateId();
    const now = new Date().toISOString();

    // Validate and clean data
    const cleanedDebt = cleanDebtData({
      ...debt,
      id,
      createdAt: now,
      updatedAt: now,
      syncStatus: options.skipSync ? "synced" : "pending",
    });

    // Insert into database
    // Insert into database via repository and pass through sync options so the repo
    // can honor skipSync and useProvidedId. This prevents double-logging and ensures
    // the provided ID is used when creating from sync.
    await db.debts.createDebt(cleanedDebt, { skipSync: !!options.skipSync, useProvidedId: id });

    return cleanedDebt;
  }

  async updateDebt(id: string, updates: Partial<Omit<Debt, "id" | "createdAt">>, options: { skipSync?: boolean } = {}): Promise<void> {
    // Get current debt to merge updates
    const currentDebt = await db.debts.getDebtById(id);
    if (!currentDebt) throw new Error(`Debt ${id} not found`);

    // Validate and clean updates
    const cleanedUpdates = cleanDebtData({
      ...currentDebt,
      ...updates,
      updatedAt: new Date().toISOString(),
      syncStatus: options.skipSync ? "synced" : "pending",
    });

    // Update in database
    await db.debts.updateDebt(id, cleanedUpdates);

    // Log for sync
    if (!options.skipSync) {
      await offlineFirstSync.logOperation("debts", id, "update", cleanedUpdates);
    }
  }

  // ===== BUDGET OPERATIONS =====
  async createBudget(
    budget: Omit<Budget, "id" | "createdAt" | "updatedAt">,
    options: { skipSync?: boolean; useProvidedId?: string } = {}
  ): Promise<Budget> {
    const id = options.useProvidedId || generateId();
    const now = new Date().toISOString();

    // Validate and clean data
    const cleanedBudget = cleanBudgetData({
      ...budget,
      id,
      createdAt: now,
      updatedAt: now,
      syncStatus: options.skipSync ? "synced" : "pending",
    });

    // Insert into database
    // Insert into database via repository with sync options
    await db.budgets.createBudget(cleanedBudget, { skipSync: !!options.skipSync, useProvidedId: id });

    return cleanedBudget;
  }

  // ===== CATEGORY OPERATIONS =====
  async createCategory(
    category: Omit<Category, "id" | "createdAt">,
    options: { skipSync?: boolean; useProvidedId?: string } = {}
  ): Promise<Category> {
    const id = options.useProvidedId || generateId();
    const now = new Date().toISOString();

    // Check for duplicates by name and type
    const existingCategories = await db.categories.getAllCategories();
    const duplicate = existingCategories.find((cat) => cat.name.toLowerCase() === category.name.toLowerCase() && cat.type === category.type);

    if (duplicate) {
      return duplicate;
    }

    // Validate and clean data
    const cleanedCategory = cleanCategoryData({
      ...category,
      id,
      createdAt: now,
      syncStatus: options.skipSync ? "synced" : "pending",
    });

    // Insert into database
    // Insert into database via repository with sync options
    await db.categories.createCategory(cleanedCategory, { skipSync: !!options.skipSync, useProvidedId: id });

    return cleanedCategory;
  }

  // ===== SYNC-SAFE OPERATIONS =====
  async createDebtFromSync(debtData: any): Promise<Debt> {
    return this.createDebt(debtData, {
      skipSync: true,
      useProvidedId: debtData.id,
    });
  }

  async createBudgetFromSync(budgetData: any): Promise<Budget> {
    return this.createBudget(budgetData, {
      skipSync: true,
      useProvidedId: budgetData.id,
    });
  }

  async createCategoryFromSync(categoryData: any): Promise<Category> {
    return this.createCategory(categoryData, {
      skipSync: true,
      useProvidedId: categoryData.id,
    });
  }

  // ===== DUPLICATE DETECTION =====
  async checkForDuplicates(): Promise<{
    debts: Array<{ id: string; duplicates: string[] }>;
    budgets: Array<{ id: string; duplicates: string[] }>;
    categories: Array<{ id: string; duplicates: string[] }>;
  }> {
    const [debts, budgets, categories] = await Promise.all([db.debts.getAllDebts(), db.budgets.getAllBudgets(), db.categories.getAllCategories()]);

    // Find duplicates by comparing key fields
    const debtDuplicates = this.findDuplicatesByKey(debts, "name");
    const budgetDuplicates = this.findDuplicatesByKey(budgets, "name");
    const categoryDuplicates = this.findDuplicatesByKey(categories, (cat: Category) => `${cat.name}_${cat.type}`);

    return {
      debts: debtDuplicates,
      budgets: budgetDuplicates,
      categories: categoryDuplicates,
    };
  }

  private findDuplicatesByKey<T extends { id: string }>(
    items: T[],
    keyExtractor: string | ((item: T) => string)
  ): Array<{ id: string; duplicates: string[] }> {
    const groups = new Map<string, T[]>();

    items.forEach((item) => {
      const key = typeof keyExtractor === "string" ? (item as any)[keyExtractor] : keyExtractor(item);

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });

    return Array.from(groups.entries())
      .filter(([_, group]) => group.length > 1)
      .map(([_, group]) => ({
        id: group[0].id,
        duplicates: group.slice(1).map((item) => item.id),
      }));
  }
}

// Export singleton instance
export const entityManager = EntityManager.getInstance();
