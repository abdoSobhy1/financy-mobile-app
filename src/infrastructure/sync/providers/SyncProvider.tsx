// Centralized Sync Management Context
import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { useSyncManager } from "../hooks/useSyncManager";
import { useToast } from "../../../shared/ui/ToastProvider";

interface SyncContextValue {
  syncState: {
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncTime: Date | null;
    syncError: string | null;
  };
  refresh: () => Promise<void>;
  fullRefresh: () => Promise<void>;
  checkForChanges: () => Promise<void>;
  performSync: (showFeedback?: boolean, forceFullSync?: boolean) => Promise<void>;
  setNotificationCallback: (callback: ((notification: { type: "info" | "success" | "error"; message: string }) => void) | null) => void;
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

interface SyncProviderProps {
  children: ReactNode;
}

export const SyncProvider: React.FC<SyncProviderProps> = ({ children }) => {
  const syncManager = useSyncManager();
  const { showToast } = useToast();

  // Set up notification callback when toast is available
  useEffect(() => {
    if (!syncManager || !showToast) return;

    try {
      syncManager.setNotificationCallback((notification) => {
        try {
          if (notification && typeof notification === "object" && notification.message && notification.type) {
            showToast(notification.message, notification.type);
          } else if (notification != null) {
            console.warn("Invalid notification object:", notification);
          }
        } catch (toastError) {
          console.error("Error showing toast notification:", toastError);
        }
      });

      // Cleanup
      return () => {
        try {
          syncManager.setNotificationCallback(null);
        } catch (cleanupError) {
          console.error("Error during sync manager cleanup:", cleanupError);
        }
      };
    } catch (setupError) {
      console.error("Error setting up notification callback:", setupError);
    }
  }, [syncManager, showToast]);

  return <SyncContext.Provider value={syncManager}>{children}</SyncContext.Provider>;
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return context;
};

export default SyncProvider;
