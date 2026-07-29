import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  Transaction,
  TransactionFilters,
  TransactionFormData,
} from "../../types";
import { db } from "../../database/queries";
import { fetchWallets } from "./walletsSlice";

// Async thunks for database operations
export const fetchTransactions = createAsyncThunk(
  "transactions/fetchTransactions",
  async (filters?: TransactionFilters) => {
    return await db.transactions.getAllTransactions(filters);
  },
);

export const addTransaction = createAsyncThunk(
  "transactions/addTransaction",
  async (transactionData: TransactionFormData, { dispatch }) => {
    const transaction: Omit<Transaction, "id" | "createdAt"> = {
      amount: parseFloat(transactionData.amount),
      type: transactionData.type,
      categoryId: transactionData.categoryId || (transactionData.type === "transfer" ? "transfer" : ""),
      budgetId: transactionData.budgetId,
      walletId: transactionData.walletId,
      fromWalletId: transactionData.fromWalletId,
      toWalletId: transactionData.toWalletId,
      description: transactionData.description,
      date: transactionData.date.toISOString(),
      note: transactionData.note,
      updatedAt: Date.now(),
    };
    const res = await db.transactions.createTransaction(transaction);
    dispatch(fetchWallets());
    return res;
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
    { dispatch },
  ) => {
    const transactionUpdates: Partial<Omit<Transaction, "id" | "createdAt">> =
      {};

    if (updates.amount !== undefined) {
      transactionUpdates.amount = parseFloat(updates.amount);
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
    if (updates.walletId !== undefined) {
      transactionUpdates.walletId = updates.walletId;
    }
    if (updates.fromWalletId !== undefined) {
      transactionUpdates.fromWalletId = updates.fromWalletId;
    }
    if (updates.toWalletId !== undefined) {
      transactionUpdates.toWalletId = updates.toWalletId;
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
    dispatch(fetchWallets());
    return updated;
  },
);

export const deleteTransaction = createAsyncThunk(
  "transactions/deleteTransaction",
  async (id: string, { dispatch }) => {
    await db.transactions.deleteTransaction(id);
    dispatch(fetchWallets());
    return id;
  },
);

export const duplicateTransaction = createAsyncThunk(
  "transactions/duplicateTransaction",
  async (id: string, { dispatch }) => {
    const res = await db.transactions.duplicateTransaction(id);
    dispatch(fetchWallets());
    return res;
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
    markTransactionSynced: (state, action: PayloadAction<string>) => {
      const item = state.items[action.payload];
      if (item) {
        item.syncStatus = "synced";
        (item as any).sync_status = "synced";
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
  },
});

export const {
  setFilters,
  clearFilters,
  clearError,
  markTransactionSynced,
} = transactionsSlice.actions;
export default transactionsSlice.reducer;
