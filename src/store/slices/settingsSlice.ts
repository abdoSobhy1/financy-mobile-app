import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { Settings } from "../../types";
import { db } from "../../database/queries";

// Async thunks for database operations
export const fetchSettings = createAsyncThunk("settings/fetchSettings", async () => {
  return await db.settings.getSettings();
});

export const updateSettings = createAsyncThunk(
  "settings/updateSettings",
  async (updates: Partial<Omit<Settings, "id" | "createdAt" | "updatedAt">>) => {
    return await db.settings.updateSettings(updates);
  }
);

export const updateBillingPeriodStartDay = createAsyncThunk("settings/updateBillingPeriodStartDay", async (day: number) => {
  await db.settings.updateBillingPeriodStartDay(day);
  return await db.settings.getSettings();
});

export const toggleFirebaseSync = createAsyncThunk("settings/toggleFirebaseSync", async () => {
  const newState = await db.settings.toggleFirebaseSync();
  const settings = await db.settings.getSettings();
  return { settings, syncEnabled: newState };
});

export const updateCurrency = createAsyncThunk("settings/updateCurrency", async (currency: string) => {
  await db.settings.updateCurrency(currency);
  return await db.settings.getSettings();
});

export const updateTheme = createAsyncThunk("settings/updateTheme", async (theme: "dark" | "light") => {
  await db.settings.updateTheme(theme);
  return await db.settings.getSettings();
});

export const resetToDefaults = createAsyncThunk("settings/resetToDefaults", async () => {
  return await db.settings.resetToDefaults();
});

export const fetchCurrentBillingPeriod = createAsyncThunk("settings/fetchCurrentBillingPeriod", async () => {
  return await db.settings.getCurrentBillingPeriod();
});

export const fetchPreviousBillingPeriod = createAsyncThunk("settings/fetchPreviousBillingPeriod", async () => {
  return await db.settings.getPreviousBillingPeriod();
});

export const fetchNextBillingPeriod = createAsyncThunk("settings/fetchNextBillingPeriod", async () => {
  return await db.settings.getNextBillingPeriod();
});

export const fetchDaysUntilNextBillingPeriod = createAsyncThunk("settings/fetchDaysUntilNextBillingPeriod", async () => {
  return await db.settings.getDaysUntilNextBillingPeriod();
});

// State interface
interface SettingsState {
  data: Settings | null;
  billingPeriods: {
    current: { start: Date; end: Date } | null;
    previous: { start: Date; end: Date } | null;
    next: { start: Date; end: Date } | null;
  };
  daysUntilNextBillingPeriod: number | null;
  loading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  data: null,
  billingPeriods: {
    current: null,
    previous: null,
    next: null,
  },
  daysUntilNextBillingPeriod: null,
  loading: false,
  error: null,
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch settings
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch settings";
      });

    // Update settings
    builder
      .addCase(updateSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to update settings";
      });

    // Update billing period start day
    builder
      .addCase(updateBillingPeriodStartDay.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBillingPeriodStartDay.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        // Clear billing periods to force refresh
        state.billingPeriods = {
          current: null,
          previous: null,
          next: null,
        };
      })
      .addCase(updateBillingPeriodStartDay.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to update billing period start day";
      });

    // Toggle Firebase sync
    builder
      .addCase(toggleFirebaseSync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleFirebaseSync.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload.settings;
      })
      .addCase(toggleFirebaseSync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to toggle Firebase sync";
      });

    // Update currency
    builder.addCase(updateCurrency.fulfilled, (state, action) => {
      state.data = action.payload;
    });

    // Update theme
    builder.addCase(updateTheme.fulfilled, (state, action) => {
      state.data = action.payload;
    });

    // Reset to defaults
    builder
      .addCase(resetToDefaults.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetToDefaults.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        // Clear billing periods to force refresh
        state.billingPeriods = {
          current: null,
          previous: null,
          next: null,
        };
      })
      .addCase(resetToDefaults.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to reset settings";
      });

    // Fetch current billing period
    builder.addCase(fetchCurrentBillingPeriod.fulfilled, (state, action) => {
      state.billingPeriods.current = action.payload;
    });

    // Fetch previous billing period
    builder.addCase(fetchPreviousBillingPeriod.fulfilled, (state, action) => {
      state.billingPeriods.previous = action.payload;
    });

    // Fetch next billing period
    builder.addCase(fetchNextBillingPeriod.fulfilled, (state, action) => {
      state.billingPeriods.next = action.payload;
    });

    // Fetch days until next billing period
    builder.addCase(fetchDaysUntilNextBillingPeriod.fulfilled, (state, action) => {
      state.daysUntilNextBillingPeriod = action.payload;
    });
  },
});

export const { clearError } = settingsSlice.actions;
export default settingsSlice.reducer;
