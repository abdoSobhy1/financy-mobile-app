import React, { useEffect, useState } from "react";
import { View, Text, AppState } from "react-native";
import { Provider } from "react-redux";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import * as SplashScreen from "expo-splash-screen";
import { store } from "./src/store";
import AppNavigator from "./src/navigation/AppNavigator";
import { DatabaseManager } from "./src/database";
import {
  LoadingOverlay,
  ErrorBoundary,
  ToastProvider,
} from "./src/components/ui";
import { initializeFirebase } from "./src/services/firebase";
import { AuthProvider } from "./src/contexts/AuthContext";
import { SyncProvider } from "./src/contexts/SyncProvider";
import { offlineFirstSync } from "./src/services/OfflineFirstSync";
import { useSyncDataRefresh } from "./src/hooks";
import { ShimmerProvider } from "react-native-fast-shimmer";
import { ThemeProvider } from "./src/components/ui/ThemeProvider";

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
          // Don't fail app initialization if notifications fail
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

    // Cleanup function
    return () => {
      if (networkUnsubscribe) {
        networkUnsubscribe();
      }
      if (appStateListener) {
        appStateListener.remove();
      }
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
          <ThemeProvider>
            <ErrorBoundary>
              <Provider store={store}>
                <AuthProvider>
                  <ToastProvider>
                    <BottomSheetModalProvider>
                      <SyncProvider>
                        {!isLoading && !dbError && <AppWithSyncRefresh />}
                      </SyncProvider>
                    </BottomSheetModalProvider>
                  </ToastProvider>
                </AuthProvider>
              </Provider>
            </ErrorBoundary>
          </ThemeProvider>
        </ShimmerProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
