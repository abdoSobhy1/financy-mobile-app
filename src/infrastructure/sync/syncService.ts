// Firebase Sync Service with Conflict Resolution
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  getDocsFromServer,
  query,
  where,
  orderBy,
  Unsubscribe,
  DocumentChange,
  DocumentData,
  Firestore,
  serverTimestamp,
} from "firebase/firestore";
import { getFirestoreInstance } from "../firebase/client";
import { authService } from "../../features/auth/services/authService";
import { DatabaseManager } from "../database";
import {
  CollectionName,
  COLLECTIONS,
  FirestoreDocument,
  PendingSyncOperation,
  SyncOperation,
} from "../../shared/types";
import { getDeviceId } from "../device/deviceId";
import { addDeviceTracking } from "../device/deviceTracking";
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
  // Bumped every time sync is stopped; in-flight polls compare against it and drop their results
  private syncGeneration: number = 0;

  private constructor() {
    this.deviceId = ""; // Will be initialized async
    this.initializeDeviceId();
  }

  private async initializeDeviceId(): Promise<void> {
    this.deviceId = await getDeviceId();
  }

  // Initialize sync for all collections
  public async initializeSync(): Promise<void> {
    const canSync = await authService.isCloudSyncAllowedAsync();
    if (!canSync) {
      return;
    }

    try {
      // Ensure device ID is initialized
      if (!this.deviceId) {
        this.deviceId = await getDeviceId();
      }
      const db = this.getDb();

      // Test authentication
      const user = await authService.getCurrentAuthenticatedUser();

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
        return;
      }
    } catch (e) {
      // Ignore storage errors and proceed to check
      console.warn("Failed to check user verified status", e);
    }

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return;
    }

    try {
      const db = this.getDb();
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnapshot = await getDoc(userDocRef);

      if (!userDocSnapshot.exists()) {
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
      } else {
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
    const canSync = await authService.isCloudSyncAllowedAsync();
    if (!canSync) {
      return;
    }

    try {
      const userId = await authService.requireUserIdAsync();

      // Check each collection for changes
      const checkPromises = Object.values(COLLECTIONS).map((collectionName) =>
        this.pollCollectionForChanges(userId, collectionName),
      );

      await Promise.all(checkPromises);
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
    const canSync = await authService.isCloudSyncAllowedAsync();
    if (!canSync) {
      return;
    }

    try {
      // Reset sync initialization timestamp to allow full data pull
      this.syncInitializedAt = 0;

      // Process any pending local operations first
      await this.processSyncQueue();

      // Pull all remote data by re-initializing listeners
      await this.startSyncListeners();
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

    this.syncGeneration++;
    this.unsubscribers.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.unsubscribers.clear();
  }

  /**
   * Forget everything that belongs to the current user. Call on sign-out / user switch.
   */
  public resetState(): void {
    this.stopSync();
    this.syncQueue = [];
    this.failedInserts = [];
    this.lastSyncTimestamp = 0;
    this.syncInitializedAt = 0;
    this.syncInProgress = false;
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

    // Return unsubscribe function
    return () => {
      const index = this.dataChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.dataChangeCallbacks.splice(index, 1);
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

    this.dataChangeCallbacks.forEach((callback, index) => {
      try {
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
    this.notifyDataChange(collectionName, "update", "test-id-123");
  }

  // Start listeners for all collections
  private async startSyncListeners(): Promise<void> {
    const userId = await authService.requireUserIdAsync();

    // Never stack timers: kill whatever the previous session left running first
    this.stopSync();

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
    this.unsubscribers.get(collectionName)?.();
    this.unsubscribers.set(collectionName, () => {
      clearInterval(pollInterval);
    });
  }

  // Poll for changes since last sync timestamp
  private async pollCollectionForChanges(
    userId: string,
    collectionName: CollectionName,
  ): Promise<void> {
    const generation = this.syncGeneration;
    try {
      const collectionRef = collection(
        this.getDb(),
        "users",
        userId,
        collectionName,
      );

      // Get last sync timestamp from settings or use a reasonable default
      const lastSyncTime = await this.getLastSyncTimestamp();

      // Query only documents modified after last sync
      const changesQuery = query(
        collectionRef,
        where("updatedAt", ">", lastSyncTime),
        orderBy("updatedAt", "desc"),
      );

      const snapshot = await getDocs(changesQuery);

      // The user may have signed out / switched while the request was in flight.
      // Writing these docs now would put the old user's data into the new user's database.
      let stillCurrent = generation === this.syncGeneration;
      if (stillCurrent) {
        try {
          stillCurrent = (await authService.requireUserIdAsync()) === userId;
        } catch {
          stillCurrent = false;
        }
      }
      if (!stillCurrent) {
        return;
      }

      if (snapshot.docs.length > 0) {

        // Process each changed document
        for (const docSnapshot of snapshot.docs) {
          if (generation !== this.syncGeneration) return;
          const docData = docSnapshot.data() as FirestoreDocument<any>;
          const docId = docSnapshot.id;

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
      }
    } catch (error) {
      console.error(`❌ Error polling ${collectionName} for changes:`, error);
    }
  }

  // Get the last sync timestamp from local storage
  private async getLastSyncTimestamp(): Promise<number> {
    try {
      const { SettingsRepository } =
        await import("../../features/settings/repositories/settingsRepository");
      const settingsRepo = new SettingsRepository();
      return await settingsRepo.getLastSyncAttempt();
    } catch (error) {
      console.warn("Could not get last sync timestamp, using default:", error);
      return Date.now() - 60 * 60 * 1000; // 1 hour ago
    }
  }

  // Update the last sync timestamp
  private async updateLastSyncTimestamp(): Promise<void> {
    try {
      const { SettingsRepository } =
        await import("../../features/settings/repositories/settingsRepository");
      const settingsRepo = new SettingsRepository();

      // Update the sync timestamp in settings
      await settingsRepo.setLastSyncAttempt(Date.now()); // Don't trigger sync for settings update

      this.lastSyncTimestamp = Date.now();
    } catch (error) {
      console.warn("Could not update last sync timestamp:", error);
    }
  }

  // Add method to pull only conflicted data on demand
  public async syncConflictsOnly(): Promise<void> {

    try {
      if (!(await authService.isCloudSyncAllowedAsync())) {
        return;
      }
      const userId = await authService.requireUserIdAsync();

      // Check local pending operations and sync only those
      await this.processSyncQueue();

      // Retry failed inserts (dependency conflicts)
      if (this.failedInserts.length > 0) {
        const toRetry = [...this.failedInserts];
        this.clearFailedInserts();

        for (const { collectionName, doc } of toRetry) {
          try {
            await this.insertLocalDocument(collectionName, doc);
          } catch (error) {
            console.error(
              `❌ Retry failed for ${collectionName}/${doc.id}:`,
              error,
            );
            // Don't re-add to failed inserts to avoid infinite loops
          }
        }
      }
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

    // Skip processing our own local writes that haven't been confirmed by server yet
    if (change.doc.metadata.hasPendingWrites) {
      return;
    }

    // Ensure device ID is initialized
    if (!this.deviceId) {
      this.deviceId = await getDeviceId();
    }

    // Check if this change was made by the same device
    const lastModifiedBy = docData.data?.lastModifiedBy;

    if (lastModifiedBy && lastModifiedBy === this.deviceId) {
      return;
    }

    // If no device info, it might be an old document - be more cautious
    if (!lastModifiedBy) {

      // For legacy documents without device tracking, we'll still apply timestamp-based conflict resolution
      // but with more conservative approach (larger time window to avoid conflicts)
    }

    try {
      if (change.type === "removed") {
        await this.handleRemoteDelete(collectionName, docId);
      } else {
        await this.handleRemoteUpdate(collectionName, docId, docData);
      }
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

    // Get local version
    const localDoc = await this.getLocalDocument(collectionName, docId);

    if (!localDoc) {
      await this.insertLocalDocument(collectionName, remoteDoc);
      return;
    }

    if (localDoc.deleted === 1 || localDoc.deleted === true) {
      try {
        await this.performSyncOperation(collectionName, "delete", docId);
      } catch (delErr) {
        console.warn(`Could not propagate deletion for ${collectionName}/${docId}:`, delErr);
      }
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

    // Special rule for settings: if local is untouched default, cloud settings always win
    if (collectionName === "settings") {
      const isLocalUntouched = !localDoc?.sync_updated_at || localDoc.sync_updated_at === 0 || localDoc.sync_status === "synced";
      if (isLocalUntouched) {
        decision = "UPDATE_LOCAL_SETTINGS_UNTOUCHED";
        shouldTakeRemote = true;
        shouldSkipDueToSameDevice = false;
      }
    }

    if (shouldSkipDueToSameDevice) {
    } else if (shouldTakeRemote) {
      await this.updateLocalDocument(collectionName, remoteDoc);
    } else if (localTime > remoteTime) {
      await this.pushLocalToRemote(collectionName, localDoc);
    } else {
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
    const canSync = await authService.isCloudSyncAllowedAsync();
    if (!canSync) {
      if (await authService.isGuestAsync()) {
        return;
      }

      const isAuthenticated = await authService.isAuthenticatedAsync();
      if (!isAuthenticated) {
        console.warn("⚠️ Not authenticated - queueing sync operation");
        this.queueSyncOperation(collectionName, operation, documentId, data);
        return;
      }
      return;
    }

    const user = await authService.getCurrentAuthenticatedUser();

    try {
      this.syncInProgress = true;
      await this.performSyncOperation(
        collectionName,
        operation,
        documentId,
        data,
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

        try {
          const result = await setDoc(docRef, syncDoc, { merge: true });
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
        await deleteDoc(docRef);
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
  }

  // Process queued sync operations
  private async processSyncQueue(): Promise<void> {
    const canSync = await authService.isCloudSyncAllowedAsync();
    if (this.syncQueue.length === 0 || !canSync) {
      return;
    }
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

    try {
      // Prepare data with the document ID, removing undefined values
      const cleanData = this.cleanDataForFirestore(doc.data);
      const dataWithId = { ...cleanData, id: doc.id };

      switch (collectionName) {
        case "sms_settings": {
          const { SmsSettingsRepository } = await import("../../features/sms/services/smsSettingsRepository");
          await new SmsSettingsRepository().applyRemote(doc.data);
          break;
        }
        case "transactions":

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

          // Insert transaction but skip logging back to sync_log to avoid loops
          await new (
            await import("../../features/transactions/repositories/transactionsRepository")
          ).TransactionRepository().createTransaction(
            mappedTransactionData as any,
            {
              skipSync: true,
              useProvidedId: dataWithId.id,
            },
          );
          break;

        case "budgets":

          const budgetRepo = new (
            await import("../../features/budgets/repositories/budgetsRepository")
          ).BudgetRepository();
          await budgetRepo.createBudget(dataWithId as any, {
            skipSync: true,
            useProvidedId: dataWithId.id,
          });
          break;

        case "categories":

          // Ensure category has required fields with safe defaults
          const safeCategory = {
            ...dataWithId,
            entryCount: Number(dataWithId.entryCount) || 0,
            updatedAt: dataWithId.updatedAt || Date.now(),
            createdAt: dataWithId.createdAt || new Date().toISOString(),
          };

          const { entityManager: em } = await import("../database/EntityManager");
          if (em.createCategoryFromSync) {
            await em.createCategoryFromSync(dataWithId as any);
          } else {
            await new (
              await import("../../features/categories/repositories/categoriesRepository")
            ).CategoryRepository().createCategory(safeCategory as any, {
              skipSync: true,
              useProvidedId: dataWithId.id,
            });
          }
          break;

        case "wallets":
          const walletRepo = new (
            await import("../../features/wallets/repositories/walletsRepository")
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
          break;

        case "debts":

          // Use DebtRepository directly to ensure we pass skipSync and useProvidedId
          // so the repository will not create a sync_log entry and will use the remote id.
          const debtRepo = new (
            await import("../../features/debts/repositories/debtsRepository")
          ).DebtRepository();
          // Mark as coming from sync; createDebt will honor skipSync and useProvidedId
          await debtRepo.createDebt(dataWithId as any, {
            skipSync: true,
            useProvidedId: dataWithId.id,
          });
          break;

        case "debt_payments":

          // Use validation to clean debt payment data and ensure required fields
          const { cleanDebtPaymentData } = await import("../../shared/utils/validation");
          const safeDebtPayment = cleanDebtPaymentData(dataWithId);
          safeDebtPayment.syncStatus = "synced"; // Mark as synced since it's coming from Firebase

          // Debt payments: call DebtRepository.makePayment with skipSync to avoid re-logging
          await new (
            await import("../../features/debts/repositories/debtsRepository")
          ).DebtRepository().makePayment(safeDebtPayment as any, {
            skipSync: true,
            useProvidedId: dataWithId.id,
          });
          break;

        case "settings":

          // Use validation to clean settings data
          const { cleanSettingsData } = await import("../../shared/utils/validation");
          const safeSettings = cleanSettingsData(dataWithId);
          safeSettings.syncStatus = "synced"; // Mark as synced since it's coming from Firebase

          const settingsRepo = new (
            await import("../../features/settings/repositories/settingsRepository")
          ).SettingsRepository();

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
          break;

        default:
          console.warn(`Unknown collection for insert: ${collectionName}`);
          return;
      }

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

    try {
      // Clean data with safe date parsing for all entities
      const cleanData = this.cleanDataForFirestore(doc.data);

      switch (collectionName) {
        case "sms_settings": {
          const { SmsSettingsRepository } = await import("../../features/sms/services/smsSettingsRepository");
          await new SmsSettingsRepository().applyRemote(doc.data);
          break;
        }
        case "transactions":

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

          const transactionRepo = new (
            await import("../../features/transactions/repositories/transactionsRepository")
          ).TransactionRepository();
          await transactionRepo.updateTransaction(
            doc.id,
            mappedUpdateData as any,
            { skipSync: true },
          );
          break;

        case "budgets":

          const budgetRepo = new (
            await import("../../features/budgets/repositories/budgetsRepository")
          ).BudgetRepository();
          await budgetRepo.updateBudget(doc.id, doc.data as any, {
            skipSync: true,
          });
          break;

        case "categories":
          const categoryRepo = new (
            await import("../../features/categories/repositories/categoriesRepository")
          ).CategoryRepository();
          await categoryRepo.updateCategory(doc.id, doc.data as any, {
            skipSync: true,
          });
          break;

        case "debts":
          const debtRepo = new (
            await import("../../features/debts/repositories/debtsRepository")
          ).DebtRepository();
          await debtRepo.updateDebt(doc.id, doc.data as any, {
            skipSync: true,
          });
          break;

        case "debt_payments":
          const debtPaymentRepo = new (
            await import("../../features/debts/repositories/debtsRepository")
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
            await import("../../features/wallets/repositories/walletsRepository")
          ).WalletRepository();
          await walletUpdateRepo.updateWallet(doc.id, doc.data as any, {
            skipSync: true,
          });
          break;

        case "settings":
          const { cleanSettingsData: cleanSettingsUpdateData } = await import(
            "../../shared/utils/validation"
          );
          const safeSettingsUpdate = cleanSettingsUpdateData(doc.data || doc);
          safeSettingsUpdate.syncStatus = "synced";

          const settingsUpdateRepo = new (
            await import("../../features/settings/repositories/settingsRepository")
          ).SettingsRepository();

          await settingsUpdateRepo.updateSettings(
            {
              billingPeriodStartDay: safeSettingsUpdate.billingPeriodStartDay,
              currency: safeSettingsUpdate.currency,
              firebaseSync: safeSettingsUpdate.firebaseSync,
              theme: safeSettingsUpdate.theme,
              syncUpdatedAt: safeSettingsUpdate.syncUpdatedAt,
              syncStatus: "synced",
            },
            { skipSync: true },
          );
          break;

        default:
          console.warn(`Unknown collection for update: ${collectionName}`);
      }

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

    try {
      // First check if the document exists locally
      const localDoc = await this.getLocalDocument(collectionName, docId);
      if (!localDoc) {
        return; // Not an error - document is already gone
      }

      switch (collectionName) {
        case "transactions":
          const transactionRepo = new (
            await import("../../features/transactions/repositories/transactionsRepository")
          ).TransactionRepository();
          await transactionRepo.deleteTransaction(docId, { skipSync: true });
          break;

        case "budgets":
          const budgetRepo = new (
            await import("../../features/budgets/repositories/budgetsRepository")
          ).BudgetRepository();
          await budgetRepo.deleteBudget(docId, { skipSync: true });
          break;

        case "categories":
          const categoryRepo = new (
            await import("../../features/categories/repositories/categoriesRepository")
          ).CategoryRepository();
          await categoryRepo.deleteCategory(docId, { skipSync: true });
          break;

        case "debts":
          const debtRepo = new (
            await import("../../features/debts/repositories/debtsRepository")
          ).DebtRepository();
          await debtRepo.deleteDebt(docId, { skipSync: true });
          break;

        case "debt_payments":
          const debtPaymentRepo = new (
            await import("../../features/debts/repositories/debtsRepository")
          ).DebtRepository();
          await debtPaymentRepo.deletePayment(docId, { skipSync: true });
          break;

        case "wallets":
          const walletDeleteRepo = new (
            await import("../../features/wallets/repositories/walletsRepository")
          ).WalletRepository();
          await walletDeleteRepo.deleteWallet(docId, { skipSync: true });
          break;

        default:
          console.warn(`Unknown collection for delete: ${collectionName}`);
          return;
      }

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

    try {
      await this.performSyncOperation(
        collectionName,
        "update",
        localDoc.id,
        localDoc,
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
      [COLLECTIONS.SMS_SETTINGS]: "sms_settings",
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
      await setDoc(testDocRef, testData);
      const snapshot = await getDoc(testDocRef);

      if (snapshot.exists()) {

        // Clean up test document
        await deleteDoc(testDocRef);
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

      // Restore requires an authoritative server snapshot. Ordering by updatedAt
      // silently excludes legacy documents without that field, and a cached
      // empty result must never be mistaken for a new account.
      const snapshot = await getDocsFromServer(collectionRef);

      const documents: any[] = [];
      snapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...doc.data(),
        });
      });
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
      if (!(await authService.isCloudSyncAllowedAsync())) {
        return;
      }
      const settingsRepo = new (
        await import("../../features/settings/repositories/settingsRepository")
      ).SettingsRepository();
      // Determine lastAttempt - prefer provided value, then settings table, then 0
      if (lastAttempt === undefined || lastAttempt === null) {
        try {
          lastAttempt = await settingsRepo.getLastSyncAttempt();
        } catch (err) {
          console.warn(
            "Could not read settings.syncUpdatedAt, defaulting to 0",
            err,
          );
          lastAttempt = 0;
        }
      }

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

          // Prefer top-level updatedAt field for querying. Firestore requires indexed fields
          const q = query(collectionRef, where("updatedAt", ">", lastAttempt));
          const snapshot = await getDocs(q);

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
              continue;
            }
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
    } catch (error) {
      console.error("❌ performDeltaSync failed:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const syncService = SyncService.getInstance();
