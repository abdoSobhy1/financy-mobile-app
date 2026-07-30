import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useAuth } from "../contexts/AuthContext";
import { SignInScreen } from "../screens/SignInScreen";
import TabNavigator from "./TabNavigator";
import { Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { UI } from "../constants";

const Stack = createStackNavigator();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={UI.COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={TabNavigator} />
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
    backgroundColor: UI.COLORS.BACKGROUND,
    padding: UI.SPACING.LG,
  },
  loadingText: {
    color: UI.COLORS.TEXT_SECONDARY,
    fontSize: 16,
    marginTop: UI.SPACING.MD,
    textAlign: "center",
  },
  errorTitle: {
    color: UI.COLORS.ERROR,
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: UI.SPACING.SM,
  },
  errorMessage: {
    color: UI.COLORS.TEXT_SECONDARY,
    fontSize: 14,
    textAlign: "center",
  },
});

export default AppNavigator;
