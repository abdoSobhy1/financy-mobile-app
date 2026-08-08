import React from "react";
import { View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "./ThemeProvider";

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Transactions: { active: "wallet", inactive: "wallet-outline" },
  Budgets: { active: "pie-chart", inactive: "pie-chart-outline" },
  Debts: { active: "card", inactive: "card-outline" },
  Analysis: { active: "analytics", inactive: "analytics-outline" },
};

export const useTabBarHeight = () => {
  const insets = useSafeAreaInsets();
  const { spacing } = useAppTheme();

  // TabBar base height (64) + bottom offset
  const tabBarHeight = 64 + Math.max(insets.bottom, spacing.md);

  // Add spacing.xl (24) for breathing room below content
  return tabBarHeight + spacing.xl;
};

export const TabBar = ({ state, descriptors, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius } = useAppTheme();

  const focusedRoute = state.routes[state.index];
  const focusedDescriptor = descriptors[focusedRoute.key];
  const focusedOptions = focusedDescriptor.options;

  if (focusedOptions.tabBarStyle?.display === "none") return null;

  return (
    <View
      style={[
        styles.floatingBarOuter,
        { bottom: Math.max(insets.bottom, spacing.md) },
      ]}>
      <View
        style={[
          styles.floatingBar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.outlineVariant,
          },
        ]}>
        <View style={styles.tabItemsContainer}>
          {state.routes.map((route: any, index: number) => {
            const isFocused = state.index === index;
            const icons = TAB_ICONS[route.name] || {
              active: "ellipse",
              inactive: "ellipse-outline",
            };
            const iconName = isFocused ? icons.active : icons.inactive;

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

            const tabItem = (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.7}
                style={styles.tabItem}>
                <View
                  style={[
                    styles.iconContainer,
                    { borderRadius: radius.pill },
                    isFocused
                      ? { backgroundColor: colors.primaryContainer }
                      : { backgroundColor: "transparent" },
                  ]}>
                  <Ionicons
                    name={iconName as any}
                    size={24}
                    color={
                      isFocused
                        ? colors.onPrimaryContainer
                        : colors.onSurfaceVariant
                    }
                  />
                </View>
              </TouchableOpacity>
            );

            // Add the FAB after the second tab (index 1) for a symmetrical 5-item layout
            if (index === 1) {
              return (
                <React.Fragment key={route.key + "_fragment"}>
                  {tabItem}
                  <TouchableOpacity
                    key="fab"
                    activeOpacity={0.8}
                    style={[
                      styles.fabContainer,
                      { backgroundColor: colors.primary, borderRadius: radius.pill },
                    ]}
                    onPress={() => {
                      const currentRoute = state.routes[state.index].name;
                      if (currentRoute === "Transactions") {
                        navigation.navigate("Transactions", { screen: "AddTransaction" });
                      } else if (currentRoute === "Budgets") {
                        navigation.navigate("Budgets", { screen: "BudgetForm" });
                      } else if (currentRoute === "Debts") {
                        navigation.navigate("Debts", { screen: "DebtForm" });
                      } else {
                        navigation.navigate("Transactions", { screen: "AddTransaction" });
                      }
                    }}>
                    <Ionicons name="add" size={28} color={colors.onPrimary} />
                  </TouchableOpacity>
                </React.Fragment>
              );
            }
            return tabItem;
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingBarOuter: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  floatingBar: {
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: 32,
    overflow: "hidden",
  },
  tabItemsContainer: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    position: "relative",
  },
  iconContainer: {
    width: 64,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  fabContainer: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});
