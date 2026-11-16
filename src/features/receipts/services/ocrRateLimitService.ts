import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  Auth,
   initializeAuth,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  Firestore,
} from "firebase/firestore";
import { authService } from "../../auth/services/authService";
import { getFirestoreInstance } from "../../../infrastructure/firebase/client";
import { getPersistentDeviceKeys } from "../../../infrastructure/device/deviceId";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getReactNativePersistence } from "firebase/auth";

export interface OcrQuotaStatus {
  isUnlimited: boolean;
  usedToday: number;
  dailyLimit: number;
  remainingToday: number;
  canScan: boolean;
  reason?: string;
}

const DEFAULT_DAILY_LIMIT = 3;
const LOCAL_USAGE_STORAGE_KEY = "@financy_ocr_daily_usage_v1";

/**
 * Firestore document path created for OCR access configuration & device rate-limit ledger:
 * Collection: "users"
 * Document ID: configured via `EXPO_PUBLIC_OCR_CONFIG_UID`
 *
 * Fields in `users/{OCR_CONFIG_DOC_UID}`:
 * - dailyLimit: 3
 * - unlimitedEmails: ["your-email@example.com"]
 * - unlimitedUids: ["your-firebase-uid"]
 *
 * Subcollection for per-device and per-user daily counters:
 * - `users/{OCR_CONFIG_DOC_UID}/ocr_daily_usage/{deviceOrUserKey}`
 */
export const OCR_CONFIG_DOC_UID = process.env.EXPO_PUBLIC_OCR_CONFIG_UID || "";
const LEDGER_APP_NAME = "FinancyOcrLedgerApp";
const LEDGER_AUTH_EMAIL = process.env.EXPO_PUBLIC_OCR_LEDGER_EMAIL || "";
const LEDGER_AUTH_PASS = process.env.EXPO_PUBLIC_OCR_LEDGER_PASS || "";

let ledgerApp: FirebaseApp | null = null;
let ledgerAuth: Auth | null = null;
let ledgerDb: Firestore | null = null;
let ledgerSignInPromise: Promise<Firestore | null> | null = null;

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function getLedgerFirestore(): Promise<Firestore | null> {
  if (ledgerDb && ledgerAuth?.currentUser) {
    return ledgerDb;
  }

  if (ledgerSignInPromise) {
    return ledgerSignInPromise;
  }

  ledgerSignInPromise = (async () => {
    try {
      const firebaseConfig = {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      };

      const existing = getApps().find((a) => a.name === LEDGER_APP_NAME);
      if (existing) {
        ledgerApp = existing;
        ledgerAuth = getAuth(ledgerApp);
      } else {
        ledgerApp = initializeApp(firebaseConfig, LEDGER_APP_NAME);
        try {
          ledgerAuth = initializeAuth(ledgerApp, {
            persistence: getReactNativePersistence(AsyncStorage),
          });
        } catch {
          ledgerAuth = getAuth(ledgerApp);
        }
      }

      if (!ledgerAuth.currentUser) {
        await signInWithEmailAndPassword(
          ledgerAuth,
          LEDGER_AUTH_EMAIL,
          LEDGER_AUTH_PASS,
        );
      }

      ledgerDb = getFirestore(ledgerApp);
      return ledgerDb;
    } catch (err) {
      console.warn("[OcrRateLimit] Cloud ledger connection unavailable:", err);
      return null;
    } finally {
      ledgerSignInPromise = null;
    }
  })();

  return ledgerSignInPromise;
}

interface LocalQuotaCache {
  date: string;
  count: number;
  dailyLimit?: number;
  isUnlimited?: boolean;
  uid?: string;
  reason?: string;
  updatedAt: number;
}

let memoryQuotaCache: {
  date: string;
  uid: string;
  status: OcrQuotaStatus;
} | null = null;

let backgroundSyncPromise: Promise<OcrQuotaStatus> | null = null;
let backgroundSyncUid: string | null = null;
const quotaListeners = new Set<(status: OcrQuotaStatus) => void>();

