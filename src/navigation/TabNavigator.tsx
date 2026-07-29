import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Text,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  getFocusedRouteNameFromRoute,
  RouteProp,
} from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { UI } from "../constants";
import { RootTabParamList } from "../types";

// Import stack navigators
import TransactionStackNavigator from "./TransactionStackNavigator";
import BudgetStackNavigator from "./BudgetStackNavigator";
import DebtStackNavigator from "./DebtStackNavigator";
import SettingsStackNavigator from "./SettingsStackNavigator";
import AnalysisStackNavigator from "./AnalysisStackNavigator";

const Tab = createBottomTabNavigator<RootTabParamList>();

// ── Icon mapping ─────────────────────────────────────────────────────
const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Transactions: { active: "wallet", inactive: "wallet-outline" },
  Budgets: { active: "pie-chart", inactive: "pie-chart-outline" },
  Debts: { active: "card", inactive: "card-outline" },
  Analysis: { active: "analytics", inactive: "analytics-outline" },
  Settings: { active: "settings", inactive: "settings-outline" },
};

// ── Screens that should hide the tab bar ─────────────────────────────
const MODAL_SCREENS = [
  "AddTransaction",
  "EditTransaction",
  "BudgetForm",
  "DebtForm",
  "AddPayment",
  "DebtPayments",
];

// ── Custom floating tab bar ──────────────────────────────────────────
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const insets = useSafeAreaInsets();

  // Check if we should hide the tab bar
  const focusedRoute = state.routes[state.index];
  const focusedDescriptor = descriptors[focusedRoute.key];
  const focusedOptions = focusedDescriptor.options;
  if (focusedOptions.tabBarStyle?.display === "none") return null;

  return (
    <View
      style={[
        styles.floatingBarOuter,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}>
      <View style={styles.floatingBar}>
        <View style={styles.barGlow} />

        <View style={styles.tabItemsContainer}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const icons = TAB_ICONS[route.name] || {
              active: "ellipse",
              inactive: "ellipse-outline",
            };
            const iconName = isFocused ? icons.active : icons.inactive;
            const label = options.tabBarLabel || route.name;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.7}
                style={styles.tabItem}>
                {/* Active indicator */}
                {isFocused && (
                  <LinearGradient
                    colors={[UI.COLORS.PRIMARY_LIGHT, UI.COLORS.PRIMARY_DARK]}
                    style={styles.activeIndicator}
                  />
                )}

                <Ionicons
                  name={iconName as any}
                  size={22}
                  color={isFocused ? "#fff" : UI.COLORS.TEXT_MUTED}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

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
      tabBar={(props) => <CustomTabBar {...props} />}
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

// ── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  floatingBarOuter: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  floatingBar: {
    width: "70%",
    maxWidth: 400,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: UI.COLORS.PRIMARY + "30",
    overflow: "hidden",
    backgroundColor: UI.COLORS.BACKGROUND + "eb",
    // Shadow
    ...Platform.select({
      ios: {
        shadowColor: UI.COLORS.PRIMARY,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tabItemsContainer: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  barGlow: {
    position: "absolute",
    top: -40,
    left: "50%",
    width: 160,
    height: 40,
    marginLeft: -80,
    backgroundColor: UI.COLORS.PRIMARY + "18",
    borderRadius: 80,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    position: "relative",
  },
  activeIndicator: {
    position: "absolute",
    top: -5,
    width: 44,
    height: 44,
    borderRadius: 22,
    opacity: 0.85,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#C7D2FE",
    fontWeight: "600",
  },
  tabLabelInactive: {
    color: UI.COLORS.TEXT_MUTED,
  },
});

export default TabNavigator;
