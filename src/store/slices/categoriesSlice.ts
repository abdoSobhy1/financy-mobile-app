import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { Category, CategoryFormData } from "../../types";
import { db } from "../../database/queries";

// Async thunks for database operations
export const fetchCategories = createAsyncThunk(
  "categories/fetchCategories",
  async () => {
    return await db.categories.getAllCategories();
  },
);

export const fetchCategoriesByType = createAsyncThunk(
  "categories/fetchCategoriesByType",
  async (type: "income" | "expense") => {
    return await db.categories.getCategoriesByType(type);
  },
);

export const addCategory = createAsyncThunk(
  "categories/addCategory",
  async (categoryData: CategoryFormData) => {
    const category: Omit<Category, "id" | "createdAt"> = {
      name: categoryData.name,
      type: categoryData.type,
      color: categoryData.color,
      icon: categoryData.icon,
      entryCount: 0,
      // Sync fields
      updatedAt: Date.now(),
      deleted: false,
      syncStatus: "pending",
    };
    return await db.categories.createCategory(category);
  },
);

export const updateCategory = createAsyncThunk(
  "categories/updateCategory",
  async ({
    id,
    updates,
  }: {
    id: string;
    updates: Partial<CategoryFormData>;
  }) => {
    const categoryUpdates: Partial<Omit<Category, "id" | "createdAt">> = {};

    if (updates.name !== undefined) {
      categoryUpdates.name = updates.name;
    }
    if (updates.type !== undefined) {
      categoryUpdates.type = updates.type;
    }
    if (updates.color !== undefined) {
      categoryUpdates.color = updates.color;
    }
    if (updates.icon !== undefined) {
      categoryUpdates.icon = updates.icon;
    }

    await db.categories.updateCategory(id, categoryUpdates);
    return await db.categories.getCategoryById(id);
  },
);

export const deleteCategory = createAsyncThunk(
  "categories/deleteCategory",
  async (id: string) => {
    await db.categories.deleteCategory(id);
    return id;
  },
);

export const fetchCategoryUsageStats = createAsyncThunk(
  "categories/fetchCategoryUsageStats",
  async () => {
    return await db.categories.getCategoryUsageStats();
  },
);

export const fetchTopSpendingCategories = createAsyncThunk(
  "categories/fetchTopSpendingCategories",
  async (limit: number = 5) => {
    return await db.categories.getTopSpendingCategories(limit);
  },
);

export const checkCategoryNameUnique = createAsyncThunk(
  "categories/checkCategoryNameUnique",
  async ({ name, excludeId }: { name: string; excludeId?: string }) => {
    return await db.categories.isCategoryNameUnique(name, excludeId);
  },
);

// State interface
interface CategoriesState {
  items: Record<string, Category>;
  ids: string[];
  incomeCategories: string[];
  expenseCategories: string[];
  usageStats: Array<{
    category: Category;
    transactionCount: number;
    totalAmount: number;
    averageAmount: number;
  }>;
  topSpendingCategories: Array<{
    category: Category;
    totalSpent: number;
  }>;
  loading: boolean;
  error: string | null;
}

const initialState: CategoriesState = {
  items: {},
  ids: [],
  incomeCategories: [],
  expenseCategories: [],
  usageStats: [],
  topSpendingCategories: [],
  loading: false,
  error: null,
};

const categoriesSlice = createSlice({
  name: "categories",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    markCategorySynced: (state, action: PayloadAction<string>) => {
      const item = state.items[action.payload];
      if (item) {
        item.syncStatus = "synced";
        (item as any).sync_status = "synced";
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch all categories
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.items = {};
        state.ids = [];
        state.incomeCategories = [];
        state.expenseCategories = [];

        action.payload.forEach((category) => {
          state.items[category.id] = category;
          state.ids.push(category.id);

          if (category.type === "income") {
            state.incomeCategories.push(category.id);
          } else {
            state.expenseCategories.push(category.id);
          }
        });
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch categories";
      });

    // Fetch categories by type
    builder.addCase(fetchCategoriesByType.fulfilled, (state, action) => {
      const categories = action.payload;
      const type = action.meta.arg;

      categories.forEach((category) => {
        if (!state.items[category.id]) {
          state.items[category.id] = category;
          state.ids.push(category.id);
        } else {
          state.items[category.id] = category;
        }
      });

      // Update type-specific arrays
      if (type === "income") {
        state.incomeCategories = categories.map((c) => c.id);
      } else {
        state.expenseCategories = categories.map((c) => c.id);
      }
    });

    // Add category
    builder
      .addCase(addCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCategory.fulfilled, (state, action) => {
        state.loading = false;
        const category = action.payload;
        state.items[category.id] = category;
        state.ids.push(category.id);

        if (category.type === "income") {
          state.incomeCategories.push(category.id);
        } else {
          state.expenseCategories.push(category.id);
        }
      })
      .addCase(addCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to add category";
      });

    // Update category
    builder
      .addCase(updateCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          const category = action.payload;
          const oldCategory = state.items[category.id];

          // Update category
          state.items[category.id] = category;

          // Handle type change
          if (oldCategory && oldCategory.type !== category.type) {
            // Remove from old type array
            if (oldCategory.type === "income") {
              state.incomeCategories = state.incomeCategories.filter(
                (id) => id !== category.id,
              );
            } else {
              state.expenseCategories = state.expenseCategories.filter(
                (id) => id !== category.id,
              );
            }

            // Add to new type array
            if (category.type === "income") {
              state.incomeCategories.push(category.id);
            } else {
              state.expenseCategories.push(category.id);
            }
          }
        }
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to update category";
      });

    // Delete category
    builder
      .addCase(deleteCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.loading = false;
        const id = action.payload;
        const category = state.items[id];

        if (category) {
          // Remove from type-specific arrays
          if (category.type === "income") {
            state.incomeCategories = state.incomeCategories.filter(
              (categoryId) => categoryId !== id,
            );
          } else {
            state.expenseCategories = state.expenseCategories.filter(
              (categoryId) => categoryId !== id,
            );
          }
        }

        delete state.items[id];
        state.ids = state.ids.filter((categoryId) => categoryId !== id);
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to delete category";
      });

    // Fetch category usage stats
    builder.addCase(fetchCategoryUsageStats.fulfilled, (state, action) => {
      state.usageStats = action.payload;
    });

    // Fetch top spending categories
    builder.addCase(fetchTopSpendingCategories.fulfilled, (state, action) => {
      state.topSpendingCategories = action.payload;
    });
  },
});

export const { clearError, markCategorySynced } = categoriesSlice.actions;
export default categoriesSlice.reducer;

// Selectors
export const selectAllCategories = (state: { categories: CategoriesState }) =>
  Object.values(state.categories.items);
