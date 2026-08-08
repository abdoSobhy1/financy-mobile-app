import React, { useState } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../components/ui/ThemeProvider";
import { useAnalysisData } from "./hooks/useAnalysisData";
import { useTabBarHeight } from "../../components/ui";
import { formatCurrency } from "../../utils";

export const AnalysisScreen: React.FC = () => {
  const { colors, typography, spacing, radius } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"This Month" | "Last Month" | "3 Months">("This Month");
  const { data: analyticsData, isLoading } = useAnalysisData();
  const tabBarHeight = useTabBarHeight();

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const { summary, categoryBreakdown, monthlyTrends, budgetUsage } = analyticsData;

  const renderTopHeader = () => (
    <View style={styles.topHeader}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceVariant }]}>
          <Ionicons name="person" size={16} color={colors.onSurfaceVariant} />
        </View>
        <Text style={[typography.h2, { color: colors.onBackground, marginLeft: spacing.md }]}>
          August Overview
        </Text>
      </View>
      <TouchableOpacity>
        <Ionicons name="notifications-outline" size={24} color={colors.onBackground} />
      </TouchableOpacity>
    </View>
  );

  const renderFilters = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xl, paddingHorizontal: spacing.lg }}>
      {["This Month", "Last Month", "3 Months"].map((f) => (
        <TouchableOpacity
          key={f}
          onPress={() => setFilter(f as any)}
          style={[
            styles.filterChip,
            {
              borderColor: colors.outlineVariant,
              backgroundColor: filter === f ? "rgba(128, 203, 196, 0.15)" : "transparent",
            },
          ]}
        >
          <Text
            style={[
              typography.bodyMedium,
              {
                color: filter === f ? colors.primaryContainer : colors.onSurfaceVariant,
                fontWeight: filter === f ? "600" : "400",
              },
            ]}
          >
            {f}
          </Text>
        </TouchableOpacity>
      ))}
      <View style={{ width: 20 }} />
    </ScrollView>
  );

  const renderSpendingBreakdown = () => {
    const expenses = categoryBreakdown.filter((item) => item.category.type === "expense");
    const totalExpenses = Math.abs(summary.totalExpenses);

    return (
      <View style={[styles.card, { backgroundColor: colors.surfaceVariant }]}>
        <View style={styles.cardHeader}>
          <Text style={[typography.h3, { color: colors.onBackground }]}>Spending Breakdown</Text>
          <Ionicons name="pie-chart-outline" size={20} color={colors.onSurfaceVariant} />
        </View>

        <View style={{ alignItems: "center", marginVertical: 32 }}>
          <Text style={[typography.label, { color: colors.onSurfaceVariant, marginBottom: 8 }]}>Total</Text>
          <Text style={[typography.h1, { color: colors.onBackground, fontSize: 36 }]}>
            {formatCurrency(totalExpenses)}
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          {expenses.map((item, index) => (
            <View key={index} style={styles.breakdownRow}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <View style={[styles.dot, { backgroundColor: (item.category as any).color || colors.primaryContainer }]} />
                <Text style={[typography.bodyLarge, { color: colors.onBackground, fontWeight: "500" }]}>
                  {item.category.name}
                </Text>
              </View>
              <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, width: 50, textAlign: "right" }]}>
                {Math.round(item.percentage)}%
              </Text>
              <Text style={[typography.bodyLarge, { color: colors.onBackground, fontWeight: "600", width: 80, textAlign: "right" }]}>
                {formatCurrency(Math.abs(item.amount))}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderCashFlowTrend = () => {
    // take the last 4 months for the bar chart
    const data = monthlyTrends.slice(-4);
    const maxVal = Math.max(
      ...data.map((d) => Math.max(d.income, d.expenses)),
      1 // prevent division by zero
    );

    return (
      <View style={[styles.card, { backgroundColor: colors.surfaceVariant }]}>
        <View style={styles.cardHeader}>
          <Text style={[typography.h3, { color: colors.onBackground }]}>Cash Flow Trend</Text>
          <Ionicons name="stats-chart" size={20} color={colors.onSurfaceVariant} />
        </View>

        <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginBottom: 32 }]}>
          {summary.balance >= 0 ? "+" : ""}{formatCurrency(summary.balance)} Net Savings
        </Text>

        {/* Bar Chart Area */}
        <View style={{ height: 160, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around" }}>
          {data.map((d, i) => {
            const incomeHeight = (d.income / maxVal) * 140;
            const expenseHeight = (d.expenses / maxVal) * 140;

            return (
              <View key={i} style={{ alignItems: "center", width: 50 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
                  {/* Income Bar */}
                  <View style={{ width: 12, height: Math.max(incomeHeight, 4), backgroundColor: colors.primaryContainer, borderRadius: 2 }} />
                  {/* Expense Bar */}
                  <View style={{ width: 12, height: Math.max(expenseHeight, 4), backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 2 }} />
                </View>
                <Text style={[typography.label, { color: colors.onSurfaceVariant, marginTop: 12, fontSize: 10 }]}>
                  {d.month.split(" ")[0]}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 24, gap: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={[styles.dot, { backgroundColor: colors.primaryContainer }]} />
            <Text style={[typography.label, { color: colors.onSurfaceVariant }]}>Income</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={[styles.dot, { backgroundColor: "rgba(255,255,255,0.15)" }]} />
            <Text style={[typography.label, { color: colors.onSurfaceVariant }]}>Expense</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderBudgetHealth = () => {
    return (
      <View style={[styles.card, { backgroundColor: colors.surfaceVariant, marginBottom: spacing.xxl }]}>
        <View style={[styles.cardHeader, { marginBottom: 24 }]}>
          <Text style={[typography.h3, { color: colors.onBackground }]}>Budget Health</Text>
          <TouchableOpacity>
            <Text style={[typography.label, { color: colors.primaryContainer }]}>Edit Limits</Text>
          </TouchableOpacity>
        </View>

        <View style={{ gap: 24 }}>
          {budgetUsage.map((b, index) => {
            const isOver = b.status === "over";
            const progressColor = isOver ? colors.errorContainer : colors.primaryContainer;
            const trackColor = "rgba(255,255,255,0.05)";
            const remainingOrOver = isOver ? b.used - b.budget.amount : b.budget.amount - b.used;

            return (
              <View key={index}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={[typography.bodyLarge, { color: colors.onBackground, fontWeight: "600" }]}>
                    {b.budget.name} {isOver ? "(Over)" : ""}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={[typography.bodyMedium, { color: isOver ? colors.errorContainer : colors.onBackground, fontWeight: "600" }]}>
                      {formatCurrency(b.used)}
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                      {" "}
                      / {formatCurrency(b.budget.amount)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.progressBar, { backgroundColor: trackColor }]}>
                  <View style={[styles.progressFill, { width: `${Math.min(b.percentage, 100)}%`, backgroundColor: progressColor }]} />
                </View>

                <Text style={[typography.label, { color: isOver ? colors.errorContainer : colors.onSurfaceVariant, marginTop: 8, fontSize: 11 }]}>
                  {isOver ? `${formatCurrency(remainingOrOver)} over limit` : `${Math.round(b.percentage)}% spent`}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {renderTopHeader()}
      <View style={{ marginTop: spacing.md }} />
      {renderFilters()}

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: tabBarHeight }}
        showsVerticalScrollIndicator={false}
      >
        {renderSpendingBreakdown()}
        {renderCashFlowTrend()}
        {renderBudgetHealth()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 12,
  },
  card: {
    padding: 24,
    borderRadius: 24,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
});

export default AnalysisScreen;