function notifyQuotaListeners(status: OcrQuotaStatus) {
  quotaListeners.forEach((listener) => {
    try {
      listener(status);
    } catch {
      // Ignore listener errors
    }
  });
}

/**
 * Subscribe to background OCR quota updates so UI can render immediately and update smoothly.
 */
export function subscribeOcrQuota(
  listener: (status: OcrQuotaStatus) => void,
): () => void {
  quotaListeners.add(listener);
  return () => {
    quotaListeners.delete(listener);
  };
}

/**
 * Returns the in-memory cached quota synchronously (0ms) if available for today.
 */
export function getCachedOcrQuotaSync(expectedUid?: string): OcrQuotaStatus | null {
  const today = getTodayDateString();
  if (
    memoryQuotaCache &&
    memoryQuotaCache.date === today &&
    (!expectedUid || memoryQuotaCache.uid === expectedUid)
  ) {
    return memoryQuotaCache.status;
  }
  return null;
}

/**
 * Returns true synchronously if the current user has verified infinite OCR scans in cache.
 */
export function isInfiniteOcrUserSync(): boolean {
  return Boolean(getCachedOcrQuotaSync()?.isUnlimited);
}

/**
 * Returns true if the current user is verified as the owner/unlimited user.
 */
export async function isInfiniteOcrUser(): Promise<boolean> {
  const status = await getOcrQuotaStatus({ fast: true });
  return Boolean(status.isUnlimited);
}

/**
 * Pre-warms the local + cloud OCR quota in the background without blocking the UI.
 */
export function prefetchOcrQuota(): void {
  getOcrQuotaStatus({ fast: true }).catch(() => {});
}

async function getLocalQuotaCache(today: string): Promise<LocalQuotaCache | null> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_USAGE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.date === today && typeof parsed.count === "number") {
      return parsed as LocalQuotaCache;
    }
  } catch {
    // Ignore local read errors
  }
  return null;
}

async function setLocalQuotaCache(cache: LocalQuotaCache): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCAL_USAGE_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore local write errors
  }
}

function buildQuotaStatus(
  usedToday: number,
  dailyLimit: number,
  isUnlimited: boolean,
  reason?: string,
): OcrQuotaStatus {
  if (isUnlimited) {
    return {
      isUnlimited: true,
      usedToday: 0,
      dailyLimit,
      remainingToday: 999,
      canScan: true,
      reason,
    };
  }
  const remainingToday = Math.max(0, dailyLimit - usedToday);
  return {
    isUnlimited: false,
    usedToday,
    dailyLimit,
    remainingToday,
    canScan: remainingToday > 0,
    reason,
  };
}

