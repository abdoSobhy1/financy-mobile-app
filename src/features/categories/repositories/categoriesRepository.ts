import { DatabaseManager } from "../../../infrastructure/database";
import { Category } from "../../../shared/types";
import { CategoryTable, transformCategory, toCategoryTable } from "../../../infrastructure/database/models";
import { generateId } from "../../../shared/utils";
import { offlineFirstSync } from "../../../infrastructure/sync/OfflineFirstSync";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getStoredUser,
  isCurrentSessionCloudAllowed,
  isSessionSeeded,
  markSessionSeeded,
} from "../../auth/services/authSessionStorage";
import {
  validateCategoryData,
  cleanCategoryData,
} from "../../../shared/utils/validation";

export const DEFAULT_ARABIC_CATEGORIES: Array<{
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string;
}> = [
  // Expenses (مصروفات)
  { id: "cat_default_food", name: "طعام ومطاعم", type: "expense", color: "#F97316", icon: "restaurant" },
  { id: "cat_default_groceries", name: "سوبر ماركت وبقالة", type: "expense", color: "#22C55E", icon: "cart" },
  { id: "cat_default_transport", name: "مواصلات ووقود", type: "expense", color: "#3B82F6", icon: "car" },
  { id: "cat_default_bills", name: "فواتير وخدمات", type: "expense", color: "#F59E0B", icon: "flash" },
  { id: "cat_default_shopping", name: "تسوق وملابس", type: "expense", color: "#8B5CF6", icon: "bag-handle" },
  { id: "cat_default_health", name: "صحة وأدوية", type: "expense", color: "#F43F5E", icon: "medkit" },
  { id: "cat_default_housing", name: "إيجار وسكن", type: "expense", color: "#6366F1", icon: "home" },
  { id: "cat_default_entertainment", name: "ترفيه وخروجات", type: "expense", color: "#EC4899", icon: "game-controller" },
  { id: "cat_default_education", name: "تعليم ودورات", type: "expense", color: "#14B8A6", icon: "school" },
  { id: "cat_default_other_exp", name: "مصاريف أخرى", type: "expense", color: "#64748B", icon: "pricetag" },
  // Income (دخل)
  { id: "cat_default_salary", name: "راتب شهري", type: "income", color: "#10B981", icon: "cash" },
  { id: "cat_default_freelance", name: "عمل حر ومشاريع", type: "income", color: "#14B8A6", icon: "briefcase" },
  { id: "cat_default_bonus", name: "مكافآت وحوافز", type: "income", color: "#EAB308", icon: "gift" },
  { id: "cat_default_investments", name: "استثمارات وأرباح", type: "income", color: "#0EA5E9", icon: "trending-up" },
  { id: "cat_default_other_inc", name: "دخل إضافي", type: "income", color: "#8B5CF6", icon: "wallet" },
];

export class CategoryRepository {
  private db = DatabaseManager.getInstance();
  private isSeedingDefaults = false;

  async createCategory(
    category: Omit<Category, "id" | "createdAt">,
    options?: { skipSync?: boolean; useProvidedId?: string },
  ): Promise<Category> {
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
      INSERT INTO categories (id, name, type, color, icon, entry_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        id,
        tableData.name,
        tableData.type,
        tableData.color || null,
        tableData.icon || null,
        tableData.entry_count,
        createdAt,
      ],
    );

    const newCategory = {
      ...cleanedCategory,
      id,
      createdAt,
    };

    // Log operation for offline-first sync (never fails)
    if (!options?.skipSync) {
      await offlineFirstSync.logOperation(
        "categories",
        id,
        "insert",
        newCategory,
      );
    }

