/**
 * SMS Detection Service (Android Only)
 *
 * Manages runtime Android permissions (READ_SMS, RECEIVE_SMS),
 * listens for incoming SMS messages matching known Egyptian bank senders,
 * parses transaction data via smsParser.ts, and fires local notifications.
 *
 * Each notification stores its parsed transaction in AsyncStorage so that
 * tapping any notification deep-links to AddTransaction with the correct
 * pre-filled data — even if multiple notifications are pending.
 *
 * Gracefully degrades (no-op) on iOS.
 */

import {
  Platform,
  PermissionsAndroid,
  DeviceEventEmitter,
  EmitterSubscription,
} from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ParsedTransaction, Budget } from "../../../shared/types";
import { isBankSender, parseSmsTransaction } from "./smsParser";
import { getSmsConfig } from "./smsConfigService";
import { DatabaseManager } from "../../../infrastructure/database";
import { db } from "../../../infrastructure/database/repositories";

// AsyncStorage key prefix — each notification gets its own entry
export const SMS_TX_KEY_PREFIX = "sms_tx_";

export interface SmsMessage {
  originatingAddress: string;
  body: string;
  timestamp?: number;
}

// ── Enabled toggle ────────────────────────────────────────────────────
const SMS_ENABLED_KEY = "sms_detection_enabled";

export async function getSmsDetectionEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(SMS_ENABLED_KEY);
    // Default to true if never set
    return val === null ? true : val === "true";
  } catch {
    return true;
  }
}

export async function setSmsDetectionEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(SMS_ENABLED_KEY, enabled ? "true" : "false");
  const { SmsSettingsRepository } = await import("./smsSettingsRepository");
  const { getSmsConfig } = await import("./smsConfigService");
  await new SmsSettingsRepository().save(await getSmsConfig(), enabled);
}

