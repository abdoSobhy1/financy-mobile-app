import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { Bill, BillFormData } from "../../types";
import { db } from "../../database/queries";
import { DateUtils } from "../../utils/dateUtils";

// Async thunks for database operations
export const fetchBills = createAsyncThunk("bills/fetchBills", async () => {
  return await db.bills.getAllBills();
});

export const fetchUpcomingBills = createAsyncThunk("bills/fetchUpcomingBills", async (days: number = 7) => {
  return await db.bills.getUpcomingBills(days);
});

export const fetchOverdueBills = createAsyncThunk("bills/fetchOverdueBills", async () => {
  return await db.bills.getOverdueBills();
});

export const fetchBillsByStatus = createAsyncThunk("bills/fetchBillsByStatus", async (paid: boolean) => {
  return await db.bills.getBillsByStatus(paid);
});

export const addBill = createAsyncThunk("bills/addBill", async (billData: BillFormData) => {
  // Use DateUtils for consistent date validation
  const safeDueDate = DateUtils.toISOString(billData.dueDate);

  console.log("billsSlice addBill: Processing bill data", {
    originalDueDate: billData.dueDate,
    safeDueDate,
    recurring: billData.recurring,
    recurringType: billData.recurringType,
  });

  const bill: Omit<Bill, "id" | "createdAt" | "updatedAt"> = {
    name: billData.name,
    amount: parseFloat(billData.amount),
    dueDate: safeDueDate,
    paid: false,
    budgetId: billData.budgetId,
    recurring: billData.recurring,
    recurringType: billData.recurringType,
    syncUpdatedAt: Date.now(),
  };
  return await db.bills.createBill(bill);
});

export const updateBill = createAsyncThunk(
  "bills/updateBill",
  async ({ id, updates }: { id: string; updates: Partial<BillFormData & { paid?: boolean }> }) => {
    const billUpdates: Partial<Omit<Bill, "id" | "createdAt" | "updatedAt">> = {};

    if (updates.name !== undefined) {
      billUpdates.name = updates.name;
    }
    if (updates.amount !== undefined) {
      billUpdates.amount = parseFloat(updates.amount);
    }
    if (updates.dueDate !== undefined) {
      // Use DateUtils for consistent date handling
      billUpdates.dueDate = DateUtils.toISOString(updates.dueDate);

      console.log("billsSlice updateBill: Processing date update", {
        originalDueDate: updates.dueDate,
        convertedDueDate: billUpdates.dueDate,
      });
    }
    if (updates.paid !== undefined) {
      billUpdates.paid = updates.paid;
    }
    if (updates.budgetId !== undefined) {
      billUpdates.budgetId = updates.budgetId;
    }
    if (updates.recurring !== undefined) {
      billUpdates.recurring = updates.recurring;
    }
    if (updates.recurringType !== undefined) {
      billUpdates.recurringType = updates.recurringType;
    }

    await db.bills.updateBill(id, billUpdates);
    return await db.bills.getBillById(id);
  }
);

export const deleteBill = createAsyncThunk("bills/deleteBill", async (id: string) => {
  await db.bills.deleteBill(id);
  return id;
});

export const markBillAsPaid = createAsyncThunk("bills/markBillAsPaid", async (id: string, { rejectWithValue }) => {
  try {
    console.log(`Redux markBillAsPaid: Starting for bill ${id}`);
    await db.bills.markBillAsPaid(id);
    console.log(`Redux markBillAsPaid: Database operation completed`);
    const updatedBill = await db.bills.getBillById(id);
    console.log(`Redux markBillAsPaid: Retrieved updated bill:`, updatedBill);
    return updatedBill;
  } catch (error) {
    console.error(`Redux markBillAsPaid: Error for bill ${id}:`, error);
    return rejectWithValue(error instanceof Error ? error.message : "Unknown error");
  }
});

export const markBillAsUnpaid = createAsyncThunk("bills/markBillAsUnpaid", async (id: string, { rejectWithValue }) => {
  try {
    console.log(`Redux markBillAsUnpaid: Starting for bill ${id}`);
    await db.bills.markBillAsUnpaid(id);
    console.log(`Redux markBillAsUnpaid: Database operation completed`);
    const updatedBill = await db.bills.getBillById(id);
    console.log(`Redux markBillAsUnpaid: Retrieved updated bill:`, updatedBill);
    return updatedBill;
  } catch (error) {
    console.error(`Redux markBillAsUnpaid: Error for bill ${id}:`, error);
    return rejectWithValue(error instanceof Error ? error.message : "Unknown error");
  }
});

export const fetchBillStats = createAsyncThunk("bills/fetchBillStats", async () => {
  return await db.bills.getBillStats();
});

export const fetchRecurringBills = createAsyncThunk("bills/fetchRecurringBills", async () => {
  return await db.bills.getRecurringBills();
});

export const createRecurringBillInstance = createAsyncThunk("bills/createRecurringBillInstance", async (originalBillId: string) => {
  return await db.bills.createRecurringBillInstance(originalBillId);
});

// State interface
interface BillsState {
  items: Record<string, Bill>;
  ids: string[];
  upcomingBills: string[];
  overdueBills: string[];
  paidBills: string[];
  unpaidBills: string[];
  recurringBills: string[];
  stats: {
    totalBills: number;
    paidBills: number;
    unpaidBills: number;
    overdueBills: number;
    totalAmount: number;
    paidAmount: number;
    unpaidAmount: number;
  } | null;
  loading: boolean;
  error: string | null;
}

