import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { Debt, DebtPayment, DebtFormData, DebtPaymentFormData } from "../../types";
import { db } from "../../database/queries";

// Async thunks for database operations
export const fetchDebts = createAsyncThunk("debts/fetchDebts", async () => {
  return await db.debts.getAllDebts();
});

export const fetchActiveDebts = createAsyncThunk("debts/fetchActiveDebts", async () => {
  return await db.debts.getActiveDebts();
});

export const fetchPaidOffDebts = createAsyncThunk("debts/fetchPaidOffDebts", async () => {
  return await db.debts.getPaidOffDebts();
});

export const fetchDebtsWithUpcomingPayments = createAsyncThunk("debts/fetchDebtsWithUpcomingPayments", async (days: number = 7) => {
  return await db.debts.getDebtsWithUpcomingPayments(days);
});

export const addDebt = createAsyncThunk("debts/addDebt", async (debtData: DebtFormData) => {
  try {
    const debt = {
      ...debtData,
      currentBalance: debtData.totalAmount, // Initially, current balance equals total amount
      categoryId: debtData.categoryId || undefined, // Handle optional category
      budgetId: debtData.budgetId || undefined, // Handle optional budget
    };
    const debtWithTimestamp = {
      ...debt,
      syncUpdatedAt: Date.now(),
      syncStatus: "pending" as const,
    };

    const result = await db.debts.createDebt(debtWithTimestamp);
    return result;
  } catch (error) {
    console.error("Error in addDebt thunk:", error);
    throw error;
  }
});

export const updateDebtAsync = createAsyncThunk("debts/updateDebt", async ({ id, updates }: { id: string; updates: Partial<Debt> }) => {
  try {
    await db.debts.updateDebt(id, updates);
    const updatedDebt = await db.debts.getDebtById(id);
    return updatedDebt;
  } catch (error) {
    console.error("Error in updateDebt thunk:", error);
    throw error;
  }
});

export const updateDebt = createAsyncThunk("debts/updateDebt", async ({ id, updates }: { id: string; updates: Partial<DebtFormData> }) => {
  const debtUpdates: Partial<Omit<Debt, "id" | "createdAt">> = {};

  if (updates.name !== undefined) {
    debtUpdates.name = updates.name;
  }
  if (updates.totalAmount !== undefined) {
    debtUpdates.totalAmount = updates.totalAmount;
  }
  if (updates.interestRate !== undefined) {
    debtUpdates.interestRate = updates.interestRate;
  }
  if (updates.minimumPayment !== undefined) {
    debtUpdates.minimumPayment = updates.minimumPayment;
  }
  if (updates.dueDate !== undefined) {
    debtUpdates.dueDate = updates.dueDate;
  }
  if (updates.creditor !== undefined) {
    debtUpdates.creditor = updates.creditor;
  }
  if (updates.description !== undefined) {
    debtUpdates.description = updates.description;
  }
  if (updates.categoryId !== undefined) {
    debtUpdates.categoryId = updates.categoryId;
  }
  if (updates.budgetId !== undefined) {
    debtUpdates.budgetId = updates.budgetId;
  }

  await db.debts.updateDebt(id, debtUpdates);
  return await db.debts.getDebtById(id);
});

export const deleteDebt = createAsyncThunk("debts/deleteDebt", async (id: string) => {
  await db.debts.deleteDebt(id);
  return id;
});

export const makeDebtPayment = createAsyncThunk(
  "debts/makeDebtPayment",
  async ({ debtId, paymentData }: { debtId: string; paymentData: DebtPaymentFormData }, { rejectWithValue }) => {
    try {
      const payment = {
        debtId,
        amount: paymentData.amount,
        date: paymentData.date, // Include required date field
        paymentDate: paymentData.paymentDate || paymentData.date, // Use paymentDate or fallback to date
        principal: paymentData.principal || paymentData.amount, // If no breakdown provided, assume all principal
        interest: paymentData.interest || 0,
        note: paymentData.note,
      };

      const paymentWithTimestamp = {
        ...payment,
        updatedAt: Date.now(),
      };

      const createdPayment = await db.debts.makePayment(paymentWithTimestamp);

      // Return both payment and updated debt
      const updatedDebt = await db.debts.getDebtById(debtId);
      return { payment: createdPayment, debt: updatedDebt };
    } catch (error) {
      console.error("Redux makeDebtPayment: Error for debt", debtId, ":", error);
      return rejectWithValue(error instanceof Error ? error.message : "Unknown error");
    }
  }
);

