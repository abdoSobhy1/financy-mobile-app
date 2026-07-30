import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";

import { useAnalysisData } from "./hooks/useAnalysisData";
import {
  ChartCard,
  PieChartSection,
  LineChartSection,
  BarChartSection,
  CustomChartCard,
} from "../../components/analysis/ChartCard";
// Glass tokens
const GLASS = {
  bg: "rgba(255,255,255,0.04)",
  border: "rgba(108,92,231,0.18)",
  borderLight: "rgba(108,92,231,0.10)",
};
import { FloatingActionButton } from "../../components/ui/FloatingActionButton";
import { useToast } from "../../components/ui";
import { UI } from "../../constants";
import { RootState } from "../../store";
import {
  deleteCustomChart,
  addCustomChart,
} from "../../store/slices/analysisSlice";
import { AnalysisStackParamList } from "../../types";
import { subMonths } from "date-fns";

type AnalysisScreenNavigationProp = StackNavigationProp<
  AnalysisStackParamList,
  "AnalysisHome"
>;

// Memoized selectors to prevent unnecessary re-renders
// Use defensive fallbacks in case a slice is missing for any reason
const selectCustomCharts = createSelector(
  [(state: RootState) => (state.analysis ? state.analysis.customCharts : {})],
  (customCharts) => Object.values(customCharts || {}),
);

const selectTransactions = createSelector(
  [(state: RootState) => (state.transactions ? state.transactions.items : {})],
  (items) => Object.values(items || {}),
);

// Simple selector - no transformation needed
const selectCategories = (state: RootState) =>
  state.categories ? state.categories.items : {};

const selectBudgets = createSelector(
  [(state: RootState) => (state.budgets ? state.budgets.items : {})],
  (items) => Object.values(items || {}),
);

const selectDebts = createSelector(
  [(state: RootState) => (state.debts ? state.debts.items : {})],
  (items) => Object.values(items || {}),
);

