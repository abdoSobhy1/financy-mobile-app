import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import {
  getOcrQuotaStatus,
  getCachedOcrQuotaSync,
  subscribeOcrQuota,
} from "../services/ocrRateLimitService";

/**
 * Custom hook to determine if the currently logged-in user is the owner / developer
 * using the identical validation and caching logic that unlocks infinite OCR scans.
 *
 * Checks:
 * 1. Firestore `users/C8hK8G3O6JNzGzeTz0NwXqXnEMW2` -> unlimitedUids & unlimitedEmails
 * 2. Firestore user doc -> role === 'owner' | 'admin' or unlimitedOcr === true
 * 3. Local quota cache in AsyncStorage & in-memory cache (`isUnlimited`)
 *
 * @returns boolean `true` if current user is verified as the owner/developer.
 */
export function useIsOwner(): boolean {
  const reduxUser = useSelector((state: RootState) => state.auth?.user);

  const [isOwner, setIsOwner] = useState<boolean>(() => {
    return Boolean(getCachedOcrQuotaSync()?.isUnlimited);
  });

  useEffect(() => {
    // 1. Subscribe to quota updates
    const unsubscribe = subscribeOcrQuota((latest) => {
      setIsOwner(Boolean(latest?.isUnlimited));
    });

    // 2. Refresh status (memory/local cache first, then background cloud refresh)
    getOcrQuotaStatus({ fast: true })
      .then((status) => {
        setIsOwner(Boolean(status?.isUnlimited));
      })
      .catch(() => {});

    return unsubscribe;
  }, [reduxUser?.uid, reduxUser?.email]);

  return isOwner;
}
