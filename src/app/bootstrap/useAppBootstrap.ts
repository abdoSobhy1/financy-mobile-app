import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";

import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { DatabaseManager } from "../../infrastructure/database";
import { navigationRef } from "../navigation/AppNavigator";
import { store } from "../store";

import { initializeFirebase } from "../../infrastructure/firebase/client";

import { markSynced as markBudgetSynced } from "../../features/budgets/store/budgetsSlice";
import { markSynced as markCategorySynced } from "../../features/categories/store/categoriesSlice";
import { markSynced as markDebtSynced } from "../../features/debts/store/debtsSlice";
import { markSynced as markTransactionSynced } from "../../features/transactions/store/transactionsSlice";
import { offlineFirstSync, registerSyncDispatchListener } from "../../infrastructure/sync/OfflineFirstSync";
import { setLastSync } from "../../infrastructure/sync/store/syncSlice";
import { registerDeltaSyncListener } from "../../infrastructure/sync/syncService";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchSettings } from "../../features/settings/store/settingsSlice";
import { clearSmsTransaction, retrieveSmsTransaction, smsService, getSmsDetectionEnabled } from "../../features/sms/services/smsService";
import { subscribeSmsConfig } from "../../features/sms/services/smsConfigService";

SplashScreen.preventAutoHideAsync();

registerSyncDispatchListener((tableName, recordId) => {
  switch (tableName) {
    case "transactions":
      store.dispatch(markTransactionSynced(recordId));
      break;
    case "budgets":
      store.dispatch(markBudgetSynced(recordId));
      break;
    case "categories":
      store.dispatch(markCategorySynced(recordId));
      break;
    case "debts":
    case "debt_payments":
      store.dispatch(markDebtSynced(recordId));
      break;
    default:
      break;
  }
});

registerDeltaSyncListener((timestamp) => {
  store.dispatch(setLastSync(timestamp));
});

export function useAppBootstrap() {

  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    let networkUnsubscribe: (() => void) | null = null;
    let appStateListener: any = null;
    const smsConfigUnsubscribe = subscribeSmsConfig(() => {
      (async () => {
        if (!(await getSmsDetectionEnabled())) {
          smsService.stopListening();
        } else if (await smsService.hasPermissions()) {
          const state = store.getState();
          smsService.startListening(Object.values(state.categories.items), state.budgets.items);
        }
      })().catch((error) => console.warn("Could not apply synced SMS toggle:", error));
    });

    const initApp = async () => {
      try {
        setIsLoading(true);
        initializeFirebase();
        const dbManager = DatabaseManager.getInstance();
        await dbManager.init();

        // Hydrate theme & currency settings early
        try {
          await store.dispatch(fetchSettings()).unwrap();
        } catch (e) {
          console.warn("Could not pre-fetch settings:", e);
        }

        // Clean up legacy app lock state if present
        AsyncStorage.multiRemove([
          "financy_app_lock_enabled_v1",
          "financy_app_lock_pin_hash_v1",
        ]).catch(() => { });
        const { databaseMigration } =
          await import("../../infrastructure/database/migrations/databaseMigration");
        const needsMigrations = await databaseMigration.needsMigrations();
        if (needsMigrations) {
          await databaseMigration.runCloudCompatibilityMigrations();
        } else {
        }

        // Initialize sync service (includes network listener and periodic sync)
        networkUnsubscribe = offlineFirstSync.initialize();

        // Setup app state listener to sync when app comes to foreground
        appStateListener = AppState.addEventListener(
          "change",
          async (nextAppState) => {
            if (nextAppState === "active") {
              offlineFirstSync.forceSyncAll().catch((error) => {
                console.error("Background sync failed:", error);
              });

              // Also ensure notifications are still scheduled
              try {
                const { default: NotificationService } =
                  await import("../../infrastructure/notifications/notificationService");
                const notificationService = NotificationService.getInstance();

                // Smart check - only reschedules if needed
                await notificationService.checkAndRescheduleIfNeeded();
              } catch (error) {
                console.error(
                  "Failed to check/reschedule notifications:",
                  error,
                );
              }
            }
          },
        );
        try {
          const { default: NotificationService } =
            await import("../../infrastructure/notifications/notificationService");
          const notificationService = NotificationService.getInstance();
          await notificationService.initialize();
        } catch (error) {
          console.error("Failed to initialize notification service:", error);
        }

        // Initialize SMS Detection Service (Android only)
        if (Platform.OS === "android") {
          try {
            const state = store.getState() as any;
            const cats = Object.values(state.categories?.items || {}) as any[];
            const budgets = state.budgets?.items || {};
            const hasPerms = await smsService.hasPermissions();
            if (hasPerms) {
              smsService.startListening(
                cats.map((c: any) => ({ id: c.id, name: c.name })),
                budgets
              );
            } else {
              // Request permissions — user will see the dialog
              const granted = await smsService.requestPermissions();
              if (granted) {
                smsService.startListening(
                  cats.map((c: any) => ({ id: c.id, name: c.name })),
                  budgets
                );
              }
            }
          } catch (e) {
            console.warn("SMS service init failed (non-critical):", e);
          }
        }
        setIsLoading(false);
      } catch (error) {
        console.error("App initialization failed:", error);
        const errorMessage =
          error instanceof Error
            ? `Initialization failed: ${error.message}`
            : "Failed to initialize app. Please restart.";
        setDbError(errorMessage);
        setIsLoading(false);
      } finally {
        // Hide the splash screen after initialization is complete
        await SplashScreen.hideAsync();
      }
    };

    initApp();

    // ── Notification tap handler — SMS deep-link ──────────────────────
    // When user taps an SMS notification, open AddTransaction pre-filled
    const handleNotificationResponse = async (
      response: Notifications.NotificationResponse | null
    ) => {
      if (!response) return;
      const data = response.notification.request.content.data as any;
      if (data?.type !== "sms-transaction") return;

      // Resolve key from either custom data payload or notification request identifier
      const requestNotifId = response.notification.request.identifier;
      const payloadNotifId =
        data?.smsNotifId && data.smsNotifId !== "pending"
          ? String(data.smsNotifId)
          : null;

      let tx = payloadNotifId ? await retrieveSmsTransaction(payloadNotifId) : null;
      if (!tx && requestNotifId) {
        tx = await retrieveSmsTransaction(requestNotifId);
      }
      if (!tx) return;

      // Navigate — wait for navigator AND Main authenticated stack to be ready
      let attempts = 0;
      const navigate = async () => {
        const rootState = navigationRef.isReady()
          ? navigationRef.getRootState()
          : undefined;
        const hasMainRoute = rootState?.routeNames?.includes("Main");

        if (navigationRef.isReady() && hasMainRoute) {
          if (payloadNotifId) await clearSmsTransaction(payloadNotifId);
          if (requestNotifId) await clearSmsTransaction(requestNotifId);
          (navigationRef as any).navigate("Main", {
            screen: "Transactions",
            params: {
              screen: "AddTransaction",
              params: { prefilledData: tx },
            },
          });
        } else if (attempts < 50) {
          attempts += 1;
          setTimeout(navigate, 200);
        }
      };
      navigate();
    };

    // Cold-start notification click check
    Notifications.getLastNotificationResponseAsync().then(handleNotificationResponse).catch(() => { });

    // Foreground/background notification click listener
    const notifSubscription =
      Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => {
      if (networkUnsubscribe) networkUnsubscribe();
      if (appStateListener) appStateListener.remove();
      notifSubscription.remove();
      smsService.stopListening();
      smsConfigUnsubscribe();
    };
  }, []);
  return { isLoading, dbError };
}