// ── Store / retrieve per-notification transaction ────────────────────
export async function storeSmsTransaction(
  notifId: string,
  tx: ParsedTransaction
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${SMS_TX_KEY_PREFIX}${notifId}`,
      JSON.stringify({ ...tx, _notifId: notifId })
    );
  } catch (e) {
    console.error("[SmsService] Failed to store SMS transaction:", e);
  }
}

export async function retrieveSmsTransaction(
  notifId: string
): Promise<ParsedTransaction | null> {
  try {
    const raw = await AsyncStorage.getItem(`${SMS_TX_KEY_PREFIX}${notifId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ParsedTransaction;
    if (parsed.date && typeof parsed.date === "string") {
      parsed.date = new Date(parsed.date);
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearSmsTransaction(notifId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${SMS_TX_KEY_PREFIX}${notifId}`);
  } catch {}
}

// ── Deduplication guard (prevents double-notify if foreground + headless both fire) ──
const recentSmsFingerprints = new Map<string, number>();
const DEDUP_WINDOW_MS = 8000;

function isDuplicateSms(sender: string, body: string): boolean {
  const now = Date.now();
  for (const [key, ts] of recentSmsFingerprints.entries()) {
    if (now - ts > DEDUP_WINDOW_MS) {
      recentSmsFingerprints.delete(key);
    }
  }
  const fingerprint = `${sender.trim().toUpperCase()}::${body.trim()}`;
  const lastSeen = recentSmsFingerprints.get(fingerprint);
  if (lastSeen && now - lastSeen <= DEDUP_WINDOW_MS) {
    return true;
  }
  recentSmsFingerprints.set(fingerprint, now);
  return false;
}

/**
 * Shared handler used by both Headless JS background task and foreground listener.
 */
export async function processIncomingSms(
  message: SmsMessage,
  options?: {
    categories?: { id: string; name: string }[];
    budgets?: Record<string, Budget> | Budget[] | null;
  }
): Promise<ParsedTransaction | null> {
  if (!message?.originatingAddress || !message?.body) return null;

  // Deduplicate if both foreground event and HeadlessJS fire for the same SMS
  if (isDuplicateSms(message.originatingAddress, message.body)) {
    return null;
  }

  // Check feature toggle
  const enabled = await getSmsDetectionEnabled();
  if (!enabled) return null;

  // Load user-configured rules from AsyncStorage
  const config = await getSmsConfig();

  // Filter non-bank senders
  if (!isBankSender(message.originatingAddress, config)) {
    return null;
  }

  let categories = options?.categories;
  let budgets = options?.budgets;

  if (!categories || categories.length === 0 || !budgets) {
    try {
      await DatabaseManager.getInstance().init();
      const [dbCats, dbBudgets] = await Promise.all([
        db.categories.getAllCategories(),
        db.budgets.getAllBudgets(),
      ]);
      if (!categories || categories.length === 0) {
        categories = dbCats;
      }
      if (!budgets) {
        budgets = dbBudgets;
      }
    } catch (dbErr) {
      console.warn("[SmsService] Could not query DB for categories/budgets:", dbErr);
    }
  }

  const parsed = parseSmsTransaction(
    message.body,
    categories || [],
    budgets,
    undefined,
    config
  );

  if (!parsed) return null;

  // Pre-generate notification ID and store transaction BEFORE scheduling
  // to avoid any race condition if the user taps the notification immediately
  const customNotifId = `sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await storeSmsTransaction(customNotifId, parsed);

  const scheduledId = await Notifications.scheduleNotificationAsync({
    identifier: customNotifId,
    content: {
      title:
        parsed.type === "income"
          ? "💰 Income Detected"
          : "💳 Expense Detected",
      body: `${parsed.type === "income" ? "+" : "-"}${parsed.amount} EGP — ${parsed.description}. Tap to log it.`,
      data: {
        type: "sms-transaction",
        smsNotifId: customNotifId,
      },
      sound: true,
    },
    trigger: null,
  });

  if (scheduledId && scheduledId !== customNotifId) {
    await storeSmsTransaction(scheduledId, parsed);
  }

  console.log("[SmsService] Parsed & Notified:", parsed.type, parsed.amount, parsed.description);
  return parsed;
}

// ── Main service class ────────────────────────────────────────────────
class SmsService {
  private subscription: EmitterSubscription | null = null;
  private isListening: boolean = false;

  public isSupported(): boolean {
    return Platform.OS === "android";
  }

  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== "android") return false;
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      ]);
      const read =
        granted[PermissionsAndroid.PERMISSIONS.READ_SMS] ===
        PermissionsAndroid.RESULTS.GRANTED;
      const receive =
        granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] ===
        PermissionsAndroid.RESULTS.GRANTED;
      return read && receive;
    } catch (error) {
      console.error("[SmsService] Permission request failed:", error);
      return false;
    }
  }

  public async hasPermissions(): Promise<boolean> {
    if (Platform.OS !== "android") return false;
    try {
      const read = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_SMS
      );
      const receive = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS
      );
      return read && receive;
    } catch {
      return false;
    }
  }

  public startListening(
    categories: { id: string; name: string }[] = [],
    budgets?: Record<string, Budget> | Budget[] | null
  ): void {
    if (Platform.OS !== "android" || this.isListening) return;
    this.isListening = true;

    this.subscription = DeviceEventEmitter.addListener(
      "onSMSReceived",
      async (message: SmsMessage) => {
        try {
          await processIncomingSms(message, { categories, budgets });
        } catch (error) {
          console.error("[SmsService] Error processing foreground SMS:", error);
        }
      }
    );
  }

  public stopListening(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.isListening = false;
  }

  /**
   * Directly process a simulated SMS for testing in-app.
   * Works on any platform / emulator without requiring native SMS broadcasts.
   */
  public async simulateSms(
    message: SmsMessage,
    categories: { id: string; name: string }[] = [],
    budgets?: Record<string, Budget> | Budget[] | null
  ): Promise<{ success: boolean; reason?: string; transaction?: ParsedTransaction }> {
    if (!message?.originatingAddress || !message?.body) {
      return { success: false, reason: "Empty SMS message or sender" };
    }

    const config = await getSmsConfig();

    if (!isBankSender(message.originatingAddress, config)) {
      return {
        success: false,
        reason: `Sender "${message.originatingAddress}" is not a recognized bank`,
      };
    }

    const parsed = parseSmsTransaction(
      message.body,
      categories,
      budgets,
      undefined,
      config
    );

    if (!parsed) {
      return {
        success: false,
        reason: "Message was ignored (e.g. ATM cash withdrawal or unparsed)",
      };
    }

    const customNotifId = `sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await storeSmsTransaction(customNotifId, parsed);

    const notifId = await Notifications.scheduleNotificationAsync({
      identifier: customNotifId,
      content: {
        title:
          parsed.type === "income"
            ? "💰 Income Detected"
            : "💳 Expense Detected",
        body: `${parsed.type === "income" ? "+" : "-"}${parsed.amount} EGP — ${parsed.description}. Tap to log it.`,
        data: {
          type: "sms-transaction",
          smsNotifId: customNotifId,
        },
        sound: true,
      },
      trigger: null,
    });

    if (notifId && notifId !== customNotifId) {
      await storeSmsTransaction(notifId, parsed);
    }

    return { success: true, transaction: parsed };
  }
}

export const smsService = new SmsService();
