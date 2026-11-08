import { SpendingBreakdown } from "../components/SpendingBreakdown";
import { CashFlowTrend } from "../components/CashFlowTrend";
import { BudgetHealth } from "../components/BudgetHealth";
import { useAnalysisScreen } from "../hooks/useAnalysisScreen";

import React from "react";
import { RefreshControl, ScrollView, StatusBar, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { FilterChips, useTabBarHeight } from "../../../shared/ui";
import { AppHeader } from "../../../shared/ui/AppHeader";

export const AnalysisScreen: React.FC = () => {
  const { navigation, refreshing, filter, setFilter, selectedSliceIndex, setSelectedSliceIndex, onRefresh, summary, categoryBreakdown, monthlyTrends, budgetUsage } = useAnalysisScreen();
  const insets = useSafeAreaInsets();
  const {
    colors,
    spacing,
    isDark,
  } = useAppTheme();
  const tabBarHeight = useTabBarHeight();

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <AppHeader title="Analytics" />
      <FilterChips
        options={["This Month", "Last Month", "3 Months"]}
        selected={filter}
        onSelect={(f) => {
          setSelectedSliceIndex(null);
          setFilter(f as any);
        }}
        style={{
          marginBottom: spacing.lg,
          paddingHorizontal: spacing.lg,
          maxHeight: 44,
        }}
      />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: tabBarHeight,
        }}
        showsVerticalScrollIndicator={false}>
        <SpendingBreakdown
          categoryBreakdown={categoryBreakdown}
          summary={summary}
          selectedSliceIndex={selectedSliceIndex}
          setSelectedSliceIndex={setSelectedSliceIndex}
        />
        <CashFlowTrend monthlyTrends={monthlyTrends} summary={summary} />
        <BudgetHealth navigation={navigation} budgetUsage={budgetUsage} />
      </ScrollView>
    </View>
  );
};

export default AnalysisScreen;
