// Firebase Sync Service with Conflict Resolution
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Unsubscribe,
  DocumentChange,
  DocumentData,
  Firestore,
  serverTimestamp,
} from "firebase/firestore";
import { getFirestoreInstance } from "./firebase";
import { authService } from "./authService";
import { DatabaseManager } from "../database";
import {
  CollectionName,
  COLLECTIONS,
  FirestoreDocument,
  PendingSyncOperation,
  SyncOperation,
} from "../types";
import { getDeviceId } from "../utils/deviceId";
import { addDeviceTracking } from "../utils/deviceTracking";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Callback type for data change notifications
type DataChangeCallback = (
  collectionName: CollectionName,
  operation: "create" | "update" | "delete",
  docId: string,
) => void;

export type DeltaSyncListener = (timestamp: number) => void;
let deltaSyncListener: DeltaSyncListener | null = null;

export function registerDeltaSyncListener(listener: DeltaSyncListener | null): void {
  deltaSyncListener = listener;
}

export class SyncService {
  private static instance: SyncService;
  private db?: Firestore;
  private dbManager = DatabaseManager.getInstance();
  private unsubscribers: Map<CollectionName, Unsubscribe> = new Map();
  private syncQueue: PendingSyncOperation[] = [];
  private isOnline = true;
  private syncInProgress = false;
  private failedInserts: Array<{
    collectionName: CollectionName;
    doc: FirestoreDocument<any>;
  }> = [];
  private dataChangeCallbacks: DataChangeCallback[] = [];
  private deviceId: string = "";
  private lastSyncTimestamp: number = 0;
  private syncInitializedAt: number = 0;

  private constructor() {
    this.deviceId = ""; // Will be initialized async
    this.initializeDeviceId();
  }

  private async initializeDeviceId(): Promise<void> {
    this.deviceId = await getDeviceId();
  }

  // Initialize sync for all collections
  public async initializeSync(): Promise<void> {
    const isAuth = await authService.isAuthenticatedAsync();
    if (!isAuth) {
      throw new Error("User must be authenticated to sync");
    }

    console.log(
      "🔥 Initializing Firebase sync (smart mode - no full data pull)...",
    );

    try {
      // Ensure device ID is initialized
      if (!this.deviceId) {
        this.deviceId = await getDeviceId();
      }

      // Test Firebase connection
      console.log("🔥 Testing Firebase connection...");
      const db = this.getDb();
      console.log("🔥 Firestore instance:", db.app.name);

      // Test authentication
      const user = await authService.getCurrentAuthenticatedUser();
      console.log("🔥 Authenticated user:", user?.uid);

      if (user) {
        // Ensure user document exists (for existing users who might be missing it)
        await this.ensureUserDocument(user);
      }

      // Mark when sync was initialized
      this.syncInitializedAt = Date.now();

      // Start listeners for all collections (this will only listen for NEW changes)
      await this.startSyncListeners();

      // Process any pending operations
      await this.processSyncQueue();

      console.log(
        "🔥 Firebase sync initialized successfully (efficient polling mode - no full data pull)",
      );
    } catch (error) {
      console.error("🔥 Failed to initialize sync:", error);
      throw error;
    }
  }

  /**
   * Ensure user document exists in Firestore (creates it if missing)
   */
  private async ensureUserDocument(user: any): Promise<void> {
    const USER_VERIFIED_KEY = `financy_user_doc_verified_${user.uid}`;

    // Check if we've already verified this user
    try {
      const isVerified = await AsyncStorage.getItem(USER_VERIFIED_KEY);
      if (isVerified === "true") {
        console.log("👤 User document already verified (cached check)");
        return;
      }
    } catch (e) {
      // Ignore storage errors and proceed to check
      console.warn("Failed to check user verified status", e);
    }

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log(
        "📴 Offline: Skipping user document check (will retry later)",
      );
      return;
    }

