import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "./ThemeProvider";

const TAB_CONFIG: Record<string, { active: string; inactive: string; label: string }> = {
  Transactions: { active: "home", inactive: "home-outline", label: "Home" },
  Budgets: { active: "pie-chart", inactive: "pie-chart-outline", label: "Budgets" },
  Debts: { active: "card", inactive: "card-outline", label: "Debts" },
  Analysis: { active: "bar-chart", inactive: "bar-chart-outline", label: "Analytics" },
};

export const useTabBarHeight = () => {
  const insets = useSafeAreaInsets();
  const { spacing } = useAppTheme();

  // TabBar base height (70) + bottom offset
  const tabBarHeight = 70 + Math.max(insets.bottom, spacing.md);

  // Add spacing.xl (20) for breathing room below content
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
            const cfg = TAB_CONFIG[route.name] || {
              active: "ellipse",
              inactive: "ellipse-outline",
              label: route.name,
            };
            const iconName = isFocused ? cfg.active : cfg.inactive;

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
                    size={20}
                    color={
                      isFocused
                        ? colors.onPrimaryContainer
                        : colors.onSurfaceVariant
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isFocused ? colors.onSurface : colors.onSurfaceVariant,
                      fontWeight: isFocused ? "700" : "500",
                    },
                  ]}
                  numberOfLines={1}>
                  {cfg.label}
                </Text>
              </TouchableOpacity>
            );

            // Add the FAB after the second tab (index 1) for a symmetrical 5-item layout
            if (index === 1) {
              return (
                <React.Fragment key={route.key + "_fragment"}>
                  {tabItem}
                  <TouchableOpacity
                    key="fab"
                    activeOpacity={0.85}
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
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  floatingBar: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 34,
    overflow: "hidden",
  },
  tabItemsContainer: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    position: "relative",
  },
  iconContainer: {
    width: 52,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 3,
    letterSpacing: 0.1,
  },
  fabContainer: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
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
