import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getFocusedRouteNameFromRoute, RouteProp } from "@react-navigation/native";
import { UI } from "../constants";
import { RootTabParamList } from "../types";

// Import stack navigators (we'll create these next)
import TransactionStackNavigator from "./TransactionStackNavigator";
import BudgetStackNavigator from "./BudgetStackNavigator";
import BillStackNavigator from "./BillStackNavigator";
import DebtStackNavigator from "./DebtStackNavigator";
import SettingsStackNavigator from "./SettingsStackNavigator";
import AnalysisStackNavigator from "./AnalysisStackNavigator";

const Tab = createBottomTabNavigator<RootTabParamList>();

// Tab icon component with vector icons
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "transactions":
        return focused ? "wallet" : "wallet-outline";
      case "budgets":
        return focused ? "pie-chart" : "pie-chart-outline";
      case "bills":
        return focused ? "receipt" : "receipt-outline";
      case "debts":
        return focused ? "card" : "card-outline";
      case "analysis":
        return focused ? "analytics" : "analytics-outline";
      case "settings":
        return focused ? "settings" : "settings-outline";
      default:
        return "ellipse";
    }
  };

  return (
    <View style={styles.iconContainer}>
      <Ionicons name={getIcon(name) as any} size={24} color={focused ? UI.COLORS.PRIMARY : UI.COLORS.TEXT_MUTED} />
    </View>
  );
};

// Helper function to determine if tab bar should be hidden
const getTabBarVisibility = (route: RouteProp<RootTabParamList>) => {
  const routeName = getFocusedRouteNameFromRoute(route);

  // Hide tab bar for modal screens
  const modalScreens = ["AddTransaction", "AddBudget", "AddBill", "EditTransaction", "EditBudget", "EditBill"];

  if (modalScreens.includes(routeName || "")) {
    return { display: "none" as const };
  }

  return {
    backgroundColor: UI.COLORS.SURFACE,
    borderTopColor: UI.COLORS.BORDER,
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
    height: 65,
  };
};

const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name.toLowerCase()} focused={focused} />,
        tabBarActiveTintColor: UI.COLORS.PRIMARY,
        tabBarInactiveTintColor: UI.COLORS.TEXT_MUTED,
        tabBarStyle: getTabBarVisibility(route),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          marginTop: 4,
        },
        headerShown: false,
      })}>
      <Tab.Screen
        name="Transactions"
        component={TransactionStackNavigator}
        options={{
          tabBarLabel: "Transactions",
        }}
      />
      <Tab.Screen
        name="Budgets"
        component={BudgetStackNavigator}
        options={{
          tabBarLabel: "Budgets",
        }}
      />
      <Tab.Screen
        name="Bills"
        component={BillStackNavigator}
        options={{
          tabBarLabel: "Bills",
        }}
      />
      <Tab.Screen
        name="Debts"
        component={DebtStackNavigator}
        options={{
          tabBarLabel: "Debts",
        }}
      />
      <Tab.Screen
        name="Analysis"
        component={AnalysisStackNavigator}
        options={{
          tabBarLabel: "Analysis",
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{
          tabBarLabel: "Settings",
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
  },
});

export default TabNavigator;
