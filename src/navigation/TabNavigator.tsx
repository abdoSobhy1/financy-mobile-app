import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute, RouteProp } from "@react-navigation/native";
import { RootTabParamList } from "../types";

// Import stack navigators
import TransactionStackNavigator from "./TransactionStackNavigator";
import BudgetStackNavigator from "./BudgetStackNavigator";
import DebtStackNavigator from "./DebtStackNavigator";
import SettingsStackNavigator from "./SettingsStackNavigator";
import AnalysisStackNavigator from "./AnalysisStackNavigator";

// Import new TabBar
import { TabBar } from "../components/ui/TabBar";

const Tab = createBottomTabNavigator<RootTabParamList>();

// ── Screens that should hide the tab bar ─────────────────────────────
const MODAL_SCREENS = [
  "AddTransaction",
  "EditTransaction",
  "BudgetForm",
  "DebtForm",
  "AddPayment",
  "DebtPayments",
];

// ── Visibility helper ────────────────────────────────────────────────
const getTabBarVisibility = (route: RouteProp<RootTabParamList>) => {
  const routeName = getFocusedRouteNameFromRoute(route);
  if (MODAL_SCREENS.includes(routeName || "")) {
    return { display: "none" as const };
  }
  return {};
};

// ── Navigator ────────────────────────────────────────────────────────
const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={({ route }) => ({
        tabBarStyle: getTabBarVisibility(route),
        headerShown: false,
      })}>
      <Tab.Screen
        name="Transactions"
        component={TransactionStackNavigator}
        options={{ tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="Budgets"
        component={BudgetStackNavigator}
        options={{ tabBarLabel: "Budgets" }}
      />
      <Tab.Screen
        name="Debts"
        component={DebtStackNavigator}
        options={{ tabBarLabel: "Debts" }}
      />
      <Tab.Screen
        name="Analysis"
        component={AnalysisStackNavigator}
        options={{ tabBarLabel: "Analysis" }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{ tabBarLabel: "Settings" }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
