/**
 * SMS Detection Service (Android Only)
 *
 * Manages runtime Android permissions (READ_SMS, RECEIVE_SMS),
 * listens for incoming SMS messages matching known Egyptian bank senders,
 * parses transaction data via smsParser.ts, and triggers local notifications
 * for user review/confirmation.
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
import { ParsedTransaction, Budget } from "../types";
import { isBankSender, parseSmsTransaction } from "./smsParser";

export interface SmsMessage {
  originatingAddress: string;
  body: string;
  timestamp?: number;
}

class SmsService {
  private subscription: EmitterSubscription | null = null;
  private isListening: boolean = false;
  private pendingTransactions: ParsedTransaction[] = [];
  private onTransactionDetectedCallbacks: ((tx: ParsedTransaction) => void)[] = [];

  /**
   * Check if Android SMS detection is supported on the current platform
   */
  public isSupported(): boolean {
    return Platform.OS === "android";
  }

  /**
   * Request READ_SMS and RECEIVE_SMS permissions on Android.
   * Returns true if both permissions are granted.
   */
  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== "android") {
      return false;
    }

    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      ]);

      const readGranted =
        granted[PermissionsAndroid.PERMISSIONS.READ_SMS] ===
        PermissionsAndroid.RESULTS.GRANTED;
      const receiveGranted =
        granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] ===
        PermissionsAndroid.RESULTS.GRANTED;

      return readGranted && receiveGranted;
    } catch (error) {
      console.error("[SmsService] Failed to request SMS permissions:", error);
      return false;
    }
  }

  /**
   * Check if SMS permissions are currently granted without prompting.
   */
  public async hasPermissions(): Promise<boolean> {
    if (Platform.OS !== "android") {
      return false;
    }

    try {
      const readGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
      );
      const receiveGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      );
      return readGranted && receiveGranted;
    } catch (error) {
      return false;
    }
  }

  /**
   * Start listening for incoming SMS events from Android native module/broadcast receiver.
   */
  public startListening(
    categories: { id: string; name: string }[] = [],
    budgets?: Record<string, Budget> | Budget[] | null,
  ): void {
    if (Platform.OS !== "android" || this.isListening) {
      return;
    }

    this.isListening = true;

    // Listen to native broadcast receiver events emitted via DeviceEventEmitter
    this.subscription = DeviceEventEmitter.addListener(
      "onSMSReceived",
      async (message: SmsMessage) => {
        try {
          if (!message || !message.originatingAddress || !message.body) {
            return;
          }

          // Check if sender is a known bank
          if (!isBankSender(message.originatingAddress)) {
            return;
          }

          console.log(`💬 [SmsService] Bank SMS received from: ${message.originatingAddress}`);

          const parsed = parseSmsTransaction(
            message.body,
            categories,
            budgets,
          );

          if (parsed) {
            console.log("✅ [SmsService] Parsed bank transaction:", JSON.stringify(parsed));
            this.pendingTransactions.push(parsed);

            // Trigger local notification to prompt user review
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `💳 Bank ${parsed.type === "income" ? "Deposit" : "Expense"} Detected`,
                body: `Tap to review EGP ${parsed.amount} at ${parsed.description}`,
                data: {
                  type: "sms-transaction",
                  transaction: parsed,
                },
              },
              trigger: null, // Immediate
            });

            // Notify registered UI listeners
            this.onTransactionDetectedCallbacks.forEach((cb) => cb(parsed));
          }
        } catch (error) {
          console.error("[SmsService] Error processing incoming SMS:", error);
        }
      },
    );
  }

  /**
   * Stop listening for incoming SMS.
   */
  public stopListening(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.isListening = false;
  }

  /**
   * Register a callback for when an SMS transaction is detected while app is open.
   */
  public addTransactionListener(cb: (tx: ParsedTransaction) => void): () => void {
    this.onTransactionDetectedCallbacks.push(cb);
    return () => {
      this.onTransactionDetectedCallbacks =
        this.onTransactionDetectedCallbacks.filter((c) => c !== cb);
    };
  }

  /**
   * Get and clear any pending transactions detected in the background.
   */
  public consumePendingTransactions(): ParsedTransaction[] {
    const items = [...this.pendingTransactions];
    this.pendingTransactions = [];
    return items;
  }
}

export const smsService = new SmsService();
