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
import { authService } from "./authService";
import { getFirestoreInstance } from "./firebase";
import { getPersistentDeviceKeys } from "../utils/deviceId";

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
 * Document ID: "C8hK8G3O6JNzGzeTz0NwXqXnEMW2"
 *
 * Fields in `users/C8hK8G3O6JNzGzeTz0NwXqXnEMW2`:
 * - dailyLimit: 3
 * - unlimitedEmails: ["your-email@example.com"]
 * - unlimitedUids: ["your-firebase-uid"]
 *
 * Subcollection for per-device and per-user daily counters:
 * - `users/C8hK8G3O6JNzGzeTz0NwXqXnEMW2/ocr_daily_usage/{deviceOrUserKey}`
 */
export const OCR_CONFIG_DOC_UID = "C8hK8G3O6JNzGzeTz0NwXqXnEMW2";
const LEDGER_APP_NAME = "FinancyOcrLedgerApp";
const LEDGER_AUTH_EMAIL = "ocr-config@financy.app";
const LEDGER_AUTH_PASS = "FinancyOcrLedger#2026!";

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

async function getLocalUsageToday(today: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_USAGE_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.date === today && typeof parsed.count === "number") {
      return parsed.count;
    }
  } catch {
    // Ignore local read errors
  }
  return 0;
}

async function setLocalUsageToday(today: string, count: number): Promise<void> {
  try {
    await AsyncStorage.setItem(
      LOCAL_USAGE_STORAGE_KEY,
      JSON.stringify({ date: today, count, updatedAt: Date.now() }),
    );
  } catch {
    // Ignore local write errors
  }
}

/**
 * Checks whether the current user + device has unlimited OCR access or how many scans remain today.
 */
export async function getOcrQuotaStatus(): Promise<OcrQuotaStatus> {
  const today = getTodayDateString();

  const currentUser = await authService.getCurrentAuthenticatedUser();
  const isSignedInAccount = Boolean(
    currentUser && !currentUser.isGuest && currentUser.uid !== "guest",
  );

  let dailyLimit = DEFAULT_DAILY_LIMIT;
  const localUsed = await getLocalUsageToday(today);
  let maxUsedToday = localUsed;

  // 2. Check Firestore config & persistent device/user usage ledger
  try {
    const db = await getLedgerFirestore();
    if (db) {
      const configRef = doc(db, "users", OCR_CONFIG_DOC_UID);
      const configSnap = await getDoc(configRef);

      if (configSnap.exists()) {
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

          const userEmailLower = (currentUser.email || "").trim().toLowerCase();
          if (
            unlimitedUids.includes(currentUser.uid) ||
            (userEmailLower && unlimitedEmails.includes(userEmailLower))
          ) {
            return {
              isUnlimited: true,
              usedToday: 0,
              dailyLimit,
              remainingToday: 999,
              canScan: true,
              reason: "owner_account",
            };
          }
        }
      }

      // Also check the signed-in user's own `users/{uid}` document for `unlimitedOcr: true` or `role: "admin"`
      if (isSignedInAccount && currentUser) {
        try {
          const primaryDb = getFirestoreInstance();
          const userDocSnap = await getDoc(doc(primaryDb, "users", currentUser.uid));
          if (userDocSnap.exists()) {
            const uData = userDocSnap.data() || {};
            if (
              uData.unlimitedOcr === true ||
              uData.role === "admin" ||
              uData.role === "owner"
            ) {
              return {
                isUnlimited: true,
                usedToday: 0,
                dailyLimit,
                remainingToday: 999,
                canScan: true,
                reason: "owner_user_doc",
              };
            }
          }
        } catch {
          // Non-fatal
        }
      }

      // 3. Query usage across all persistent hardware device keys + user UID
      const deviceKeys = await getPersistentDeviceKeys();
      const lookupKeys = [...deviceKeys];
      if (isSignedInAccount && currentUser?.uid) {
        lookupKeys.push(`uid_${currentUser.uid}`);
      }

      const usageSnaps = await Promise.all(
        lookupKeys.map((key) =>
          getDoc(
            doc(db, "users", OCR_CONFIG_DOC_UID, "ocr_daily_usage", key),
          ).catch(() => null),
        ),
      );

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

      // Sync local cache upward if cloud ledger has a higher count (e.g. after reinstall!)
      if (maxUsedToday > localUsed) {
        await setLocalUsageToday(today, maxUsedToday);
      }
    }
  } catch (err) {
    console.warn("[OcrRateLimit] Error checking cloud quota, using local count:", err);
  }

  const remainingToday = Math.max(0, dailyLimit - maxUsedToday);
  return {
    isUnlimited: false,
    usedToday: maxUsedToday,
    dailyLimit,
    remainingToday,
    canScan: remainingToday > 0,
  };
}

/**
 * Increments the daily OCR scan counter for this device (and signed-in user) in both local storage and Firestore.
 * Call this after a successful OCR AI scan (or right as an AI scan begins).
 */
export async function consumeOcrQuota(): Promise<OcrQuotaStatus> {
  const status = await getOcrQuotaStatus();
  if (status.isUnlimited) {
    return status;
  }

  const today = getTodayDateString();
  const nextCount = status.usedToday + 1;

  // Save locally immediately
  await setLocalUsageToday(today, nextCount);

  // Save to cloud ledger across all persistent hardware device keys + user UID
  try {
    const db = await getLedgerFirestore();
    if (db) {
      const currentUser = await authService.getCurrentAuthenticatedUser();
      const isSignedInAccount = Boolean(
        currentUser && !currentUser.isGuest && currentUser.uid !== "guest",
      );
      const deviceKeys = await getPersistentDeviceKeys();
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

  const remainingToday = Math.max(0, status.dailyLimit - nextCount);
  return {
    isUnlimited: false,
    usedToday: nextCount,
    dailyLimit: status.dailyLimit,
    remainingToday,
    canScan: remainingToday > 0,
  };
}
