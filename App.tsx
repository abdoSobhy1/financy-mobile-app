import React, { useEffect, useRef, useState } from "react";
import { View, Text, AppState, Platform } from "react-native";
import { Provider } from "react-redux";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { store } from "./src/store";
import AppNavigator, { navigationRef } from "./src/navigation/AppNavigator";
import { DatabaseManager } from "./src/database";
import {
  LoadingOverlay,
  ErrorBoundary,
  ToastProvider,
  GlobalAlertProvider,
} from "./src/components/ui";
import { initializeFirebase } from "./src/services/firebase";
import { AuthProvider } from "./src/contexts/AuthContext";
import { SyncProvider } from "./src/contexts/SyncProvider";
import { offlineFirstSync } from "./src/services/OfflineFirstSync";
import { useSyncDataRefresh } from "./src/hooks";
import { ShimmerProvider } from "react-native-fast-shimmer";
import { ThemeProvider } from "./src/components/ui/ThemeProvider";
import { AppLockOverlay } from "./src/components/ui/AppLockOverlay";
import { fetchSettings } from "./src/store/slices/settingsSlice";
import {
  smsService,
  retrieveSmsTransaction,
  clearSmsTransaction,
  SMS_TX_KEY_PREFIX,
} from "./src/services/smsService";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Internal component that uses the sync hook
const AppWithSyncRefresh = () => {
  useSyncDataRefresh();
  return <AppNavigator />;
};

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    let networkUnsubscribe: (() => void) | null = null;
    let appStateListener: any = null;

    const initApp = async () => {
      try {
        setIsLoading(true);

        // Initialize Firebase
        console.log("Initializing Firebase...");
        initializeFirebase();

        // Initialize Database
        console.log("Initializing Database...");
        const dbManager = DatabaseManager.getInstance();
        await dbManager.init();

        // Hydrate theme & currency settings early
        try {
          await store.dispatch(fetchSettings()).unwrap();
        } catch (e) {
          console.warn("Could not pre-fetch settings:", e);
        }

        // Run database migrations if needed for cloud compatibility
        console.log("Checking for database migrations...");
        const { databaseMigration } =
          await import("./src/utils/databaseMigration");
        const needsMigrations = await databaseMigration.needsMigrations();
        if (needsMigrations) {
          console.log("Running database migrations for cloud compatibility...");
          await databaseMigration.runCloudCompatibilityMigrations();
        } else {
          console.log("Database is up to date");
        }

        // Initialize Offline-First Sync
        console.log("Setting up offline-first sync...");

        // Initialize sync service (includes network listener and periodic sync)
        networkUnsubscribe = offlineFirstSync.initialize();

        // Setup app state listener to sync when app comes to foreground
        appStateListener = AppState.addEventListener(
          "change",
          async (nextAppState) => {
            if (nextAppState === "active") {
              console.log(
                "📱 App became active, checking for pending sync operations",
              );
              offlineFirstSync.forceSyncAll().catch((error) => {
                console.error("Background sync failed:", error);
              });

              // Also ensure notifications are still scheduled
              try {
                const { default: NotificationService } =
                  await import("./src/services/notificationService");
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

        // Initialize Notification Service
        console.log("Initializing notification service...");
        try {
          const { default: NotificationService } =
            await import("./src/services/notificationService");
          const notificationService = NotificationService.getInstance();
          await notificationService.initialize();
          console.log("Notification service initialized successfully");
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
              console.log("📱 SMS detection service started");
            } else {
              // Request permissions — user will see the dialog
              const granted = await smsService.requestPermissions();
              if (granted) {
                smsService.startListening(
                  cats.map((c: any) => ({ id: c.id, name: c.name })),
                  budgets
                );
                console.log("📱 SMS detection service started after permission grant");
              }
            }
          } catch (e) {
            console.warn("SMS service init failed (non-critical):", e);
          }
        }

        // Note: Initial cloud pull will happen after user authentication
        // See AuthContext for post-authentication cloud restore logic

        console.log("App initialization completed successfully");
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

      // The notification identifier is the key into AsyncStorage
      const notifId = response.notification.request.identifier;
      const tx = await retrieveSmsTransaction(notifId);
      if (!tx) return;

      // Clean up stored entry
      await clearSmsTransaction(notifId);

      // Navigate — wait for navigator to be ready
      const navigate = () => {
        if (navigationRef.isReady()) {
          (navigationRef as any).navigate("Main", {
            screen: "Transactions",
            params: {
              screen: "AddTransaction",
              params: { prefilledData: tx },
            },
          });
        } else {
          setTimeout(navigate, 200);
        }
      };
      navigate();
    };

    // Cold-start notification click check
    Notifications.getLastNotificationResponseAsync().then(handleNotificationResponse).catch(() => {});

    // Foreground/background notification click listener
    const notifSubscription =
      Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => {
      if (networkUnsubscribe) networkUnsubscribe();
      if (appStateListener) appStateListener.remove();
      notifSubscription.remove();
      smsService.stopListening();
    };
  }, []);
  if (dbError) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            backgroundColor: "#0F0F23",
          }}>
          <Text
            style={{
              fontSize: 18,
              color: "#EF4444",
              textAlign: "center",
              marginBottom: 10,
            }}>
            Database Error
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#CBD5E1",
              textAlign: "center",
            }}>
            {dbError}
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ShimmerProvider duration={1000}>
          <Provider store={store}>
            <ThemeProvider>
              <ErrorBoundary>
                <AuthProvider>
                  <ToastProvider>
                    <BottomSheetModalProvider>
                      <SyncProvider>
                        <GlobalAlertProvider>
                          {!isLoading && !dbError && <AppWithSyncRefresh />}
                          <AppLockOverlay />
                        </GlobalAlertProvider>
                      </SyncProvider>
                    </BottomSheetModalProvider>
                  </ToastProvider>
                </AuthProvider>
              </ErrorBoundary>
            </ThemeProvider>
          </Provider>
        </ShimmerProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