    return newCategory;
  }

  async getCategoryById(id: string): Promise<Category | null> {
    const database = this.db.getDatabase();
    const result = (await database.getFirstAsync(
      "SELECT * FROM categories WHERE id = ?",
      [id],
    )) as CategoryTable | null;

    return result ? transformCategory(result) : null;
  }

  private async shouldSeedDefaults(userId?: string): Promise<boolean> {
    try {
      const storedUser = await getStoredUser();
      // Never auto-seed when no user session is active (e.g. on SignInScreen)
      if (!storedUser && !userId) {
        return false;
      }

      const isCloudAllowed = await isCurrentSessionCloudAllowed();
      // If user is logged in with Firebase, wait for cloud restore before seeding defaults
      if (isCloudAllowed || (storedUser && !storedUser.isGuest && storedUser.uid !== "guest")) {
        return false;
      }

      const currentUserId = userId || storedUser?.uid || "guest";

      // If user has already been marked as seeded, NEVER auto-seed again (prevents resurrecting deleted categories)
      const alreadySeeded = await isSessionSeeded("categories", currentUserId);
      if (alreadySeeded) {
        return false;
      }

      return true;
    } catch (e) {
      console.warn("Error checking shouldSeedDefaults:", e);
      return false;
    }
  }

  public async seedDefaultArabicCategories(userId?: string): Promise<void> {
    const database = this.db.getDatabase();

    for (const defCat of DEFAULT_ARABIC_CATEGORIES) {
      // Check if a category with this deterministic ID or exact name already exists
      const existing = await database.getFirstAsync<{ id: string }>(
        "SELECT id FROM categories WHERE id = ? OR name = ?",
        [defCat.id, defCat.name],
      );

      if (!existing) {
        await this.createCategory(
          {
            name: defCat.name,
            type: defCat.type,
            color: defCat.color,
            icon: defCat.icon,
            entryCount: 0,
            updatedAt: Date.now(),
            deleted: false,
            syncStatus: "pending",
          },
          { useProvidedId: defCat.id },
        );
      }
    }

    // Mark as seeded for this user/session so it never regenerates if user deletes them
    try {
      await markSessionSeeded("categories", userId);
    } catch (e) {
      console.warn("Failed to set categories seeded key:", e);
    }
  }

  async getAllCategories(): Promise<Category[]> {
    try {
      await this.db.ensureInitialized();
      const database = this.db.getDatabase();
      let results = (await database.getAllAsync(
        "SELECT * FROM categories ORDER BY entry_count DESC, type ASC, name ASC",
      )) as CategoryTable[];

      let activeResults = results.filter((r) => !(r as any).deleted);

      // Only auto-generate if no active categories exist AND shouldSeedDefaults() allows it
      if (activeResults.length === 0 && !this.isSeedingDefaults) {
        const canSeed = await this.shouldSeedDefaults();
        if (canSeed) {
          this.isSeedingDefaults = true;
          try {
            await this.seedDefaultArabicCategories();
            results = (await database.getAllAsync(
              "SELECT * FROM categories ORDER BY entry_count DESC, type ASC, name ASC",
            )) as CategoryTable[];
            activeResults = results.filter((r) => !(r as any).deleted);
          } finally {
            this.isSeedingDefaults = false;
          }
        }
      }
      return activeResults.map(transformCategory);
    } catch (error) {
      console.error("Error in getAllCategories:", error);
      throw error;
    }
  }

  async getCategoriesByType(type: "income" | "expense"): Promise<Category[]> {
    const database = this.db.getDatabase();
    const results = (await database.getAllAsync(
      "SELECT * FROM categories WHERE type = ? AND (deleted = 0 OR deleted IS NULL) ORDER BY entry_count DESC, name ASC",
      [type],
    )) as CategoryTable[];

    return results.map(transformCategory);
  }

  async updateCategory(
    id: string,
    updates: Partial<Omit<Category, "id" | "createdAt">>,
    options?: { skipSync?: boolean },
  ): Promise<void> {
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

    if (updates.icon !== undefined) {
      setParts.push("icon = ?");
      params.push(updates.icon || null);
    }

    if (setParts.length === 0) {
      return; // No updates to make
    }

    const nowMs = Date.now();
    setParts.push("updated_at = ?", "sync_updated_at = ?", "sync_status = ?");
    params.push(new Date(nowMs).toISOString(), nowMs, options?.skipSync ? "synced" : "pending");
    params.push(id);

    await database.runAsync(
      `
      UPDATE categories 
      SET ${setParts.join(", ")}
      WHERE id = ?
    `,
      params,
    );

    // Log operation for offline-first sync (never fails)
    const updatedCategory = await this.getCategoryById(id);
    if (!options?.skipSync) {
      await offlineFirstSync.logOperation(
        "categories",
        id,
        "update",
        updatedCategory,
      );
    }
  }

  async deleteCategory(
    id: string,
    options?: { skipSync?: boolean; userId?: string },
  ): Promise<void> {
    const database = this.db.getDatabase();

    // Check if category has associated transactions
    const transactionCount = (await database.getFirstAsync(
      "SELECT COUNT(*) as count FROM transactions WHERE category_id = ?",
      [id],
    )) as {
      count: number;
    } | null;

    if (transactionCount && transactionCount.count > 0) {
      throw new Error(
        "Cannot delete category with associated transactions. Reassign transactions to another category first.",
      );
    }

    await database.runAsync("DELETE FROM categories WHERE id = ?", [id]);

    // Ensure deleting categories never triggers auto-reseeding
    try {
      await markSessionSeeded("categories", options?.userId);
    } catch (e) {
      // ignore
    }

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
      WHERE c.deleted = 0 OR c.deleted IS NULL
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
    endDate: string,
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
      [categoryId, startDate, endDate],
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
      [limit],
    )) as Array<CategoryTable & { total_spent: number }>;

    return results.map((row) => ({
      category: transformCategory(row),
      totalSpent: row.total_spent,
    }));
  }

  async searchCategories(
    searchTerm: string,
    type?: "income" | "expense",
  ): Promise<Category[]> {
    const database = this.db.getDatabase();
    let query = "SELECT * FROM categories WHERE name LIKE ?";
    const params = [`%${searchTerm}%`];

    if (type) {
      query += " AND type = ?";
      params.push(type);
    }

    query += " ORDER BY name ASC";

    const results = (await database.getAllAsync(
      query,
      params,
    )) as CategoryTable[];
    return results.map(transformCategory);
  }

  async isCategoryNameUnique(
    name: string,
    excludeId?: string,
  ): Promise<boolean> {
    const database = this.db.getDatabase();
    let query =
      "SELECT COUNT(*) as count FROM categories WHERE LOWER(name) = LOWER(?)";
    const params = [name];

    if (excludeId) {
      query += " AND id != ?";
      params.push(excludeId);
    }

    const result = (await database.getFirstAsync(query, params)) as {
      count: number;
    } | null;
    return (result?.count || 0) === 0;
  }

  async incrementEntryCount(categoryId: string): Promise<void> {
    const database = this.db.getDatabase();
    await database.runAsync(
      "UPDATE categories SET entry_count = entry_count + 1 WHERE id = ?",
      [categoryId],
    );
  }

  async decrementEntryCount(categoryId: string): Promise<void> {
    const database = this.db.getDatabase();
    await database.runAsync(
      "UPDATE categories SET entry_count = CASE WHEN entry_count > 0 THEN entry_count - 1 ELSE 0 END WHERE id = ?",
      [categoryId],
    );
  }

  async updateEntryCount(categoryId: string, count: number): Promise<void> {
    const database = this.db.getDatabase();
    await database.runAsync(
      "UPDATE categories SET entry_count = ? WHERE id = ?",
      [count, categoryId],
    );
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
