import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  Transaction,
  TransactionFilters,
  TransactionFormData,
} from "../../../shared/types";
import { db } from "../../../infrastructure/database/repositories";
import {
  formatCurrency,
  getDateRangeForBillingPeriod,
  parseMoneyInput,
} from "../../../shared/utils";
import { startOfWeek, endOfWeek } from "date-fns";

async function checkAndTriggerBudgetAlert(tx: Transaction, state: any) {
  try {
    if (tx.type !== "expense") return;
    const budgetsMap = state?.budgets?.items || {};
    const settingsData = state?.settings?.data;
    const allBudgets = Object.values(budgetsMap) as any[];
    const matchingBudgets = allBudgets.filter(
      (b) =>
        !b.deleted &&
        b.alertsEnabled !== false &&
        (b.id === tx.budgetId || (b.categoryId && b.categoryId === tx.categoryId))
    );
    if (matchingBudgets.length === 0) return;

    const NotificationService = require("../../../infrastructure/notifications/notificationService").default;
    const notifService = NotificationService.getInstance();

    for (const budget of matchingBudgets) {
      const isWeekly = budget.period === "weekly";
      const range = isWeekly
        ? {
            start: startOfWeek(new Date(), { weekStartsOn: 1 }),
            end: endOfWeek(new Date(), { weekStartsOn: 1 }),
          }
        : getDateRangeForBillingPeriod(settingsData?.billingPeriodStartDay ?? 1);

      const progress = await db.budgets.getBudgetProgressForPeriod(
        budget.id,
        range.start.toISOString(),
        range.end.toISOString()
      );
      if (progress && progress.percentageUsed >= 80) {
        await notifService.sendBudgetAlertNotification(
          budget.name,
          formatCurrency(progress.spent),
          formatCurrency(budget.amount),
          progress.percentageUsed,
          budget.id
        );
      }
    }
  } catch (err) {
    console.warn("Budget alert check failed (non-fatal):", err);
  }
}

// Async thunks for database operations
export const fetchTransactions = createAsyncThunk(
  "transactions/fetchTransactions",
  async (filters?: TransactionFilters) => {
    return await db.transactions.getAllTransactions(filters);
  },
);

export const addTransaction = createAsyncThunk(
  "transactions/addTransaction",
  async (transactionData: TransactionFormData, { getState }) => {
    const transaction: Omit<Transaction, "id" | "createdAt"> = {
      amount: parseMoneyInput(transactionData.amount),
      type: transactionData.type,
      categoryId: transactionData.categoryId,
      budgetId: transactionData.budgetId,
      accountId: transactionData.accountId || "default_cash",
      receiptUri: transactionData.receiptUri,
      description: transactionData.description,
      date: transactionData.date.toISOString(),
      note: transactionData.note,
      updatedAt: Date.now(),
    };
    const created = await db.transactions.createTransaction(transaction);
    await checkAndTriggerBudgetAlert(created, getState());
    return created;
  },
);

export const updateTransaction = createAsyncThunk(
  "transactions/updateTransaction",
  async (
    {
      id,
      updates,
    }: {
      id: string;
      updates: Partial<TransactionFormData>;
    },
    { getState }
  ) => {
    const transactionUpdates: Partial<Omit<Transaction, "id" | "createdAt">> =
      {};

    if (updates.amount !== undefined) {
      transactionUpdates.amount = parseMoneyInput(updates.amount);
    }
    if (updates.type !== undefined) {
      transactionUpdates.type = updates.type;
    }
    if (updates.categoryId !== undefined) {
      transactionUpdates.categoryId = updates.categoryId;
    }
    if (updates.budgetId !== undefined) {
      transactionUpdates.budgetId = updates.budgetId;
    }
    if (updates.accountId !== undefined) {
      transactionUpdates.accountId = updates.accountId;
    }
    if (updates.receiptUri !== undefined) {
      transactionUpdates.receiptUri = updates.receiptUri;
    }
    if (updates.description !== undefined) {
      transactionUpdates.description = updates.description;
    }
    if (updates.date !== undefined) {
      transactionUpdates.date = updates.date.toISOString();
    }
    if (updates.note !== undefined) {
      transactionUpdates.note = updates.note;
    }

    await db.transactions.updateTransaction(id, transactionUpdates);
    const updated = await db.transactions.getTransactionById(id);
    if (updated) {
      await checkAndTriggerBudgetAlert(updated, getState());
    }
    return updated;
  },
);

