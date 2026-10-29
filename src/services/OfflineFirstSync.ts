import { DatabaseManager } from "../database";
import { syncService } from "./syncService";
import { authService } from "./authService";
import { COLLECTIONS, CollectionName, FirestoreDocument } from "../types";
import NetInfo from "@react-native-community/netinfo";
import { addDeviceTracking } from "../utils/deviceTracking";
import NotificationService from "./notificationService";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type SyncDispatchListener = (tableName: string, recordId: string) => void;
let syncDispatchListener: SyncDispatchListener | null = null;

export function registerSyncDispatchListener(listener: SyncDispatchListener | null): void {
  syncDispatchListener = listener;
}

export interface SyncLogEntry {
  log_id?: number;
  table_name: string;
  record_id: string;
  operation: "insert" | "update" | "delete";
  payload: string; // JSON string
  created_at: number;
  is_processed: boolean;
  retry_count: number;
  error_message?: string;
}

class OfflineFirstSync {
  private db = DatabaseManager.getInstance();
  private isProcessing = false;
  private fullSyncPromise: Promise<{
    push: { totalUploaded: number; totalSkipped: number; errors: string[] };
    pull: { itemsCreated: number; itemsUpdated: number; errors: string[] };
  }> | null = null;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private periodicSyncInterval: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;

  // Mapping from database table names to Firestore collection names
  private readonly TABLE_TO_COLLECTION: Record<string, CollectionName> = {
    transactions: COLLECTIONS.TRANSACTIONS,
    categories: COLLECTIONS.CATEGORIES,
    budgets: COLLECTIONS.BUDGETS,
    debts: COLLECTIONS.DEBTS,
    debt_payments: COLLECTIONS.DEBT_PAYMENTS,
    settings: COLLECTIONS.SETTINGS,
    wallets: COLLECTIONS.WALLETS,
  };

