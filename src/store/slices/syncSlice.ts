// Redux slice for sync state management
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { SyncState } from "../../types";
import { offlineFirstSync, syncConflictsOnly as syncConflictsOnlyService } from "../../services/OfflineFirstSync";

// Initial state
const initialState: SyncState = {
  isOnline: true,
  lastSync: null,
  pendingOperations: 0,
  syncInProgress: false,
  error: null,
};

// Async thunks for sync operations
export const initializeSync = createAsyncThunk("sync/initialize", async () => {
  // Use conflicts-only sync to avoid pulling all data on startup
  await offlineFirstSync.syncConflictsOnly();
  return await offlineFirstSync.getSyncStatus();
});

export const stopSync = createAsyncThunk("sync/stop", async () => {
  // Note: OfflineFirstSync runs automatically, no need to stop
  // Just return current status
  return await offlineFirstSync.getSyncStatus();
});

export const refreshSyncStatus = createAsyncThunk("sync/refreshStatus", async () => {
  return await offlineFirstSync.getSyncStatus();
});

export const forceSyncAll = createAsyncThunk("sync/forceSync", async () => {
  await offlineFirstSync.forceSyncAll();
  return await offlineFirstSync.getSyncStatus();
});

export const initialCloudRestore = createAsyncThunk("sync/initialCloudRestore", async () => {
  const dataRestored = await offlineFirstSync.performInitialCloudPull();
  const status = await offlineFirstSync.getSyncStatus();
  return { dataRestored, status };
});

export const syncConflictsOnly = createAsyncThunk("sync/conflictsOnly", async () => {
  await syncConflictsOnlyService();
  return await offlineFirstSync.getSyncStatus();
});

// Sync slice
const syncSlice = createSlice({
  name: "sync",
  initialState,
  reducers: {
    // Update online status
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
      if (!action.payload) {
        state.error = "Device is offline";
      } else if (state.error === "Device is offline") {
        state.error = null;
      }
    },

    // Update last sync timestamp
    setLastSync: (state, action: PayloadAction<number>) => {
      state.lastSync = action.payload;
    },

    // Update pending operations count
    setPendingOperations: (state, action: PayloadAction<number>) => {
      state.pendingOperations = action.payload;
    },

    // Set sync in progress
    setSyncInProgress: (state, action: PayloadAction<boolean>) => {
      state.syncInProgress = action.payload;
    },

    // Set sync error
    setSyncError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Clear sync error
    clearSyncError: (state) => {
      state.error = null;
    },

    // Update full sync status
    updateSyncStatus: (
      state,
      action: PayloadAction<{
        isOnline: boolean;
        syncInProgress: boolean;
        pendingOperations: number;
      }>
    ) => {
      const { isOnline, syncInProgress, pendingOperations } = action.payload;
      state.isOnline = isOnline;
      state.syncInProgress = syncInProgress;
      state.pendingOperations = pendingOperations;
    },
  },
  extraReducers: (builder) => {
    // Initialize Sync
    builder.addCase(initializeSync.pending, (state) => {
      state.syncInProgress = true;
      state.error = null;
    });
    builder.addCase(initializeSync.fulfilled, (state, action) => {
      const status = action.payload;
      state.syncInProgress = status.isProcessing;
      state.isOnline = status.isOnline;
      state.pendingOperations = status.pendingOperations;
      state.lastSync = status.lastSyncAttempt || Date.now();
      state.error = status.failedOperations > 0 ? `${status.failedOperations} operations failed` : null;
    });
    builder.addCase(initializeSync.rejected, (state, action) => {
      state.syncInProgress = false;
      state.error = action.error.message || "Failed to initialize sync";
    });

    // Stop Sync
    builder.addCase(stopSync.fulfilled, (state, action) => {
      const status = action.payload;
      state.syncInProgress = status.isProcessing;
      state.pendingOperations = status.pendingOperations;
      state.isOnline = status.isOnline;
    });

    // Refresh Status
    builder.addCase(refreshSyncStatus.fulfilled, (state, action) => {
      const status = action.payload;
      state.isOnline = status.isOnline;
      state.syncInProgress = status.isProcessing;
      state.pendingOperations = status.pendingOperations;
      state.lastSync = status.lastSyncAttempt || state.lastSync;
      state.error = status.failedOperations > 0 ? `${status.failedOperations} operations failed` : null;
    });

    // Force Sync All
    builder.addCase(forceSyncAll.pending, (state) => {
      state.syncInProgress = true;
      state.error = null;
    });
    builder.addCase(forceSyncAll.fulfilled, (state, action) => {
      const status = action.payload;
      state.syncInProgress = status.isProcessing;
      state.isOnline = status.isOnline;
      state.pendingOperations = status.pendingOperations;
      state.lastSync = Date.now();
      state.error = status.failedOperations > 0 ? `${status.failedOperations} operations failed` : null;
    });
    builder.addCase(forceSyncAll.rejected, (state, action) => {
      state.syncInProgress = false;
      state.error = action.error.message || "Force sync failed";
    });

    // Conflicts-only sync
    builder.addCase(syncConflictsOnly.pending, (state) => {
      state.syncInProgress = true;
      state.error = null;
    });

    builder.addCase(syncConflictsOnly.fulfilled, (state, action) => {
      state.syncInProgress = false;
      state.lastSync = action.payload.lastSyncAttempt || Date.now();
      state.pendingOperations = action.payload.pendingOperations;
      state.error = null;
    });

    builder.addCase(syncConflictsOnly.rejected, (state, action) => {
      state.syncInProgress = false;
      state.error = action.error.message || "Conflicts sync failed";
    });
  },
});

export const { setOnlineStatus, setLastSync, setPendingOperations, setSyncInProgress, setSyncError, clearSyncError, updateSyncStatus } =
  syncSlice.actions;

export default syncSlice.reducer;