export const deleteTransaction = createAsyncThunk(
  "transactions/deleteTransaction",
  async (id: string) => {
    await db.transactions.deleteTransaction(id);
    return id;
  },
);

export const deleteMultipleTransactions = createAsyncThunk(
  "transactions/deleteMultipleTransactions",
  async (ids: string[]) => {
    for (const id of ids) {
      await db.transactions.deleteTransaction(id);
    }
    return ids;
  },
);

export const duplicateTransaction = createAsyncThunk(
  "transactions/duplicateTransaction",
  async (id: string) => {
    return await db.transactions.duplicateTransaction(id);
  },
);

export const fetchTransactionStats = createAsyncThunk(
  "transactions/fetchTransactionStats",
  async () => {
    return await db.transactions.getTransactionStats();
  },
);

// State interface
interface TransactionsState {
  items: Record<string, Transaction>;
  ids: string[];
  loading: boolean;
  error: string | null;
  filters: TransactionFilters;
  stats: {
    totalIncome: number;
    totalExpenses: number;
    totalTransactions: number;
  } | null;
}

const initialState: TransactionsState = {
  items: {},
  ids: [],
  loading: false,
  error: null,
  filters: {},
  stats: null,
};

const transactionsSlice = createSlice({
  name: "transactions",
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<TransactionFilters>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearError: (state) => {
      state.error = null;
    },
    /** Update in-memory syncStatus after a successful push to Firebase */
    markSynced: (state, action: PayloadAction<string>) => {
      if (state.items[action.payload]) {
        state.items[action.payload].syncStatus = "synced";
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch transactions
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.items = {};
        state.ids = [];
        action.payload.forEach((transaction) => {
          state.items[transaction.id] = transaction;
          state.ids.push(transaction.id);
        });
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch transactions";
      });

    // Add transaction
    builder
      .addCase(addTransaction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addTransaction.fulfilled, (state, action) => {
        state.loading = false;
        const transaction = action.payload;
        state.items[transaction.id] = transaction;
        state.ids.unshift(transaction.id); // Add to beginning for latest first
      })
      .addCase(addTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to add transaction";
      });

    // Update transaction
    builder
      .addCase(updateTransaction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTransaction.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.items[action.payload.id] = action.payload;
        }
      })
      .addCase(updateTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to update transaction";
      });

    // Delete transaction
    builder
      .addCase(deleteTransaction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTransaction.fulfilled, (state, action) => {
        state.loading = false;
        const id = action.payload;
        delete state.items[id];
        state.ids = state.ids.filter((transactionId) => transactionId !== id);
      })
      .addCase(deleteTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to delete transaction";
      })
      .addCase(deleteMultipleTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteMultipleTransactions.fulfilled, (state, action) => {
        state.loading = false;
        const ids = action.payload;
        const idSet = new Set(ids);
        ids.forEach((id) => {
          delete state.items[id];
        });
        state.ids = state.ids.filter((transactionId) => !idSet.has(transactionId));
      })
      .addCase(deleteMultipleTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to delete transactions";
      });

    // Duplicate transaction
    builder
      .addCase(duplicateTransaction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(duplicateTransaction.fulfilled, (state, action) => {
        state.loading = false;
        const transaction = action.payload;
        state.items[transaction.id] = transaction;
        state.ids.unshift(transaction.id); // Add to beginning for latest first
      })
      .addCase(duplicateTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to duplicate transaction";
      });

    // Fetch stats
    builder.addCase(fetchTransactionStats.fulfilled, (state, action) => {
      state.stats = action.payload;
    });

    // Clear transactions state on sign out
    builder.addCase("auth/signOut/fulfilled", () => initialState);
  },
});

export const { setFilters, clearFilters, clearError, markSynced } =
  transactionsSlice.actions;
export default transactionsSlice.reducer;
