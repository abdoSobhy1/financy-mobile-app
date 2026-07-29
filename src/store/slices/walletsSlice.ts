import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { Wallet, WalletFormData } from "../../types";
import { db } from "../../database/queries";

// Async thunks for database operations
export const fetchWallets = createAsyncThunk("wallets/fetchWallets", async () => {
  return await db.wallets.getAllWallets();
});

export const addWallet = createAsyncThunk(
  "wallets/addWallet",
  async (walletData: WalletFormData) => {
    const wallet: Omit<Wallet, "id" | "createdAt" | "updatedAt"> = {
      name: walletData.name,
      icon: walletData.icon || "wallet",
      color: walletData.color || "#10B981",
      balance: parseFloat(walletData.balance || "0"),
      syncUpdatedAt: Date.now(),
    };
    return await db.wallets.createWallet(wallet);
  }
);

export const editWallet = createAsyncThunk(
  "wallets/editWallet",
  async ({ id, updates }: { id: string; updates: Partial<WalletFormData> }) => {
    const walletUpdates: Partial<Omit<Wallet, "id" | "createdAt" | "updatedAt">> = {};

    if (updates.name !== undefined) {
      walletUpdates.name = updates.name;
    }
    if (updates.icon !== undefined) {
      walletUpdates.icon = updates.icon;
    }
    if (updates.color !== undefined) {
      walletUpdates.color = updates.color;
    }
    if (updates.balance !== undefined) {
      walletUpdates.balance = parseFloat(updates.balance);
    }

    await db.wallets.updateWallet(id, walletUpdates);
    return await db.wallets.getWalletById(id);
  }
);

export const removeWallet = createAsyncThunk("wallets/removeWallet", async (id: string) => {
  await db.wallets.deleteWallet(id);
  return id;
});

export const transferBetweenWallets = createAsyncThunk(
  "wallets/transferBetweenWallets",
  async (
    {
      fromWalletId,
      toWalletId,
      amount,
      date,
      description,
      note,
    }: {
      fromWalletId: string;
      toWalletId: string;
      amount: string | number;
      date?: string;
      description?: string;
      note?: string;
    },
    { dispatch }
  ) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    const tx = await db.transactions.createTransaction({
      amount: numAmount,
      type: "transfer",
      categoryId: "transfer",
      fromWalletId,
      toWalletId,
      description: description || "Transfer between wallets",
      date: date || new Date().toISOString(),
      note: note || undefined,
      syncUpdatedAt: Date.now(),
    });
    dispatch(fetchWallets());
    return tx;
  }
);

// State interface
interface WalletsState {
  items: Record<string, Wallet>;
  ids: string[];
  loading: boolean;
  error: string | null;
}

const initialState: WalletsState = {
  items: {},
  ids: [],
  loading: false,
  error: null,
};

const walletsSlice = createSlice({
  name: "wallets",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    markWalletSynced: (state, action: PayloadAction<string>) => {
      const item = state.items[action.payload];
      if (item) {
        item.syncStatus = "synced";
        (item as any).sync_status = "synced";
      }
    },
    updateWalletBalanceInState: (
      state,
      action: PayloadAction<{ walletId: string; delta: number }>
    ) => {
      const { walletId, delta } = action.payload;
      const wallet = state.items[walletId];
      if (wallet) {
        wallet.balance += delta;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch wallets
    builder
      .addCase(fetchWallets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWallets.fulfilled, (state, action) => {
        state.loading = false;
        state.items = {};
        state.ids = [];
        action.payload.forEach((wallet) => {
          state.items[wallet.id] = wallet;
          state.ids.push(wallet.id);
        });
      })
      .addCase(fetchWallets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch wallets";
      });

    // Add wallet
    builder.addCase(addWallet.fulfilled, (state, action) => {
      state.items[action.payload.id] = action.payload;
      if (!state.ids.includes(action.payload.id)) {
        state.ids.push(action.payload.id);
      }
    });

    // Edit wallet
    builder.addCase(editWallet.fulfilled, (state, action) => {
      if (action.payload) {
        state.items[action.payload.id] = action.payload;
      }
    });

    // Remove wallet
    builder.addCase(removeWallet.fulfilled, (state, action) => {
      const id = action.payload;
      delete state.items[id];
      state.ids = state.ids.filter((item) => item !== id);
    });
  },
});

export const { clearError, markWalletSynced, updateWalletBalanceInState } = walletsSlice.actions;
export default walletsSlice.reducer;
