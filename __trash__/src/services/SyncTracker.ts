import AsyncStorage from "@react-native-async-storage/async-storage";

// Sync tracking system to ensure all data is properly synced
export interface SyncTrackingData {
  lastSyncTimestamp: number;
  syncedItemIds: {
    transactions: Set<string>;
    categories: Set<string>;
    budgets: Set<string>;
    bills: Set<string>;
    debts: Set<string>;
  };
  pendingSyncItems: {
    transactions: Set<string>;
    categories: Set<string>;
    budgets: Set<string>;
    bills: Set<string>;
    debts: Set<string>;
  };
}

const SYNC_TRACKING_KEY = "@financy_sync_tracking";

class SyncTracker {
  private syncData: SyncTrackingData = {
    lastSyncTimestamp: 0,
    syncedItemIds: {
      transactions: new Set(),
      categories: new Set(),
      budgets: new Set(),
      bills: new Set(),
      debts: new Set(),
    },
    pendingSyncItems: {
      transactions: new Set(),
      categories: new Set(),
      budgets: new Set(),
      bills: new Set(),
      debts: new Set(),
    },
  };

  async initializeSyncTracking(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(SYNC_TRACKING_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert arrays back to Sets
        Object.keys(parsed.syncedItemIds).forEach((key) => {
          this.syncData.syncedItemIds[key] = new Set(parsed.syncedItemIds[key]);
        });
        Object.keys(parsed.pendingSyncItems).forEach((key) => {
          this.syncData.pendingSyncItems[key] = new Set(parsed.pendingSyncItems[key]);
        });
        this.syncData.lastSyncTimestamp = parsed.lastSyncTimestamp || 0;
        console.log("📊 Sync tracking initialized:", {
          lastSync: new Date(this.syncData.lastSyncTimestamp).toISOString(),
          syncedCounts: {
            transactions: this.syncData.syncedItemIds.transactions.size,
            categories: this.syncData.syncedItemIds.categories.size,
            budgets: this.syncData.syncedItemIds.budgets.size,
            bills: this.syncData.syncedItemIds.bills.size,
            debts: this.syncData.syncedItemIds.debts.size,
          },
          pendingCounts: {
            transactions: this.syncData.pendingSyncItems.transactions.size,
            categories: this.syncData.pendingSyncItems.categories.size,
            budgets: this.syncData.pendingSyncItems.budgets.size,
            bills: this.syncData.pendingSyncItems.bills.size,
            debts: this.syncData.pendingSyncItems.debts.size,
          },
        });
      }
    } catch (error) {
      console.error("❌ Failed to initialize sync tracking:", error);
    }
  }

  async saveSyncTracking(): Promise<void> {
    try {
      // Convert Sets to arrays for storage
      const dataToStore = {
        lastSyncTimestamp: this.syncData.lastSyncTimestamp,
        syncedItemIds: {},
        pendingSyncItems: {},
      };

      Object.keys(this.syncData.syncedItemIds).forEach((key) => {
        dataToStore.syncedItemIds[key] = Array.from(this.syncData.syncedItemIds[key]);
      });

      Object.keys(this.syncData.pendingSyncItems).forEach((key) => {
        dataToStore.pendingSyncItems[key] = Array.from(this.syncData.pendingSyncItems[key]);
      });

      await AsyncStorage.setItem(SYNC_TRACKING_KEY, JSON.stringify(dataToStore));
    } catch (error) {
      console.error("❌ Failed to save sync tracking:", error);
    }
  }

  markItemAsSynced(collection: keyof SyncTrackingData["syncedItemIds"], itemId: string): void {
    this.syncData.syncedItemIds[collection].add(itemId);
    this.syncData.pendingSyncItems[collection].delete(itemId);
    console.log(`✅ Marked ${collection}:${itemId} as synced`);
  }

  markItemAsPending(collection: keyof SyncTrackingData["pendingSyncItems"], itemId: string): void {
    this.syncData.pendingSyncItems[collection].add(itemId);
    console.log(`⏳ Marked ${collection}:${itemId} as pending sync`);
  }

  isItemSynced(collection: keyof SyncTrackingData["syncedItemIds"], itemId: string): boolean {
    return this.syncData.syncedItemIds[collection].has(itemId);
  }

  isItemPending(collection: keyof SyncTrackingData["pendingSyncItems"], itemId: string): boolean {
    return this.syncData.pendingSyncItems[collection].has(itemId);
  }

  removeItem(collection: keyof SyncTrackingData["syncedItemIds"], itemId: string): void {
    this.syncData.syncedItemIds[collection].delete(itemId);
    this.syncData.pendingSyncItems[collection].delete(itemId);
    console.log(`🗑️ Removed ${collection}:${itemId} from sync tracking`);
  }

  updateLastSyncTimestamp(): void {
    this.syncData.lastSyncTimestamp = Date.now();
  }

  getUnsyncedItems(collection: keyof SyncTrackingData["syncedItemIds"]): string[] {
    return Array.from(this.syncData.pendingSyncItems[collection]);
  }

  getSyncStatus(): {
    totalSynced: number;
    totalPending: number;
    lastSync: Date | null;
    collections: Record<string, { synced: number; pending: number }>;
  } {
    const collections = {};
    let totalSynced = 0;
    let totalPending = 0;

    Object.keys(this.syncData.syncedItemIds).forEach((key) => {
      const synced = this.syncData.syncedItemIds[key].size;
      const pending = this.syncData.pendingSyncItems[key].size;
      collections[key] = { synced, pending };
      totalSynced += synced;
      totalPending += pending;
    });

    return {
      totalSynced,
      totalPending,
      lastSync: this.syncData.lastSyncTimestamp > 0 ? new Date(this.syncData.lastSyncTimestamp) : null,
      collections,
    };
  }

  async resetSyncTracking(): Promise<void> {
    this.syncData = {
      lastSyncTimestamp: 0,
      syncedItemIds: {
        transactions: new Set(),
        categories: new Set(),
        budgets: new Set(),
        bills: new Set(),
        debts: new Set(),
      },
      pendingSyncItems: {
        transactions: new Set(),
        categories: new Set(),
        budgets: new Set(),
        bills: new Set(),
        debts: new Set(),
      },
    };
    await AsyncStorage.removeItem(SYNC_TRACKING_KEY);
    console.log("🔄 Sync tracking reset");
  }

  async forceSyncAll(): Promise<void> {
    // Move all synced items to pending
    Object.keys(this.syncData.syncedItemIds).forEach((key) => {
      this.syncData.syncedItemIds[key].forEach((id) => {
        this.syncData.pendingSyncItems[key].add(id);
      });
      this.syncData.syncedItemIds[key].clear();
    });
    await this.saveSyncTracking();
    console.log("🔄 All items marked for re-sync");
  }
}

export const syncTracker = new SyncTracker();
