import React, { useState } from "react";
import { View, ScrollView, RefreshControl, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../../components/ui/ThemeProvider";
import { useAnalysisData } from "./hooks/useAnalysisData";
import { PieChartCard, LineChartCard } from "../../components/analysis";
import { Card } from "../../components/ui";
import { useTabBarHeight } from "../../components/ui";

export const AnalysisScreen: React.FC = () => {
  const { colors, typography, spacing } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);
  const { data: analyticsData } = useAnalysisData();
  const tabBarHeight = useTabBarHeight();

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderOverview = () => {
    const { summary } = analyticsData;
    return (
      <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
        <Text style={{ ...typography.h2, color: colors.onBackground, paddingHorizontal: spacing.md }}>Overview</Text>
        <View style={{ flexDirection: "row", paddingHorizontal: spacing.md, gap: spacing.sm }}>
          <Card variant="default" style={{ flex: 1, backgroundColor: colors.surfaceVariant, padding: spacing.md }}>
            <Text style={{ color: colors.onSurfaceVariant, ...typography.label }}>Income</Text>
            <Text style={{ color: colors.onSurface, ...typography.h3 }}>${summary.totalIncome.toFixed(0)}</Text>
          </Card>
          <Card variant="default" style={{ flex: 1, backgroundColor: colors.surfaceVariant, padding: spacing.md }}>
            <Text style={{ color: colors.onSurfaceVariant, ...typography.label }}>Expenses</Text>
            <Text style={{ color: colors.onSurface, ...typography.h3 }}>${Math.abs(summary.totalExpenses).toFixed(0)}</Text>
          </Card>
          <Card variant="default" style={{ flex: 1, backgroundColor: colors.primaryContainer, padding: spacing.md }}>
            <Text style={{ color: colors.onPrimaryContainer, ...typography.label }}>Net</Text>
            <Text style={{ color: colors.onPrimaryContainer, ...typography.h3 }}>${summary.balance.toFixed(0)}</Text>
          </Card>
        </View>
      </View>
    );
  };

  const renderCategoriesPie = () => {
    const expenses = analyticsData.categoryBreakdown
      .filter((item) => item.category.type === "expense")
      .map((item) => ({
        name: item.category.name,
        amount: Math.abs(item.amount),
        color: item.category.color || colors.primary,
      }))
      .sort((a, b) => b.amount - a.amount);

    return (
      <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.lg }}>
        <PieChartCard title="Spending by Category" data={expenses} />
      </View>
    );
  };

  const renderMonthlyComparison = () => {
    const trendsData = analyticsData.monthlyTrends.map((trend) => ({
      month: trend.month,
      amount: Math.abs(trend.expenses),
    }));

    return (
      <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.lg }}>
        <LineChartCard title="Expense Trends" data={trendsData} />
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <View style={{ padding: spacing.md, flexDirection: "row", alignItems: "center" }}>
        <Text style={{ ...typography.h1, color: colors.onBackground, flex: 1 }}>Analysis</Text>
      </View>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: tabBarHeight + spacing.lg }}
      >
        {renderOverview()}
        {renderCategoriesPie()}
        {renderMonthlyComparison()}
      </ScrollView>
    </SafeAreaView>
  );
};
