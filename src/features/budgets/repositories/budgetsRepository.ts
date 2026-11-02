import { DatabaseManager } from "../../../infrastructure/database";
import { Budget } from "../../../shared/types";
import { BudgetTable, transformBudget, toBudgetTable } from "../../../infrastructure/database/models";
import { generateId } from "../../../shared/utils";
import { offlineFirstSync } from "../../../infrastructure/sync/OfflineFirstSync";
import { validateBudgetData, cleanBudgetData } from "../../../shared/utils/validation";

export class BudgetRepository {
  private db = DatabaseManager.getInstance();

  async createBudget(
    budget: Omit<Budget, "id" | "createdAt" | "updatedAt">,
    options?: { skipSync?: boolean; useProvidedId?: string }
  ): Promise<Budget> {
    // Validate the budget data
    validateBudgetData(budget);

    // Clean the budget data
    const cleanedBudget = cleanBudgetData(budget);

    const database = this.db.getDatabase();
    const id = options?.useProvidedId || generateId();
    const now = new Date().toISOString();
    const tableData = toBudgetTable(cleanedBudget);

    await database.runAsync(
      `
      INSERT INTO budgets (
        id, name, amount, current_balance, period_type, alerts_enabled, reset_day, category_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        id,
        tableData.name,
        tableData.amount,
        tableData.current_balance,
        tableData.period_type || "monthly",
        tableData.alerts_enabled ?? 1,
        tableData.reset_day,
        tableData.category_id || null,
        now,
        now,
      ]
    );

    const newBudget = {
      ...cleanedBudget,
      id,
      createdAt: now,
      updatedAt: now,
    };

    // Log operation for offline-first sync (never fails)
    if (!options?.skipSync) {
      await offlineFirstSync.logOperation("budgets", id, "insert", newBudget);
    }

    return newBudget;
  }

  async getBudgetById(id: string): Promise<Budget | null> {
    const database = this.db.getDatabase();
    const result = (await database.getFirstAsync("SELECT * FROM budgets WHERE id = ?", [id])) as BudgetTable | null;

    return result ? transformBudget(result) : null;
  }

  async getAllBudgets(): Promise<Budget[]> {
    try {
      await this.db.ensureInitialized();
      const database = this.db.getDatabase();
      const results = (await database.getAllAsync("SELECT * FROM budgets ORDER BY name ASC")) as BudgetTable[];

      return results.map(transformBudget);
    } catch (error) {
      console.error("Error in getAllBudgets:", error);
      throw error;
    }
  }

  async updateBudget(id: string, updates: Partial<Omit<Budget, "id" | "createdAt" | "updatedAt">>, options?: { skipSync?: boolean }): Promise<void> {
    const database = this.db.getDatabase();

    const setParts: string[] = ["updated_at = ?"];
    const params: any[] = [new Date().toISOString()];

    if (updates.name !== undefined) {
      setParts.push("name = ?");
      params.push(updates.name);
    }

    if (updates.amount !== undefined) {
      setParts.push("amount = ?");
      params.push(updates.amount);
    }

    if (updates.currentBalance !== undefined) {
      setParts.push("current_balance = ?");
      params.push(updates.currentBalance);
    }

    if (updates.resetDay !== undefined) {
      setParts.push("reset_day = ?");
      params.push(updates.resetDay);
    }

    if (updates.categoryId !== undefined) {
      setParts.push("category_id = ?");
      params.push(updates.categoryId);
    }

    if (updates.period !== undefined) {
      setParts.push("period_type = ?");
      params.push(updates.period);
    }

    if (updates.alertsEnabled !== undefined) {
      setParts.push("alerts_enabled = ?");
      params.push(updates.alertsEnabled ? 1 : 0);
    }

    params.push(id);

    await database.runAsync(
      `
      UPDATE budgets 
      SET ${setParts.join(", ")}
      WHERE id = ?
    `,
      params
    );

    // Log operation for offline-first sync (never fails)
    const updatedBudget = await this.getBudgetById(id);
    if (!options?.skipSync) {
      await offlineFirstSync.logOperation("budgets", id, "update", updatedBudget);
    }
  }

  async deleteBudget(id: string, options?: { skipSync?: boolean }): Promise<void> {
    const database = this.db.getDatabase();

    // Check if budget has associated transactions
    const transactionCount = (await database.getFirstAsync("SELECT COUNT(*) as count FROM transactions WHERE budget_id = ?", [id])) as {
      count: number;
    } | null;

    if (transactionCount && transactionCount.count > 0) {
      throw new Error("Cannot delete budget with associated transactions. Remove budget from transactions first.");
    }

    // Check if budget has associated debts
    try {
      const debtCount = (await database.getFirstAsync("SELECT COUNT(*) as count FROM debts WHERE budget_id = ?", [id])) as { count: number } | null;
      if (debtCount && debtCount.count > 0) {
        throw new Error("Cannot delete budget with associated debts. Remove budget from debts first.");
      }
    } catch (error) {
      console.warn("Could not check debts for budget association:", error);
    }

    await database.runAsync("DELETE FROM budgets WHERE id = ?", [id]);

    // Log operation for offline-first sync (never fails)
    if (!options?.skipSync) {
      await offlineFirstSync.logOperation("budgets", id, "delete", { id });
    }
  }

  async resetBudget(id: string): Promise<void> {
    const database = this.db.getDatabase();
    const budget = await this.getBudgetById(id);

    if (!budget) {
      throw new Error("Budget not found");
    }

    await database.runAsync(
      `
      UPDATE budgets 
      SET current_balance = amount, updated_at = ?
      WHERE id = ?
    `,
      [new Date().toISOString(), id]
    );
  }

  async resetAllBudgets(): Promise<void> {
    const database = this.db.getDatabase();

    await database.runAsync(
      `
      UPDATE budgets 
      SET current_balance = amount, updated_at = ?
    `,
      [new Date().toISOString()]
    );
  }

  async getBudgetProgress(id: string): Promise<{
    budget: Budget;
    spent: number;
    remaining: number;
    percentageUsed: number;
  } | null> {
    const budget = await this.getBudgetById(id);
    if (!budget) {
      return null;
    }

    const database = this.db.getDatabase();

    // Calculate total spent in this budget
    const spentResult = (await database.getFirstAsync(
      `
      SELECT COALESCE(SUM(amount), 0) as spent
      FROM transactions 
      WHERE budget_id = ? AND type = 'expense'
    `,
      [id]
    )) as { spent: number } | null;

    const spent = spentResult?.spent || 0;
    const remaining = Math.max(0, budget.amount - spent);
    const percentageUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

    return {
      budget,
      spent,
      remaining,
      percentageUsed,
    };
  }

  async getBudgetProgressForPeriod(
    id: string,
    startDate: string,
    endDate: string
  ): Promise<{
    budget: Budget;
    spent: number;
    remaining: number;
    percentageUsed: number;
  } | null> {
    const budget = await this.getBudgetById(id);
    if (!budget) {
      return null;
    }

    const database = this.db.getDatabase();

    // Calculate total spent in this budget for the specified period
    const spentResult = (await database.getFirstAsync(
      `
      SELECT COALESCE(SUM(amount), 0) as spent
      FROM transactions 
      WHERE COALESCE(deleted, 0) = 0
        AND description != 'Balance adjustment'
        AND (budget_id = ? OR (? IS NOT NULL AND category_id = ?))
        AND (type = 'expense' OR (type = 'transfer' AND budget_id = ?))
        AND date >= ? AND date <= ?
    `,
      [id, budget.categoryId || null, budget.categoryId || null, id, startDate, endDate]
    )) as { spent: number } | null;

    const spent = spentResult?.spent || 0;
    const remaining = Math.max(0, budget.amount - spent);
    const percentageUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

    return {
      budget,
      spent,
      remaining,
      percentageUsed,
    };
  }

  async getAllBudgetProgress(): Promise<
    Array<{
      budget: Budget;
      spent: number;
      remaining: number;
      percentageUsed: number;
    }>
  > {
    const budgets = await this.getAllBudgets();
    const progressPromises = budgets.map((budget) => this.getBudgetProgress(budget.id));
    const results = await Promise.all(progressPromises);

    return results.filter((result) => result !== null) as Array<{
      budget: Budget;
      spent: number;
      remaining: number;
      percentageUsed: number;
    }>;
  }

  async getBudgetSpendingByCategory(budgetId: string): Promise<
    Array<{
      categoryId: string;
      categoryName: string;
      totalSpent: number;
    }>
  > {
    const database = this.db.getDatabase();

    const results = (await database.getAllAsync(
      `
      SELECT 
        t.category_id,
        c.name as category_name,
        COALESCE(SUM(t.amount), 0) as total_spent
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.budget_id = ? AND t.type = 'expense'
      GROUP BY t.category_id, c.name
      ORDER BY total_spent DESC
    `,
      [budgetId]
    )) as Array<{
      category_id: string;
      category_name: string;
      total_spent: number;
    }>;

    return results.map((row) => ({
      categoryId: row.category_id,
      categoryName: row.category_name,
      totalSpent: row.total_spent,
    }));
  }

  async getBudgetsNeedingReset(billingStartDay: number): Promise<Budget[]> {
    const now = new Date();
    const currentDay = now.getDate();

    // Check if we've passed the billing start day for budgets
    const budgets = await this.getAllBudgets();

    return budgets.filter((budget) => {
      // If the budget's reset day has passed in this month, it needs reset
      return budget.resetDay <= currentDay;
    });
  }

  async updateBudgetBalance(id: string, amount: number, isIncome: boolean = false): Promise<void> {
    const database = this.db.getDatabase();
    const changeAmount = isIncome ? amount : -amount;

    await database.runAsync(
      `
      UPDATE budgets 
      SET current_balance = current_balance + ?, updated_at = ?
      WHERE id = ?
    `,
      [changeAmount, new Date().toISOString(), id]
    );
  }
}
