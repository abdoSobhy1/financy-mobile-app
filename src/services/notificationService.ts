import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TRANSACTION_REMINDER_TASK = "TRANSACTION_REMINDER";

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationSettings {
  transactionReminders: boolean;
  morningReminderTime: string; // "09:00"
  eveningReminderTime: string; // "20:00"
}

const DEFAULT_SETTINGS: NotificationSettings = {
  transactionReminders: true,
  morningReminderTime: "09:00",
  eveningReminderTime: "20:00",
};

class NotificationService {
  private static instance: NotificationService;
  private settings: NotificationSettings = DEFAULT_SETTINGS;
  private initialized: boolean = false;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private constructor() {
    // Don't initialize automatically to prevent issues during app startup
  }

  async initialize() {
    console.log("🚀 NotificationService.initialize() called");
    console.warn("🚀 NotificationService.initialize() called");

    if (this.initialized) {
      console.log("✅ Service already initialized, skipping");
      console.warn("✅ Service already initialized, skipping");
      return true;
    }

    try {
      console.log("🔐 Requesting notification permissions...");
      console.warn("🔐 Requesting notification permissions...");

      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      console.log(`📋 Permission status: ${status}`);
      console.warn(`📋 Permission status: ${status}`);

      if (status !== "granted") {
        console.log("❌ Notification permission denied");
        console.warn("❌ Notification permission denied");
        this.initialized = true; // Mark as initialized even if permission denied
        return false;
      }

      console.log("📂 Loading notification settings...");
      console.warn("📂 Loading notification settings...");

      // Load settings
      await this.loadSettings();

      console.log("🔧 Registering background tasks...");
      console.warn("🔧 Registering background tasks...");

      // Register background tasks
      this.registerBackgroundTasks();

      this.initialized = true;
      console.log("✅ NotificationService initialized successfully");
      console.warn("✅ NotificationService initialized successfully");

      // Automatically schedule all notifications after initialization
      console.log("📅 Auto-scheduling notifications after initialization...");
      console.warn("📅 Auto-scheduling notifications after initialization...");
      await this.scheduleAllNotifications();

      return true;
    } catch (error) {
      console.error("❌ Failed to initialize NotificationService:", error);
      console.warn("❌ Failed to initialize NotificationService:", error);

      if (error instanceof Error) {
        console.error(`   Error details: ${error.message}`);
        console.warn(`   Error details: ${error.message}`);
      }

      this.initialized = true; // Mark as initialized to prevent retry loops
      return false;
    }
  }

