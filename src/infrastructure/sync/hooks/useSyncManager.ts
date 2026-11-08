import { useEffect, useCallback, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { AppState, AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { AppDispatch } from "../../../app/store";
import { offlineFirstSync } from "../OfflineFirstSync";
import { syncService } from "../syncService";
import { syncWithFirebase } from "../store/syncSlice";

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: string | null;
}

interface SyncNotification {
  type: "info" | "success" | "error";
  message: string;
}

export const useSyncManager = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: true,
    isSyncing: false,
    lastSyncTime: null,
    syncError: null,
  });

  // Add debounce to prevent rapid repeated syncs
  const [lastSyncAttempt, setLastSyncAttempt] = useState<number>(0);
  const SYNC_DEBOUNCE_MS = 10000; // 10 seconds

  // Notification callback (will be set by SyncProvider)
  const notificationCallbackRef = useRef<((notification: SyncNotification) => void) | null>(null);
  const setNotificationCallback = useCallback((callback: ((notification: SyncNotification) => void) | null) => {
    notificationCallbackRef.current = callback;
  }, []);

  // Unified sync function - now with smart sync that avoids full data pulls
  const performSync = useCallback(
    async (showFeedback: boolean = true, forceFullSync: boolean = false) => {
      if (syncState.isSyncing) return;

      // Debounce sync attempts unless it's a forced full sync
      const now = Date.now();
      if (!forceFullSync && !showFeedback && now - lastSyncAttempt < SYNC_DEBOUNCE_MS) {
        return;
      }

      setLastSyncAttempt(now);
      setSyncState((prev) => ({ ...prev, isSyncing: true, syncError: null }));

      if (showFeedback && notificationCallbackRef.current) {
        notificationCallbackRef.current({ type: "info", message: "Syncing data..." });
      }

      try {
        if (forceFullSync) {
          // Perform full bidirectional sync with Firebase database
          await dispatch(syncWithFirebase({ showToast: false })).unwrap();
        } else {
          // Only process pending local operations (smart sync)
          await offlineFirstSync.forceSyncAll();
          // Initialize sync service for real-time updates (no full data pull)
          await syncService.initializeSync();
        }

        setSyncState((prev) => ({
          ...prev,
          isSyncing: false,
          lastSyncTime: new Date(),
          syncError: null,
        }));

        if (showFeedback && notificationCallbackRef.current) {
          notificationCallbackRef.current({ type: "success", message: "Data synced successfully" });
        }
      } catch (error) {
        const errorMessage = error && typeof error === "object" && "message" in error ? (error as Error).message : "Unknown sync error";
        setSyncState((prev) => ({
          ...prev,
          isSyncing: false,
          syncError: errorMessage,
        }));

        if (showFeedback && notificationCallbackRef.current) {
          const safeErrorMessage = errorMessage || "Unknown error";
          notificationCallbackRef.current({ type: "error", message: `Sync failed: ${safeErrorMessage}` });
        }
        console.error("Sync error:", error);
      }
    },
    [syncState.isSyncing, lastSyncAttempt, SYNC_DEBOUNCE_MS]
  );

  // Manual refresh trigger - smart sync by default
  const refresh = useCallback(() => {
    return performSync(true, false); // Show feedback, but use smart sync
  }, [performSync]);

  // Full refresh trigger - for when user explicitly wants to sync everything
  const fullRefresh = useCallback(() => {
    return performSync(true, true); // Show feedback and force full sync
  }, [performSync]);

  // Instant change check - manually check for remote changes immediately
  const checkForChanges = useCallback(async () => {
    if (syncState.isSyncing) return;

    try {
      setSyncState((prev) => ({ ...prev, isSyncing: true }));
      await syncService.checkForChanges();

      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date(),
        syncError: null,
      }));

      if (notificationCallbackRef.current) {
        notificationCallbackRef.current({ type: "success", message: "Change check completed" });
      }
    } catch (error) {
      const errorMessage = error && typeof error === "object" && "message" in error ? (error as Error).message : "Change check failed";

      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        syncError: errorMessage,
      }));

      if (notificationCallbackRef.current) {
        notificationCallbackRef.current({ type: "error", message: `Change check failed: ${errorMessage}` });
      }
    }
  }, [syncState.isSyncing]);

  // Network state monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const wasOffline = !syncState.isOnline;
      const isNowOnline = state.isConnected ?? false;

      setSyncState((prev) => ({ ...prev, isOnline: isNowOnline }));

      // Auto-sync when coming back online (only pending operations, not full sync)
      if (wasOffline && isNowOnline) {
        performSync(false, false); // Smart sync, no feedback
      }
    });

    return unsubscribe;
  }, [syncState.isOnline, performSync]);

  // App state monitoring
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active" && syncState.isOnline) {
        // Auto-sync when app becomes active (only pending operations, not full sync)
        performSync(false, false); // Smart sync, no feedback
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [syncState.isOnline, performSync]);

  // Initial sync on mount - only sync pending operations, not full sync
  useEffect(() => {
    const initializeSync = async () => {
      // Don't initialize sync immediately - wait a bit for the app to fully load
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (syncState.isOnline) {
        try {
          setSyncState((prev) => ({ ...prev, isSyncing: true }));

          // Wait for database to be fully initialized before syncing
          const dbManager = (await import("../../database")).DatabaseManager.getInstance();
          if (!dbManager.isReady()) {
            // Wait for database to be ready
            let retries = 0;
            while (!dbManager.isReady() && retries < 10) {
              await new Promise((resolve) => setTimeout(resolve, 500));
              retries++;
            }
            if (!dbManager.isReady()) {
              throw new Error("Database failed to initialize within timeout");
            }
          }
          await offlineFirstSync.forceSyncAll();
          await syncService.initializeSync();
          setSyncState((prev) => ({
            ...prev,
            isSyncing: false,
            lastSyncTime: new Date(),
            syncError: null,
          }));
        } catch (error) {
          console.error("❌ Initial sync setup failed:", error);
          let errorMessage = "Initial sync failed";

          if (error && typeof error === "object") {
            if ("message" in error && typeof error.message === "string") {
              errorMessage = error.message;
            } else if (typeof error.toString === "function") {
              errorMessage = error.toString();
            }
          }

          setSyncState((prev) => ({
            ...prev,
            isSyncing: false,
            syncError: errorMessage,
          }));
        }
      }
    };

    // Use setTimeout to avoid blocking the main thread during initialization
    const timeoutId = setTimeout(initializeSync, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []); // Only run once on mount

  return {
    syncState,
    refresh,
    fullRefresh,
    checkForChanges,
    performSync,
    setNotificationCallback,
  };
};

export default useSyncManager;
