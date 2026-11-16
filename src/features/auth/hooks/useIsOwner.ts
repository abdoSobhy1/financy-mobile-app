import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import {
  getOcrQuotaStatus,
  getCachedOcrQuotaSync,
  subscribeOcrQuota,
} from "../../receipts/services/ocrRateLimitService";

/**
 * Custom hook to determine if the currently logged-in user is the owner / developer
 * using the identical validation and caching logic that unlocks infinite OCR scans.
 *
 * Checks:
 * 1. Firestore `users/{OCR_CONFIG_DOC_UID}` -> unlimitedUids & unlimitedEmails
 * 2. Firestore user doc -> role === 'owner' | 'admin' or unlimitedOcr === true
 * 3. Local quota cache in AsyncStorage & in-memory cache (`isUnlimited`)
 *
 * @returns boolean `true` if current user is verified as the owner/developer.
 */
export function useIsOwner(): boolean {
  const reduxUser = useSelector((state: RootState) => state.auth?.user);

  const [isOwner, setIsOwner] = useState<boolean>(() => {
    return Boolean(getCachedOcrQuotaSync(reduxUser?.uid || "guest")?.isUnlimited);
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

export type IsOwnerController = ReturnType<typeof useIsOwner>;