async function syncOcrQuotaFromCloud(): Promise<OcrQuotaStatus> {
  const currentUser = await authService.getCurrentAuthenticatedUser();
  const isSignedInAccount = Boolean(
    currentUser && !currentUser.isGuest && currentUser.uid !== "guest",
  );
  const activeUid = isSignedInAccount && currentUser ? currentUser.uid : "guest";

  if (backgroundSyncPromise && backgroundSyncUid === activeUid) {
    return backgroundSyncPromise;
  }

  const syncPromise = (async () => {
    const today = getTodayDateString();

    const localCache = await getLocalQuotaCache(today);
    let dailyLimit = localCache?.dailyLimit || DEFAULT_DAILY_LIMIT;
    const localUsed = localCache?.count || 0;
    let maxUsedToday = localUsed;
    let isUnlimited = false;
    let reason: string | undefined;

    try {
      const userDocSnap =
        isSignedInAccount && currentUser
          ? await getDoc(
              doc(getFirestoreInstance(), "users", currentUser.uid),
            ).catch(() => null)
          : null;

      if (userDocSnap?.exists()) {
        const userData = userDocSnap.data() || {};
        if (
          userData.unlimitedOcr === true ||
          userData.role === "admin" ||
          userData.role === "owner"
        ) {
          isUnlimited = true;
          reason = "owner_user_doc";
        }
      }

      if (!isUnlimited) {
        const [db, deviceKeys] = await Promise.all([
          getLedgerFirestore(),
          getPersistentDeviceKeys(),
        ]);
        if (!db) {
          throw new Error("OCR quota ledger is unavailable.");
        }

        const lookupKeys = [...deviceKeys];
        if (isSignedInAccount && currentUser?.uid) {
          lookupKeys.push(`uid_${currentUser.uid}`);
        }

        const configRef = doc(db, "users", OCR_CONFIG_DOC_UID);
        // Run all Firestore reads in parallel instead of sequentially
        const [configSnap, ...usageSnaps] = await Promise.all([
          getDoc(configRef).catch(() => null),
          ...lookupKeys.map((key) =>
            getDoc(
              doc(db, "users", OCR_CONFIG_DOC_UID, "ocr_daily_usage", key),
            ).catch(() => null),
          ),
        ]);

        if (configSnap && configSnap.exists()) {
          const configData = configSnap.data() || {};
          if (
            typeof configData.dailyLimit === "number" &&
            configData.dailyLimit > 0
          ) {
            dailyLimit = configData.dailyLimit;
          }

          if (isSignedInAccount && currentUser) {
            const unlimitedUids: string[] = Array.isArray(
              configData.unlimitedUids,
            )
              ? configData.unlimitedUids.map((u: any) => String(u).trim())
              : [];
            const unlimitedEmails: string[] = Array.isArray(
              configData.unlimitedEmails,
            )
              ? configData.unlimitedEmails.map((e: any) =>
                  String(e).trim().toLowerCase(),
                )
              : [];

            const userEmailLower = (currentUser.email || "")
              .trim()
              .toLowerCase();
            if (
              unlimitedUids.includes(currentUser.uid) ||
              (userEmailLower && unlimitedEmails.includes(userEmailLower))
            ) {
              isUnlimited = true;
              reason = "owner_account";
            }
          }
        }

        if (!isUnlimited) {
          for (const snap of usageSnaps) {
            if (snap && snap.exists()) {
              const data = snap.data();
              if (data?.date === today && typeof data?.count === "number") {
                if (data.count > maxUsedToday) {
                  maxUsedToday = data.count;
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn(
        "[OcrRateLimit] Error checking cloud quota, using local count:",
        err,
      );
    }

    const status = buildQuotaStatus(
      maxUsedToday,
      dailyLimit,
      isUnlimited,
      reason,
    );

    memoryQuotaCache = {
      date: today,
      uid: activeUid,
      status,
    };

    await setLocalQuotaCache({
      date: today,
      count: maxUsedToday,
      dailyLimit,
      isUnlimited,
      uid: activeUid,
      reason,
      updatedAt: Date.now(),
    });

    notifyQuotaListeners(status);
    return status;
  })();

  backgroundSyncUid = activeUid;
  backgroundSyncPromise = syncPromise;
  try {
    return await syncPromise;
  } finally {
    if (backgroundSyncPromise === syncPromise) {
      backgroundSyncPromise = null;
      backgroundSyncUid = null;
    }
  }
}

/**
 * Checks whether the current user + device has unlimited OCR access or how many scans remain today.
 * Pass `{ fast: true }` to return immediately from memory/local cache while refreshing cloud state in the background.
 */
export async function getOcrQuotaStatus(options?: {
  fast?: boolean;
}): Promise<OcrQuotaStatus> {
  const today = getTodayDateString();
  const currentUser = await authService.getCurrentAuthenticatedUser();
  const isSignedInAccount = Boolean(
    currentUser && !currentUser.isGuest && currentUser.uid !== "guest",
  );
  const activeUid = isSignedInAccount && currentUser ? currentUser.uid : "guest";

  if (options?.fast) {
    if (
      memoryQuotaCache &&
      memoryQuotaCache.date === today &&
      memoryQuotaCache.uid === activeUid
    ) {
      // Trigger non-blocking background refresh
      syncOcrQuotaFromCloud().catch(() => {});
      return memoryQuotaCache.status;
    }

    const localCache = await getLocalQuotaCache(today);
    if (localCache) {
      const canTrustUnlimited =
        isSignedInAccount &&
        localCache.uid === activeUid &&
        Boolean(localCache.isUnlimited);
      const fastStatus = buildQuotaStatus(
        localCache.count || 0,
        localCache.dailyLimit || DEFAULT_DAILY_LIMIT,
        canTrustUnlimited,
        canTrustUnlimited ? localCache.reason : undefined,
      );
      memoryQuotaCache = {
        date: today,
        uid: activeUid,
        status: fastStatus,
      };
      // Trigger non-blocking background refresh
      syncOcrQuotaFromCloud().catch(() => {});
      return fastStatus;
    }

    // Even if no local cache exists yet (brand new day/install), return optimistic default immediately
    // and let the cloud sync update in the background so UI never freezes!
    const optimisticStatus = buildQuotaStatus(0, DEFAULT_DAILY_LIMIT, false);
    memoryQuotaCache = {
      date: today,
      uid: activeUid,
      status: optimisticStatus,
    };
    syncOcrQuotaFromCloud().catch(() => {});
    return optimisticStatus;
  }

  return syncOcrQuotaFromCloud();
}

/**
 * Increments the daily OCR scan counter for this device (and signed-in user) in both local storage and Firestore.
 * Updates local cache & memory immediately and syncs to Firestore in the background without blocking the UI.
 */
export async function consumeOcrQuota(): Promise<OcrQuotaStatus> {
  const status = await getOcrQuotaStatus({ fast: true });
  if (status.isUnlimited) {
    return status;
  }

  const today = getTodayDateString();
  const nextCount = status.usedToday + 1;
  const currentUser = await authService.getCurrentAuthenticatedUser();
  const isSignedInAccount = Boolean(
    currentUser && !currentUser.isGuest && currentUser.uid !== "guest",
  );
  const activeUid = isSignedInAccount && currentUser ? currentUser.uid : "guest";

  const nextStatus = buildQuotaStatus(
    nextCount,
    status.dailyLimit,
    false,
    status.reason,
  );

  memoryQuotaCache = {
    date: today,
    uid: activeUid,
    status: nextStatus,
  };
  notifyQuotaListeners(nextStatus);

  // Save locally immediately
  await setLocalQuotaCache({
    date: today,
    count: nextCount,
    dailyLimit: status.dailyLimit,
    isUnlimited: false,
    uid: activeUid,
    updatedAt: Date.now(),
  });

  // Fire-and-forget cloud ledger update across all persistent hardware device keys + user UID
  (async () => {
    try {
      const [db, deviceKeys] = await Promise.all([
        getLedgerFirestore(),
        getPersistentDeviceKeys(),
      ]);
      if (db) {
        const lookupKeys = [...deviceKeys];
        if (isSignedInAccount && currentUser?.uid) {
          lookupKeys.push(`uid_${currentUser.uid}`);
        }

        await Promise.all(
          lookupKeys.map((key) =>
            setDoc(
              doc(db, "users", OCR_CONFIG_DOC_UID, "ocr_daily_usage", key),
              {
                date: today,
                count: nextCount,
                key,
                uid: currentUser?.uid || "guest",
                email: currentUser?.email || null,
                updatedAt: Date.now(),
              },
              { merge: true },
            ).catch((e) =>
              console.warn(`[OcrRateLimit] Failed to write key ${key}:`, e),
            ),
          ),
        );
      }
    } catch (err) {
      console.warn("[OcrRateLimit] Failed to persist cloud usage:", err);
    }
  })();

  return nextStatus;
}
