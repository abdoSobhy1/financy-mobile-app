import React from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useAuth } from "../contexts/AuthContext";
import { SignInScreen } from "../screens/SignInScreen";
import TabNavigator from "./TabNavigator";
import SettingsStackNavigator from "./SettingsStackNavigator";
import { Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { UI } from "../constants";
import { useAppTheme } from "../components/ui/ThemeProvider";

export const navigationRef = createNavigationContainerRef<any>();

const Stack = createStackNavigator();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const { colors } = useAppTheme();

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="Settings" component={SettingsStackNavigator} />
          </>
        ) : (
          <Stack.Screen name="SignIn" component={SignInScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B0B1E",
    padding: UI.SPACING.LG,
  },
  loadingText: {
    color: "#A0A0B0",
    fontSize: 16,
    marginTop: UI.SPACING.MD,
    textAlign: "center",
  },
  errorTitle: {
    color: "#FF7675",
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: UI.SPACING.SM,
  },
  errorMessage: {
    color: "#A0A0B0",
    fontSize: 14,
    textAlign: "center",
  },
});

export default AppNavigator;