const initialState: BillsState = {
  items: {},
  ids: [],
  upcomingBills: [],
  overdueBills: [],
  paidBills: [],
  unpaidBills: [],
  recurringBills: [],
  stats: null,
  loading: false,
  error: null,
};

const billsSlice = createSlice({
  name: "bills",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch all bills
    builder
      .addCase(fetchBills.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBills.fulfilled, (state, action) => {
        state.loading = false;
        state.items = {};
        state.ids = [];

        action.payload.forEach((bill) => {
          state.items[bill.id] = bill;
          state.ids.push(bill.id);
        });
      })
      .addCase(fetchBills.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch bills";
      });

    // Fetch upcoming bills
    builder.addCase(fetchUpcomingBills.fulfilled, (state, action) => {
      state.upcomingBills = [];
      action.payload.forEach((bill) => {
        state.items[bill.id] = bill;
        state.upcomingBills.push(bill.id);
      });
    });

    // Fetch overdue bills
    builder.addCase(fetchOverdueBills.fulfilled, (state, action) => {
      state.overdueBills = [];
      action.payload.forEach((bill) => {
        state.items[bill.id] = bill;
        state.overdueBills.push(bill.id);
      });
    });

    // Fetch bills by status
    builder.addCase(fetchBillsByStatus.fulfilled, (state, action) => {
      const bills = action.payload;
      const paid = action.meta.arg;

      if (paid) {
        state.paidBills = [];
        bills.forEach((bill) => {
          state.items[bill.id] = bill;
          state.paidBills.push(bill.id);
        });
      } else {
        state.unpaidBills = [];
        bills.forEach((bill) => {
          state.items[bill.id] = bill;
          state.unpaidBills.push(bill.id);
        });
      }
    });

    // Add bill
    builder
      .addCase(addBill.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addBill.fulfilled, (state, action) => {
        state.loading = false;
        const bill = action.payload;
        state.items[bill.id] = bill;
        state.ids.push(bill.id);

        // Add to appropriate status array
        if (bill.paid) {
          state.paidBills.push(bill.id);
        } else {
          state.unpaidBills.push(bill.id);
        }

        // Add to recurring bills if applicable
        if (bill.recurring) {
          state.recurringBills.push(bill.id);
        }
      })
      .addCase(addBill.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to add bill";
      });

    // Update bill
    builder
      .addCase(updateBill.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBill.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          const bill = action.payload;
          const oldBill = state.items[bill.id];

          state.items[bill.id] = bill;

          // Update status arrays if payment status changed
          if (oldBill && oldBill.paid !== bill.paid) {
            if (bill.paid) {
              state.unpaidBills = state.unpaidBills.filter((id) => id !== bill.id);
              state.paidBills.push(bill.id);
            } else {
              state.paidBills = state.paidBills.filter((id) => id !== bill.id);
              state.unpaidBills.push(bill.id);
            }
          }

          // Update recurring bills array
          if (oldBill && oldBill.recurring !== bill.recurring) {
            if (bill.recurring) {
              state.recurringBills.push(bill.id);
            } else {
              state.recurringBills = state.recurringBills.filter((id) => id !== bill.id);
            }
          }
        }
      })
      .addCase(updateBill.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to update bill";
      });

    // Delete bill
    builder
      .addCase(deleteBill.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteBill.fulfilled, (state, action) => {
        state.loading = false;
        const id = action.payload;

        delete state.items[id];
        state.ids = state.ids.filter((billId) => billId !== id);
        state.upcomingBills = state.upcomingBills.filter((billId) => billId !== id);
        state.overdueBills = state.overdueBills.filter((billId) => billId !== id);
        state.paidBills = state.paidBills.filter((billId) => billId !== id);
        state.unpaidBills = state.unpaidBills.filter((billId) => billId !== id);
        state.recurringBills = state.recurringBills.filter((billId) => billId !== id);
      })
      .addCase(deleteBill.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to delete bill";
      });

    // Mark bill as paid
    builder.addCase(markBillAsPaid.fulfilled, (state, action) => {
      if (action.payload) {
        const bill = action.payload;
        state.items[bill.id] = bill;

        // Move from unpaid to paid
        state.unpaidBills = state.unpaidBills.filter((id) => id !== bill.id);
        if (!state.paidBills.includes(bill.id)) {
          state.paidBills.push(bill.id);
        }
      }
    });

    // Mark bill as unpaid
    builder.addCase(markBillAsUnpaid.fulfilled, (state, action) => {
      if (action.payload) {
        const bill = action.payload;
        state.items[bill.id] = bill;

        // Move from paid to unpaid
        state.paidBills = state.paidBills.filter((id) => id !== bill.id);
        if (!state.unpaidBills.includes(bill.id)) {
          state.unpaidBills.push(bill.id);
        }
      }
    });

    // Fetch bill stats
    builder.addCase(fetchBillStats.fulfilled, (state, action) => {
      state.stats = action.payload;
    });

    // Fetch recurring bills
    builder.addCase(fetchRecurringBills.fulfilled, (state, action) => {
      state.recurringBills = [];
      action.payload.forEach((bill) => {
        state.items[bill.id] = bill;
        state.recurringBills.push(bill.id);
      });
    });

    // Create recurring bill instance
    builder.addCase(createRecurringBillInstance.fulfilled, (state, action) => {
      const bill = action.payload;
      state.items[bill.id] = bill;
      state.ids.push(bill.id);
      state.unpaidBills.push(bill.id);

      if (bill.recurring) {
        state.recurringBills.push(bill.id);
      }
    });
  },
});

export const { clearError } = billsSlice.actions;
export default billsSlice.reducer;