  /**
   * Log an operation for later sync - this never fails the main database operation
   * @param tableName - The table name
   * @param recordId - The record ID
   * @param operation - The operation type
   * @param data - The data
   * @param skipSyncLog - Whether to skip logging this operation (used when applying remote changes)
   */
  async logOperation(
    tableName: string,
    recordId: string,
    operation: "insert" | "update" | "delete",
    data: any,
    skipSyncLog: boolean = false,
  ): Promise<void> {
    // Don't log sync operations when applying remote changes to prevent loops
    if (skipSyncLog) {
      console.log(
        `⏭️ Skipping sync log for ${tableName}:${recordId} (remote change application)`,
      );
      return;
    }
    try {
      // Check if database is ready before proceeding
      if (!this.db.isReady()) {
        console.log("Database not ready for sync operations, skipping...");
        return;
      }

      const database = this.db.getDatabase();

      // Add device tracking to prevent sync loops
      const enhancedData = await addDeviceTracking(data);

      const logEntry = {
        table_name: tableName,
        record_id: recordId,
        operation,
        payload: JSON.stringify(enhancedData),
        created_at: Date.now(),
        is_processed: 0,
        retry_count: 0,
      };

      await database.runAsync(
        `INSERT INTO sync_log (table_name, record_id, operation, payload, created_at, is_processed, retry_count)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          logEntry.table_name,
          logEntry.record_id,
          logEntry.operation,
          logEntry.payload,
          logEntry.created_at,
          logEntry.is_processed,
          logEntry.retry_count,
        ],
      );

      // More verbose debug: include a short payload preview and stack trace origin
      const preview = logEntry.payload
        ? logEntry.payload.length > 200
          ? logEntry.payload.substring(0, 200) + "..."
          : logEntry.payload
        : "";
      const stack = new Error().stack || "";
      console.log(
        `🔄 Logged ${operation} operation for ${tableName}:${recordId} created_at=${new Date(
          logEntry.created_at,
        ).toISOString()} payload_preview=${preview}`,
      );
      console.log(
        `🔍 logOperation call stack (top 3):\n${stack.split("\n").slice(0, 4).join("\n")}`,
      );

      // Try to sync immediately if online (but don't block the operation)
      this.attemptSync();
    } catch (error) {
      // Operation logging failed but this should not block the main database operation
      // This should never fail the main database operation
    }
  }

  /**
   * Attempt to sync all pending operations - runs in background
   */
  private attemptSync = async (): Promise<void> => {
    if (this.isProcessing) {
      return;
    }

    try {
      const canSync = await authService.isCloudSyncAllowedAsync();
      if (!canSync) {
        return;
      }

      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        return;
      }

      await this.processUnSyncedOperations();
    } catch (error) {
      // Sync attempt failed - will retry later
      // Retry after delay
      this.scheduleRetry();
    }
  };

  /**
   * Process all unsynced operations from the log
   */
  private async processUnSyncedOperations(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      await this.db.ensureInitialized();
      const database = this.db.getDatabase();

      // Get all unprocessed operations ordered by creation time
      const sql = `SELECT * FROM sync_log 
         WHERE is_processed = 0 
         ORDER BY created_at ASC 
         LIMIT 50`;

      const result = (await database.getAllAsync(sql)) as SyncLogEntry[];

      console.log(
        `🔎 Found ${result.length} pending sync operations to process`,
      );
      result.forEach((r, i) =>
        console.log(
          `   [${i + 1}] log_id=${r.log_id} table=${r.table_name} id=${r.record_id} op=${r.operation} retry=${r.retry_count} created_at=${new Date(
            r.created_at,
          ).toISOString()}`,
        ),
      );

      console.log(
        `� Processing ${result.length} pending sync operations`,
      );

      for (const logEntry of result) {
        await this.processSingleOperation(logEntry);
      }

      console.log("✅ Sync operations completed");
    } catch (error) {
      console.error("Error processing sync operations:", error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single sync operation
   */
  private async processSingleOperation(logEntry: SyncLogEntry): Promise<void> {
    try {
      const data = JSON.parse(logEntry.payload);
      const collectionName = this.TABLE_TO_COLLECTION[logEntry.table_name];

      if (!collectionName) {
        throw new Error(`Unknown table name: ${logEntry.table_name}`);
      }

      // Map operation names from database style to sync service style
      const syncOperation =
        logEntry.operation === "insert" ? "create" : logEntry.operation;

      // Use the existing sync service to perform the actual sync
      await syncService.syncLocalChanges(
        collectionName,
        syncOperation,
        logEntry.record_id,
        data,
      );

      // Update the entity row's sync_status to 'synced' in SQLite
      await this.markRecordSynced(logEntry.table_name, logEntry.record_id);

      // Mark as processed
      await this.markOperationAsProcessed(logEntry.log_id!);

      // Sync operation completed successfully
    } catch (error) {
      // Sync operation failed - marked for retry

      // Increment retry count and update error message
      await this.markOperationAsFailed(
        logEntry.log_id!,
        error instanceof Error ? error.message : "Unknown error",
      );

      // If we've retried too many times, mark as processed to avoid infinite loops
      if (logEntry.retry_count >= 5) {
        // Max retries reached - marking as processed to avoid infinite loops
        await this.markOperationAsProcessed(logEntry.log_id!);
      }
    }
  }

  /**
   * Update the entity row's sync_status column to 'synced' after a successful
   * Firebase push. tableName is validated against TABLE_TO_COLLECTION keys to
   * prevent SQL injection from an arbitrary string.
   */
  private async markRecordSynced(
    tableName: string,
    recordId: string,
  ): Promise<void> {
    // Whitelist check — only interpolate known table names
    if (!this.TABLE_TO_COLLECTION[tableName]) {
      console.warn(
        `markRecordSynced: unknown table "${tableName}", skipping SQL update`,
      );
      return;
    }
    try {
      const database = this.db.getDatabase();
      await database.runAsync(
        `UPDATE ${tableName} SET sync_status = 'synced' WHERE id = ?`,
        [recordId],
      );
      console.log(`✅ Marked ${tableName}:${recordId} sync_status = synced`);
    } catch (error) {
      // Non-fatal: the sync_log entry is already processed; log and continue
      console.warn(
        `⚠️ Could not update sync_status for ${tableName}:${recordId}:`,
        error,
      );
      return;
    }

    // Dispatch to Redux so in-memory state reflects the change immediately
    // without requiring a full data re-fetch from SQLite
    try {
      if (syncDispatchListener) {
        syncDispatchListener(tableName, recordId);
      }
    } catch (dispatchError) {
      // Non-fatal: SQLite is already updated; Redux will catch up on next fetch
      console.warn(
        `⚠️ Redux dispatch for markSynced failed (${tableName}:${recordId}):`,
        dispatchError,
      );
    }
  }

  /**
   * Mark an operation as successfully processed
   */
  private async markOperationAsProcessed(logId: number): Promise<void> {
    const database = this.db.getDatabase();
    await database.runAsync(
      `UPDATE sync_log SET is_processed = 1 WHERE log_id = ?`,
      [logId],
    );
  }

  /**
   * Mark an operation as failed and increment retry count
   */
  private async markOperationAsFailed(
    logId: number,
    errorMessage: string,
  ): Promise<void> {
    const database = this.db.getDatabase();
    await database.runAsync(
      `UPDATE sync_log 
       SET retry_count = retry_count + 1, error_message = ? 
       WHERE log_id = ?`,
      [errorMessage, logId],
    );
  }

  /**
   * Cancel any scheduled retry (called on sign-out so the old user's queue isn't pushed later)
   */
  public cancelScheduledRetry(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  /**
   * Schedule a retry after a delay
   */
  private scheduleRetry(retryCount: number = 0): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    // Exponential backoff: 5s, 10s, 20s, 40s, 60s max
    const retryDelay = Math.min(5000 * Math.pow(2, retryCount), 60000);

    console.log(
      `⏳ Scheduling retry in ${retryDelay / 1000}s (attempt ${retryCount + 1})`,
    );

    this.retryTimeout = setTimeout(() => {
      this.attemptSync();
    }, retryDelay);
  }

  /**
   * Force sync all pending operations (called when coming online)
   */
  public async forceSyncAll(): Promise<void> {
    console.log("🚀 Force syncing all pending operations");
    await this.processUnSyncedOperations();
  }

  /**
   * Alias for forceSyncAll
   */
  public async processUnSyncedOperationsOnly(): Promise<void> {
    return this.forceSyncAll();
  }

  /**
   * Get count of pending sync operations
   */
  public async getPendingOperationsCount(): Promise<number> {
    try {
      await this.db.ensureInitialized();
      const database = this.db.getDatabase();

      const result = (await database.getFirstAsync(
        `SELECT COUNT(*) as count FROM sync_log WHERE is_processed = 0`,
      )) as { count: number };

      return result?.count || 0;
    } catch (error) {
      console.error("Error getting pending operations count:", error);
      return 0;
    }
  }

  /**
   * Get sync status information
   */
  public async getSyncStatus(): Promise<{
    isOnline: boolean;
    pendingOperations: number;
    isProcessing: boolean;
    failedOperations: number;
    lastSyncAttempt: number | null;
  }> {
    try {
      await this.db.ensureInitialized();
      const database = this.db.getDatabase();
      const netInfo = await NetInfo.fetch();

      const pendingResult = (await database.getFirstAsync(
        `SELECT COUNT(*) as count FROM sync_log WHERE is_processed = 0`,
      )) as { count: number };

      const failedResult = (await database.getFirstAsync(
        `SELECT COUNT(*) as count FROM sync_log WHERE is_processed = 0 AND retry_count > 0`,
      )) as {
        count: number;
      };

      const lastAttemptResult = (await database.getFirstAsync(
        `SELECT MAX(created_at) as last_attempt FROM sync_log`,
      )) as {
        last_attempt: number | null;
      };

      return {
        isOnline: netInfo.isConnected || false,
        pendingOperations: pendingResult?.count || 0,
        isProcessing: this.isProcessing,
        failedOperations: failedResult?.count || 0,
        lastSyncAttempt: lastAttemptResult?.last_attempt || null,
      };
    } catch (error) {
      console.error("Error getting sync status:", error);
      return {
        isOnline: false,
        pendingOperations: 0,
        isProcessing: false,
        failedOperations: 0,
        lastSyncAttempt: null,
      };
    }
  }

  /**
   * Clean up old processed operations (housekeeping)
   */
  public async cleanupOldOperations(): Promise<void> {
    try {
      await this.db.ensureInitialized();
      const database = this.db.getDatabase();

      // Remove processed operations older than 7 days
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      const result = await database.runAsync(
        `DELETE FROM sync_log 
         WHERE is_processed = 1 AND created_at < ?`,
        [sevenDaysAgo],
      );

      console.log(`🧹 Cleaned up ${result.changes} old sync operations`);
    } catch (error) {
      console.error("Error cleaning up old operations:", error);
    }
  }

  /**
   * Initialize Firebase real-time listeners for detecting remote changes
   */
  private async initializeFirebaseListeners(): Promise<void> {
    try {
      console.log("🔥 Starting Firebase real-time listeners...");
      await syncService.initializeSync();
      // After listeners are started, perform a delta sync to pull any changes
      try {
        await syncService.performDeltaSync();
        console.log("✅ Performed initial delta sync after starting listeners");
      } catch (deltaErr) {
        console.warn("Initial delta sync failed (continuing):", deltaErr);
      }
      console.log("✅ Firebase real-time listeners started successfully");
    } catch (error) {
      console.error("❌ Failed to start Firebase listeners:", error);
      // Don't throw - app should still work without real-time sync
    }
  }

  /**
   * Initialize the sync service (call once at app startup)
   */
  public initialize(): () => void {
    if (this.isInitialized) {
      return () => {}; // Return empty cleanup function if already initialized
    }

    this.isInitialized = true;
    console.log("🚀 Initializing OfflineFirstSync service");

    // Setup network listener
    const networkUnsubscribe = this.setupNetworkListener();

    // Initialize real-time Firebase listeners from syncService
    // This is crucial for detecting Firebase changes and triggering Redux updates
    // Run async without blocking initialization
    this.initializeFirebaseListeners().catch((error) => {
      console.error("Failed to initialize Firebase listeners:", error);
    });

    // Setup periodic sync (every 2 minutes when online)
    this.periodicSyncInterval = setInterval(
      async () => {
        try {
          const netInfo = await NetInfo.fetch();
          if (netInfo.isConnected) {
            const pendingCount = await this.getPendingOperationsCount();
            if (pendingCount > 0) {
              console.log(
                `⏰ Periodic sync: ${pendingCount} pending operations`,
              );
              await this.forceSyncAll();
            }

            // Always attempt a delta sync to pull recent remote changes
            try {
              await syncService.performDeltaSync();
              console.log("⏰ Periodic delta sync completed");
            } catch (deltaErr) {
              console.warn("Periodic delta sync failed:", deltaErr);
            }
          }
        } catch (error) {
          console.error("Periodic sync failed:", error);
        }
      },
      10 * 60 * 1000,
    ); // Every 2 minutes

    // Cleanup old operations periodically (every hour)
    const cleanupInterval = setInterval(
      () => {
        this.cleanupOldOperations().catch((error) => {
          console.error("Cleanup failed:", error);
        });
      },
      60 * 60 * 1000,
    ); // Every hour

    // Return cleanup function
    return () => {
      this.isInitialized = false;
      networkUnsubscribe();

      // Stop Firebase listeners
      syncService.stopSync();

      if (this.periodicSyncInterval) {
        clearInterval(this.periodicSyncInterval);
        this.periodicSyncInterval = null;
      }
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
      }
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = null;
      }
    };
  }

  /**
   * Setup network listener to auto-sync when coming online
   */
  public setupNetworkListener(): () => void {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        console.log(
          "📡 Network connected, attempting to sync pending operations and perform delta sync",
        );

        // Force local pending operations to cloud
        this.forceSyncAll().catch((error) => {
          console.error("Auto-sync on network restore failed:", error);
        });

        // Also perform a delta pull from cloud to update local DB
        syncService
          .performDeltaSync()
          .then(() => console.log("✅ Delta sync on network restore completed"))
          .catch((err) =>
            console.error("Delta sync on network restore failed:", err),
          );
      } else {
        console.log(
          "📡 Network disconnected, operations will be queued locally",
        );
      }
    });

    return unsubscribe;
  }

  /**
   * Normalize any timestamp value (number, numeric string, ISO string, or Firestore Timestamp) to epoch ms
   */
  private parseTimestampMs(val: any): number {
    if (!val) return 0;
    if (typeof val === "number") {
      return isNaN(val) ? 0 : val;
    }
    if (typeof val === "object") {
      if (typeof val.toDate === "function") {
        return val.toDate().getTime();
      }
      if (typeof val.seconds === "number") {
        return val.seconds * 1000;
      }
    }
    if (typeof val === "string") {
      const asNum = Number(val);
      if (!isNaN(asNum) && asNum > 0) {
        return asNum;
      }
      const parsed = Date.parse(val);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return 0;
  }

  /**
   * Complete bidirectional sync with Firebase database:
   * 1. Validates auth & internet connection
   * 2. Initializes sync service & ensures Firestore user document exists
   * 3. Flushes pending local sync operations
   * 4. Pulls/restores cloud data down to local SQLite
   * 5. Pushes local data (categories, settings, wallets, budgets, transactions, debts, debt_payments) to cloud
   * 6. Updates syncUpdatedAt timestamp
   */
  public async syncWithFirebase(forceFullPush: boolean = true): Promise<{
    push: { totalUploaded: number; totalSkipped: number; errors: string[] };
    pull: { itemsCreated: number; itemsUpdated: number; errors: string[] };
  }> {
    if (this.fullSyncPromise) {
      console.log("🔄 Full sync already in progress, awaiting active sync promise...");
      return await this.fullSyncPromise;
    }

    this.fullSyncPromise = (async () => {
      try {
        await this.db.ensureInitialized();

        const canSync = await authService.isCloudSyncAllowedAsync();
        if (!canSync) {
          console.log("⏭️ Cloud sync skipped: user is not authenticated or in guest mode");
          return {
            push: { totalUploaded: 0, totalSkipped: 0, errors: [] },
            pull: { itemsCreated: 0, itemsUpdated: 0, errors: [] },
          };
        }

        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          console.log("📡 No internet connection for Firebase sync");
          throw new Error("No internet connection");
        }

        console.log("🔄 Starting full bidirectional sync with Firebase database...");

        // 1. Initialize Firebase sync service & ensure user document exists in Firestore
        await syncService.initializeSync();

        // 2. Process pending offline sync operations
        await this.processUnSyncedOperations();

        // 3. Restore cloud data FIRST so local database is populated with cloud records before pushing
        let pullResult = { itemsCreated: 0, itemsUpdated: 0, errors: [] as string[] };
        try {
          pullResult = await this.performComprehensiveCloudRestore();
        } catch (pullErr: any) {
          console.error("❌ Restore from cloud failed:", pullErr);
          pullResult.errors.push(pullErr?.message || String(pullErr));
        }

        // 4. Ensure categories and wallets state for this user is marked or seeded
        try {
          await this.db.ensureInitialized();
          const database = this.db.getDatabase();
          const catCountRow = await database.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) as count FROM categories WHERE deleted = 0 OR deleted IS NULL",
          );
          const walletCountRow = await database.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) as count FROM wallets",
          );
          const currentUserId = (await authService.getCurrentAuthenticatedUser())?.uid;

          if (currentUserId) {
            const seededKey = `financy_categories_seeded_v1_${currentUserId}`;
            const walletSeededKey = `financy_wallets_seeded_v1_${currentUserId}`;
            const hasExistingCloudData =
              pullResult.itemsCreated + pullResult.itemsUpdated > 0;

            if ((catCountRow && catCountRow.count > 0) || hasExistingCloudData) {
              // User already has categories or existing cloud account data (meaning any missing categories were intentionally deleted)
              await AsyncStorage.setItem(seededKey, "true");
            } else {
              // Brand new user with 0 categories and 0 cloud records: seed default Arabic categories with deterministic IDs once
              const alreadySeeded = await AsyncStorage.getItem(seededKey);
              if (alreadySeeded !== "true") {
                const { CategoryRepository } = await import("../database/queries/categories");
                const categoryRepo = new CategoryRepository();
                await categoryRepo.seedDefaultArabicCategories();
              }
            }

            if ((walletCountRow && walletCountRow.count > 0) || hasExistingCloudData) {
              await AsyncStorage.setItem(walletSeededKey, "true");
            } else {
              const alreadySeededWallets = await AsyncStorage.getItem(walletSeededKey);
              if (alreadySeededWallets !== "true") {
                const { WalletRepository } = await import("../database/queries/wallets");
                const walletRepo = new WalletRepository();
                await walletRepo.seedDefaultWallets();
              }
            }
          }
        } catch (catInitErr) {
          console.warn("Category/Wallet post-restore check warning:", catInitErr);
        }

        // Recalculate category entry counts after cloud restore
        try {
          await this.db.recalculateEntryCounts();
        } catch (recalcErr) {
          console.warn("Could not recalculate entry counts after restore:", recalcErr);
        }

        // 5. Push local data to cloud (categories, settings, wallets, budgets, transactions, debts, debt_payments)
        let pushResult = {
          totalUploaded: 0,
          totalSkipped: 0,
          collections: {},
          errors: [] as string[],
        };
        try {
          pushResult = await this.pushAllDataToCloud(forceFullPush);
        } catch (pushErr: any) {
          console.warn("⚠️ Push to cloud encountered an issue:", pushErr);
          pushResult.errors.push(pushErr?.message || String(pushErr));
        }

        // 6. Update settings.syncUpdatedAt (with skipSync to avoid queuing an operation in sync_log)
        try {
          const { SettingsRepository } = await import("../database/queries/settings");
          const settingsRepo = new SettingsRepository();
          const now = Date.now();
          await settingsRepo.updateSettings({ syncUpdatedAt: now }, { skipSync: true });
        } catch (e) {
          console.warn("Could not update syncUpdatedAt setting:", e);
        }

        console.log(
          `✅ Firebase database sync completed: ${pushResult.totalUploaded} pushed, ${pullResult.itemsCreated + pullResult.itemsUpdated} pulled`,
        );

        return {
          push: {
            totalUploaded: pushResult.totalUploaded,
            totalSkipped: pushResult.totalSkipped,
            errors: pushResult.errors,
          },
          pull: pullResult,
        };
      } finally {
        this.fullSyncPromise = null;
      }
    })();

    return await this.fullSyncPromise;
  }

  /**
   * Sync only conflicts and pending operations (no full data pull)
   */
  async syncConflictsOnly(): Promise<void> {
    try {
      console.log("🔍 Starting conflicts-only sync...");

      // Check if user is authenticated first
      const isAuthenticated = await authService.isAuthenticatedAsync();
      if (!isAuthenticated) {
        console.log("🔐 User not authenticated, skipping conflicts sync");
        return;
      }

      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log("📡 No internet connection for conflicts sync");
        return;
      }

      // Sync pending operations first
      await this.processUnSyncedOperations();

      // Sync conflicts in Firebase
      await syncService.syncConflictsOnly();

      console.log("✅ Conflicts-only sync completed");
    } catch (error) {
      console.error("❌ Conflicts-only sync failed:", error);
      throw error;
    }
  }

  /**
   * Internal multi-phase restore helper executed in dependency order:
   * Phase 1: Independent collections (categories, settings, wallets)
   * Phase 2: Dependent collections (budgets, transactions, debts, debt_payments)
   * Phase 3: Retry failed inserts (foreign key constraints)
   * Followed by debt balance reconciliation.
   */
  private async executePhasedCloudRestore(): Promise<{
    itemsUpdated: number;
    itemsCreated: number;
    errors: string[];
  }> {
    // Clear any existing failed inserts from previous attempts
    syncService.clearFailedInserts();

    const result = {
      itemsUpdated: 0,
      itemsCreated: 0,
      errors: [] as string[],
    };

    const independentCollections = ["categories", "settings", "wallets"];
    const dependentCollections = [
      "budgets",
      "transactions",
      "debts",
      "debt_payments",
    ];

    console.log(
      "☁️ Phase 1: Syncing independent collections (categories, settings, wallets)",
    );
    for (const tableName of independentCollections) {
      const collectionName = this.TABLE_TO_COLLECTION[tableName];
      if (collectionName) {
        try {
          const stats = await this.syncCollectionWithIdComparison(
            collectionName,
            tableName,
          );
          result.itemsUpdated += stats.updated;
          result.itemsCreated += stats.created;
        } catch (error) {
          const errorMsg = `Failed to sync ${tableName}: ${error instanceof Error ? error.message : error}`;
          result.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }
    }

    console.log(
      "☁️ Phase 2: Syncing dependent collections (budgets, transactions, debts, debt_payments)",
    );
    for (const tableName of dependentCollections) {
      const collectionName = this.TABLE_TO_COLLECTION[tableName];
      if (collectionName) {
        try {
          const stats = await this.syncCollectionWithIdComparison(
            collectionName,
            tableName,
          );
          result.itemsUpdated += stats.updated;
          result.itemsCreated += stats.created;
        } catch (error) {
          const errorMsg = `Failed to sync ${tableName}: ${error instanceof Error ? error.message : error}`;
          result.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }
    }

    // Phase 3: Retry failed inserts (foreign key constraints)
    const retryCount = await this.retryFailedInserts();
    if (retryCount > 0) {
      console.log(
        `☁️ Phase 3: Successfully retried ${retryCount} failed inserts`,
      );
      result.itemsCreated += retryCount;
    }

    try {
      const { DebtRepository } = await import("../database/queries/debts");
      await new DebtRepository().reconcileDebtBalances();
    } catch (reconcileErr) {
      console.warn("Could not reconcile debt balances after cloud restore:", reconcileErr);
    }

    return result;
  }

  /**
   * Initial cloud pull - downloads all user data from Firebase on fresh install
   */
  async performInitialCloudPull(): Promise<boolean> {
    try {
      console.log("☁️ Starting initial cloud data pull...");

      // Check if user is authenticated
      const isAuthenticated = await authService.isAuthenticatedAsync();
      if (!isAuthenticated) {
        console.log("🔐 User not authenticated, skipping cloud pull");
        return false;
      }

      // Check if we have any local data (indicates not a fresh install)
      const hasLocalData = await this.checkForLocalData();
      if (hasLocalData) {
        console.log(
          "📱 Local data exists, performing conflicts-only sync instead",
        );
        await this.syncConflictsOnly();
        return true; // Return true to indicate sync was performed
      }

      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log("📡 No internet connection for initial cloud pull");
        return false;
      }

      const result = await this.executePhasedCloudRestore();
      const totalPulled = result.itemsCreated + result.itemsUpdated;

      console.log(
        `☁️ Initial cloud pull completed: ${totalPulled} items restored`,
      );
      return totalPulled > 0;
    } catch (error) {
      console.error("❌ Initial cloud pull failed:", error);
      return false;
    }
  }

  /**
   * Comprehensive cloud data restore - pulls all cloud data and compares by ID to avoid duplicates
   * This is used by the "Restore Cloud Data" button to sync all data regardless of local data state
   */
  async performComprehensiveCloudRestore(): Promise<{
    itemsUpdated: number;
    itemsCreated: number;
    errors: string[];
  }> {
    const notificationService = NotificationService.getInstance();
    let notificationId: string | null = null;

    try {
      console.log("☁️ Starting comprehensive cloud data restore...");

      // Show sync notification
      notificationId = await notificationService.showSyncNotification(
        "Restoring data from cloud...",
      );

      // Check if user is authenticated
      const isAuthenticated = await authService.isAuthenticatedAsync();
      if (!isAuthenticated) {
        throw new Error("User not authenticated");
      }

      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new Error("No internet connection");
      }

      const result = await this.executePhasedCloudRestore();

      console.log(
        `☁️ Comprehensive cloud restore completed: ${result.itemsCreated} created, ${result.itemsUpdated} updated, ${result.errors.length} errors`,
      );

      // Dismiss sync notification
      if (notificationId) {
        await notificationService.dismissSyncNotification(notificationId);
      }

      return result;
    } catch (error) {
      console.error("❌ Comprehensive cloud restore failed:", error);

      // Dismiss sync notification on error
      if (notificationId) {
        await notificationService.dismissSyncNotification(notificationId);
      }

      throw error;
    }
  }

  /**
   * Sync a collection by comparing cloud data with local data by ID
   */
  private async syncCollectionWithIdComparison(
    collectionName: CollectionName,
    tableName: string,
  ): Promise<{ created: number; updated: number }> {
    console.log(`🔄 Syncing ${collectionName} with ID comparison...`);

    // Check if user is authenticated first
    const isAuthenticated = await authService.isAuthenticatedAsync();
    if (!isAuthenticated) {
      console.log(`🔐 User not authenticated, skipping ${collectionName} sync`);
      return { created: 0, updated: 0 };
    }

    const result = { created: 0, updated: 0 };

    try {
      // Get all cloud documents
      const cloudDocuments =
        await syncService.getAllDocumentsFromCollection(collectionName);

      if (cloudDocuments.length === 0) {
        console.log(`☁️ No ${collectionName} found in cloud`);
        return result;
      }

      // Get all local documents and any pending deletes in sync_log so hard-deleted items are never resurrected
      const localDocuments = await this.getLocalDocumentsByTable(tableName, true);
      const localById = new Map(localDocuments.map((doc) => [doc.id, doc]));

      await this.db.ensureInitialized();
      const database = this.db.getDatabase();
      const pendingDeleteRows = await database.getAllAsync<{ record_id: string }>(
        `SELECT record_id FROM sync_log WHERE table_name = ? AND operation = 'delete' AND is_processed = 0`,
        [tableName],
      );
      const pendingDeleteIds = new Set(pendingDeleteRows.map((r) => r.record_id));

      console.log(
        `📊 ${collectionName}: ${cloudDocuments.length} cloud items, ${localDocuments.length} local items`,
      );

      // Process each cloud document
      for (const cloudDoc of cloudDocuments) {
        try {
          const docData = cloudDoc.data || cloudDoc;
          const isDeleted =
            cloudDoc.deleted === true ||
            cloudDoc.deleted === 1 ||
            docData?.deleted === true ||
            docData?.deleted === 1;

          // Special handling for deleted cloud documents: hard-delete from local DB and remove from Firebase
          if (isDeleted) {
            const localDoc = localById.get(cloudDoc.id);
            if (localDoc) {
              console.log(`🗑️ Removing deleted ${tableName} document from local DB: ${cloudDoc.id}`);
              await database.runAsync(`DELETE FROM ${tableName} WHERE id = ?`, [cloudDoc.id]);
              result.updated++;
            }
            try {
              await syncService.syncLocalChanges(collectionName, "delete", cloudDoc.id);
            } catch {
              // ignore
            }
            continue;
          }

          // Validate document has minimum required data
          if (!cloudDoc || !cloudDoc.id) {
            console.warn(
              `⚠️ Skipping invalid ${tableName} document (no ID):`,
              cloudDoc,
            );
            continue;
          }

          // If this item was hard-deleted locally and is waiting in sync_log, delete it from Firebase instead of re-inserting
          if (pendingDeleteIds.has(cloudDoc.id)) {
            console.log(`🗑️ ${tableName}:${cloudDoc.id} has pending local delete, removing from Firebase...`);
            try {
              await syncService.syncLocalChanges(collectionName, "delete", cloudDoc.id);
              await database.runAsync(
                `UPDATE sync_log SET is_processed = 1 WHERE table_name = ? AND record_id = ? AND operation = 'delete'`,
                [tableName, cloudDoc.id],
              );
            } catch (delErr) {
              console.warn(`Could not delete ${tableName}:${cloudDoc.id} from Firebase:`, delErr);
            }
            continue;
          }

          const localDoc = localById.get(cloudDoc.id);
          const cloudUpdatedAt = this.parseTimestampMs(
            cloudDoc.updatedAt ??
              docData?.updatedAt ??
              cloudDoc.sync_updated_at ??
              docData?.sync_updated_at,
          );

          if (!localDoc) {
            // Document doesn't exist locally - create it
            console.log(`➕ Creating new ${tableName}: ${cloudDoc.id}`);
            await this.insertCloudDocumentToLocal(tableName, cloudDoc);
            result.created++;
          } else {
            // If locally deleted, do not resurrect from cloud — delete from Firebase instead
            if (
              (localDoc as any).deleted === 1 ||
              (localDoc as any).deleted === true
            ) {
              console.log(
                `🗑️ ${tableName}:${cloudDoc.id} is marked deleted locally, removing from Firebase...`,
              );
              try {
                await syncService.syncLocalChanges(
                  collectionName,
                  "delete",
                  cloudDoc.id,
                );
                await this.markRecordSynced(tableName, cloudDoc.id);
              } catch (delErr) {
                console.warn(
                  `Could not delete ${tableName}:${cloudDoc.id} from Firebase:`,
                  delErr,
                );
              }
              continue;
            }

            // Document exists locally - check if cloud version is newer
            const localUpdatedAt = this.parseTimestampMs(
              (localDoc as any).sync_updated_at ?? (localDoc as any).updated_at,
            );

            // Special rule for settings: if local is an untouched default placeholder, cloud settings ALWAYS win
            const isSettingsTable = tableName === "settings";
            const localIsUntouchedDefault =
              isSettingsTable &&
              (!(localDoc as any).sync_updated_at ||
                (localDoc as any).sync_updated_at === 0 ||
                (localDoc as any).sync_status === "synced");

            if (cloudUpdatedAt > localUpdatedAt || localUpdatedAt === 0 || localIsUntouchedDefault) {
              console.log(
                `🔄 Updating ${tableName}: ${cloudDoc.id} (cloud: ${cloudUpdatedAt}, local: ${localUpdatedAt}, isDefault: ${localIsUntouchedDefault})`,
              );
              await this.updateLocalDocumentFromCloud(tableName, cloudDoc);
              result.updated++;
            } else {
              console.log(
                `⏭️ Skipping ${tableName}: ${cloudDoc.id} (local is up to date)`,
              );
            }
          }
        } catch (error) {
          console.error(
            `❌ Failed to process ${tableName}:${cloudDoc.id}:`,
            error,
          );
          // Continue with other documents
        }
      }

      console.log(
        `✅ ${collectionName} sync completed: ${result.created} created, ${result.updated} updated`,
      );

      if (tableName === "settings" && result.updated + result.created > 0) {
        try {
          const { store } = await import("../store");
          const { fetchSettings } = await import("../store/slices/settingsSlice");
          store.dispatch(fetchSettings());
        } catch (e) {
          console.warn("Could not dispatch fetchSettings after cloud restore:", e);
        }
      }

      return result;
    } catch (error) {
      console.error(`❌ Failed to sync ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get all local documents from a specific table
   */
  private async getLocalDocumentsByTable(
    tableName: string,
    includeDeleted: boolean = false,
  ): Promise<any[]> {
    await this.db.ensureInitialized();
    const database = this.db.getDatabase();
    const whereClause = includeDeleted
      ? ""
      : " WHERE deleted = 0 OR deleted IS NULL";

    switch (tableName) {
      case "transactions":
      case "categories":
      case "budgets":
      case "debts":
      case "debt_payments":
      case "settings":
      case "wallets":
        return await database.getAllAsync(
          `SELECT * FROM ${tableName}${whereClause}`,
        );
      default:
        return [];
    }
  }

  /**
   * Update a local document with data from the cloud
   */
  private async updateLocalDocumentFromCloud(
    tableName: string,
    cloudDocument: any,
  ): Promise<void> {
    await this.db.ensureInitialized();
    const database = this.db.getDatabase();

    // Convert cloud document to local format
    const localData = this.convertCloudToLocalFormat(tableName, cloudDocument);

    switch (tableName) {
      case "transactions":
      case "categories":
      case "budgets":
      case "debts":
      case "debt_payments":
      case "wallets":
        await this.insertCloudDocumentToLocal(tableName, cloudDocument);
        break;

      case "settings":
        // Handle both legacy key-value format and new structured format
        if (localData.key && localData.value) {
          // Legacy key-value format
          await database.runAsync(
            `UPDATE settings SET key = ?, value = ?, updated_at = ? WHERE id = ?`,
            [localData.key, localData.value, localData.updatedAt, localData.id],
          );
        } else {
          // New structured format with billing period and other settings
          const updates: string[] = ["updated_at = ?"];
          const params: any[] = [
            localData.updatedAt || new Date().toISOString(),
          ];

          if (
            localData.billingPeriodStartDay !== undefined ||
            localData.billing_period_start_day !== undefined
          ) {
            updates.push("billing_period_start_day = ?");
            params.push(
              localData.billingPeriodStartDay ||
                localData.billing_period_start_day,
            );
          }
          if (localData.currency !== undefined) {
            updates.push("currency = ?");
            params.push(localData.currency);
          }
          if (
            localData.firebaseSync !== undefined ||
            localData.firebase_sync !== undefined
          ) {
            updates.push("firebase_sync = ?");
            params.push(
              localData.firebaseSync !== undefined
                ? localData.firebaseSync
                  ? 1
                  : 0
                : localData.firebase_sync,
            );
          }
          if (localData.theme !== undefined) {
            updates.push("theme = ?");
            params.push(localData.theme);
          }

          params.push(localData.id);

          await database.runAsync(
            `UPDATE settings SET ${updates.join(", ")} WHERE id = ?`,
            params,
          );
        }
        break;
    }
  }

  /**
   * Push all local data to Firebase cloud - ensures complete backup without duplicates
   * @param forceAll If true, ignores last sync timestamp and evaluates all local documents
   */
  public async pushAllDataToCloud(forceAll: boolean = false): Promise<{
    totalUploaded: number;
    totalSkipped: number;
    collections: Record<
      string,
      { uploaded: number; skipped: number; errors: number }
    >;
    errors: string[];
  }> {
    const notificationService = NotificationService.getInstance();
    let notificationId: string | null = null;

    try {
      console.log("⬆️ Starting comprehensive data push to cloud...");

      // Show sync notification
      notificationId = await notificationService.showSyncNotification(
        "Pushing local data to cloud...",
      );

      // Check if user is authenticated
      const isAuthenticated = await authService.isAuthenticatedAsync();
      if (!isAuthenticated) {
        throw new Error("User not authenticated");
      }

      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new Error("No internet connection");
      }

      const result = {
        totalUploaded: 0,
        totalSkipped: 0,
        collections: {} as Record<
          string,
          { uploaded: number; skipped: number; errors: number }
        >,
        errors: [] as string[],
      };

      // Read last sync attempt marker so we only push local items updated since then
      let since = 0;
      if (!forceAll) {
        try {
          await this.db.ensureInitialized();
          const database = this.db.getDatabase();
          const row = await database.getFirstAsync<{ sync_updated_at: number }>(
            "SELECT sync_updated_at FROM settings WHERE id = 'default' LIMIT 1",
          );
          since = row?.sync_updated_at || 0;
          console.log(
            `⬆️ Pushing only local items updated after ${new Date(since).toISOString()}`,
          );
        } catch (err) {
          console.warn(
            "Could not read settings.syncUpdatedAt, falling back to full push:",
            err,
          );
          since = 0;
        }
      } else {
        console.log("⬆️ Force push enabled: checking all local records for upload");
      }

      // Process all collections (independent first, then dependent)
      const allCollections = [
        "categories",
        "settings",
        "wallets",
        "budgets",
        "transactions",
        "debts",
        "debt_payments",
      ];

      for (const tableName of allCollections) {
        const collectionName = this.TABLE_TO_COLLECTION[tableName];
        if (collectionName) {
          try {
            console.log(`⬆️ Pushing ${tableName} to cloud (since=${since})...`);
            const stats = await this.pushCollectionToCloud(
              collectionName,
              tableName,
            );

            result.collections[tableName] = stats;
            result.totalUploaded += stats.uploaded;
            result.totalSkipped += stats.skipped;

            console.log(
              `✅ ${tableName}: ${stats.uploaded} uploaded, ${stats.skipped} skipped, ${stats.errors} errors`,
            );
          } catch (error) {
            const errorMsg = `Failed to push ${tableName}: ${error instanceof Error ? error.message : error}`;
            result.errors.push(errorMsg);
            result.collections[tableName] = {
              uploaded: 0,
              skipped: 0,
              errors: 1,
            };
            console.error(`❌ ${errorMsg}`);
          }
        }
      }

      console.log(
        `🚀 Data push completed: ${result.totalUploaded} uploaded, ${result.totalSkipped} skipped, ${result.errors.length} collection errors`,
      );

      // Dismiss sync notification
      if (notificationId) {
        await notificationService.dismissSyncNotification(notificationId);
      }

      return result;
    } catch (error) {
      console.error("❌ Comprehensive data push failed:", error);

      // Dismiss sync notification on error
      if (notificationId) {
        await notificationService.dismissSyncNotification(notificationId);
      }

      throw error;
    }
  }

  /**
   * Push a specific collection to cloud with duplicate prevention
   */
  private async pushCollectionToCloud(
    collectionName: CollectionName,
    tableName: string,
    since: number = 0,
  ): Promise<{ uploaded: number; skipped: number; errors: number }> {
    // Check if user is authenticated first
    const { authService } = await import("./authService");
    const isAuthenticated = await authService.isAuthenticatedAsync();
    if (!isAuthenticated) {
      console.log(
        `🔐 User not authenticated, skipping ${collectionName} push to cloud`,
      );
      return { uploaded: 0, skipped: 0, errors: 0 };
    }

    const result = { uploaded: 0, skipped: 0, errors: 0 };

    try {
      // Get all local documents for this table (including soft-deleted rows so deletions propagate to cloud)
      let localDocuments = await this.getLocalDocumentsByTable(tableName, true);

      // If a since timestamp is provided, filter to only items updated after that time
      if (since && since > 0) {
        localDocuments = localDocuments.filter((d: any) => {
          const updatedAt = d.sync_updated_at || d.updated_at || 0;
          return (updatedAt || 0) > since;
        });
      }

      if (localDocuments.length === 0) {
        console.log(`📭 No local ${tableName} to upload`);
        return result;
      }

      // Get all cloud documents for comparison
      const cloudDocuments =
        await syncService.getAllDocumentsFromCollection(collectionName);
      const cloudById = new Map(cloudDocuments.map((doc) => [doc.id, doc]));

      console.log(
        `📊 ${tableName}: ${localDocuments.length} local items, ${cloudDocuments.length} cloud items`,
      );

      // Process each local document
      for (const localDoc of localDocuments) {
        try {
          // Handle locally deleted items: remove from cloud if still present
          if (
            (localDoc as any).deleted === 1 ||
            (localDoc as any).deleted === true
          ) {
            if (cloudById.has((localDoc as any).id)) {
              console.log(
                `🗑️ Deleting ${tableName} from cloud: ${(localDoc as any).id}`,
              );
              await syncService.syncLocalChanges(
                collectionName,
                "delete",
                (localDoc as any).id,
              );
              await this.markRecordSynced(tableName, (localDoc as any).id);
              result.uploaded++;
            } else {
              result.skipped++;
            }
            continue;
          }

          const cloudDoc = cloudById.get((localDoc as any).id);
          const localUpdatedAt = this.parseTimestampMs(
            (localDoc as any).sync_updated_at ?? (localDoc as any).updated_at,
          );

          // Convert local database format to cloud format
          const cloudFormatDoc = this.convertLocalToCloudFormat(
            tableName,
            localDoc,
          );

          if (!cloudDoc) {
            // Document doesn't exist in cloud - upload it
            console.log(
              `⬆️ Uploading new ${tableName}: ${(localDoc as any).id}`,
            );
            await syncService.syncLocalChanges(
              collectionName,
              "create",
              (localDoc as any).id,
              cloudFormatDoc,
            );
            result.uploaded++;
          } else {
            // Document exists in cloud - check if local is newer
            const cloudDocData = cloudDoc.data || cloudDoc;
            const cloudUpdatedAt = this.parseTimestampMs(
              cloudDoc.updatedAt ??
                cloudDocData?.updatedAt ??
                cloudDoc.sync_updated_at ??
                cloudDocData?.sync_updated_at,
            );

            if (localUpdatedAt > cloudUpdatedAt) {
              // Special rule for settings: NEVER overwrite existing cloud settings with an untouched local default
              if (
                tableName === "settings" &&
                (!(localDoc as any).sync_updated_at ||
                  (localDoc as any).sync_updated_at === 0 ||
                  (localDoc as any).sync_status === "synced")
              ) {
                console.log(
                  `⏭️ Skipping cloud settings push (local is default placeholder, cloud already exists)`,
                );
                result.skipped++;
                continue;
              }

              console.log(
                `⬆️ Updating cloud ${tableName}: ${(localDoc as any).id} (local: ${localUpdatedAt}, cloud: ${cloudUpdatedAt})`,
              );
              await syncService.syncLocalChanges(
                collectionName,
                "update",
                (localDoc as any).id,
                cloudFormatDoc,
              );
              result.uploaded++;
            } else {
              console.log(
                `⏭️ Skipping ${tableName}: ${(localDoc as any).id} (cloud is up to date)`,
              );
              result.skipped++;
            }
          }
        } catch (error) {
          console.error(
            `❌ Failed to push ${tableName}:${(localDoc as any).id}:`,
            error,
          );
          result.errors++;
        }
      }

      return result;
    } catch (error) {
      console.error(`❌ Failed to push ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Check if local database has any user data
   */
  private async checkForLocalData(): Promise<boolean> {
    try {
      await this.db.ensureInitialized();
      const database = this.db.getDatabase();

      // Check for any transactions (main indicator of user data)
      const result = (await database.getFirstAsync(
        "SELECT COUNT(*) as count FROM transactions LIMIT 1",
      )) as { count: number } | null;

      return result ? result.count > 0 : false;
    } catch (error) {
      console.error("Error checking for local data:", error);
      return false;
    }
  }

  /**
   * Retry failed inserts after all dependencies have been synced
   */
  private async retryFailedInserts(): Promise<number> {
    const failedInserts = syncService.getFailedInserts();

    if (failedInserts.length === 0) {
      console.log("☁️ No failed inserts to retry");
      return 0;
    }

    console.log(`🔄 Retrying ${failedInserts.length} failed inserts...`);

    let successCount = 0;
    const stillFailed: Array<{
      collectionName: CollectionName;
      doc: FirestoreDocument<any>;
    }> = [];

    for (const { collectionName, doc } of failedInserts) {
      try {
        const tableName = this.getTableNameFromCollection(collectionName);
        if (tableName) {
          console.log(`🔄 Retrying ${tableName}:${doc.id}...`);
          await this.insertCloudDocumentToLocal(tableName, doc);
          successCount++;
        }
      } catch (error) {
        console.error(
          `❌ Retry failed for ${collectionName}:${doc.id}:`,
          error,
        );
        stillFailed.push({ collectionName, doc });
      }
    }

    // Update the failed inserts array with any that still failed
    syncService.clearFailedInserts();
    for (const failedItem of stillFailed) {
      console.warn(
        `⚠️ Document ${failedItem.collectionName}:${failedItem.doc.id} still failing after retry`,
      );
    }

    console.log(
      `🔄 Retry completed: ${successCount}/${failedInserts.length} successful`,
    );
    return successCount;
  }

  /**
   * Get table name from collection name (reverse mapping)
   */
  private getTableNameFromCollection(
    collectionName: CollectionName,
  ): string | null {
    for (const [tableName, colName] of Object.entries(
      this.TABLE_TO_COLLECTION,
    )) {
      if (colName === collectionName) {
        return tableName;
      }
    }
    return null;
  }

  /**
   * Insert a cloud document into the appropriate local table
   */
  private async insertCloudDocumentToLocal(
    tableName: string,
    document: any,
  ): Promise<void> {
    await this.db.ensureInitialized();
    const database = this.db.getDatabase();

    // Convert Firebase document to local format
    const localData = this.convertCloudToLocalFormat(tableName, document);

    switch (tableName) {
      case "transactions": {
        let validCategoryId = localData.categoryId || null;
        if (validCategoryId) {
          const catRow = await database.getFirstAsync(
            "SELECT id FROM categories WHERE id = ?",
            [validCategoryId],
          );
          if (!catRow) validCategoryId = null;
        }
        let validBudgetId = localData.budgetId || null;
        if (validBudgetId) {
          const budRow = await database.getFirstAsync(
            "SELECT id FROM budgets WHERE id = ?",
            [validBudgetId],
          );
          if (!budRow) validBudgetId = null;
        }
        await database.runAsync(
          `INSERT OR REPLACE INTO transactions (id, amount, type, category_id, budget_id, account_id, to_account_id, description, date, note, updated_at, sync_updated_at, deleted, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'synced')`,
          [
            localData.id,
            localData.amount,
            localData.type,
            validCategoryId,
            validBudgetId,
            localData.accountId || "default_cash",
            localData.toAccountId || null,
            localData.description,
            localData.date,
            localData.note,
            localData.updatedAt,
            this.parseTimestampMs(localData.updatedAt) || Date.now(),
          ],
        );
        break;
      }

      case "categories":
        await database.runAsync(
          `INSERT OR REPLACE INTO categories (id, name, type, color, icon, updated_at, sync_updated_at, deleted, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'synced')`,
          [
            localData.id,
            localData.name,
            localData.type,
            localData.color,
            localData.icon,
            localData.updatedAt,
            this.parseTimestampMs(localData.updatedAt) || Date.now(),
          ],
        );
        break;

      case "budgets": {
        let validCategoryId = localData.categoryId || null;
        if (validCategoryId) {
          const catRow = await database.getFirstAsync(
            "SELECT id FROM categories WHERE id = ?",
            [validCategoryId],
          );
          if (!catRow) validCategoryId = null;
        }
        await database.runAsync(
          `INSERT OR REPLACE INTO budgets (id, name, amount, period_type, period_start, category_id, reset_day, updated_at, sync_updated_at, deleted, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'synced')`,
          [
            localData.id,
            localData.name,
            localData.amount,
            localData.periodType,
            localData.periodStart,
            validCategoryId,
            localData.resetDay,
            localData.updatedAt,
            this.parseTimestampMs(localData.updatedAt) || Date.now(),
          ],
        );
        break;
      }

      case "debts": {
        // Use validation to ensure all required fields are present and valid
        const { cleanDebtData } = await import("../utils/validation");
        const cleanedDebt = cleanDebtData(localData);
        let validCategoryId = cleanedDebt.categoryId || null;
        if (validCategoryId) {
          const catRow = await database.getFirstAsync(
            "SELECT id FROM categories WHERE id = ?",
            [validCategoryId],
          );
          if (!catRow) validCategoryId = null;
        }
        let validBudgetId = cleanedDebt.budgetId || null;
        if (validBudgetId) {
          const budRow = await database.getFirstAsync(
            "SELECT id FROM budgets WHERE id = ?",
            [validBudgetId],
          );
          if (!budRow) validBudgetId = null;
        }

        const existingDebt = await database.getFirstAsync<{ id: string }>(
          "SELECT id FROM debts WHERE id = ?",
          [cleanedDebt.id],
        );
        const debtSyncUpdatedAt =
          this.parseTimestampMs(cleanedDebt.updatedAt) || Date.now();

        if (existingDebt) {
          await database.runAsync(
            `UPDATE debts SET
              name = ?, debt_type = ?, amount = ?, total_amount = ?, current_balance = ?,
              monthly_payment = ?, interest_rate = ?, minimum_payment = ?, due_date = ?,
              creditor = ?, description = ?, category_id = ?, budget_id = ?,
              updated_at = ?, sync_updated_at = ?, deleted = 0, sync_status = 'synced'
             WHERE id = ?`,
            [
              cleanedDebt.name,
              cleanedDebt.type || "i_owe",
              cleanedDebt.totalAmount,
              cleanedDebt.totalAmount,
              cleanedDebt.currentBalance,
              cleanedDebt.minimumPayment,
              cleanedDebt.interestRate,
              cleanedDebt.minimumPayment,
              cleanedDebt.dueDate,
              cleanedDebt.creditor,
              cleanedDebt.description,
              validCategoryId,
              validBudgetId,
              cleanedDebt.updatedAt,
              debtSyncUpdatedAt,
              cleanedDebt.id,
            ],
          );
        } else {
          await database.runAsync(
            `INSERT INTO debts (id, name, debt_type, amount, total_amount, current_balance, monthly_payment, interest_rate, minimum_payment, due_date, creditor, description, category_id, budget_id, created_at, updated_at, sync_updated_at, deleted, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'synced')`,
            [
              cleanedDebt.id,
              cleanedDebt.name,
              cleanedDebt.type || "i_owe",
              cleanedDebt.totalAmount,
              cleanedDebt.totalAmount,
              cleanedDebt.currentBalance,
              cleanedDebt.minimumPayment,
              cleanedDebt.interestRate,
              cleanedDebt.minimumPayment,
              cleanedDebt.dueDate,
              cleanedDebt.creditor,
              cleanedDebt.description,
              validCategoryId,
              validBudgetId,
              cleanedDebt.createdAt,
              cleanedDebt.updatedAt,
              debtSyncUpdatedAt,
            ],
          );
        }
        break;
      }

      case "debt_payments":
        await database.runAsync(
          `INSERT OR REPLACE INTO debt_payments (id, debt_id, amount, date, payment_date, principal, interest, note, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            localData.id,
            localData.debtId,
            localData.amount,
            localData.date,
            localData.paymentDate || localData.date,
            localData.principal || 0,
            localData.interest || 0,
            localData.note,
            localData.updatedAt,
          ],
        );
        break;

      case "settings":
        // Handle both legacy key-value format and new structured format
        if (localData.key && localData.value) {
          // Legacy key-value format
          await database.runAsync(
            `INSERT OR REPLACE INTO settings (id, key, value, updated_at)
             VALUES (?, ?, ?, ?)`,
            [localData.id, localData.key, localData.value, localData.updatedAt],
          );
        } else {
          // New structured format with billing period and other settings
          await database.runAsync(
            `INSERT OR REPLACE INTO settings (id, billing_period_start_day, currency, firebase_sync, theme, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              localData.id,
              localData.billingPeriodStartDay ||
                localData.billing_period_start_day ||
                1,
              localData.currency || "USD",
              localData.firebaseSync !== undefined
                ? localData.firebaseSync
                  ? 1
                  : 0
                : localData.firebase_sync || 0,
              localData.theme || "system",
              localData.createdAt ||
                localData.created_at ||
                new Date().toISOString(),
              localData.updatedAt ||
                localData.updated_at ||
                new Date().toISOString(),
            ],
          );
        }
        break;

      case "wallets":
        await database.runAsync(
          `INSERT OR REPLACE INTO wallets (id, name, type, icon, color, initial_balance, is_secret, archived, created_at, updated_at, sync_updated_at, deleted, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            localData.id,
            localData.name,
            localData.type,
            localData.icon || null,
            localData.color || null,
            localData.initialBalance ?? localData.initial_balance ?? 0,
            localData.isSecret || localData.is_secret ? 1 : 0,
            localData.archived ? 1 : 0,
            localData.createdAt || new Date().toISOString(),
            localData.updatedAt || localData.updated_at || Date.now(),
            localData.updatedAt || localData.updated_at || Date.now(),
            localData.deleted ? 1 : 0,
            "synced",
          ],
        );
        break;
    }
  }

  /**
   * Convert local database format to cloud format for Firebase storage
   */
  private convertLocalToCloudFormat(tableName: string, document: any): any {
    // Convert database snake_case to Firebase camelCase and clean up fields
    const baseFields = {
      id: document.id,
      updatedAt: document.updated_at || document.updatedAt || Date.now(),
      createdAt: document.created_at || document.createdAt || Date.now(),
    };

    switch (tableName) {
      case "settings":
        return {
          ...baseFields,
          // Convert snake_case database fields to camelCase for cloud storage
          billingPeriodStartDay:
            document.billing_period_start_day ||
            document.billingPeriodStartDay ||
            1,
          currency: document.currency || "USD",
          firebaseSync:
            document.firebase_sync !== undefined
              ? Boolean(document.firebase_sync)
              : document.firebaseSync || false,
          theme: document.theme || "system",
          // Remove legacy key-value fields if they exist
          key: undefined,
          value: undefined,
        };

      case "transactions":
        return {
          ...baseFields,
          amount: document.amount,
          description: document.description || document.note || "",
          categoryId: document.category_id || document.categoryId || null,
          budgetId: document.budget_id || document.budgetId || null,
          accountId: document.account_id || document.accountId || "default_cash",
          toAccountId: document.to_account_id || document.toAccountId || null,
          type: document.type,
          date: document.date,
          note: document.note || null,
        };

      case "categories":
        return {
          ...baseFields,
          name: document.name,
          type: document.type || "expense",
          color: document.color || "#007AFF",
          icon: document.icon || "folder",
          isDefault:
            document.is_default !== undefined
              ? Boolean(document.is_default)
              : document.isDefault || false,
        };

      case "budgets":
        return {
          ...baseFields,
          categoryId: document.category_id || document.categoryId || null,
          amount: document.amount,
          periodType: document.period_type || document.periodType || document.period || "monthly",
          periodStart: document.period_start || document.periodStart || null,
          resetDay: document.reset_day || document.resetDay || 1,
          name: document.name || "",
        };

      case "debts": {
        const totalAmount =
          document.total_amount !== undefined && document.total_amount !== null
            ? Number(document.total_amount)
            : document.totalAmount !== undefined && document.totalAmount !== null
            ? Number(document.totalAmount)
            : Number(document.amount || 0);
        const currentBalance =
          document.current_balance !== undefined && document.current_balance !== null
            ? Number(document.current_balance)
            : document.currentBalance !== undefined && document.currentBalance !== null
            ? Number(document.currentBalance)
            : totalAmount;
        return {
          ...baseFields,
          name: document.name || "Unnamed Debt",
          type: document.debt_type || document.type || "i_owe",
          totalAmount,
          currentBalance,
          interestRate: document.interest_rate || document.interestRate || 0,
          minimumPayment:
            document.minimum_payment || document.minimumPayment || 0,
          dueDate: document.due_date || document.dueDate || null,
          creditor: document.creditor || null,
          description: document.description || null,
          categoryId: document.category_id || document.categoryId || null,
          budgetId: document.budget_id || document.budgetId || null,
        };
      }

      case "debt_payments":
        return {
          ...baseFields,
          debtId: document.debt_id || document.debtId,
          amount: document.amount,
          date: document.date,
          paymentDate:
            document.payment_date || document.paymentDate || document.date,
          principal: document.principal || 0,
          interest: document.interest || 0,
          note: document.note || null,
        };

      case "wallets":
        return {
          ...baseFields,
          name: document.name || "Wallet",
          type: document.type || "cash",
          icon: document.icon || "wallet-outline",
          color: document.color || "teal",
          initialBalance:
            document.initial_balance !== undefined
              ? document.initial_balance
              : document.initialBalance || 0,
          isSecret:
            document.is_secret !== undefined
              ? Boolean(document.is_secret)
              : Boolean(document.isSecret),
          archived:
            document.archived !== undefined
              ? Boolean(document.archived)
              : Boolean(document.archived),
        };

      default:
        // For unknown tables, return as-is but ensure basic fields
        return {
          ...document,
          updatedAt: document.updated_at || document.updatedAt || Date.now(),
          createdAt: document.created_at || document.createdAt || Date.now(),
        };
    }
  }

  /**
   * Convert cloud document format to local database format
   */
  private convertCloudToLocalFormat(tableName: string, document: any): any {
    // Firebase documents often have nested data structure
    const data = document.data || document;

    // Handle different field name mappings between cloud and local
    const baseFields = {
      id: document.id || data.id || `unknown-${Date.now()}`,
      updatedAt:
        document.updatedAt ||
        data.updatedAt ||
        document.sync_updated_at ||
        data.sync_updated_at ||
        Date.now(),
    };

    // Helper function to ensure required fields have values
    const ensureValue = (value: any, defaultValue: any) => {
      return value !== null && value !== undefined && value !== ""
        ? value
        : defaultValue;
    };

    // Helper function to get value from either document or data (preserving 0 and false)
    const getValue = (field: string, ...alternativeFields: string[]) => {
      let value =
        data[field] !== undefined && data[field] !== null
          ? data[field]
          : document[field];

      // Try alternative field names if primary is not found
      for (const altField of alternativeFields) {
        if (
          (value === undefined || value === null || value === "") &&
          (data[altField] !== undefined || document[altField] !== undefined)
        ) {
          value =
            data[altField] !== undefined && data[altField] !== null
              ? data[altField]
              : document[altField];
        }
      }

      return value;
    };

    switch (tableName) {
      case "transactions":
        return {
          ...baseFields,
          amount: Math.max(ensureValue(getValue("amount"), 1), 0.01), // Must be > 0 due to CHECK constraint
          type: ensureValue(getValue("type"), "expense"),
          categoryId: getValue("categoryId", "category_id") || null, // Allow null since no default categories
          budgetId: getValue("budgetId", "budget_id") || null,
          accountId: getValue("accountId", "account_id") || "default_cash",
          toAccountId: getValue("toAccountId", "to_account_id") || null,
          description: ensureValue(
            getValue("description"),
            "Imported transaction",
          ),
          date: ensureValue(getValue("date"), new Date().toISOString()),
          note: getValue("note") || null,
        };

      case "categories":
        return {
          ...baseFields,
          name: ensureValue(getValue("name"), "Imported Category"),
          type: ensureValue(getValue("type"), "expense"),
          color: getValue("color") || "#6B7280",
          icon: getValue("icon") || null,
        };

      case "budgets":
        return {
          ...baseFields,
          name: ensureValue(getValue("name"), "Imported Budget"),
          amount: ensureValue(getValue("amount"), 1), // Must be >= 0
          periodType: ensureValue(
            getValue("periodType", "period_type"),
            "monthly",
          ),
          periodStart: getValue("periodStart", "period_start") || null,
          categoryId: getValue("categoryId", "category_id") || null,
          resetDay: ensureValue(getValue("resetDay", "reset_day"), 1), // Required NOT NULL field
        };

      case "debts": {
        const totalAmount = Math.max(
          Number(ensureValue(getValue("totalAmount", "total_amount", "amount"), 1)),
          0.01,
        );
        const rawCurrentBalance = getValue("currentBalance", "current_balance");
        const currentBalance =
          rawCurrentBalance !== undefined &&
          rawCurrentBalance !== null &&
          rawCurrentBalance !== "" &&
          !isNaN(Number(rawCurrentBalance))
            ? Math.max(Number(rawCurrentBalance), 0)
            : totalAmount;
        const debtType =
          getValue("type", "debt_type") === "owed_to_me" ? "owed_to_me" : "i_owe";
        return {
          ...baseFields,
          name: ensureValue(getValue("name"), "Imported Debt"),
          type: debtType,
          debt_type: debtType,
          // Map to database snake_case fields for proper storage
          amount: totalAmount, // amount field for compatibility
          total_amount: totalAmount, // total_amount field
          current_balance: currentBalance,
          monthly_payment:
            getValue(
              "monthlyPayment",
              "monthly_payment",
              "minimumPayment",
              "minimum_payment",
            ) || null,
          interest_rate: getValue("interestRate", "interest_rate") || null,
          minimum_payment:
            getValue("minimumPayment", "minimum_payment") || null,
          due_date: getValue("dueDate", "due_date") || null,
          creditor: getValue("creditor") || null,
          description: getValue("description") || null,
          category_id: getValue("categoryId", "category_id") || null,
          budget_id: getValue("budgetId", "budget_id") || null,
          created_at: ensureValue(
            getValue("createdAt", "created_at"),
            new Date().toISOString(),
          ),
          updated_at: ensureValue(
            getValue("updatedAt", "updated_at"),
            new Date().toISOString(),
          ),
        };
      }

      case "debt_payments":
        return {
          ...baseFields,
          debtId: ensureValue(getValue("debtId", "debt_id"), ""),
          amount: Math.max(ensureValue(getValue("amount"), 1), 0.01), // Must be > 0
          date: ensureValue(getValue("date"), new Date().toISOString()),
          paymentDate: ensureValue(
            getValue("paymentDate", "payment_date", "date"),
            new Date().toISOString(),
          ),
          principal: Math.max(getValue("principal") || 0, 0), // Default to 0 if not provided
          interest: Math.max(getValue("interest") || 0, 0), // Default to 0 if not provided
          note: getValue("note") || null,
        };

      case "settings":
        // Handle both legacy key-value format and new structured format
        const hasKeyValue = getValue("key") || getValue("value");

        if (hasKeyValue) {
          // Legacy key-value format
          return {
            ...baseFields,
            key: getValue("key") || "imported_setting",
            value: getValue("value") || "",
          };
        } else {
          // New structured format with proper field mapping
          return {
            ...baseFields,
            // Map cloud camelCase to local snake_case and vice versa
            billing_period_start_day: ensureValue(
              getValue("billingPeriodStartDay", "billing_period_start_day"),
              1,
            ),
            currency: ensureValue(getValue("currency"), "USD"),
            firebase_sync:
              getValue("firebaseSync", "firebase_sync") !== undefined
                ? getValue("firebaseSync", "firebase_sync")
                  ? 1
                  : 0
                : 0,
            theme: ensureValue(getValue("theme"), "system"),
            created_at: ensureValue(
              getValue("createdAt", "created_at"),
              new Date().toISOString(),
            ),
            updated_at: ensureValue(
              getValue("updatedAt", "updated_at"),
              new Date().toISOString(),
            ),
          };
        }

      case "wallets":
        return {
          ...baseFields,
          name: ensureValue(getValue("name"), "Wallet"),
          type: ensureValue(getValue("type"), "cash"),
          icon: getValue("icon") || "wallet-outline",
          color: getValue("color") || "teal",
          initialBalance:
            Number(getValue("initialBalance", "initial_balance")) || 0,
          isSecret: Boolean(getValue("isSecret", "is_secret")),
          archived: Boolean(getValue("archived")),
        };

      default:
        return document;
    }
  }
}

export const offlineFirstSync = new OfflineFirstSync();

// Export conflicts-only sync for external use
export const syncConflictsOnly = () => offlineFirstSync.syncConflictsOnly();
