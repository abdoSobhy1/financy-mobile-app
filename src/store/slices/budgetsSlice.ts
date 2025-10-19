import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { Budget, BudgetFormData } from "../../types";
import { db } from "../../database/queries";

// Async thunks for database operations
export const fetchBudgets = createAsyncThunk("budgets/fetchBudgets", async () => {
  return await db.budgets.getAllBudgets();
});

export const fetchBudgetProgress = createAsyncThunk("budgets/fetchBudgetProgress", async () => {
  return await db.budgets.getAllBudgetProgress();
});

export const addBudget = createAsyncThunk("budgets/addBudget", async (budgetData: BudgetFormData) => {
  const budget: Omit<Budget, "id" | "createdAt" | "updatedAt"> = {
    name: budgetData.name,
    amount: parseFloat(budgetData.amount),
    currentBalance: parseFloat(budgetData.amount), // Start with full amount
    resetDay: budgetData.resetDay,
    categoryId: budgetData.categoryId,
    syncUpdatedAt: Date.now(),
  };
  return await db.budgets.createBudget(budget);
});

export const updateBudget = createAsyncThunk("budgets/updateBudget", async ({ id, updates }: { id: string; updates: Partial<BudgetFormData> }) => {
  const budgetUpdates: Partial<Omit<Budget, "id" | "createdAt" | "updatedAt">> = {};

  if (updates.name !== undefined) {
    budgetUpdates.name = updates.name;
  }
  if (updates.amount !== undefined) {
    budgetUpdates.amount = parseFloat(updates.amount);
  }
  if (updates.resetDay !== undefined) {
    budgetUpdates.resetDay = updates.resetDay;
  }

  await db.budgets.updateBudget(id, budgetUpdates);
  return await db.budgets.getBudgetById(id);
});

export const deleteBudget = createAsyncThunk("budgets/deleteBudget", async (id: string) => {
  await db.budgets.deleteBudget(id);
  return id;
});

export const resetBudget = createAsyncThunk("budgets/resetBudget", async (id: string) => {
  await db.budgets.resetBudget(id);
  return await db.budgets.getBudgetById(id);
});

export const resetAllBudgets = createAsyncThunk("budgets/resetAllBudgets", async () => {
  await db.budgets.resetAllBudgets();
  return await db.budgets.getAllBudgets();
});

export const fetchBudgetSpendingByCategory = createAsyncThunk("budgets/fetchBudgetSpendingByCategory", async (budgetId: string) => {
  return await db.budgets.getBudgetSpendingByCategory(budgetId);
});

// State interface
interface BudgetsState {
  items: Record<string, Budget>;
  ids: string[];
  progress: Record<
    string,
    {
      spent: number;
      remaining: number;
      percentageUsed: number;
    }
  >;
  spendingByCategory: Record<
    string,
    Array<{
      categoryId: string;
      categoryName: string;
      totalSpent: number;
    }>
  >;
  loading: boolean;
  error: string | null;
}

const initialState: BudgetsState = {
  items: {},
  ids: [],
  progress: {},
  spendingByCategory: {},
  loading: false,
  error: null,
};

const budgetsSlice = createSlice({
  name: "budgets",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateBudgetBalance: (state, action: PayloadAction<{ budgetId: string; amount: number; isIncome: boolean }>) => {
      const { budgetId, amount, isIncome } = action.payload;
      const budget = state.items[budgetId];
      if (budget) {
        const changeAmount = isIncome ? amount : -amount;
        budget.currentBalance += changeAmount;

        // Update progress
        if (state.progress[budgetId]) {
          const spent = budget.amount - budget.currentBalance;
          state.progress[budgetId] = {
            spent: Math.max(0, spent),
            remaining: Math.max(0, budget.currentBalance),
            percentageUsed: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
          };
        }
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch budgets
    builder
      .addCase(fetchBudgets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBudgets.fulfilled, (state, action) => {
        state.loading = false;
        state.items = {};
        state.ids = [];
        action.payload.forEach((budget) => {
          state.items[budget.id] = budget;
          state.ids.push(budget.id);
        });
      })
      .addCase(fetchBudgets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch budgets";
      });

    // Fetch budget progress
    builder.addCase(fetchBudgetProgress.fulfilled, (state, action) => {
      state.progress = {};
      action.payload.forEach((item) => {
        state.progress[item.budget.id] = {
          spent: item.spent,
          remaining: item.remaining,
          percentageUsed: item.percentageUsed,
        };
      });
    });

    // Add budget
    builder
      .addCase(addBudget.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addBudget.fulfilled, (state, action) => {
        state.loading = false;
        const budget = action.payload;
        state.items[budget.id] = budget;
        state.ids.push(budget.id);
        // Initialize progress
        state.progress[budget.id] = {
          spent: 0,
          remaining: budget.amount,
          percentageUsed: 0,
        };
      })
      .addCase(addBudget.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to add budget";
      });

    // Update budget
    builder
      .addCase(updateBudget.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBudget.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.items[action.payload.id] = action.payload;
        }
      })
      .addCase(updateBudget.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to update budget";
      });

    // Delete budget
    builder
      .addCase(deleteBudget.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteBudget.fulfilled, (state, action) => {
        state.loading = false;
        const id = action.payload;
        delete state.items[id];
        delete state.progress[id];
        delete state.spendingByCategory[id];
        state.ids = state.ids.filter((budgetId) => budgetId !== id);
      })
      .addCase(deleteBudget.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to delete budget";
      });

    // Reset budget
    builder.addCase(resetBudget.fulfilled, (state, action) => {
      if (action.payload) {
        state.items[action.payload.id] = action.payload;
        // Update progress
        state.progress[action.payload.id] = {
          spent: 0,
          remaining: action.payload.amount,
          percentageUsed: 0,
        };
      }
    });

    // Reset all budgets
    builder.addCase(resetAllBudgets.fulfilled, (state, action) => {
      action.payload.forEach((budget) => {
        state.items[budget.id] = budget;
        // Update progress
        state.progress[budget.id] = {
          spent: 0,
          remaining: budget.amount,
          percentageUsed: 0,
        };
      });
    });

    // Fetch budget spending by category
    builder.addCase(fetchBudgetSpendingByCategory.fulfilled, (state, action) => {
      const budgetId = action.meta.arg;
      state.spendingByCategory[budgetId] = action.payload;
    });
  },
});

export const { clearError, updateBudgetBalance } = budgetsSlice.actions;
export default budgetsSlice.reducer;