export const fetchPaymentsByDebt = createAsyncThunk("debts/fetchPaymentsByDebt", async (debtId: string) => {
  return await db.debts.getPaymentsByDebt(debtId);
});

export const updatePayment = createAsyncThunk(
  "debts/updatePayment",
  async ({ id, updates }: { id: string; updates: Partial<DebtPaymentFormData> }) => {
    const paymentUpdates: Partial<Omit<DebtPayment, "id" | "debtId" | "createdAt">> = {};

    if (updates.amount !== undefined) {
      paymentUpdates.amount = updates.amount;
    }
    if (updates.paymentDate !== undefined) {
      paymentUpdates.paymentDate = updates.paymentDate;
    }
    if (updates.principal !== undefined) {
      paymentUpdates.principal = updates.principal;
    }
    if (updates.interest !== undefined) {
      paymentUpdates.interest = updates.interest;
    }
    if (updates.note !== undefined) {
      paymentUpdates.note = updates.note;
    }

    await db.debts.updatePayment(id, paymentUpdates);
    return await db.debts.getPaymentById(id);
  }
);

export const deletePayment = createAsyncThunk("debts/deletePayment", async (id: string) => {
  await db.debts.deletePayment(id);
  return id;
});

export const fetchDebtSummary = createAsyncThunk("debts/fetchDebtSummary", async () => {
  return await db.debts.getDebtSummary();
});

export const fetchPaymentHistory = createAsyncThunk(
  "debts/fetchPaymentHistory",
  async ({ startDate, endDate }: { startDate?: string; endDate?: string } = {}) => {
    return await db.debts.getPaymentHistory(startDate, endDate);
  }
);

// State interface
interface DebtsState {
  items: Record<string, Debt>;
  ids: string[];
  activeDebtIds: string[];
  paidOffDebtIds: string[];
  upcomingPaymentIds: string[];
  payments: Record<string, DebtPayment>;
  paymentIds: string[];
  paymentsByDebt: Record<string, string[]>;
  summary: {
    totalDebt: number;
    totalPaid: number;
    activeDebts: number;
    paidOffDebts: number;
    monthlyMinimumPayments: number;
  };
  loading: boolean;
  error: string | null;
}

const initialState: DebtsState = {
  items: {},
  ids: [],
  activeDebtIds: [],
  paidOffDebtIds: [],
  upcomingPaymentIds: [],
  payments: {},
  paymentIds: [],
  paymentsByDebt: {},
  summary: {
    totalDebt: 0,
    totalPaid: 0,
    activeDebts: 0,
    paidOffDebts: 0,
    monthlyMinimumPayments: 0,
  },
  loading: false,
  error: null,
};