export const AnalysisScreen: React.FC = () => {
  const navigation = useNavigation<AnalysisScreenNavigationProp>();
  const dispatch = useDispatch();
  const { showSuccess, showError } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [currentBillingPeriod, setCurrentBillingPeriod] = useState(() => {
    // Calculate current billing period (assume billing day is 28th)
    const today = new Date();
    const billingDay = 28;
    let endDate: Date;
    let startDate: Date;

    if (today.getDate() >= billingDay) {
      // We're in the current month's billing period
      endDate = new Date(today.getFullYear(), today.getMonth(), billingDay - 1);
      endDate.setMonth(endDate.getMonth() + 1);
      startDate = new Date(today.getFullYear(), today.getMonth(), billingDay);
    } else {
      // We're in the previous month's billing period
      endDate = new Date(today.getFullYear(), today.getMonth(), billingDay - 1);
      startDate = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        billingDay,
      );
    }

    const periodName = endDate.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    return {
      startDate,
      endDate,
      name: periodName,
      billingDay,
    };
  });

  const [comparisonModal, setComparisonModal] = useState<{
    visible: boolean;
    type: "expense" | "income" | null;
    title?: string;
    data: any[];
  }>({
    visible: false,
    type: null,
    title: undefined,
    data: [],
  });

  // Chart comparison and period selection states
  const [comparisonMode, setComparisonMode] = useState<"category" | "total">(
    "category",
  );
  const [selectedPeriod, setSelectedPeriod] = useState<
    "day" | "week" | "month" | "billing"
  >("billing");
  const [periodSelectionModal, setPeriodSelectionModal] = useState(false);

  const customCharts = useSelector(selectCustomCharts);
  const transactions = useSelector(selectTransactions);
  const categories = useSelector(selectCategories);
  const budgets = useSelector(selectBudgets);
  const debts = useSelector(selectDebts);

  const {
    data: analyticsData,
    isLoading,
    isEmpty,
  } = useAnalysisData({
    startDate: currentBillingPeriod.startDate,
    endDate: currentBillingPeriod.endDate,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    // Here you would trigger any data refresh actions
    // For now, just simulate refresh
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleCreateChart = () => {
    navigation.navigate("CreateCustomChart");
  };

  const handleEditChart = (chartId: string) => {
    navigation.navigate("CreateCustomChart", { chartId });
  };

  const handleDeleteChart = (chartId: string) => {
    const chart = customCharts.find((c) => c.id === chartId);
    const chartName = chart?.title || "chart";

    Alert.alert(
      "Delete Chart",
      `Are you sure you want to delete "${chartName}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            try {
              dispatch(deleteCustomChart(chartId));
              showSuccess(`"${chartName}" deleted successfully`);
            } catch (error) {
              showError("Failed to delete chart");
            }
          },
        },
      ],
    );
  };

  const handleViewChart = (chartId: string) => {
    // For now, just navigate to edit - could be expanded to a detailed view later
    handleEditChart(chartId);
  };

  const processCustomChartData = (chart: any) => {
    const { chartType, dataSource, filters } = chart;

    switch (dataSource) {
      case "transactions":
        return processTransactionData(chartType, filters);
      case "budgets":
        return processBudgetData(chartType, filters);
      case "bills":
        return processBillData(chartType, filters);
      case "debts":
        return processDebtData(chartType, filters);
      default:
        return [];
    }
  };

  const processTransactionData = (chartType: string, filters: any = {}) => {
    let filteredTransactions = [...transactions];

    // Apply filters
    if (filters.categoryIds?.length > 0) {
      filteredTransactions = filteredTransactions.filter((t) =>
        filters.categoryIds.includes(t.categoryId),
      );
    }

    if (filters.transactionType && filters.transactionType !== "both") {
      filteredTransactions = filteredTransactions.filter(
        (t) => t.type === filters.transactionType,
      );
    }

    if (filters.startDate && filters.endDate) {
      filteredTransactions = filteredTransactions.filter((t) => {
        const date = new Date(t.date);
        return (
          date >= new Date(filters.startDate) &&
          date <= new Date(filters.endDate)
        );
      });
    }

    if (chartType === "pie") {
      // Group by category for pie chart
      const categoryData = new Map();

      filteredTransactions.forEach((transaction) => {
        const category = categories[transaction.categoryId];
        if (!category) return;

        const existing = categoryData.get(category.id) || {
          amount: 0,
          count: 0,
        };
        categoryData.set(category.id, {
          amount: existing.amount + transaction.amount,
          count: existing.count + 1,
          category,
        });
      });

      return Array.from(categoryData.values()).map((data: any, index) => ({
        name: data.category.name,
        amount: Math.abs(data.amount), // Use absolute values
        color:
          data.category.color ||
          [
            UI.COLORS.PRIMARY,
            UI.COLORS.SUCCESS,
            UI.COLORS.WARNING,
            UI.COLORS.ERROR,
            UI.COLORS.ACCENT,
            "#8B5CF6",
          ][index % 6],
      }));
    }

    if (chartType === "line" || chartType === "bar") {
      // Group by month for line/bar chart
      const monthlyData = new Map();

      filteredTransactions.forEach((transaction) => {
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        const monthLabel = date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        const existing = monthlyData.get(monthKey) || {
          income: 0,
          expenses: 0,
          balance: 0,
          month: monthLabel,
        };

        if (transaction.type === "income") {
          existing.income += transaction.amount;
        } else {
          existing.expenses += transaction.amount;
        }
        existing.balance = existing.income - existing.expenses;

        monthlyData.set(monthKey, existing);
      });

      return Array.from(monthlyData.values()).sort(
        (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime(),
      );
    }

    return [];
  };

  const processBudgetData = (chartType: string, filters: any = {}) => {
    if (chartType === "pie") {
      return budgets.map((budget, index) => {
        const budgetTransactions = transactions.filter(
          (t) => t.budgetId === budget.id,
        );
        const used = budgetTransactions.reduce((sum, t) => sum + t.amount, 0);

        return {
          name: budget.name,
          amount: Math.abs(used), // Use absolute values
          color: [
            UI.COLORS.PRIMARY,
            UI.COLORS.SUCCESS,
            UI.COLORS.WARNING,
            UI.COLORS.ERROR,
            UI.COLORS.ACCENT,
            "#8B5CF6",
          ][index % 6],
        };
      });
    }

    return [];
  };

  const processBillData = (chartType: string, filters: any = {}) => {
    if (chartType === "pie") {
      // Find bill-like categories by name
      const billCategoryIdsLocal = Object.values(categories)
        .filter(
          (cat) =>
            (cat.name || "").toLowerCase().includes("bill") ||
            (cat.name || "").toLowerCase().includes("utility") ||
            (cat.name || "").toLowerCase().includes("subscription") ||
            (cat.name || "").toLowerCase().includes("rent") ||
            (cat.name || "").toLowerCase().includes("insurance"),
        )
        .map((cat) => cat.id);

      // Filter transactions that look like bill payments
      const billTransactions = transactions.filter((t) => {
        if (t.type !== "expense") return false;
        // Optionally apply date filters if provided
        if (filters.startDate && filters.endDate) {
          const d = new Date(t.date);
          if (d < new Date(filters.startDate) || d > new Date(filters.endDate))
            return false;
        }

        const cat = categories ? categories[t.categoryId] : undefined;
        const catName = cat && cat.name ? cat.name.toLowerCase() : "";

        return (
          catName.includes("bill") ||
          billCategoryIdsLocal.includes(t.categoryId)
        );
      });

      // Aggregate by category name
      const agg = new Map<string, { name: string; amount: number }>();
      billTransactions.forEach((t) => {
        const cat = categories ? categories[t.categoryId] : undefined;
        const name = (cat && cat.name) || "Bills";
        const key = name;
        const existing = agg.get(key) || { name, amount: 0 };
        existing.amount += Math.abs(t.amount);
        agg.set(key, existing);
      });

      return Array.from(agg.values()).map((data, index) => ({
        name: data.name,
        amount: data.amount,
        color: [
          UI.COLORS.PRIMARY,
          UI.COLORS.SUCCESS,
          UI.COLORS.WARNING,
          UI.COLORS.ERROR,
          UI.COLORS.ACCENT,
          "#8B5CF6",
        ][index % 6],
      }));
    }

    return [];
  };

  const processDebtData = (chartType: string, filters: any = {}) => {
    if (chartType === "pie") {
      return debts.map((debt, index) => ({
        name: debt.name || "Debt",
        amount: Math.abs(debt.totalAmount || 0), // Use absolute values
        color: [
          UI.COLORS.ERROR,
          UI.COLORS.WARNING,
          UI.COLORS.PRIMARY,
          UI.COLORS.ACCENT,
          UI.COLORS.SUCCESS,
          "#8B5CF6",
        ][index % 6],
      }));
    }

    return [];
  };

  const handleDuplicateChart = (chartId: string) => {
    const chart = customCharts.find((c) => c.id === chartId);
    if (!chart) return;

    try {
      const duplicatedChart = {
        id: Date.now().toString(),
        title: `${chart.title} (Copy)`,
        chartType: chart.chartType,
        dataSource: chart.dataSource,
        colorTheme: chart.colorTheme,
        filters: chart.filters,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      dispatch(addCustomChart(duplicatedChart));
      showSuccess(`"${chart.title}" duplicated successfully`);
    } catch (error) {
      showError("Failed to duplicate chart");
    }
  };

  const handleCategoryComparison = (categoryType: "expense" | "income") => {
    console.log("Category comparison clicked for:", categoryType);
    const categoryData = analyticsData.categoryBreakdown
      .filter((item) => item.category.type === categoryType)
      .map((item) => ({
        ...item,
        amount: Math.abs(item.amount), // Use absolute values
      }))
      .sort((a, b) => b.amount - a.amount); // Sort by amount descending

    console.log("Category data:", categoryData);

    setComparisonModal({
      visible: true,
      type: categoryType,
      title: `${categoryType === "expense" ? "Expense" : "Income"} Category Comparison`,
      data: categoryData,
    });
  };

  const handleMonthlyTrendsComparison = (trendsData: any[]) => {
    const monthlyComparisonData = trendsData.map((trend) => ({
      category: {
        id: trend.month,
        name: trend.month,
        type: "trend" as const,
        color: UI.COLORS.PRIMARY,
      },
      amount: Math.abs(trend.balance || trend.value || 0),
      percentage: 0, // Will be calculated
      count: 1,
    }));

    // Calculate percentages
    const total = monthlyComparisonData.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    monthlyComparisonData.forEach((item) => {
      item.percentage = total > 0 ? (item.amount / total) * 100 : 0;
    });

    Alert.alert(
      "Monthly Trends Comparison",
      `Showing activity trends for ${trendsData.length} months:\n${monthlyComparisonData
        .slice(0, 3)
        .map(
          (item, index) =>
            `${index + 1}. ${item.category.name}: $${item.amount.toFixed(0)}`,
        )
        .join("\n")}`,
      [
        { text: "OK" },
        {
          text: "View Details",
          onPress: () => {
            setComparisonModal({
              visible: true,
              type: "expense", // Use expense type for monthly trends
              title: "Monthly Activity Comparison",
              data: monthlyComparisonData,
            });
          },
        },
      ],
    );
  };

  const renderHeader = () => {
    return (
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Analysis</Text>
          </View>
          <TouchableOpacity
            style={styles.periodSelector}
            onPress={() => setPeriodSelectionModal(true)}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={UI.COLORS.PRIMARY}
            />
            <Text style={styles.periodSelectorText}>
              {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}
            </Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color="rgba(255,255,255,0.4)"
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.billingPeriod}>{currentBillingPeriod.name}</Text>
        <Text style={styles.billingPeriodDates}>
          {currentBillingPeriod.startDate.toLocaleDateString()} –{" "}
          {currentBillingPeriod.endDate.toLocaleDateString()}
        </Text>

        {/* Comparison Mode Toggle */}
        <View style={styles.comparisonToggle}>
          <Text style={styles.toggleLabel}>Compare by</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                comparisonMode === "category" && styles.toggleButtonActive,
              ]}
              onPress={() => setComparisonMode("category")}>
              <Text
                style={[
                  styles.toggleButtonText,
                  comparisonMode === "category" &&
                    styles.toggleButtonTextActive,
                ]}>
                Category
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                comparisonMode === "total" && styles.toggleButtonActive,
              ]}
              onPress={() => setComparisonMode("total")}>
              <Text
                style={[
                  styles.toggleButtonText,
                  comparisonMode === "total" && styles.toggleButtonTextActive,
                ]}>
                Total
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderOverview = () => {
    const { summary } = analyticsData;

    // Calculate expense breakdown by type using categories and budgets
    const expenseBreakdown = {
      normalExpenses: 0,
      debts: 0,
      bills: 0,
      unbudgeted: 0,
      myExpenses: 0,
    };

    // Get category IDs for different types
    const debtCategoryIds = Object.values(categories)
      .filter(
        (cat) =>
          cat.name.toLowerCase().includes("debt") ||
          cat.name.toLowerCase().includes("loan") ||
          cat.name.toLowerCase().includes("credit"),
      )
      .map((cat) => cat.id);

    const billCategoryIds = Object.values(categories)
      .filter(
        (cat) =>
          cat.name.toLowerCase().includes("bill") ||
          cat.name.toLowerCase().includes("utility") ||
          cat.name.toLowerCase().includes("subscription") ||
          cat.name.toLowerCase().includes("rent") ||
          cat.name.toLowerCase().includes("insurance"),
      )
      .map((cat) => cat.id);

    // Find the "مصاريفي" budget
    const myExpensesBudget = budgets.find(
      (budget) => budget.name === "مصاريفي",
    );
    const myExpensesBudgetId = myExpensesBudget ? myExpensesBudget.id : null;

    // Calculate expenses by category type and budget assignment
    transactions
      .filter(
        (t) =>
          t.type === "expense" &&
          new Date(t.date) >= currentBillingPeriod.startDate &&
          new Date(t.date) <= currentBillingPeriod.endDate,
      )
      .forEach((t) => {
        const amount = Math.abs(t.amount);

        // Detect bills by category name as well as by category id matching
        const txCategory = categories ? categories[t.categoryId] : undefined;
        const categoryName =
          txCategory && txCategory.name ? txCategory.name.toLowerCase() : "";

        // If the category name contains 'bill', treat it as a bill
        if (categoryName.includes("bill")) {
          expenseBreakdown.bills += amount;
          return;
        }

        // Check if assigned to "مصاريفي" budget first
        if (myExpensesBudgetId && t.budgetId === myExpensesBudgetId) {
          expenseBreakdown.myExpenses += amount;
        }
        // Check if not assigned to any budget
        else if (!t.budgetId) {
          expenseBreakdown.unbudgeted += amount;
        }
        // Then check category types for budgeted transactions
        else if (debtCategoryIds.includes(t.categoryId)) {
          expenseBreakdown.debts += amount;
        } else if (billCategoryIds.includes(t.categoryId)) {
          expenseBreakdown.bills += amount;
        } else {
          expenseBreakdown.normalExpenses += amount;
        }
      });

    // Get top 2 demanding categories
    const topCategories = analyticsData.categoryBreakdown
      .filter((item) => item.category.type === "expense")
      .slice(0, 2);

    const mainSummaryItems = [
      {
        title: "Total Income",
        value: summary.totalIncome,
        icon: "trending-up",
        color: UI.COLORS.SUCCESS,
      },
      {
        title: "Total Spend",
        value: Math.abs(summary.totalExpenses),
        icon: "trending-down",
        color: UI.COLORS.ERROR,
      },
      {
        title: "Net Balance",
        value: summary.balance,
        icon: summary.balance >= 0 ? "checkmark-circle" : "alert-circle",
        color: summary.balance >= 0 ? UI.COLORS.SUCCESS : UI.COLORS.ERROR,
      },
    ];

    const expenseBreakdownItems = [
      {
        title: "My Expenses (مصاريفي)",
        value: expenseBreakdown.myExpenses,
        icon: "person",
        color: UI.COLORS.PRIMARY,
      },
      {
        title: "Unbudgeted",
        value: expenseBreakdown.unbudgeted,
        icon: "help-circle",
        color: UI.COLORS.TEXT_MUTED,
      },
      {
        title: "Normal Expenses",
        value: expenseBreakdown.normalExpenses,
        icon: "card",
        color: UI.COLORS.WARNING,
      },
      {
        title: "Debt Payments",
        value: expenseBreakdown.debts,
        icon: "remove-circle",
        color: UI.COLORS.ERROR,
      },
      {
        title: "Bills",
        value: expenseBreakdown.bills,
        icon: "receipt",
        color: UI.COLORS.ACCENT,
      },
    ].filter((item) => item.value > 0); // Only show items with values

    return (
      <View style={styles.overviewContainer}>
        <Text style={styles.sectionLabel}>OVERVIEW</Text>

        {/* Main Summary */}
        <View style={styles.mainSummaryGrid}>
          {mainSummaryItems.map((item, index) => (
            <View key={index} style={styles.glassCard}>
              <View style={styles.overviewCardRow}>
                <LinearGradient
                  colors={[item.color, item.color + "60"]}
                  style={styles.iconCircle}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}>
                  <Ionicons name={item.icon as any} size={18} color="#fff" />
                </LinearGradient>
                <View style={styles.overviewCardTextBlock}>
                  <Text style={styles.overviewCardTitle}>{item.title}</Text>
                  <Text
                    style={[styles.overviewCardValue, { color: item.color }]}>
                    ${Math.abs(item.value).toFixed(0)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Expense Breakdown */}
        {expenseBreakdownItems.length > 0 && (
          <>
            <Text style={styles.subSectionTitle}>Expense Breakdown</Text>
            <View style={styles.expenseBreakdownGrid}>
              {expenseBreakdownItems.map((item, index) => (
                <View key={index} style={styles.glassCardSmall}>
                  <View style={styles.overviewCardRow}>
                    <LinearGradient
                      colors={[item.color, item.color + "60"]}
                      style={styles.iconCircleSmall}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}>
                      <Ionicons
                        name={item.icon as any}
                        size={14}
                        color="#fff"
                      />
                    </LinearGradient>
                    <View style={styles.overviewCardTextBlock}>
                      <Text style={styles.overviewCardTitle}>{item.title}</Text>
                      <Text
                        style={[
                          styles.overviewCardValue,
                          { color: item.color, fontSize: 16 },
                        ]}>
                        ${item.value.toFixed(0)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Top 2 Demanding Categories */}
        {topCategories.length > 0 && (
          <>
            <Text style={styles.subSectionTitle}>Top Demanding Categories</Text>
            <View style={styles.topCategoriesGrid}>
              {topCategories.map((item, index) => (
                <View key={index} style={styles.glassCardSmall}>
                  <View style={styles.categoryCardRow}>
                    <View
                      style={[
                        styles.categoryDot,
                        {
                          backgroundColor:
                            item.category.color || UI.COLORS.PRIMARY,
                        },
                      ]}
                    />
                    <View style={styles.categoryTextBlock}>
                      <Text style={styles.categoryTitle} numberOfLines={1}>
                        {item.category.name}
                      </Text>
                      <Text style={styles.categoryValue}>
                        ${Math.abs(item.amount).toFixed(0)}
                      </Text>
                      <Text style={styles.categoryPercentageText}>
                        {item.percentage.toFixed(1)}% of expenses
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    );
  };

  const renderCategoriesPieChart = () => {
    const categoryData = analyticsData.categoryBreakdown
      .filter((item) => item.category.type === "expense") // Focus on expenses
      .slice(0, 8) // Show top 8 categories
      .map((item, index) => ({
        name: item.category.name,
        amount: Math.abs(item.amount),
        percentage: item.percentage,
        color:
          item.category.color ||
          [
            UI.COLORS.PRIMARY,
            UI.COLORS.SUCCESS,
            UI.COLORS.WARNING,
            UI.COLORS.ERROR,
            UI.COLORS.ACCENT,
            "#8B5CF6",
            "#10B981",
            "#06B6D4",
          ][index % 8],
      }));

    if (categoryData.length === 0) return null;

    return (
      <PieChartSection
        title="Expense Categories"
        data={categoryData}
        onPress={() => handleCategoryComparison("expense")}
        onCompare={() => handleCategoryComparison("expense")}
      />
    );
  };

  const renderMonthlyComparison = () => {
    let periods: Array<{ startDate: Date; endDate: Date; name: string }> = [];
    let titleSuffix = "";

    if (selectedPeriod === "billing") {
      // Get last 6 billing periods for comparison
      titleSuffix = "Billing Period";
      for (let i = 0; i < 6; i++) {
        const periodEndDate = new Date(currentBillingPeriod.endDate);
        periodEndDate.setMonth(periodEndDate.getMonth() - i);

        const periodStartDate = new Date(periodEndDate);
        periodStartDate.setDate(currentBillingPeriod.billingDay);
        periodStartDate.setMonth(periodStartDate.getMonth() - 1);

        const periodName = periodEndDate.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        periods.push({
          startDate: periodStartDate,
          endDate: periodEndDate,
          name: periodName,
        });
      }
    } else if (selectedPeriod === "month") {
      // Get last 6 calendar months
      titleSuffix = "Monthly";
      for (let i = 0; i < 6; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        periods.push({
          startDate,
          endDate,
          name: date.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          }),
        });
      }
    } else if (selectedPeriod === "week") {
      // Get last 8 weeks
      titleSuffix = "Weekly";
      for (let i = 0; i < 8; i++) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - i * 7);
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 6);

        periods.push({
          startDate,
          endDate,
          name: `W${Math.ceil((endDate.getDate() - startDate.getDate() + 1) / 7)}`,
        });
      }
    } else {
      // Daily for last 14 days
      titleSuffix = "Daily";
      for (let i = 0; i < 14; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        periods.push({
          startDate,
          endDate,
          name: `${date.getMonth() + 1}/${date.getDate()}`, // More compact format: MM/DD
        });
      }
    }

    const periodData = periods
      .map((period) => {
        const periodTransactions = transactions.filter((t) => {
          const date = new Date(t.date);
          return date >= period.startDate && date <= period.endDate;
        });

        const income = periodTransactions
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const expenses = periodTransactions
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        return {
          month: period.name,
          name: period.name, // Add name field for chart labels
          income,
          expenses,
          balance: income - expenses,
          value: Math.abs(income - expenses), // Use absolute value for better chart display
          amount: Math.abs(income - expenses), // Alternative field name
        };
      })
      .reverse(); // Show oldest to newest

    // Always ensure at least 3 periods are shown
    const minPeriods = 3;
    let finalPeriodData;

    if (periodData.length < minPeriods) {
      // If we have fewer periods than minimum, keep them all
      finalPeriodData = periodData;
    } else {
      // Show at least 3 periods, prioritizing recent ones with data, but include zeros if needed
      const periodsWithData = periodData.filter(
        (p) => p.income > 0 || p.expenses > 0,
      );
      if (periodsWithData.length >= minPeriods) {
        finalPeriodData = periodsWithData.slice(-6); // Show up to 6 periods with data
      } else {
        // Mix periods with data and recent periods to reach minimum
        finalPeriodData = periodData.slice(-minPeriods);
      }
    }

    if (finalPeriodData.length === 0) return null;

    return (
      <LineChartSection
        title={`${titleSuffix} Comparison`}
        data={finalPeriodData}
        onPress={() => console.log("Navigate to detailed trends")}
        onCompare={() => handleMonthlyTrendsComparison(finalPeriodData)}
        comparisonMode="monthly"
      />
    );
  };

  const renderCategoriesVsDays = () => {
    // Show category spending by day for the current period (up to today only)
    const today = new Date();
    const endDateToUse =
      today < currentBillingPeriod.endDate
        ? today
        : currentBillingPeriod.endDate;

    if (comparisonMode === "total") {
      // Show total daily spending
      const dailyTotals = new Map();

      transactions.forEach((transaction) => {
        if (transaction.type !== "expense") return;

        const date = new Date(transaction.date);
        if (date < currentBillingPeriod.startDate || date > endDateToUse)
          return;

        const dayKey = date.toISOString().split("T")[0];
        const dayLabel = date.getDate().toString(); // Just the day number

        if (!dailyTotals.has(dayKey)) {
          dailyTotals.set(dayKey, { day: dayLabel, date, total: 0 });
        }

        dailyTotals.get(dayKey).total += Math.abs(transaction.amount);
      });

      const sortedDays = Array.from(dailyTotals.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(-14);

      const chartData = sortedDays.map((d) => ({
        month: d.day,
        value: d.total,
        expenses: d.total,
        income: 0,
        balance: -d.total,
      }));

      return (
        <LineChartSection
          title="Daily Total Spending (Current Period)"
          data={chartData}
          onPress={() => console.log("Navigate to daily details")}
          onCompare={() => console.log("Compare daily totals")}
          comparisonMode="monthly"
        />
      );
    } else {
      // Show by category (existing logic)
      const topCategories = analyticsData.categoryBreakdown
        .filter((item) => item.category.type === "expense")
        .slice(0, 8)
        .map((item) => item.category);

      if (topCategories.length === 0) return null;

      // Create daily data for each category
      const dailyData = new Map();

      transactions.forEach((transaction) => {
        if (transaction.type !== "expense") return;

        const category = categories[transaction.categoryId];
        if (!category || !topCategories.find((c) => c.id === category.id))
          return;

        const date = new Date(transaction.date);
        if (date < currentBillingPeriod.startDate || date > endDateToUse)
          return;

        const dayKey = date.toISOString().split("T")[0]; // YYYY-MM-DD
        const dayLabel = date.getDate().toString(); // Just the day number

        if (!dailyData.has(dayKey)) {
          dailyData.set(dayKey, {
            day: dayLabel,
            date: date,
          });
        }

        const dayData = dailyData.get(dayKey);
        if (!dayData[category.id]) {
          dayData[category.id] = 0;
        }
        dayData[category.id] += Math.abs(transaction.amount);
      });

      // Sort by date and fill missing days with zeros
      const sortedDays = Array.from(dailyData.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(-14); // Show last 14 days

      // Ensure all categories have data for all days
      sortedDays.forEach((dayData) => {
        topCategories.forEach((category) => {
          if (!dayData[category.id]) {
            dayData[category.id] = 0;
          }
        });
      });

      const chartData = {
        labels: sortedDays.map((d) => d.day),
        datasets: topCategories.map((category, index) => ({
          data: sortedDays.map((d) => d[category.id] || 0),
          color: () =>
            category.color ||
            [
              UI.COLORS.PRIMARY,
              UI.COLORS.SUCCESS,
              UI.COLORS.WARNING,
              UI.COLORS.ERROR,
              UI.COLORS.ACCENT,
              "#8B5CF6",
              "#10B981",
              "#06B6D4",
            ][index % 8],
          strokeWidth: 2,
        })),
        legend: topCategories.map((c) => c.name),
      };

      return (
        <LineChartSection
          title="Categories vs Days (Current Period)"
          data={chartData}
          onPress={() => handleCategoryComparison("expense")}
          onCompare={() => handleCategoryComparison("expense")}
          comparisonMode="category"
          isMultiCategory={true}
        />
      );
    }
  };

  const renderPeriodComparison = () => {
    // Compare current period vs last period vs average of all periods
    const currentPeriod = currentBillingPeriod;

    // Calculate previous period
    const previousPeriodEnd = new Date(currentPeriod.startDate);
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
    const previousPeriodStart = new Date(previousPeriodEnd);
    previousPeriodStart.setDate(currentPeriod.billingDay);
    previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);

    // Get all historical billing periods (last 12 months)
    const historicalPeriods: Array<{ startDate: Date; endDate: Date }> = [];
    for (let i = 2; i < 12; i++) {
      // Skip current and previous
      const periodEndDate = new Date(currentPeriod.endDate);
      periodEndDate.setMonth(periodEndDate.getMonth() - i);

      const periodStartDate = new Date(periodEndDate);
      periodStartDate.setDate(currentPeriod.billingDay);
      periodStartDate.setMonth(periodStartDate.getMonth() - 1);

      historicalPeriods.push({
        startDate: periodStartDate,
        endDate: periodEndDate,
      });
    }

    // Get top categories
    const topCategories = analyticsData.categoryBreakdown
      .filter((item) => item.category.type === "expense")
      .slice(0, 6)
      .map((item) => item.category);

    const calculatePeriodData = (startDate: Date, endDate: Date) => {
      const periodTransactions = transactions.filter((t) => {
        const date = new Date(t.date);
        return date >= startDate && date <= endDate && t.type === "expense";
      });

      return topCategories.map((category) => {
        const categoryTotal = periodTransactions
          .filter((t) => t.categoryId === category.id)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        return categoryTotal;
      });
    };

    const currentData = calculatePeriodData(
      currentPeriod.startDate,
      currentPeriod.endDate,
    );
    const previousData = calculatePeriodData(
      previousPeriodStart,
      previousPeriodEnd,
    );

    // Calculate average from historical periods
    const averageData = topCategories.map((_, index) => {
      const historicalTotals = historicalPeriods.map(
        (period) =>
          calculatePeriodData(period.startDate, period.endDate)[index],
      );
      return historicalTotals.length > 0
        ? historicalTotals.reduce((sum, val) => sum + val, 0) /
            historicalTotals.length
        : 0;
    });

    const chartData = {
      labels: topCategories.map((c) =>
        c.name.length > 10 ? c.name.substring(0, 10) + "..." : c.name,
      ),
      datasets: [
        {
          data: currentData,
          color: () => UI.COLORS.PRIMARY,
        },
        {
          data: previousData,
          color: () => UI.COLORS.SUCCESS,
        },
        {
          data: averageData,
          color: () => UI.COLORS.WARNING,
        },
      ],
      legend: ["Current Period", "Previous Period", "Historical Average"],
    };

    return (
      <BarChartSection
        title="Period Comparison by Category"
        data={chartData}
        onCompare={() => handleCategoryComparison("expense")}
        comparisonMode="category"
        isMultiCategory={true}
      />
    );
  };

  const renderCustomCharts = () => {
    if (customCharts.length === 0) {
      return (
        <View style={styles.customChartsSection}>
          <View style={styles.customChartsHeader}>
            <Text style={styles.sectionLabel}>CUSTOM CHARTS</Text>
            <TouchableOpacity
              style={styles.addChartButton}
              onPress={handleCreateChart}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addChartText}>Add</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.emptyChartsCard}>
            <Ionicons
              name="pie-chart-outline"
              size={48}
              color="rgba(255,255,255,0.15)"
            />
            <Text style={styles.emptyChartsTitle}>No Custom Charts</Text>
            <Text style={styles.emptyChartsDescription}>
              Create custom charts to visualize your data in new ways
            </Text>
            <TouchableOpacity
              style={styles.createFirstChartButton}
              onPress={handleCreateChart}>
              <LinearGradient
                colors={[UI.COLORS.PRIMARY, UI.COLORS.PRIMARY_DARK]}
                style={styles.gradientBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}>
                <Text style={styles.gradientBtnText}>
                  Create Your First Chart
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.customChartsSection}>
        <View style={styles.customChartsHeader}>
          <View>
            <Text style={styles.sectionLabel}>CUSTOM CHARTS</Text>
            <Text style={styles.chartCount}>
              {customCharts.length} chart{customCharts.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addChartButton}
            onPress={handleCreateChart}>
            <Ionicons name="add" size={20} color={UI.COLORS.TEXT_PRIMARY} />
            <Text style={styles.addChartText}>Add Chart</Text>
          </TouchableOpacity>
        </View>

        {customCharts.map((chart) => (
          <CustomChartCard
            key={chart.id}
            chart={{
              id: chart.id,
              title: chart.title,
              chartType: chart.chartType,
              dataSource: chart.dataSource,
              filters: chart.filters,
              colorTheme: chart.colorTheme,
            }}
            data={processCustomChartData(chart)}
            onPress={() => handleViewChart(chart.id)}
            onEdit={() => handleEditChart(chart.id)}
            onDelete={() => handleDeleteChart(chart.id)}
            onDuplicate={() => handleDuplicateChart(chart.id)}
          />
        ))}
      </View>
    );
  };

  const renderPeriodSelectionModal = () => {
    const periods = [
      { value: "day", label: "Daily", description: "Daily data points" },
      { value: "week", label: "Weekly", description: "Week-by-week analysis" },
      { value: "month", label: "Monthly", description: "Monthly comparison" },
      {
        value: "billing",
        label: "Billing Period",
        description: "Billing cycle based",
      },
    ] as const;

    return (
      <Modal
        visible={periodSelectionModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPeriodSelectionModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Period</Text>
            <TouchableOpacity
              onPress={() => setPeriodSelectionModal(false)}
              style={styles.closeButton}>
              <Ionicons name="close" size={24} color={UI.COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period.value}
                style={[
                  styles.periodOption,
                  selectedPeriod === period.value && styles.periodOptionActive,
                ]}
                onPress={() => {
                  setSelectedPeriod(period.value);
                  setPeriodSelectionModal(false);
                }}>
                <View style={styles.periodOptionContent}>
                  <Text
                    style={[
                      styles.periodOptionTitle,
                      selectedPeriod === period.value &&
                        styles.periodOptionTitleActive,
                    ]}>
                    {period.label}
                  </Text>
                  <Text style={styles.periodOptionDescription}>
                    {period.description}
                  </Text>
                </View>
                {selectedPeriod === period.value && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={UI.COLORS.PRIMARY}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderComparisonModal = () => {
    const { visible, type, title, data } = comparisonModal;
    if (!visible || !type) return null;

    const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() =>
          setComparisonModal({
            visible: false,
            type: null,
            title: undefined,
            data: [],
          })
        }>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {title ||
                `${type === "expense" ? "Expense" : "Income"} Category Comparison`}
            </Text>
            <TouchableOpacity
              onPress={() =>
                setComparisonModal({
                  visible: false,
                  type: null,
                  title: undefined,
                  data: [],
                })
              }
              style={styles.closeButton}>
              <Ionicons name="close" size={24} color={UI.COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.comparisonSummary}>
              <Text style={styles.summaryText}>
                Total {type === "expense" ? "Expenses" : "Income"}: $
                {totalAmount.toFixed(0)}
              </Text>
              <Text style={styles.summarySubtext}>
                {data.length} categories in selected period
              </Text>
            </View>

            {data.map((item, index) => (
              <View key={item.category.id} style={styles.comparisonItem}>
                <View style={styles.comparisonRank}>
                  <Text style={styles.rankNumber}>#{index + 1}</Text>
                </View>
                <View
                  style={[
                    styles.categoryColorIndicator,
                    {
                      backgroundColor: item.category.color || UI.COLORS.PRIMARY,
                    },
                  ]}
                />
                <View style={styles.comparisonDetails}>
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {item.category.name}
                  </Text>
                  <View style={styles.amountRow}>
                    <Text style={styles.categoryAmount}>
                      ${item.amount.toFixed(0)}
                    </Text>
                    <Text style={styles.categoryPercentage}>
                      {item.percentage.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${(item.amount / totalAmount) * 100}%`,
                          backgroundColor:
                            item.category.color || UI.COLORS.PRIMARY,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={styles.createChartButton}
              onPress={() => {
                setComparisonModal({
                  visible: false,
                  type: null,
                  title: undefined,
                  data: [],
                });
                navigation.navigate("CreateCustomChart");
              }}>
              <Ionicons
                name="pie-chart"
                size={20}
                color={UI.COLORS.TEXT_PRIMARY}
              />
              <Text style={styles.createChartButtonText}>
                Create Custom Chart
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyCard}>
      <Ionicons
        name="analytics-outline"
        size={64}
        color="rgba(255,255,255,0.15)"
      />
      <Text style={styles.emptyTitle}>No Financial Data</Text>
      <Text style={styles.emptyDescription}>
        Start adding transactions to see your financial analytics and insights.
      </Text>
      <TouchableOpacity
        style={{ marginTop: 16 }}
        onPress={() => navigation.goBack()}>
        <LinearGradient
          colors={[UI.COLORS.PRIMARY, UI.COLORS.PRIMARY_DARK]}
          style={styles.gradientBtn}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}>
          <Text style={styles.gradientBtnText}>Add First Transaction</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (isEmpty) {
    return (
      <LinearGradient
        colors={["#0a0a2e", "#1a1040", "#0d0d30"]}
        style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.emptyContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={UI.COLORS.PRIMARY}
              />
            }>
            {renderEmptyState()}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#0a0a2e", "#1a1040", "#0d0d30"]}
      style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={UI.COLORS.PRIMARY}
            />
          }>
          {renderHeader()}
          {renderOverview()}
          {renderCategoriesPieChart()}
          {renderMonthlyComparison()}
          {renderCategoriesVsDays()}
          {renderPeriodComparison()}
          {renderCustomCharts()}
        </ScrollView>

        <FloatingActionButton
          onPress={handleCreateChart}
          icon="analytics"
          style={styles.fab}
        />

        {renderComparisonModal()}
        {renderPeriodSelectionModal()}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  /* ── layout ── */
  container: {
    flex: 1,
    paddingBottom: 100,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 16,
  },

  /* ── header ── */
  header: {
    padding: 16,
    paddingBottom: 0,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: UI.COLORS.PRIMARY,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
  },
  billingPeriod: {
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    marginTop: 8,
    marginBottom: 2,
  },
  billingPeriodDates: {
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
    marginBottom: 14,
  },

  /* ── period selector pill ── */
  periodSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(108,92,231,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: GLASS.borderLight,
  },
  periodSelectorText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },

  /* ── comparison toggle ── */
  comparisonToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: GLASS.borderLight,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: GLASS.bg,
    borderRadius: 20,
    padding: 2,
    borderWidth: 1,
    borderColor: GLASS.borderLight,
  },
  toggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  toggleButtonActive: {
    backgroundColor: UI.COLORS.PRIMARY,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.45)",
  },
  toggleButtonTextActive: {
    color: "#fff",
  },

  /* ── section labels ── */
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.35)",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: UI.COLORS.TEXT_PRIMARY,
    letterSpacing: 0.3,
    marginBottom: UI.SPACING.SM,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 10,
    marginTop: 20,
  },

  /* ── overview ── */
  overviewContainer: {
    padding: 16,
  },
  summaryContainer: {
    padding: 16,
  },
  mainSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },

  /* ── glass cards ── */
  glassCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: GLASS.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GLASS.border,
    padding: 14,
  },
  glassCardSmall: {
    flex: 1,
    minWidth: 140,
    backgroundColor: GLASS.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GLASS.borderLight,
    padding: 12,
  },

  /* ── icon circles ── */
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  overviewCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  overviewCardTextBlock: {
    flex: 1,
  },
  overviewCardTitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 2,
  },
  overviewCardValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },

  /* ── expense breakdown ── */
  expenseBreakdownGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  /* ── top categories ── */
  topCategoriesGrid: {
    flexDirection: "row",
    gap: 8,
  },
  categoryCardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  categoryDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 3,
  },
  categoryTextBlock: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
    marginBottom: 2,
  },
  categoryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  categoryPercentageText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    marginTop: 1,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },

  /* ── custom charts section ── */
  customChartsSection: {
    padding: 16,
  },
  customChartsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  chartCount: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    marginTop: 2,
  },
  addChartButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(108,92,231,0.25)",
    borderWidth: 1,
    borderColor: GLASS.borderLight,
  },
  addChartText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  emptyChartsCard: {
    backgroundColor: GLASS.bg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GLASS.border,
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  emptyChartsTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    marginTop: 4,
  },
  emptyChartsDescription: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    lineHeight: 18,
  },
  createFirstChartButton: {
    marginTop: 12,
    borderRadius: 14,
    overflow: "hidden",
  },

  /* ── gradient button ── */
  gradientBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  gradientBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },

  /* ── empty state ── */
  emptyCard: {
    backgroundColor: GLASS.bg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GLASS.border,
    padding: 40,
    alignItems: "center",
    gap: 10,
    margin: 16,
  },
  emptyContent: {
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginTop: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    lineHeight: 20,
  },

  /* ── modals ── */
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0d0d30",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: GLASS.border,
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: GLASS.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  modalCloseButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  periodOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: GLASS.borderLight,
  },
  periodOptionActive: {
    backgroundColor: "rgba(108,92,231,0.12)",
  },
  periodOptionText: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
  },
  periodOptionTextActive: {
    color: UI.COLORS.PRIMARY,
    fontWeight: "700",
  },
  comparisonOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: GLASS.borderLight,
  },
  comparisonOptionActive: {
    backgroundColor: "rgba(108,92,231,0.12)",
  },
  comparisonOptionText: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
  },
  comparisonOptionTextActive: {
    color: UI.COLORS.PRIMARY,
    fontWeight: "700",
  },
  comparisonOptionSubtext: {
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    marginTop: 3,
  },
  comparisonSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },

  /* ── category comparison modal ── */
  categoryOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: GLASS.borderLight,
  },
  categoryOptionActive: {
    backgroundColor: "rgba(108,92,231,0.12)",
  },
  categoryOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
  },
  categoryOptionTextActive: {
    color: UI.COLORS.PRIMARY,
    fontWeight: "700",
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
  },
  categoryPercentage: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.35)",
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  createChartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: UI.COLORS.PRIMARY,
    padding: 14,
    borderRadius: 14,
    marginTop: 20,
    marginHorizontal: 20,
  },
  createChartButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  /* ── FAB ── */
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
  },

  /* ── comparison modal (period details) ── */
  closeButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  periodOptionContent: {
    flex: 1,
  },
  periodOptionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  periodOptionTitleActive: {
    color: UI.COLORS.PRIMARY,
    fontWeight: "700",
  },
  periodOptionDescription: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
  },

  /* ── category comparison view ── */
  comparisonSummary: {
    backgroundColor: GLASS.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GLASS.borderLight,
    padding: 14,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  summarySubtext: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
  },
  comparisonItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GLASS.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GLASS.borderLight,
    padding: 12,
    marginBottom: 8,
  },
  comparisonRank: {
    width: 36,
    alignItems: "center",
  },
  rankNumber: {
    fontSize: 15,
    fontWeight: "700",
    color: "rgba(255,255,255,0.4)",
  },
  categoryColorIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginHorizontal: 8,
  },
  comparisonDetails: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
    fontFamily: "System",
    textAlign: "left",
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
});
