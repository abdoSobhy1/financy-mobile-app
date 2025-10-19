import { DatabaseManager } from "../index";
import { Category } from "../../types";
import { CategoryTable, transformCategory, toCategoryTable } from "../models";
import { generateId } from "../../utils";
import { offlineFirstSync } from "../../services/OfflineFirstSync";
import { validateCategoryData, cleanCategoryData } from "../../utils/validation";

export class CategoryRepository {
  private db = DatabaseManager.getInstance();

  async createCategory(category: Omit<Category, "id" | "createdAt">, options?: { skipSync?: boolean; useProvidedId?: string }): Promise<Category> {
    // Validate the category data
    validateCategoryData(category);

    // Clean the category data
    const cleanedCategory = cleanCategoryData(category);

    const database = this.db.getDatabase();
    const id = options?.useProvidedId || generateId();
    const createdAt = new Date().toISOString();
    const tableData = toCategoryTable(cleanedCategory);

    await database.runAsync(
      `
      INSERT INTO categories (id, name, type, color, entry_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [id, tableData.name, tableData.type, tableData.color || null, tableData.entry_count, createdAt]
    );

    const newCategory = {
      ...cleanedCategory,
      id,
      createdAt,
    };

    // Log operation for offline-first sync (never fails)
    if (!options?.skipSync) {
      await offlineFirstSync.logOperation("categories", id, "insert", newCategory);
    }

    return newCategory;
  }

  async getCategoryById(id: string): Promise<Category | null> {
    const database = this.db.getDatabase();
    const result = (await database.getFirstAsync("SELECT * FROM categories WHERE id = ?", [id])) as CategoryTable | null;

    return result ? transformCategory(result) : null;
  }

  async getAllCategories(): Promise<Category[]> {
    try {
      await this.db.ensureInitialized();
      const database = this.db.getDatabase();
      console.log("Querying categories table...");
      const results = (await database.getAllAsync("SELECT * FROM categories ORDER BY entry_count DESC, type ASC, name ASC")) as CategoryTable[];

      console.log(`Found ${results.length} categories in database`);
      return results.map(transformCategory);
    } catch (error) {
      console.error("Error in getAllCategories:", error);
      throw error;
    }
  }

  async getCategoriesByType(type: "income" | "expense"): Promise<Category[]> {
    const database = this.db.getDatabase();
    const results = (await database.getAllAsync("SELECT * FROM categories WHERE type = ? ORDER BY entry_count DESC, name ASC", [
      type,
    ])) as CategoryTable[];

    return results.map(transformCategory);
  }

  async updateCategory(id: string, updates: Partial<Omit<Category, "id" | "createdAt">>, options?: { skipSync?: boolean }): Promise<void> {
    const database = this.db.getDatabase();

    const setParts: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) {
      setParts.push("name = ?");
      params.push(updates.name);
    }

    if (updates.type !== undefined) {
      setParts.push("type = ?");
      params.push(updates.type);
    }

    if (updates.color !== undefined) {
      setParts.push("color = ?");
      params.push(updates.color || null);
    }

    if (setParts.length === 0) {
      return; // No updates to make
    }

    params.push(id);

    await database.runAsync(
      `
      UPDATE categories 
      SET ${setParts.join(", ")}
      WHERE id = ?
    `,
      params
    );

    // Log operation for offline-first sync (never fails)
    const updatedCategory = await this.getCategoryById(id);
    if (!options?.skipSync) {
      await offlineFirstSync.logOperation("categories", id, "update", updatedCategory);
    }
  }

  async deleteCategory(id: string, options?: { skipSync?: boolean }): Promise<void> {
    const database = this.db.getDatabase();

    // Check if category has associated transactions
    const transactionCount = (await database.getFirstAsync("SELECT COUNT(*) as count FROM transactions WHERE category_id = ?", [id])) as {
      count: number;
    } | null;

    if (transactionCount && transactionCount.count > 0) {
      throw new Error("Cannot delete category with associated transactions. Reassign transactions to another category first.");
    }

    // Check if category has associated bills
    const billCount = (await database.getFirstAsync("SELECT COUNT(*) as count FROM bills WHERE category_id = ?", [id])) as { count: number } | null;

    if (billCount && billCount.count > 0) {
      throw new Error("Cannot delete category with associated bills. Reassign bills to another category first.");
    }

    await database.runAsync("DELETE FROM categories WHERE id = ?", [id]);

    // Log operation for offline-first sync (never fails)
    if (!options?.skipSync) {
      await offlineFirstSync.logOperation("categories", id, "delete", { id });
    }
  }

  async getCategoryUsageStats(): Promise<
    Array<{
      category: Category;
      transactionCount: number;
      totalAmount: number;
      averageAmount: number;
    }>
  > {
    const database = this.db.getDatabase();

    const results = (await database.getAllAsync(`
      SELECT 
        c.*,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(t.amount), 0) as total_amount,
        COALESCE(AVG(t.amount), 0) as average_amount
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id
      GROUP BY c.id, c.name, c.type, c.color, c.created_at
      ORDER BY transaction_count DESC
    `)) as Array<
      CategoryTable & {
        transaction_count: number;
        total_amount: number;
        average_amount: number;
      }
    >;

    return results.map((row) => ({
      category: transformCategory(row),
      transactionCount: row.transaction_count,
      totalAmount: row.total_amount,
      averageAmount: row.average_amount,
    }));
  }

  async getCategorySpendingForPeriod(
    categoryId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    category: Category;
    totalSpent: number;
    transactionCount: number;
  } | null> {
    const category = await this.getCategoryById(categoryId);
    if (!category) {
      return null;
    }

    const database = this.db.getDatabase();

    const result = (await database.getFirstAsync(
      `
      SELECT 
        COUNT(*) as transaction_count,
        COALESCE(SUM(amount), 0) as total_spent
      FROM transactions 
      WHERE category_id = ? AND date >= ? AND date <= ?
    `,
      [categoryId, startDate, endDate]
    )) as {
      transaction_count: number;
      total_spent: number;
    } | null;

    return {
      category,
      totalSpent: result?.total_spent || 0,
      transactionCount: result?.transaction_count || 0,
    };
  }

  async getTopSpendingCategories(limit: number = 5): Promise<
    Array<{
      category: Category;
      totalSpent: number;
    }>
  > {
    const database = this.db.getDatabase();

    const results = (await database.getAllAsync(
      `
      SELECT 
        c.*,
        COALESCE(SUM(t.amount), 0) as total_spent
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id AND t.type = 'expense'
      WHERE c.type = 'expense'
      GROUP BY c.id, c.name, c.type, c.color, c.created_at
      ORDER BY total_spent DESC
      LIMIT ?
    `,
      [limit]
    )) as Array<CategoryTable & { total_spent: number }>;

    return results.map((row) => ({
      category: transformCategory(row),
      totalSpent: row.total_spent,
    }));
  }

  async searchCategories(searchTerm: string, type?: "income" | "expense"): Promise<Category[]> {
    const database = this.db.getDatabase();
    let query = "SELECT * FROM categories WHERE name LIKE ?";
    const params = [`%${searchTerm}%`];

    if (type) {
      query += " AND type = ?";
      params.push(type);
    }

    query += " ORDER BY name ASC";

    const results = (await database.getAllAsync(query, params)) as CategoryTable[];
    return results.map(transformCategory);
  }

  async isCategoryNameUnique(name: string, excludeId?: string): Promise<boolean> {
    const database = this.db.getDatabase();
    let query = "SELECT COUNT(*) as count FROM categories WHERE LOWER(name) = LOWER(?)";
    const params = [name];

    if (excludeId) {
      query += " AND id != ?";
      params.push(excludeId);
    }

    const result = (await database.getFirstAsync(query, params)) as { count: number } | null;
    return (result?.count || 0) === 0;
  }

  async incrementEntryCount(categoryId: string): Promise<void> {
    const database = this.db.getDatabase();
    await database.runAsync("UPDATE categories SET entry_count = entry_count + 1 WHERE id = ?", [categoryId]);
  }

  async decrementEntryCount(categoryId: string): Promise<void> {
    const database = this.db.getDatabase();
    await database.runAsync("UPDATE categories SET entry_count = CASE WHEN entry_count > 0 THEN entry_count - 1 ELSE 0 END WHERE id = ?", [
      categoryId,
    ]);
  }

  async updateEntryCount(categoryId: string, count: number): Promise<void> {
    const database = this.db.getDatabase();
    await database.runAsync("UPDATE categories SET entry_count = ? WHERE id = ?", [count, categoryId]);
  }

  async recalculateAllEntryCounts(): Promise<void> {
    const database = this.db.getDatabase();
    await database.runAsync(`
      UPDATE categories 
      SET entry_count = (
        SELECT COUNT(*) 
        FROM transactions 
        WHERE transactions.category_id = categories.id
      )
    `);
  }
}