const debtsSlice = createSlice({
  name: "debts",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearPayments: (state) => {
      state.payments = {};
      state.paymentIds = [];
      state.paymentsByDebt = {};
    },
    markDebtSynced: (state, action: PayloadAction<string>) => {
      const item = state.items[action.payload];
      if (item) {
        item.syncStatus = "synced";
        (item as any).sync_status = "synced";
      }
    },
    markDebtPaymentSynced: (state, action: PayloadAction<string>) => {
      const payment = state.payments[action.payload];
      if (payment) {
        payment.syncStatus = "synced";
        (payment as any).sync_status = "synced";
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch all debts
    builder
      .addCase(fetchDebts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDebts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = {};
        state.ids = [];

        action.payload.forEach((debt) => {
          state.items[debt.id] = debt;
          state.ids.push(debt.id);
        });
      })
      .addCase(fetchDebts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch debts";
      });

    // Fetch active debts
    builder.addCase(fetchActiveDebts.fulfilled, (state, action) => {
      state.activeDebtIds = [];
      action.payload.forEach((debt) => {
        state.items[debt.id] = debt;
        state.activeDebtIds.push(debt.id);
      });
    });

    // Fetch paid off debts
    builder.addCase(fetchPaidOffDebts.fulfilled, (state, action) => {
      state.paidOffDebtIds = [];
      action.payload.forEach((debt) => {
        state.items[debt.id] = debt;
        state.paidOffDebtIds.push(debt.id);
      });
    });

    // Fetch debts with upcoming payments
    builder.addCase(fetchDebtsWithUpcomingPayments.fulfilled, (state, action) => {
      state.upcomingPaymentIds = [];
      action.payload.forEach((debt) => {
        state.items[debt.id] = debt;
        state.upcomingPaymentIds.push(debt.id);
      });
    });

    // Add debt
    builder
      .addCase(addDebt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addDebt.fulfilled, (state, action) => {
        state.loading = false;
        const debt = action.payload;
        state.items[debt.id] = debt;
        state.ids.push(debt.id);

        if (debt.currentBalance > 0) {
          state.activeDebtIds.push(debt.id);
        } else {
          state.paidOffDebtIds.push(debt.id);
        }
      })
      .addCase(addDebt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to add debt";
      });

    // Update debt
    builder
      .addCase(updateDebt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDebt.fulfilled, (state, action) => {
        state.loading = false;
        const debt = action.payload;
        if (debt) {
          state.items[debt.id] = debt;
        }
      })
      .addCase(updateDebt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to update debt";
      });

    // Delete debt
    builder.addCase(deleteDebt.fulfilled, (state, action) => {
      const id = action.payload;
      delete state.items[id];
      state.ids = state.ids.filter((debtId) => debtId !== id);
      state.activeDebtIds = state.activeDebtIds.filter((debtId) => debtId !== id);
      state.paidOffDebtIds = state.paidOffDebtIds.filter((debtId) => debtId !== id);
      state.upcomingPaymentIds = state.upcomingPaymentIds.filter((debtId) => debtId !== id);

      // Clean up associated payments
      if (state.paymentsByDebt[id]) {
        state.paymentsByDebt[id].forEach((paymentId) => {
          delete state.payments[paymentId];
          state.paymentIds = state.paymentIds.filter((pid) => pid !== paymentId);
        });
        delete state.paymentsByDebt[id];
      }
    });

    // Make debt payment
    builder
      .addCase(makeDebtPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(makeDebtPayment.fulfilled, (state, action) => {
        state.loading = false;
        const { payment, debt } = action.payload;

        // Update payment
        state.payments[payment.id] = payment;
        state.paymentIds.push(payment.id);

        // Update payments by debt
        if (!state.paymentsByDebt[payment.debtId]) {
          state.paymentsByDebt[payment.debtId] = [];
        }
        state.paymentsByDebt[payment.debtId].unshift(payment.id);

        // Update debt
        if (debt) {
          state.items[debt.id] = debt;

          // Update debt lists based on new balance
          if (debt.currentBalance === 0) {
            // Debt is paid off
            state.activeDebtIds = state.activeDebtIds.filter((id) => id !== debt.id);
            if (!state.paidOffDebtIds.includes(debt.id)) {
              state.paidOffDebtIds.push(debt.id);
            }
          }
        }
      })
      .addCase(makeDebtPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to make payment";
      });

    // Fetch payments by debt
    builder.addCase(fetchPaymentsByDebt.fulfilled, (state, action) => {
      const payments = action.payload;
      const debtId = action.meta.arg;

      // Clear existing payments for this debt
      if (state.paymentsByDebt[debtId]) {
        state.paymentsByDebt[debtId].forEach((paymentId) => {
          delete state.payments[paymentId];
          state.paymentIds = state.paymentIds.filter((pid) => pid !== paymentId);
        });
      }

      // Add new payments
      state.paymentsByDebt[debtId] = [];
      payments.forEach((payment) => {
        state.payments[payment.id] = payment;
        state.paymentIds.push(payment.id);
        state.paymentsByDebt[debtId].push(payment.id);
      });
    });

    // Update payment
    builder.addCase(updatePayment.fulfilled, (state, action) => {
      const payment = action.payload;
      if (payment) {
        state.payments[payment.id] = payment;
      }
    });

    // Delete payment
    builder.addCase(deletePayment.fulfilled, (state, action) => {
      const id = action.payload;
      const payment = state.payments[id];

      if (payment) {
        // Remove from payments by debt
        if (state.paymentsByDebt[payment.debtId]) {
          state.paymentsByDebt[payment.debtId] = state.paymentsByDebt[payment.debtId].filter((paymentId) => paymentId !== id);
        }
      }

      delete state.payments[id];
      state.paymentIds = state.paymentIds.filter((paymentId) => paymentId !== id);
    });

    // Fetch debt summary
    builder.addCase(fetchDebtSummary.fulfilled, (state, action) => {
      state.summary = action.payload;
    });

    // Fetch payment history
    builder.addCase(fetchPaymentHistory.fulfilled, (state, action) => {
      // This replaces all payments in state with the filtered history
      state.payments = {};
      state.paymentIds = [];

      action.payload.forEach((payment) => {
        state.payments[payment.id] = payment;
        state.paymentIds.push(payment.id);
      });
    });
  },
});

export const {
  clearError,
  clearPayments,
  markDebtSynced,
  markDebtPaymentSynced,
} = debtsSlice.actions;
export default debtsSlice.reducer;
