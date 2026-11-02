import { BudgetEmptyState } from "../components/BudgetEmptyState";
import { BudgetOverview } from "../components/BudgetOverview";
import { BudgetListCard } from "../components/BudgetListCard";

import { styles } from "./BudgetScreens.styles";

import { useBudgetListScreen } from "../hooks/useBudgetListScreen";
import React from "react";
import { View, FlatList, RefreshControl, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";

import { useTabBarHeight, AppHeader } from "../../../shared/ui";

export const BudgetListScreen: React.FC = () => {
  const { navigation, refreshing, progressLoaded, budgetProgressMap, budgets, ids, budgetsLoading, categoriesMap, handleRefresh, totalBudget, totalSpent, totalRemaining, totalProgressPercentage, isTotalOver } = useBudgetListScreen();
  const { colors, typography, spacing, isDark } = useAppTheme();
  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();

  const renderBudget = ({ item: id }: { item: string; }) => (<BudgetListCard budgets={budgets} progressLoaded={progressLoaded} colors={colors} budgetProgressMap={budgetProgressMap} categoriesMap={categoriesMap} navigation={navigation} typography={typography} item={id} />);

  return (
    <View
      style={[
        styles.safeArea,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <AppHeader title="Budgets" />

      <FlatList
        data={ids}
        keyExtractor={(item) => item}
        renderItem={renderBudget}
        ListHeaderComponent={ids.length > 0 ? (() => <BudgetOverview progressLoaded={progressLoaded} spacing={spacing} colors={colors} typography={typography} totalBudget={totalBudget} isTotalOver={isTotalOver} totalRemaining={totalRemaining} totalProgressPercentage={totalProgressPercentage} totalSpent={totalSpent} ids={ids} navigation={navigation} />) : null}
        ListEmptyComponent={!budgetsLoading ? (() => <BudgetEmptyState colors={colors} typography={typography} spacing={spacing} navigation={navigation} />) : null}
        contentContainerStyle={[styles.container, { paddingBottom: tabBarHeight + 100 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};
