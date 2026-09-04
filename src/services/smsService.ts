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
import { ParsedTransaction, Budget } from "../types";
import { isBankSender, parseSmsTransaction } from "./smsParser";

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
}

// ── Store / retrieve per-notification transaction ────────────────────
export async function storeSmsTransaction(
  notifId: string,
  tx: ParsedTransaction
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${SMS_TX_KEY_PREFIX}${notifId}`,
      JSON.stringify(tx)
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
    return JSON.parse(raw) as ParsedTransaction;
  } catch {
    return null;
  }
}

export async function clearSmsTransaction(notifId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${SMS_TX_KEY_PREFIX}${notifId}`);
  } catch {}
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
          if (!message?.originatingAddress || !message?.body) return;

          // Check feature toggle
          const enabled = await getSmsDetectionEnabled();
          if (!enabled) return;

          // Filter non-bank senders
          if (!isBankSender(message.originatingAddress)) return;

          console.log(
            `💬 [SmsService] Bank SMS from: ${message.originatingAddress}`
          );

          const parsed = parseSmsTransaction(
            message.body,
            categories,
            budgets
          );

          if (!parsed) return;

          console.log(
            "✅ [SmsService] Parsed:",
            parsed.type,
            parsed.amount,
            parsed.description
          );

          // Schedule notification — get back the notif identifier
          const notifId = await Notifications.scheduleNotificationAsync({
            content: {
              title:
                parsed.type === "income"
                  ? "💰 Income Detected"
                  : "💳 Expense Detected",
              body: `${parsed.type === "income" ? "+" : "-"}${parsed.amount} EGP — ${parsed.description}. Tap to log it.`,
              data: {
                type: "sms-transaction",
                // The actual tx is stored in AsyncStorage; we pass the key
                smsNotifId: "pending", // will be replaced below
              },
              sound: true,
            },
            trigger: null, // immediate
          });

          // Store the transaction keyed by the notification identifier
          await storeSmsTransaction(notifId, parsed);

          // Update the data payload so the tap handler can look it up
          // (expo-notifications doesn't let us update after scheduling,
          //  so we write the notifId into AsyncStorage as well as a
          //  'latest' pointer for convenience)
          await AsyncStorage.setItem(
            `${SMS_TX_KEY_PREFIX}${notifId}`,
            JSON.stringify({ ...parsed, _notifId: notifId })
          );
        } catch (error) {
          console.error("[SmsService] Error processing SMS:", error);
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

    if (!isBankSender(message.originatingAddress)) {
      return {
        success: false,
        reason: `Sender "${message.originatingAddress}" is not a recognized bank`,
      };
    }

    const parsed = parseSmsTransaction(
      message.body,
      categories,
      budgets
    );

    if (!parsed) {
      return {
        success: false,
        reason: "Message was ignored (e.g. ATM cash withdrawal or unparsed)",
      };
    }

    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title:
          parsed.type === "income"
            ? "💰 Income Detected"
            : "💳 Expense Detected",
        body: `${parsed.type === "income" ? "+" : "-"}${parsed.amount} EGP — ${parsed.description}. Tap to log it.`,
        data: {
          type: "sms-transaction",
          smsNotifId: "pending",
        },
        sound: true,
      },
      trigger: null,
    });

    await storeSmsTransaction(notifId, parsed);
    await AsyncStorage.setItem(
      `${SMS_TX_KEY_PREFIX}${notifId}`,
      JSON.stringify({ ...parsed, _notifId: notifId })
    );

    return { success: true, transaction: parsed };
  }
}

export const smsService = new SmsService();
