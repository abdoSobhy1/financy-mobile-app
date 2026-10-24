import { storeSmsTransaction } from "./smsService";
import { parseSmsTransaction } from "./smsParser";
import { db } from "../database/queries";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DatabaseManager } from "../database";

// AsyncStorage key prefix
const SMS_TX_KEY_PREFIX = "sms_tx_";
const SMS_ENABLED_KEY = "sms_detection_enabled";

export default async (taskData: any) => {
  try {
    const { originatingAddress, body, timestamp } = taskData;

    // Check feature toggle
    const val = await AsyncStorage.getItem(SMS_ENABLED_KEY);
    const enabled = val === null ? true : val === "true";
    if (!enabled) return;

    // Ensure database is initialized
    await DatabaseManager.getInstance().init();

    // Query categories and budgets
    const categories = await db.categories.getAllCategories();
    const budgets = await db.budgets.getAllBudgets();

    const parsed = parseSmsTransaction(
      body,
      categories,
      budgets
    );

    if (!parsed) return;

    // Schedule notification
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title:
          parsed.type === "income"
            ? "💰 Income Detected"
            : "💸 Expense Detected",
        body: `${parsed.type === "income" ? "+" : "-"}${parsed.amount} EGP — ${parsed.description}. Tap to log it.`,
        data: {
          type: "sms-transaction",
          smsNotifId: "pending",
        },
        sound: true,
      },
      trigger: null,
    });

    // Store the transaction keyed by the notification identifier
    await storeSmsTransaction(notifId, parsed);

    // Update the data payload pointer
    await AsyncStorage.setItem(
      `${SMS_TX_KEY_PREFIX}${notifId}`,
      JSON.stringify({ ...parsed, _notifId: notifId })
    );

    console.log("[SmsHeadlessTask] Parsed & Notified:", parsed.amount, parsed.description);
  } catch (e) {
    console.error("[SmsHeadlessTask] Error:", e);
  }
};