    try {
      const db = this.getDb();
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnapshot = await getDoc(userDocRef);

      if (!userDocSnapshot.exists()) {
        console.log(
          `👤 User document missing for ${user.uid}, creating it now...`,
        );
        await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          role: "user",
          settings: {
            currency: "USD",
            theme: "dark",
            language: "en",
          },
        });
        console.log("✅ Created missing user document in Firestore");
      } else {
        console.log("👤 User document verified exists");
      }

      // Mark as verified
      await AsyncStorage.setItem(USER_VERIFIED_KEY, "true");
    } catch (error) {
      console.error("❌ Failed to ensure user document:", error);
      // Non-fatal, allow sync to proceed
    }
  }

  /**
   * Manually check for changes across all collections (immediate check)
   */
  public async checkForChanges(): Promise<void> {
    const isAuth = await authService.isAuthenticatedAsync();
    if (!isAuth) {
      throw new Error("User must be authenticated to check for changes");
    }

    console.log("🔍 Manually checking for changes across all collections...");

    try {
      const userId = await authService.requireUserIdAsync();

      // Check each collection for changes
      const checkPromises = Object.values(COLLECTIONS).map((collectionName) =>
        this.pollCollectionForChanges(userId, collectionName),
      );

      await Promise.all(checkPromises);

      console.log("✅ Manual change check completed");
    } catch (error) {
      console.error("❌ Manual change check failed:", error);
      throw error;
    }
  }

  /**
   * Force a full bidirectional sync - pulls all remote data and pushes all local changes
   * This should only be used for initial setup or when explicitly requested by the user
   */
  public async forceFullSync(): Promise<void> {
    const isAuth = await authService.isAuthenticatedAsync();
    if (!isAuth) {
      throw new Error("User must be authenticated to sync");
    }

    console.log(
      "🔄 Starting FULL bidirectional sync (this will pull all remote data)...",
    );

    try {
      // Reset sync initialization timestamp to allow full data pull
      this.syncInitializedAt = 0;

      // Process any pending local operations first
      await this.processSyncQueue();

      // Pull all remote data by re-initializing listeners
      await this.startSyncListeners();

      console.log("✅ Full sync completed successfully");
    } catch (error) {
      console.error("❌ Full sync failed:", error);
      throw error;
    }
  }

  /**
   * Testing helper: apply a remote document locally as if it came from Firestore.
   * This calls the same internal insertion logic but is exposed publicly for tests/tools.
   */
  public async applyRemoteDocumentForTest(
    collectionName: CollectionName,
    docId: string,
    docData: any,
  ): Promise<void> {
    const fakeDoc: FirestoreDocument<any> = {
      id: docId,
      data: docData,
      updatedAt: docData?.updatedAt || Date.now(),
    };

    // Reuse the same internal insertion logic to ensure behavior matches production
    await this.insertLocalDocument(collectionName, fakeDoc);
  }
  // Stop all sync listeners
  public stopSync(): void {
    console.log("Stopping Firebase sync...");

    this.unsubscribers.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.unsubscribers.clear();

    console.log("Firebase sync stopped");
  }

  private getDb(): Firestore {
    if (!this.db) {
      this.db = getFirestoreInstance();
    }
    return this.db;
  }

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Clear the failed inserts array (useful before starting a new sync operation)
   */
  public clearFailedInserts(): void {
    console.log(`🧹 Clearing ${this.failedInserts.length} failed inserts`);
    this.failedInserts = [];
  }

  /**
   * Get the current failed inserts (for retry operations)
   */
  public getFailedInserts(): Array<{
    collectionName: CollectionName;
    doc: FirestoreDocument<any>;
  }> {
    return [...this.failedInserts]; // Return a copy
  }

  /**
   * Register callback for data changes
   */
  public onDataChange(callback: DataChangeCallback): () => void {
    this.dataChangeCallbacks.push(callback);
    console.log(
      `📝 Registered new data change callback. Total callbacks: ${this.dataChangeCallbacks.length}`,
    );

    // Return unsubscribe function
    return () => {
      const index = this.dataChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.dataChangeCallbacks.splice(index, 1);
        console.log(
          `🗑️ Unregistered data change callback. Remaining callbacks: ${this.dataChangeCallbacks.length}`,
        );
      }
    };
  }

  /**
   * Notify callbacks of data changes
   */
  private notifyDataChange(
    collectionName: CollectionName,
    operation: "create" | "update" | "delete",
    docId: string,
  ): void {
    console.log(
      `🔔 Notifying ${this.dataChangeCallbacks.length} callbacks about ${operation} on ${collectionName}/${docId}`,
    );

    this.dataChangeCallbacks.forEach((callback, index) => {
      try {
        console.log(
          `  📞 Calling callback ${index + 1}/${this.dataChangeCallbacks.length}`,
        );
        callback(collectionName, operation, docId);
      } catch (error) {
        console.error(`❌ Error in data change callback ${index + 1}:`, error);
      }
    });

    if (this.dataChangeCallbacks.length === 0) {
      console.warn("⚠️ No callbacks registered for data change notifications!");
    }
  }

  /**
   * Test method to manually trigger notifications (for debugging)
   */
  public testNotification(collectionName: CollectionName = "budgets"): void {
    console.log("🧪 Testing notification system...");
    this.notifyDataChange(collectionName, "update", "test-id-123");
  }

  // Start listeners for all collections
  private async startSyncListeners(): Promise<void> {
    const userId = await authService.requireUserIdAsync();

    // Listen to each collection
    const startPromises = Object.values(COLLECTIONS).map((collectionName) =>
      this.startCollectionListener(userId, collectionName),
    );

    // Start all listeners in parallel
    await Promise.all(startPromises);
  }

  // Start efficient polling for a specific collection (only fetches changes)
  private async startCollectionListener(
    userId: string,
    collectionName: CollectionName,
  ): Promise<void> {
    console.log(
      `🔄 Starting efficient polling for ${collectionName} at path: users/${userId}/${collectionName}`,
    );

    // Run initial sync immediately on app start
    try {
      await this.pollCollectionForChanges(userId, collectionName);
    } catch (error) {
      console.error(`❌ Error in initial poll for ${collectionName}:`, error);
    }

    // Use polling with 10-minute intervals for periodic checks
    const pollInterval = setInterval(async () => {
      try {
        await this.pollCollectionForChanges(userId, collectionName);
      } catch (error) {
        console.error(`❌ Error polling ${collectionName}:`, error);
      }
    }, 600000); // Poll every 10 minutes (600,000ms)

    // Store the interval ID so we can clear it later
    this.unsubscribers.set(collectionName, () => {
      clearInterval(pollInterval);
    });

    console.log(
      `✅ Started efficient polling for ${collectionName} (initial sync + every 10 minutes)`,
    );
  }

  // Poll for changes since last sync timestamp
  private async pollCollectionForChanges(
    userId: string,
    collectionName: CollectionName,
  ): Promise<void> {
    try {
      const collectionRef = collection(
        this.getDb(),
        "users",
        userId,
        collectionName,
      );

      // Get last sync timestamp from settings or use a reasonable default
      const lastSyncTime = await this.getLastSyncTimestamp();

      console.log(
        `🔍 Polling ${collectionName} for changes since ${new Date(lastSyncTime).toISOString()}`,
      );

      // Query only documents modified after last sync
      const changesQuery = query(
        collectionRef,
        where("updatedAt", ">", lastSyncTime),
        orderBy("updatedAt", "desc"),
      );

      const snapshot = await getDocs(changesQuery);

      if (snapshot.docs.length > 0) {
        console.log(
          `� Found ${snapshot.docs.length} changed documents in ${collectionName}`,
        );

        // Process each changed document
        for (const docSnapshot of snapshot.docs) {
          const docData = docSnapshot.data() as FirestoreDocument<any>;
          const docId = docSnapshot.id;

          console.log(
            `🔄 Processing changed document ${collectionName}/${docId}`,
          );

          // Create a mock change object for existing processing logic
          const mockChange = {
            type: "modified" as const,
            doc: docSnapshot,
            oldIndex: -1,
            newIndex: -1,
          } as DocumentChange<DocumentData>;

          await this.handleDocumentChangeWithErrorHandling(
            collectionName,
            mockChange,
          );
        }

        // Update last sync timestamp
        await this.updateLastSyncTimestamp();
      } else {
        console.log(`✅ No changes found in ${collectionName} since last sync`);
      }
    } catch (error) {
      console.error(`❌ Error polling ${collectionName} for changes:`, error);
    }
  }

  // Get the last sync timestamp from local storage
  private async getLastSyncTimestamp(): Promise<number> {
    try {
      const { SettingsRepository } =
        await import("../database/queries/settings");
      const settingsRepo = new SettingsRepository();
      const settings = await settingsRepo.getSettings();

      // Return last sync time or default to 1 hour ago for initial sync
      const defaultTime = Date.now() - 60 * 60 * 1000; // 1 hour ago
      return settings.syncUpdatedAt || defaultTime;
    } catch (error) {
      console.warn("Could not get last sync timestamp, using default:", error);
      return Date.now() - 60 * 60 * 1000; // 1 hour ago
    }
  }

  // Update the last sync timestamp
  private async updateLastSyncTimestamp(): Promise<void> {
    try {
      const { SettingsRepository } =
        await import("../database/queries/settings");
      const settingsRepo = new SettingsRepository();

      // Update the sync timestamp in settings
      await settingsRepo.updateSettings(
        {
          syncUpdatedAt: Date.now(),
        },
        { skipSync: true },
      ); // Don't trigger sync for settings update

      this.lastSyncTimestamp = Date.now();
    } catch (error) {
      console.warn("Could not update last sync timestamp:", error);
    }
  }

  // Add method to pull only conflicted data on demand
  public async syncConflictsOnly(): Promise<void> {
    console.log("🔍 Starting conflicts-only sync...");

    try {
      const userId = await authService.requireUserIdAsync();

      // Check local pending operations and sync only those
      await this.processSyncQueue();

      // Retry failed inserts (dependency conflicts)
      if (this.failedInserts.length > 0) {
        console.log(
          `🔄 Retrying ${this.failedInserts.length} failed inserts...`,
        );
        const toRetry = [...this.failedInserts];
        this.clearFailedInserts();

        for (const { collectionName, doc } of toRetry) {
          try {
            await this.insertLocalDocument(collectionName, doc);
            console.log(`✅ Successfully retried ${collectionName}/${doc.id}`);
          } catch (error) {
            console.error(
              `❌ Retry failed for ${collectionName}/${doc.id}:`,
              error,
            );
            // Don't re-add to failed inserts to avoid infinite loops
          }
        }
      }

      console.log("✅ Conflicts-only sync completed");
    } catch (error) {
      console.error("❌ Conflicts-only sync failed:", error);
      throw error;
    }
  }

  // Handle document changes with error handling for dates
  private async handleDocumentChangeWithErrorHandling(
    collectionName: CollectionName,
    change: DocumentChange<DocumentData>,
  ): Promise<void> {
    try {
      await this.handleDocumentChange(collectionName, change);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorType = error?.constructor?.name || "Error";

      // Provide more informative error logging
      if (
        errorMessage.includes("Date value out of bounds") ||
        errorMessage.includes("RangeError")
      ) {
        console.warn(
          `⚠️ Date parsing error for ${collectionName}/${change.doc.id}: [${errorType}: ${errorMessage}]`,
        );
        console.warn(
          `⚠️ Document data:`,
          JSON.stringify(change.doc.data(), null, 2),
        );
        console.warn(`⚠️ Skipping this document to prevent sync interruption`);
      } else {
        console.error(
          `❌ Error handling ${change.type} for ${collectionName}/${change.doc.id}: [${errorType}: ${errorMessage}]`,
        );

        // For non-date errors, still log but don't interrupt sync
        console.error(
          `❌ Document data:`,
          JSON.stringify(change.doc.data(), null, 2),
        );
      }

      // Don't throw the error - just log it to prevent sync from stopping
    }
  }

  // Handle individual document changes
  private async handleDocumentChange(
    collectionName: CollectionName,
    change: DocumentChange<DocumentData>,
  ): Promise<void> {
    const docData = change.doc.data() as FirestoreDocument<any>;
    const docId = change.doc.id;

    console.log(`📄 ===== FIREBASE DOCUMENT CHANGE =====`);
    console.log(
      `📄 Collection: ${collectionName}, Document: ${docId}, Change: ${change.type}`,
    );
    console.log(`📄 Document metadata:`, {
      fromCache: change.doc.metadata.fromCache,
      hasPendingWrites: change.doc.metadata.hasPendingWrites,
      isLocalWrite:
        change.doc.metadata.hasPendingWrites && change.doc.metadata.fromCache,
    });
    console.log(`📄 Full document data:`, JSON.stringify(docData, null, 2));

    // Skip processing our own local writes that haven't been confirmed by server yet
    if (change.doc.metadata.hasPendingWrites) {
      console.log(
        `⏭️ Skipping document with pending writes (likely our own local change)`,
      );
      return;
    }

    // Ensure device ID is initialized
    if (!this.deviceId) {
      this.deviceId = await getDeviceId();
    }

    // Check if this change was made by the same device
    const lastModifiedBy = docData.data?.lastModifiedBy;
    console.log(`🔍 Device check:`, {
      currentDeviceId: this.deviceId,
      documentLastModifiedBy: lastModifiedBy,
      isSameDevice: lastModifiedBy === this.deviceId,
      hasDeviceInfo: !!lastModifiedBy,
    });

    if (lastModifiedBy && lastModifiedBy === this.deviceId) {
      console.log(`⏭️ SKIPPING: Change from same device (${this.deviceId})`);
      return;
    }

    // If no device info, it might be an old document - be more cautious
    if (!lastModifiedBy) {
      console.log(
        `⚠️ Document has no device info - treating as legacy data from different source`,
      );

      // For legacy documents without device tracking, we'll still apply timestamp-based conflict resolution
      // but with more conservative approach (larger time window to avoid conflicts)
    }

    try {
      if (change.type === "removed") {
        console.log(`🗑️ Processing deletion for ${collectionName}/${docId}`);
        await this.handleRemoteDelete(collectionName, docId);
      } else {
        console.log(`📝 Processing update for ${collectionName}/${docId}`);
        await this.handleRemoteUpdate(collectionName, docId, docData);
      }
      console.log(
        `✅ Successfully handled ${change.type} for ${collectionName}/${docId}`,
      );
    } catch (error) {
      console.error(
        `❌ Error handling ${change.type} for ${collectionName}/${docId}:`,
        error,
      );
    }
  }

  // Handle remote document updates with conflict resolution
  private async handleRemoteUpdate(
    collectionName: CollectionName,
    docId: string,
    remoteDoc: FirestoreDocument<any>,
  ): Promise<void> {
    await this.dbManager.ensureInitialized();

    console.log(`🔍 Checking local existence for ${collectionName}/${docId}`);
    console.log(
      `📥 Raw Firebase data for ${collectionName}/${docId}:`,
      JSON.stringify(remoteDoc, null, 2),
    );
    console.log(`📊 Firebase data structure:`, {
      hasData: !!remoteDoc.data,
      dataKeys: remoteDoc.data ? Object.keys(remoteDoc.data) : [],
      updatedAt: remoteDoc.updatedAt,
      createdAt: remoteDoc.data?.createdAt,
    });

    // Get local version
    const localDoc = await this.getLocalDocument(collectionName, docId);
    console.log(
      `💾 Local document for ${collectionName}/${docId}:`,
      localDoc ? JSON.stringify(localDoc, null, 2) : "NOT FOUND",
    );

    if (!localDoc) {
      // New document from remote - insert locally
      console.log(
        `📥 No local version found, inserting ${collectionName}/${docId} from remote`,
      );
      await this.insertLocalDocument(collectionName, remoteDoc);
      return;
    }

    // Compare timestamps for conflict resolution using safe parsing
    const remoteTime = this.safeParseTimestamp(
      remoteDoc.data?.lastModifiedAt ||
        remoteDoc.updatedAt ||
        remoteDoc.data?.syncUpdatedAt ||
        remoteDoc.data?.createdAt,
    );
    const localTime = localDoc
      ? this.safeParseTimestamp(
          localDoc.sync_updated_at ||
            localDoc.updated_at ||
            localDoc.created_at,
        )
      : 0;

    // Check if this is from the same device (more thorough check)
    const remoteDeviceId = remoteDoc.data?.lastModifiedBy;
    const isSameDevice = remoteDeviceId && remoteDeviceId === this.deviceId;

    // New conflict resolution logic:
    // - If time difference > 10 minutes (600,000ms), ignore device and use newer timestamp
    // - If time difference <= 10 minutes AND different device, always take remote
    // - If same device, skip (to prevent sync loops)
    const timeDifference = Math.abs(remoteTime - localTime);
    const TEN_MINUTES_MS = 10 * 60 * 1000; // 10 minutes in milliseconds
    const isDifferentDevice =
      remoteDeviceId && remoteDeviceId !== this.deviceId;

    let decision: string;
    let shouldSkipDueToSameDevice = false;
    let shouldTakeRemote = false;

    if (isSameDevice) {
      // Same device - always skip to prevent sync loops
      decision = "SKIP_SAME_DEVICE";
      shouldSkipDueToSameDevice = true;
    } else if (timeDifference > TEN_MINUTES_MS) {
      // Time difference > 10 minutes - ignore device, use newer timestamp
      if (remoteTime > localTime) {
        decision = "UPDATE_LOCAL_TIME_DIFF_LARGE";
        shouldTakeRemote = true;
      } else {
        decision = "KEEP_LOCAL_TIME_DIFF_LARGE";
      }
    } else if (isDifferentDevice && timeDifference >= 1) {
      // Different device and any time difference >= 1ms - always take remote
      decision = "UPDATE_LOCAL_DIFFERENT_DEVICE";
      shouldTakeRemote = true;
    } else {
      // Same timestamp or no device tracking - use standard newer timestamp logic
      if (remoteTime > localTime) {
        decision = "UPDATE_LOCAL_TIMESTAMP";
        shouldTakeRemote = true;
      } else {
        decision = "KEEP_LOCAL_TIMESTAMP";
      }
    }

    console.log(`⏰ Conflict resolution for ${collectionName}/${docId}:`, {
      remoteTime: new Date(remoteTime).toISOString(),
      localTime: localDoc ? new Date(localTime).toISOString() : "NO_LOCAL_DOC",
      remoteNewer: remoteTime > localTime,
      timeDifference: timeDifference,
      timeDifferenceMinutes: Math.round((timeDifference / 60000) * 100) / 100,
      isLargeTimeDiff: timeDifference > TEN_MINUTES_MS,
      isSameDevice: isSameDevice,
      isDifferentDevice: isDifferentDevice,
      remoteDeviceId: remoteDeviceId,
      currentDeviceId: this.deviceId,
      hasDeviceTracking: !!remoteDeviceId,
      decision: decision,
      willTakeRemote: shouldTakeRemote,
      willSkip: shouldSkipDueToSameDevice,
      rawRemoteValue: remoteDoc.updatedAt,
      rawLocalValue: localDoc?.sync_updated_at || localDoc?.updated_at,
    });

    if (shouldSkipDueToSameDevice) {
      console.log(
        `⏭️ CONFLICT RESOLUTION: Skipping - change from same device (${this.deviceId})`,
      );
    } else if (shouldTakeRemote) {
      console.log(
        `📝 CONFLICT RESOLUTION: Remote version is newer, updating local ${collectionName}/${docId}`,
      );
      console.log(
        `   Firebase data will be APPLIED:`,
        JSON.stringify(remoteDoc.data, null, 2),
      );
      await this.updateLocalDocument(collectionName, remoteDoc);
    } else if (localTime > remoteTime) {
      console.log(
        `⬆️ CONFLICT RESOLUTION: Local version is newer, pushing ${collectionName}/${docId} to remote`,
      );
      console.log(
        `   Local data will be pushed:`,
        JSON.stringify(localDoc, null, 2),
      );
      await this.pushLocalToRemote(collectionName, localDoc);
    } else {
      console.log(
        `✅ CONFLICT RESOLUTION: Timestamps equal for ${collectionName}/${docId}, no action needed`,
      );
      console.log(
        `   Both versions have same timestamp:`,
        new Date(remoteTime).toISOString(),
      );
    }
  }

  // Handle remote document deletions
  private async handleRemoteDelete(
    collectionName: CollectionName,
    docId: string,
  ): Promise<void> {
    await this.dbManager.ensureInitialized();

    try {
      await this.deleteLocalDocument(collectionName, docId);
      console.log(`Deleted ${collectionName}/${docId} locally`);
    } catch (error) {
      console.error(`Error deleting local ${collectionName}/${docId}:`, error);
    }
  }

  // Push local changes to Firebase
  public async syncLocalChanges(
    collectionName: CollectionName,
    operation: SyncOperation,
    documentId: string,
    data?: any,
  ): Promise<void> {
    // Check authentication using async method that checks both Firebase and stored session
    const isAuthenticated = await authService.isAuthenticatedAsync();
    const user = await authService.getCurrentAuthenticatedUser();

    console.log(`🔄 Sync attempt for ${collectionName}/${operation}:`, {
      isAuthenticated,
      userId: user?.uid || "none",
      hasFirebaseUser: authService.isAuthenticated(),
      hasStoredSession: await authService.hasValidSession(),
    });

    if (!isAuthenticated) {
      console.warn("⚠️ Not authenticated - queueing sync operation");
      this.queueSyncOperation(collectionName, operation, documentId, data);
      return;
    }

    try {
      this.syncInProgress = true;
      console.log(
        `🚀 Starting sync operation: ${collectionName}/${operation}/${documentId}`,
      );
      await this.performSyncOperation(
        collectionName,
        operation,
        documentId,
        data,
      );
      console.log(
        `✅ Sync operation completed: ${collectionName}/${operation}/${documentId}`,
      );
    } catch (error) {
      console.error("❌ Sync operation failed:", error);
      console.error("❌ Error type:", typeof error);
      console.error("❌ Error name:", (error as any)?.name);
      console.error("❌ Error message:", (error as any)?.message);
      console.error("❌ Error code:", (error as any)?.code);
      console.error("❌ Full error object:", JSON.stringify(error, null, 2));
      console.error("❌ Failed operation details:", {
        collectionName,
        operation,
        documentId,
        data,
      });
      // Queue for retry
      this.queueSyncOperation(collectionName, operation, documentId, data);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Safe timestamp parsing to prevent RangeError
  private safeParseTimestamp(timestampValue: any): number {
    if (!timestampValue) return 0;

    try {
      // Handle Firestore Timestamp
      if (
        timestampValue &&
        typeof timestampValue === "object" &&
        "toDate" in timestampValue
      ) {
        return timestampValue.toDate().getTime();
      }

      // Handle epoch timestamp (number)
      if (typeof timestampValue === "number") {
        // Validate timestamp range (1970-2100)
        if (timestampValue > 0 && timestampValue < 4102444800000) {
          // Year 2100
          return timestampValue;
        }
      }

      // Handle string timestamps or dates
      if (typeof timestampValue === "string") {
        // Try parsing as number first (epoch timestamp as string)
        const numericValue = parseInt(timestampValue);
        if (
          !isNaN(numericValue) &&
          numericValue > 0 &&
          numericValue < 4102444800000
        ) {
          return numericValue;
        }

        // Try parsing as date string
        const date = new Date(timestampValue);
        if (
          !isNaN(date.getTime()) &&
          date.getFullYear() > 1900 &&
          date.getFullYear() < 2100
        ) {
          return date.getTime();
        }
      }

      console.warn(
        "Invalid timestamp value, using current time:",
        timestampValue,
      );
      return Date.now();
    } catch (error) {
      console.error(
        "Error parsing timestamp:",
        error,
        "Value:",
        timestampValue,
      );
      return Date.now();
    }
  }

  // Like safeParseTimestamp but return null when the value is invalid instead of using Date.now()
  private safeParseTimestampOrNull(timestampValue: any): number | null {
    if (!timestampValue) return null;

    try {
      // Handle Firestore Timestamp
      if (
        timestampValue &&
        typeof timestampValue === "object" &&
        "toDate" in timestampValue
      ) {
        return timestampValue.toDate().getTime();
      }

      // Handle epoch timestamp (number)
      if (typeof timestampValue === "number") {
        if (timestampValue > 0 && timestampValue < 4102444800000) {
          return timestampValue;
        }
        return null;
      }

      // Handle string timestamps or dates
      if (typeof timestampValue === "string") {
        const numericValue = parseInt(timestampValue);
        if (
          !isNaN(numericValue) &&
          numericValue > 0 &&
          numericValue < 4102444800000
        ) {
          return numericValue;
        }

        const date = new Date(timestampValue);
        if (
          !isNaN(date.getTime()) &&
          date.getFullYear() > 1900 &&
          date.getFullYear() < 2100
        ) {
          return date.getTime();
        }
        return null;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Safe date parsing to prevent RangeError
  private parseFirebaseDate(dateValue: any): string | null {
    if (!dateValue) return null;

    try {
      // Handle Firestore Timestamp
      if (dateValue && typeof dateValue === "object" && "toDate" in dateValue) {
        return dateValue.toDate().toISOString();
      }

      // Handle epoch timestamp (number)
      if (typeof dateValue === "number") {
        // Check if it's a reasonable timestamp (not too far in past/future)
        const date = new Date(dateValue);
        if (
          date.getTime() > 0 &&
          date.getFullYear() > 1900 &&
          date.getFullYear() < 2100
        ) {
          return date.toISOString();
        }
      }

      // Handle string dates
      if (typeof dateValue === "string") {
        const date = new Date(dateValue);
        if (
          !isNaN(date.getTime()) &&
          date.getFullYear() > 1900 &&
          date.getFullYear() < 2100
        ) {
          return date.toISOString();
        }
      }

      console.warn("Invalid date value:", dateValue);
      return null;
    } catch (error) {
      console.error("Error parsing Firebase date:", error, "Value:", dateValue);
      return null;
    }
  }

  // Clean data for Firestore (remove undefined values and fix dates)
  private cleanDataForFirestore(data: any): any {
    if (data === null || data === undefined) {
      return null;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.cleanDataForFirestore(item));
    }

    if (typeof data === "object") {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          // Handle date fields safely - comprehensive list of date field patterns
          const isDateField =
            key.includes("date") ||
            key.includes("Date") ||
            key.includes("At") ||
            key === "createdAt" ||
            key === "updatedAt" ||
            key === "created_at" ||
            key === "updated_at" ||
            key === "sync_updated_at" ||
            key === "duplicatedAt" ||
            key === "dueDate" ||
            key === "paymentDate";

          if (isDateField) {
            const parsedDate = this.parseFirebaseDate(value);
            if (parsedDate) {
              cleaned[key] = parsedDate;
            } else {
              // If date parsing fails completely, use current time as fallback for required date fields
              if (key === "createdAt" || key === "created_at") {
                cleaned[key] = new Date().toISOString();
                console.warn(
                  `Using current time as fallback for ${key} in document`,
                );
              }
              // For other date fields, just skip them if they can't be parsed
            }
          } else {
            cleaned[key] = this.cleanDataForFirestore(value);
          }
        }
      }
      return cleaned;
    }

    return data;
  }

  // Perform the actual sync operation
  private async performSyncOperation(
    collectionName: CollectionName,
    operation: SyncOperation,
    documentId: string,
    data?: any,
  ): Promise<void> {
    const userId = await authService.requireUserIdAsync();
    const docPath = `users/${userId}/${collectionName}/${documentId}`;
    const docRef = doc(
      this.getDb(),
      "users",
      userId,
      collectionName,
      documentId,
    );

    console.log(`📍 Firebase document path: ${docPath}`);
    console.log(`📍 User ID: ${userId}`);
    console.log(`📍 Collection: ${collectionName}`);
    console.log(`📍 Document ID: ${documentId}`);

    switch (operation) {
      case "create":
      case "update":
        // Clean the data to remove undefined values
        const cleanedData = this.cleanDataForFirestore(data);

        // Add device tracking to the data
        const dataWithDeviceTracking = await addDeviceTracking(cleanedData);

        const syncDoc: FirestoreDocument<any> = {
          id: documentId,
          data: dataWithDeviceTracking,
          updatedAt: Date.now(),
        };

        console.log(`📦 Sending to Firestore:`, syncDoc);
        console.log(`🔗 Document reference path:`, docRef.path);

        try {
          const result = await setDoc(docRef, syncDoc, { merge: true });
          console.log(`✅ setDoc result:`, result);
          console.log(
            `✅ Synced ${operation} for ${collectionName}/${documentId} to path: ${docPath}`,
          );
        } catch (fireError) {
          console.error(
            `❌ Firestore setDoc failed for ${collectionName}/${documentId}:`,
            fireError,
          );
          throw fireError;
        }

        // Verify the write by attempting to read it back
        try {
          const snapshot = await getDoc(docRef);
          if (snapshot.exists()) {
            console.log(
              `✅ Verification: Document exists in Firestore:`,
              snapshot.data(),
            );
          } else {
            console.error(
              `❌ Verification failed: Document not found after write`,
            );
          }
        } catch (readError) {
          console.error(`❌ Verification read failed:`, readError);
        }
        break;

      case "delete":
        // Hard delete - completely remove the document
        console.log(`🗑️ Hard deleting document from Firestore`);
        await deleteDoc(docRef);
        console.log(
          `✅ Synced delete for ${collectionName}/${documentId} to path: ${docPath}`,
        );
        break;
    }
  }

  // Queue sync operation for later
  private queueSyncOperation(
    collectionName: CollectionName,
    operation: SyncOperation,
    documentId: string,
    data?: any,
  ): void {
    const syncOp: PendingSyncOperation = {
      id: `${Date.now()}_${Math.random()}`,
      collection: collectionName,
      documentId,
      operation,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.syncQueue.push(syncOp);
    console.log(`Queued ${operation} for ${collectionName}/${documentId}`);
  }

  // Process queued sync operations
  private async processSyncQueue(): Promise<void> {
    const isAuth = await authService.isAuthenticatedAsync();
    if (this.syncQueue.length === 0 || !isAuth) {
      return;
    }

    console.log(`Processing ${this.syncQueue.length} queued sync operations`);
    const operations = [...this.syncQueue];
    this.syncQueue = [];

    for (const operation of operations) {
      try {
        await this.performSyncOperation(
          operation.collection as CollectionName,
          operation.operation,
          operation.documentId,
          operation.data,
        );
      } catch (error) {
        console.error("Failed to process queued operation:", error);

        // Re-queue with retry limit
        if (operation.retryCount < 3) {
          operation.retryCount++;
          this.syncQueue.push(operation);
        }
      }
    }
  }

  // Helper methods for local database operations
  private async getLocalDocument(
    collectionName: CollectionName,
    docId: string,
  ): Promise<any> {
    const db = this.dbManager.getDatabase();
    const tableName = this.getTableName(collectionName);

    const result = await db.getFirstAsync(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [docId],
    );

    return result;
  }

  private async insertLocalDocument(
    collectionName: CollectionName,
    doc: FirestoreDocument<any>,
  ): Promise<void> {
    console.log(
      `📥 Inserting ${collectionName}/${doc.id} from Firestore to local DB`,
    );

    try {
      // Prepare data with the document ID, removing undefined values
      const cleanData = this.cleanDataForFirestore(doc.data);
      const dataWithId = { ...cleanData, id: doc.id };

      switch (collectionName) {
        case "transactions":
          console.log(`💰 Processing transaction for local insertion:`);
          console.log(
            `  Raw Firebase doc.data:`,
            JSON.stringify(doc.data, null, 2),
          );
          console.log(
            `  Cleaned dataWithId:`,
            JSON.stringify(dataWithId, null, 2),
          );
          console.log(`  LinkedBillId field mapping check:`, {
            hasLinkedBillId: !!dataWithId.linkedBillId,
            hasLinked_bill_id: !!dataWithId.linked_bill_id,
            linkedBillIdValue: dataWithId.linkedBillId,
            linked_bill_idValue: dataWithId.linked_bill_id,
            allTransactionKeys: Object.keys(dataWithId),
          });

          // Ensure proper field mapping for Firebase -> Local conversion
          const mappedTransactionData = {
            ...dataWithId,
            // Handle both possible field names from Firebase
            linkedBillId: dataWithId.linkedBillId || dataWithId.linked_bill_id,
            linkedDebtPaymentId:
              dataWithId.linkedDebtPaymentId ||
              dataWithId.linked_debt_payment_id,
            categoryId: dataWithId.categoryId || dataWithId.category_id,
            budgetId: dataWithId.budgetId || dataWithId.budget_id,
            accountId:
              dataWithId.accountId ||
              dataWithId.account_id ||
              "default_cash",
            toAccountId: dataWithId.toAccountId || dataWithId.to_account_id || null,
          };

          console.log(
            `  Final mapped transaction data:`,
            JSON.stringify(mappedTransactionData, null, 2),
          );

          // Insert transaction but skip logging back to sync_log to avoid loops
          await new (
            await import("../database/queries/transactions")
          ).TransactionRepository().createTransaction(
            mappedTransactionData as any,
            {
              skipSync: true,
              useProvidedId: dataWithId.id,
            },
          );
          break;

        case "budgets":
          console.log(`📊 Processing budget for local insertion:`);
          console.log(`  Raw dataWithId:`, JSON.stringify(dataWithId, null, 2));
          console.log(`  Data transformation check:`, {
            hasId: !!dataWithId.id,
            hasName: !!dataWithId.name,
            hasAmount: !!dataWithId.amount,
            hasCurrentBalance: !!dataWithId.currentBalance,
            hasResetDay: !!dataWithId.resetDay,
            allRequiredFields: !!(
              dataWithId.id &&
              dataWithId.name &&
              dataWithId.amount
            ),
          });

          const budgetRepo = new (
            await import("../database/queries/budgets")
          ).BudgetRepository();
          console.log(`📊 Calling budgetRepo.createBudget with:`, dataWithId);
          await budgetRepo.createBudget(dataWithId as any, {
            skipSync: true,
            useProvidedId: dataWithId.id,
          });
          console.log(`✅ Budget insertion completed successfully`);
          break;

        case "categories":
          console.log(`🏷️ Processing category for local insertion:`);
          console.log(`  Raw dataWithId:`, JSON.stringify(dataWithId, null, 2));

          // Ensure category has required fields with safe defaults
          const safeCategory = {
            ...dataWithId,
            entryCount: Number(dataWithId.entryCount) || 0,
            updatedAt: dataWithId.updatedAt || Date.now(),
            createdAt: dataWithId.createdAt || new Date().toISOString(),
          };

          const { entityManager: em } = await import("./EntityManager");
          console.log(`🏷️ Calling category create with skipSync`);
          if (em.createCategoryFromSync) {
            await em.createCategoryFromSync(dataWithId as any);
          } else {
            await new (
              await import("../database/queries/categories")
            ).CategoryRepository().createCategory(safeCategory as any, {
              skipSync: true,
              useProvidedId: dataWithId.id,
            });
          }
          console.log(`✅ Category insertion completed successfully`);
          break;

        case "wallets":
          console.log(`👛 Processing wallet for local insertion:`);
          const walletRepo = new (
            await import("../database/queries/wallets")
          ).WalletRepository();
          await walletRepo.createWallet(
            {
              name: dataWithId.name || "Wallet",
              type: dataWithId.type || "cash",
              icon: dataWithId.icon,
              color: dataWithId.color,
              initialBalance: Number(dataWithId.initialBalance) || 0,
              isSecret: Boolean(dataWithId.isSecret),
              archived: Boolean(dataWithId.archived),
            },
            {
              skipSync: true,
              useProvidedId: dataWithId.id,
            },
          );
          console.log(`✅ Wallet insertion completed successfully`);
          break;

        case "debts":
          console.log(`💳 Processing debt for local insertion:`);
          console.log(`  Raw dataWithId:`, JSON.stringify(dataWithId, null, 2));

          // Use DebtRepository directly to ensure we pass skipSync and useProvidedId
          // so the repository will not create a sync_log entry and will use the remote id.
          const debtRepo = new (
            await import("../database/queries/debts")
          ).DebtRepository();
          // Mark as coming from sync; createDebt will honor skipSync and useProvidedId
          await debtRepo.createDebt(dataWithId as any, {
            skipSync: true,
            useProvidedId: dataWithId.id,
          });
          console.log(`✅ Debt insertion completed successfully`);
          break;

        case "debt_payments":
          console.log(`💰 Processing debt payment for local insertion:`);
          console.log(`  Raw dataWithId:`, JSON.stringify(dataWithId, null, 2));

          // Use validation to clean debt payment data and ensure required fields
          const { cleanDebtPaymentData } = await import("../utils/validation");
          const safeDebtPayment = cleanDebtPaymentData(dataWithId);
          safeDebtPayment.syncStatus = "synced"; // Mark as synced since it's coming from Firebase

          // Debt payments: call DebtRepository.makePayment with skipSync to avoid re-logging
          await new (
            await import("../database/queries/debts")
          ).DebtRepository().makePayment(safeDebtPayment as any, {
            skipSync: true,
            useProvidedId: dataWithId.id,
          });
          console.log(`✅ Debt payment insertion completed successfully`);
          break;

        case "settings":
          console.log(`⚙️ Processing settings for local insertion:`);
          console.log(`  Raw dataWithId:`, JSON.stringify(dataWithId, null, 2));

          // Use validation to clean settings data
          const { cleanSettingsData } = await import("../utils/validation");
          const safeSettings = cleanSettingsData(dataWithId);
          safeSettings.syncStatus = "synced"; // Mark as synced since it's coming from Firebase

          const settingsRepo = new (
            await import("../database/queries/settings")
          ).SettingsRepository();
          console.log(
            `⚙️ Calling settingsRepo.updateSettings with:`,
            safeSettings,
          );

          // For settings, we need to use updateSettings since there's only one settings record
          const settingsUpdate = {
            billingPeriodStartDay: safeSettings.billingPeriodStartDay,
            currency: safeSettings.currency,
            firebaseSync: safeSettings.firebaseSync,
            theme: safeSettings.theme,
            syncUpdatedAt: safeSettings.syncUpdatedAt,
            syncStatus: safeSettings.syncStatus as
              | "pending"
              | "synced"
              | "error",
          };

          // Use updateSettings with skipSync to avoid creating a sync_log entry for this metadata update
          await settingsRepo.updateSettings(settingsUpdate, { skipSync: true });
          console.log(`✅ Settings insertion completed successfully`);
          break;

        default:
          console.warn(`Unknown collection for insert: ${collectionName}`);
          return;
      }
      console.log(`✅ Successfully inserted ${collectionName}/${doc.id}`);

      // Notify Redux store about the data change
      this.notifyDataChange(collectionName, "create", doc.id);
    } catch (error) {
      // Check if this is a constraint error (duplicate ID or foreign key)
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.toLowerCase().includes("unique constraint") ||
        errorMessage.toLowerCase().includes("primary key")
      ) {
        console.log(
          `⚠️ Document ${collectionName}/${doc.id} already exists locally, treating as update`,
        );
        await this.updateLocalDocument(collectionName, doc);
      } else if (errorMessage.toLowerCase().includes("foreign key")) {
        console.warn(
          `⚠️ Foreign key constraint failed for ${collectionName}/${doc.id}. Will retry after dependencies are synced.`,
        );
        console.warn(`⚠️ Data:`, doc.data);
        // Store for retry after dependencies are synced
        this.failedInserts.push({ collectionName, doc });
        return; // Don't throw, will retry later
      } else {
        console.error(`❌ Error inserting ${collectionName}/${doc.id}:`, error);
        throw error;
      }
    }
  }

  private async updateLocalDocument(
    collectionName: CollectionName,
    doc: FirestoreDocument<any>,
  ): Promise<void> {
    console.log(
      `📝 Updating ${collectionName}/${doc.id} from Firestore to local DB`,
    );

    try {
      // Clean data with safe date parsing for all entities
      const cleanData = this.cleanDataForFirestore(doc.data);

      switch (collectionName) {
        case "transactions":
          console.log(`💰 Processing transaction for local update:`);
          console.log(
            `  Raw Firebase doc.data:`,
            JSON.stringify(doc.data, null, 2),
          );
          console.log(`  Cleaned data:`, JSON.stringify(cleanData, null, 2));

          // Ensure proper field mapping for Firebase -> Local conversion
          const mappedUpdateData = {
            ...cleanData,
            // Handle both possible field names from Firebase
            linkedBillId: cleanData.linkedBillId || cleanData.linked_bill_id,
            linkedDebtPaymentId:
              cleanData.linkedDebtPaymentId || cleanData.linked_debt_payment_id,
            categoryId: cleanData.categoryId || cleanData.category_id,
            budgetId: cleanData.budgetId || cleanData.budget_id,
            accountId: cleanData.accountId || cleanData.account_id,
            toAccountId: cleanData.toAccountId || cleanData.to_account_id || null,
          };

          console.log(
            `  Final mapped update data:`,
            JSON.stringify(mappedUpdateData, null, 2),
          );

          const transactionRepo = new (
            await import("../database/queries/transactions")
          ).TransactionRepository();
          await transactionRepo.updateTransaction(
            doc.id,
            mappedUpdateData as any,
            { skipSync: true },
          );
          break;

        case "budgets":
          console.log(`📊 Processing budget for local update:`);
          console.log(`  Document ID:`, doc.id);
          console.log(`  Raw doc.data:`, JSON.stringify(doc.data, null, 2));
          console.log(`  Cleaned data:`, JSON.stringify(cleanData, null, 2));
          console.log(`  Update data validation:`, {
            hasValidId: !!doc.id,
            hasData: !!doc.data,
            dataKeys: doc.data ? Object.keys(doc.data) : [],
            hasRequiredFields: !!(doc.data?.name && doc.data?.amount),
          });

          const budgetRepo = new (
            await import("../database/queries/budgets")
          ).BudgetRepository();
          console.log(
            `📊 Calling budgetRepo.updateBudget with ID: ${doc.id} and data:`,
            doc.data,
          );
          await budgetRepo.updateBudget(doc.id, doc.data as any, {
            skipSync: true,
          });
          console.log(`✅ Budget update completed successfully`);
          break;

        case "categories":
          const categoryRepo = new (
            await import("../database/queries/categories")
          ).CategoryRepository();
          await categoryRepo.updateCategory(doc.id, doc.data as any, {
            skipSync: true,
          });
          break;

        case "debts":
          const debtRepo = new (
            await import("../database/queries/debts")
          ).DebtRepository();
          await debtRepo.updateDebt(doc.id, doc.data as any, {
            skipSync: true,
          });
          break;

        case "debt_payments":
          const debtPaymentRepo = new (
            await import("../database/queries/debts")
          ).DebtRepository();
          // Use updatePayment if present, otherwise fall back to updatePaymentAndTransaction
          if (debtPaymentRepo.updatePayment) {
            await debtPaymentRepo.updatePayment(doc.id, doc.data as any, {
              skipSync: true,
            });
          } else {
            await debtPaymentRepo.updatePaymentAndTransaction(
              doc.id,
              doc.data as any,
            );
          }
          break;

        case "wallets":
          const walletUpdateRepo = new (
            await import("../database/queries/wallets")
          ).WalletRepository();
          await walletUpdateRepo.updateWallet(doc.id, doc.data as any, {
            skipSync: true,
          });
          break;

        default:
          console.warn(`Unknown collection for update: ${collectionName}`);
      }
      console.log(`✅ Successfully updated ${collectionName}/${doc.id}`);

      // Notify Redux store about the data change
      this.notifyDataChange(collectionName, "update", doc.id);
    } catch (error) {
      console.error(`❌ Error updating ${collectionName}/${doc.id}:`, error);
    }
  }

  private async deleteLocalDocument(
    collectionName: CollectionName,
    docId: string,
  ): Promise<void> {
    console.log(`🗑️ Deleting ${collectionName}/${docId} from local DB`);

    try {
      // First check if the document exists locally
      const localDoc = await this.getLocalDocument(collectionName, docId);
      if (!localDoc) {
        console.log(
          `⚠️ Document ${collectionName}/${docId} not found locally - already deleted or never existed`,
        );
        return; // Not an error - document is already gone
      }

      switch (collectionName) {
        case "transactions":
          const transactionRepo = new (
            await import("../database/queries/transactions")
          ).TransactionRepository();
          await transactionRepo.deleteTransaction(docId, { skipSync: true });
          break;

        case "budgets":
          const budgetRepo = new (
            await import("../database/queries/budgets")
          ).BudgetRepository();
          await budgetRepo.deleteBudget(docId, { skipSync: true });
          break;

        case "categories":
          const categoryRepo = new (
            await import("../database/queries/categories")
          ).CategoryRepository();
          await categoryRepo.deleteCategory(docId, { skipSync: true });
          break;

        case "debts":
          const debtRepo = new (
            await import("../database/queries/debts")
          ).DebtRepository();
          await debtRepo.deleteDebt(docId, { skipSync: true });
          break;

        case "debt_payments":
          const debtPaymentRepo = new (
            await import("../database/queries/debts")
          ).DebtRepository();
          await debtPaymentRepo.deletePayment(docId, { skipSync: true });
          break;

        case "wallets":
          const walletDeleteRepo = new (
            await import("../database/queries/wallets")
          ).WalletRepository();
          await walletDeleteRepo.deleteWallet(docId, { skipSync: true });
          break;

        default:
          console.warn(`Unknown collection for delete: ${collectionName}`);
          return;
      }
      console.log(`✅ Successfully deleted ${collectionName}/${docId}`);

      // Notify Redux store about the data change
      this.notifyDataChange(collectionName, "delete", docId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.toLowerCase().includes("not found") ||
        errorMessage.toLowerCase().includes("no transaction found") ||
        errorMessage.toLowerCase().includes("does not exist")
      ) {
        console.log(
          `⚠️ Document ${collectionName}/${docId} was already deleted or never existed locally`,
        );
        // This is not an error - the goal (document not existing) is achieved
      } else {
        console.error(`❌ Error deleting ${collectionName}/${docId}:`, error);
      }
    }
  }

  private async pushLocalToRemote(
    collectionName: CollectionName,
    localDoc: any,
  ): Promise<void> {
    console.log(
      `⬆️ Pushing local ${collectionName}/${localDoc.id} to Firestore`,
    );

    try {
      await this.performSyncOperation(
        collectionName,
        "update",
        localDoc.id,
        localDoc,
      );
      console.log(
        `✅ Successfully pushed ${collectionName}/${localDoc.id} to Firestore`,
      );
    } catch (error) {
      console.error(
        `❌ Error pushing local ${collectionName}/${localDoc.id} to remote:`,
        error,
      );
    }
  }

  // Map collection names to table names
  private getTableName(collectionName: CollectionName): string {
    const mapping: Record<CollectionName, string> = {
      [COLLECTIONS.TRANSACTIONS]: "transactions",
      [COLLECTIONS.CATEGORIES]: "categories",
      [COLLECTIONS.BUDGETS]: "budgets",
      [COLLECTIONS.DEBTS]: "debts",
      [COLLECTIONS.DEBT_PAYMENTS]: "debt_payments",
      [COLLECTIONS.SETTINGS]: "settings",
      [COLLECTIONS.WALLETS]: "wallets",
    };

    return mapping[collectionName];
  }

  // Handle sync errors
  private handleSyncError(error: any): void {
    console.error("Sync error:", error);
    // Could implement retry logic, offline mode, etc.
  }

  // Get sync status
  public getSyncStatus() {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      pendingOperations: this.syncQueue.length,
      isAuthenticated: authService.isAuthenticated(),
    };
  }

  // Test Firebase connectivity and permissions
  public async testFirebaseConnection(): Promise<void> {
    try {
      console.log("🧪 Starting Firebase connection test...");

      const user = await authService.getCurrentAuthenticatedUser();
      if (!user) {
        throw new Error("No authenticated user found");
      }

      const testDocRef = doc(
        this.getDb(),
        "users",
        user.uid,
        "test",
        "connectivity-test",
      );
      const testData = {
        timestamp: Date.now(),
        message: "Firebase connectivity test",
        userId: user.uid,
      };

      console.log("🧪 Writing test document...");
      await setDoc(testDocRef, testData);

      console.log("🧪 Reading test document back...");
      const snapshot = await getDoc(testDocRef);

      if (snapshot.exists()) {
        console.log("✅ Firebase connection test PASSED!");
        console.log("✅ Test data:", snapshot.data());

        // Clean up test document
        await deleteDoc(testDocRef);
        console.log("🧹 Test document cleaned up");
      } else {
        throw new Error("Test document was not found after write");
      }
    } catch (error) {
      console.error("❌ Firebase connection test FAILED:", error);
      throw error;
    }
  }

  /**
   * Get all documents from a specific collection - used for initial cloud pull
   */
  public async getAllDocumentsFromCollection(
    collectionName: CollectionName,
  ): Promise<any[]> {
    try {
      const user = await authService.getCurrentAuthenticatedUser();
      if (!user) {
        throw new Error("User must be authenticated to fetch cloud data");
      }

      const collectionRef = collection(
        this.getDb(),
        "users",
        user.uid,
        collectionName,
      );
      const q = query(collectionRef, orderBy("updatedAt", "desc"));

      console.log(`☁️ Fetching all documents from ${collectionName}...`);

      // Use getDocs for one-time fetch
      const snapshot = await getDocs(q);

      const documents: any[] = [];
      snapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      console.log(
        `☁️ Retrieved ${documents.length} documents from ${collectionName}`,
      );
      return documents;
    } catch (error) {
      console.error(
        `❌ Failed to get documents from ${collectionName}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Perform a delta sync: fetch only documents whose timestamps are newer than
   * the provided lastAttempt (or the stored settings marker if omitted).
   * After a successful connection attempt (regardless of returned data),
   * store the current timestamp in local settings as the new last-attempt marker.
   */
  public async performDeltaSync(lastAttempt?: number): Promise<void> {
    try {
      const settingsRepo = new (
        await import("../database/queries/settings")
      ).SettingsRepository();
      // Determine lastAttempt - prefer provided value, then settings table, then 0
      if (lastAttempt === undefined || lastAttempt === null) {
        try {
          const settings = await settingsRepo.getSettings();
          lastAttempt = settings.syncUpdatedAt || 0;
        } catch (err) {
          console.warn(
            "Could not read settings.syncUpdatedAt, defaulting to 0",
            err,
          );
          lastAttempt = 0;
        }
      }

      console.log(
        `🔁 Starting delta sync (since: ${new Date(lastAttempt).toISOString()})`,
      );

      // Ensure user and firestore available
      const user = await authService.getCurrentAuthenticatedUser();
      if (!user) {
        console.warn("User not authenticated - skipping delta sync");
        return;
      }

      const db = this.getDb();

      // For each collection, query documents where updatedAt > lastAttempt
      for (const collectionName of Object.values(COLLECTIONS)) {
        try {
          const collectionRef = collection(
            db,
            "users",
            user.uid,
            collectionName,
          );

          console.log(user.uid);

          // Prefer top-level updatedAt field for querying. Firestore requires indexed fields
          const q = query(collectionRef, where("updatedAt", ">", lastAttempt));
          console.log(
            `☁️ Querying ${collectionName} for updates since ${lastAttempt}`,
          );
          const snapshot = await getDocs(q);

          console.log(
            `☁️ Delta query for ${collectionName} returned ${snapshot.docs.length} docs`,
          );

          for (const docSnap of snapshot.docs) {
            const docData = docSnap.data() as FirestoreDocument<any>;
            const docId = docSnap.id;

            // Determine a robust remote updated timestamp from multiple possible fields
            const candidate =
              (docData as any).updatedAt ||
              (docData as any).syncUpdatedAt ||
              (docData as any).updated_at ||
              (docData as any).createdAt ||
              null;
            // Firestore provides snapshot.updateTime which is a reliable server timestamp when available
            const snapshotTime = (docSnap as any).updateTime
              ? (docSnap as any).updateTime.toMillis
                ? (docSnap as any).updateTime.toMillis()
                : null
              : null;

            let remoteTime = this.safeParseTimestampOrNull(candidate);
            if (remoteTime === null && snapshotTime) {
              remoteTime = snapshotTime as number;
            }

            // If we couldn't determine a valid remote timestamp, skip this doc (avoid treating it as newer)
            if (remoteTime === null) {
              console.warn(
                `⚠️ Skipping delta ${collectionName}/${docId} because remote updatedAt could not be parsed`,
              );
              continue;
            }

            // Only process documents whose remote updatedAt is newer than our lastAttempt marker
            if (remoteTime <= (lastAttempt || 0)) {
              console.log(
                `↩️ Skipping ${collectionName}/${docId} - remote updatedAt (${new Date(remoteTime).toISOString()}) <= lastAttempt (${new Date(
                  lastAttempt || 0,
                ).toISOString()})`,
              );
              continue;
            }

            // Use the existing handlers to apply document changes locally
            console.log(
              `🔄 Processing delta ${collectionName}/${docId} (remote updatedAt=${new Date(remoteTime).toISOString()})`,
            );
            try {
              const deletedFlag = (docData as any).deleted;
              const deleted =
                deletedFlag === true ||
                deletedFlag === 1 ||
                deletedFlag === "1";
              if (deleted) {
                await this.handleRemoteDelete(
                  collectionName as CollectionName,
                  docId,
                );
              } else {
                await this.handleRemoteUpdate(
                  collectionName as CollectionName,
                  docId,
                  docData,
                );
              }
            } catch (innerErr) {
              console.error(
                `❌ Error processing delta doc ${collectionName}/${docId}:`,
                innerErr,
              );
            }
          }
        } catch (colErr) {
          console.error(
            `❌ Error querying collection ${collectionName} during delta sync:`,
            colErr,
          );
          // Continue with other collections even if one fails
        }
      }

      // After attempting to contact Firestore successfully, update the local marker
      const now = Date.now();
      try {
        await settingsRepo.setLastSyncAttempt(now);
      } catch (sErr) {
        console.warn("Failed to update local last sync attempt marker:", sErr);
      }

      // Update Redux slice if available
      try {
        if (deltaSyncListener) {
          deltaSyncListener(now);
        }
      } catch (reduxErr) {
        // Not critical - just log
        console.warn("Could not dispatch lastSync to Redux store:", reduxErr);
      }

      console.log(
        `✅ Delta sync completed, marker updated to ${new Date(now).toISOString()}`,
      );
    } catch (error) {
      console.error("❌ performDeltaSync failed:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const syncService = SyncService.getInstance();