  async loadSettings() {
    try {
      const settingsJson = await AsyncStorage.getItem("notificationSettings");
      if (settingsJson) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(settingsJson) };
      }
    } catch (error) {
      console.error("Failed to load notification settings:", error);
    }
  }

  async saveSettings(newSettings: Partial<NotificationSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      await AsyncStorage.setItem("notificationSettings", JSON.stringify(this.settings));
      // Reschedule notifications with new settings
      await this.scheduleAllNotifications();
    } catch (error) {
      console.error("Failed to save notification settings:", error);
    }
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  private registerBackgroundTasks() {
    // Register transaction reminder task
    TaskManager.defineTask(TRANSACTION_REMINDER_TASK, async () => {
      await this.sendTransactionReminder();
      return { success: true };
    });
  }

  async scheduleAllNotifications() {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      console.log("NotificationService not properly initialized, cannot schedule notifications");
      return;
    }

    try {
      // Cancel existing notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log("✅ Cancelled all existing scheduled notifications");

      if (this.settings.transactionReminders) {
        console.log("📅 Scheduling transaction reminders...");
        await this.scheduleTransactionReminders();
      }

      // Debug: Check what notifications were actually scheduled
      await this.logScheduledNotifications();
    } catch (error) {
      console.error("Failed to schedule notifications:", error);
    }
  }

  private async scheduleTransactionReminders() {
    // Schedule morning reminder
    const morningTime = this.parseTimeString(this.settings.morningReminderTime);
    await this.scheduleRepeatingNotification(
      "transaction-reminder-morning",
      "Add Your Transactions",
      "Don't forget to log your expenses and income for today!",
      morningTime.hour,
      morningTime.minute,
      true
    );

    // Schedule evening reminder
    const eveningTime = this.parseTimeString(this.settings.eveningReminderTime);
    await this.scheduleRepeatingNotification(
      "transaction-reminder-evening",
      "Daily Transaction Review",
      "Have you added all your transactions for today?",
      eveningTime.hour,
      eveningTime.minute,
      true
    );
  }

  private async scheduleRepeatingNotification(
    identifier: string,
    title: string,
    body: string,
    hour: number,
    minute: number,
    shouldShow: boolean = true
  ) {
    if (!this.initialized) {
      console.log("NotificationService not initialized, skipping notification schedule");
      console.warn("NotificationService not initialized, skipping notification schedule");
      return null;
    }

    // Validate input parameters
    if (hour < 0 || hour > 23) {
      console.error(`❌ Invalid hour: ${hour}. Must be 0-23`);
      console.warn(`❌ Invalid hour: ${hour}. Must be 0-23`);
      return null;
    }

    if (minute < 0 || minute > 59) {
      console.error(`❌ Invalid minute: ${minute}. Must be 0-59`);
      console.warn(`❌ Invalid minute: ${minute}. Must be 0-59`);
      return null;
    }

    const trigger: Notifications.NotificationTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    };

    console.log(`📅 Attempting to schedule "${identifier}" at ${hour}:${minute.toString().padStart(2, "0")}`);
    console.warn(`📅 Attempting to schedule "${identifier}" at ${hour}:${minute.toString().padStart(2, "0")}`);

    try {
      // First check if we can schedule notifications
      const permissions = await Notifications.getPermissionsAsync();
      if (!permissions.granted) {
        console.error("❌ No notification permissions - cannot schedule");
        console.warn("❌ No notification permissions - cannot schedule");
        return null;
      }

      const notificationRequest = {
        identifier,
        content: {
          title,
          body,
          sound: shouldShow ? "default" : false,
          badge: shouldShow ? 1 : 0,
          data: {
            type: "scheduled",
            identifier,
            shouldShow,
            scheduledAt: new Date().toISOString(),
          },
        },
        trigger,
      };

      console.log(`🔧 Notification request:`, JSON.stringify(notificationRequest, null, 2));
      console.warn(`🔧 Notification request prepared for ${identifier}`);

      const notificationId = await Notifications.scheduleNotificationAsync(notificationRequest);

      if (notificationId) {
        console.log(`✅ Scheduled notification "${identifier}" with ID: ${notificationId}`);
        console.warn(`✅ Scheduled notification "${identifier}" with ID: ${notificationId}`);
        console.log(`   Time: ${hour}:${minute.toString().padStart(2, "0")}`);
        console.log(`   Title: ${title}`);
        return notificationId;
      } else {
        console.error(`❌ Scheduling returned null ID for ${identifier}`);
        console.warn(`❌ Scheduling returned null ID for ${identifier}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Failed to schedule notification ${identifier}:`, error);
      console.warn(`❌ Failed to schedule notification ${identifier}:`, error);

      // Log more details about the error
      if (error instanceof Error) {
        console.error(`   Error message: ${error.message}`);
        console.warn(`   Error message: ${error.message}`);
        console.error(`   Error stack: ${error.stack}`);
      }

      // Log the trigger that failed
      console.error(`   Failed trigger: ${JSON.stringify(trigger)}`);
      console.warn(`   Failed trigger: ${JSON.stringify(trigger)}`);

      return null;
    }
  }

  private parseTimeString(timeStr: string): { hour: number; minute: number } {
    const [hour, minute] = timeStr.split(":").map(Number);
    return { hour, minute };
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === "granted";
    } catch (error) {
      console.error("Failed to request notification permissions:", error);
      return false;
    }
  }

  async sendTransactionReminder(): Promise<void> {
    if (!this.initialized) {
      console.log("NotificationService not initialized, cannot send reminder");
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Transaction Reminder",
          body: "Don't forget to add your daily transactions!",
          sound: true,
          badge: 1,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error("Failed to send transaction reminder:", error);
    }
  }

  async getNotificationSettings(): Promise<NotificationSettings & { enabled: boolean; times: string[] }> {
    return {
      ...this.settings,
      enabled: this.initialized,
      times: [this.settings.morningReminderTime, this.settings.eveningReminderTime],
    };
  }

  private activeBudgetNotificationIds: Map<string, string> = new Map();

  async sendBudgetAlertNotification(
    budgetName: string,
    spentFormatted: string,
    limitFormatted: string,
    percentageUsed: number,
    budgetId?: string
  ) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      const budgetKey = (budgetId || budgetName).replace(/[^a-zA-Z0-9_-]/g, "_");
      const identifier = `budget-alert-${budgetKey}`;

      // Dismiss any existing presented notification for this budget so it updates/replaces cleanly
      const prevNotifId = this.activeBudgetNotificationIds.get(budgetKey) || identifier;
      try {
        await Notifications.dismissNotificationAsync(prevNotifId);
      } catch {}
      if (prevNotifId !== identifier) {
        try {
          await Notifications.dismissNotificationAsync(identifier);
        } catch {}
      }

      const isOver = percentageUsed >= 100;
      const title = isOver
        ? `🚨 Over Budget: ${budgetName}`
        : `⚠️ Budget Alert: ${budgetName}`;
      const body = isOver
        ? `You have spent ${spentFormatted} (${Math.round(percentageUsed)}% of your ${limitFormatted} limit).`
        : `You have reached ${Math.round(percentageUsed)}% of your ${budgetName} budget (${spentFormatted} / ${limitFormatted}).`;

      const scheduledId = await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title,
          body,
          sound: true,
          badge: 1,
          data: {
            type: "budget_alert",
            budgetId: budgetId || budgetName,
            budgetName,
          },
        },
        trigger: null,
      });
      if (scheduledId) {
        this.activeBudgetNotificationIds.set(budgetKey, scheduledId);
      }
    } catch (error) {
      console.error("Failed to send budget alert notification:", error);
    }
  }

  async showSyncNotification(message: string = "Syncing data..."): Promise<string | null> {
    try {
      // Initialize if not already done
      if (!this.initialized) {
        console.log("Initializing NotificationService for sync notification...");
        await this.initialize();
      }

      if (!this.initialized) {
        console.warn("NotificationService failed to initialize, cannot show sync notification");
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Sync in Progress",
          body: message,
          data: {
            type: "sync",
            persistent: true,
          },
          sound: false, // No sound for sync notifications
        },
        trigger: null, // Show immediately
      });

      console.log("Sync notification shown with ID:", notificationId);
      return notificationId;
    } catch (error) {
      console.error("Failed to show sync notification:", error);
      return null;
    }
  }

  async dismissSyncNotification(notificationId: string | null) {
    if (!notificationId) {
      console.warn("No notification ID provided for dismissal");
      return;
    }

    try {
      // For presented notifications (trigger: null), use dismissNotificationAsync
      await Notifications.dismissNotificationAsync(notificationId);
      console.log("Sync notification dismissed:", notificationId);
    } catch (error) {
      console.error("Failed to dismiss sync notification:", error);
    }
  }

  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Method to force re-schedule all notifications (useful for debugging)
  async forceRescheduleNotifications() {
    console.log("🔄 Force rescheduling all notifications...");
    console.warn("🔄 Force rescheduling all notifications...");

    try {
      // Ensure service is initialized
      if (!this.initialized) {
        console.log("🚀 Initializing service first...");
        console.warn("🚀 Initializing service first...");
        await this.initialize();
      }

      // Cancel all existing notifications
      console.log("🗑️ Canceling all existing notifications...");
      console.warn("🗑️ Canceling all existing notifications...");
      await this.cancelAllNotifications();

      // Schedule new notifications
      console.log("📅 Scheduling new notifications...");
      console.warn("📅 Scheduling new notifications...");
      await this.scheduleAllNotifications();

      // Verify what was scheduled
      console.log("🔍 Checking what was actually scheduled...");
      console.warn("🔍 Checking what was actually scheduled...");
      await this.logScheduledNotifications();

      console.log("✅ Force reschedule completed");
      console.warn("✅ Force reschedule completed");
    } catch (error) {
      console.error("❌ Force reschedule failed:", error);
      console.warn("❌ Force reschedule failed:", error);
    }
  }

  // Method to check if notifications need to be rescheduled
  async checkAndRescheduleIfNeeded() {
    try {
      if (!this.initialized) {
        await this.initialize();
        return; // initialize() already calls scheduleAllNotifications()
      }

      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const expectedNotifications: string[] = [];

      if (this.settings.transactionReminders) {
        expectedNotifications.push("transaction-reminder-morning");
        expectedNotifications.push("transaction-reminder-evening");
      }

      const scheduledIdentifiers = scheduledNotifications.map((n) => n.identifier);
      const missingNotifications = expectedNotifications.filter((id) => !scheduledIdentifiers.includes(id));

      if (missingNotifications.length > 0) {
        console.log(`📅 Missing notifications detected: ${missingNotifications.join(", ")}`);
        console.log("🔄 Rescheduling all notifications...");
        await this.scheduleAllNotifications();
      } else {
        console.log("✅ All expected notifications are scheduled");
      }
    } catch (error) {
      console.error("Failed to check notifications:", error);
    }
  }

  // Debug method to check notification permissions and settings
  async checkNotificationStatus() {
    try {
      const permissions = await Notifications.getPermissionsAsync();
      console.log("📋 Notification Permission Status:");
      console.log(`   Status: ${permissions.status}`);
      console.log(`   Can ask again: ${permissions.canAskAgain}`);
      console.log(`   Granted: ${permissions.granted}`);

      if (permissions.android) {
        console.log("🤖 Android specific settings:");
        console.log(`   Importance: ${permissions.android.importance}`);
        console.log(`   Interruption filter: ${permissions.android.interruptionFilter}`);
      }

      if (permissions.ios) {
        console.log("🍎 iOS specific settings:");
        console.log(`   Allow alert: ${permissions.ios.allowsAlert}`);
        console.log(`   Allow badge: ${permissions.ios.allowsBadge}`);
        console.log(`   Allow sound: ${permissions.ios.allowsSound}`);
      }

      return permissions;
    } catch (error) {
      console.error("Failed to check notification permissions:", error);
      return null;
    }
  }

  // Debug method to log currently scheduled notifications
  async logScheduledNotifications() {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📱 Currently scheduled notifications: ${scheduledNotifications.length}`);

      scheduledNotifications.forEach((notification, index) => {
        console.log(`${index + 1}. ID: ${notification.identifier}`);
        console.log(`   Title: ${notification.content.title}`);
        console.log(`   Trigger: ${JSON.stringify(notification.trigger)}`);
      });

      if (scheduledNotifications.length === 0) {
        console.log("⚠️  No notifications are currently scheduled!");
      }
    } catch (error) {
      console.error("Failed to get scheduled notifications:", error);
    }
  }

  // Comprehensive debug method
  async runNotificationDiagnostics() {
    console.log("🔍 Running Notification Diagnostics...");
    console.warn("🔍 Running Notification Diagnostics..."); // Also use warn for visibility

    try {
      // Check initialization
      console.log(`📱 Service initialized: ${this.initialized}`);
      console.warn(`📱 Service initialized: ${this.initialized}`);

      // Force initialization if not done
      if (!this.initialized) {
        console.log("🔧 Forcing initialization...");
        console.warn("🔧 Forcing initialization...");
        await this.initialize();
      }

      // Check permissions
      console.log("🔐 Checking permissions...");
      console.warn("🔐 Checking permissions...");
      await this.checkNotificationStatus();

      // Check scheduled notifications
      console.log("📅 Checking scheduled notifications...");
      console.warn("📅 Checking scheduled notifications...");
      await this.logScheduledNotifications();

      // Check settings
      console.log("⚙️ Current settings:");
      console.warn("⚙️ Current settings:");
      console.log(JSON.stringify(this.settings, null, 2));
      console.warn(JSON.stringify(this.settings, null, 2));

      console.log("✅ Diagnostics complete!");
      console.warn("✅ Diagnostics complete!");

      // Also alert to make sure we can see output
      if (typeof alert !== "undefined") {
        alert("Notification diagnostics completed - check console for details");
      }
    } catch (error) {
      console.error("❌ Diagnostics failed:", error);
      console.warn("❌ Diagnostics failed:", error);

      if (typeof alert !== "undefined") {
        alert(`Diagnostics failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  }

  // Test method to schedule a notification in 10 seconds
  async scheduleTestNotification() {
    console.log("🧪 Starting test notification process...");
    console.warn("🧪 Starting test notification process..."); // Also use warn for visibility

    if (!this.initialized) {
      console.log("🔧 Initializing notification service for test...");
      console.warn("🔧 Initializing notification service for test...");
      await this.initialize();
    }

    // Run diagnostics first
    console.log("🔍 Running diagnostics before test...");
    console.warn("🔍 Running diagnostics before test...");
    await this.runNotificationDiagnostics();

    try {
      console.log("🗑️ Canceling existing test notifications...");
      console.warn("🗑️ Canceling existing test notifications...");

      // Cancel any existing test notifications
      await Notifications.cancelScheduledNotificationAsync("test-notification");

      console.log("📱 Scheduling test notification...");
      console.warn("📱 Scheduling test notification...");

      const notificationId = await Notifications.scheduleNotificationAsync({
        identifier: "test-notification",
        content: {
          title: "🧪 Test Notification",
          body: `Scheduled at ${new Date().toLocaleTimeString()} - This should appear in 10 seconds`,
          sound: "default",
          data: { type: "test", scheduledAt: Date.now() },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 10,
        },
      });

      console.log("✅ Test notification scheduled with ID:", notificationId);
      console.warn("✅ Test notification scheduled with ID:", notificationId);

      // Also try an immediate notification for comparison
      console.log("📢 Sending immediate test notification...");
      console.warn("📢 Sending immediate test notification...");

      const immediateId = await Notifications.scheduleNotificationAsync({
        identifier: "test-immediate",
        content: {
          title: "🚨 Immediate Test",
          body: "This notification should appear right now",
          sound: "default",
        },
        trigger: null, // Immediate
      });

      console.log("✅ Immediate notification sent with ID:", immediateId);
      console.warn("✅ Immediate notification sent with ID:", immediateId);

      // Verify it was scheduled
      setTimeout(async () => {
        console.log("🔍 Checking scheduled notifications after 1 second...");
        console.warn("🔍 Checking scheduled notifications after 1 second...");
        await this.logScheduledNotifications();
      }, 1000);

      return notificationId;
    } catch (error) {
      console.error("❌ Failed to schedule test notification:", error);
      console.warn("❌ Failed to schedule test notification:", error);

      if (error instanceof Error) {
        console.error(`   Error details: ${error.message}`);
        console.warn(`   Error details: ${error.message}`);
      }

      if (typeof alert !== "undefined") {
        alert(`Test notification failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }

      return null;
    }
  }
}

export default NotificationService;
