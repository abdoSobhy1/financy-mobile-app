import { useAppBootstrap } from "./src/app/bootstrap/useAppBootstrap";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { Provider } from "react-redux";

import AppNavigator from "./src/app/navigation/AppNavigator";
import { store } from "./src/app/store";

import { ErrorBoundary, GlobalAlertProvider, ToastProvider } from "./src/shared/ui";

import { AuthProvider } from "./src/features/auth/providers/AuthContext";
import { SyncProvider } from "./src/infrastructure/sync/providers/SyncProvider";

import { ShimmerProvider } from "react-native-fast-shimmer";
import { useSyncDataRefresh } from "./src/infrastructure/sync/hooks/useSyncDataRefresh";
import { ThemeProvider } from "./src/shared/theme/ThemeProvider";

// Internal component that uses the sync hook
const AppWithSyncRefresh = () => {
  useSyncDataRefresh();
  return <AppNavigator />;
};

export default function App() {
  const { isLoading, dbError } = useAppBootstrap();

  if (dbError) {
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
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
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
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
