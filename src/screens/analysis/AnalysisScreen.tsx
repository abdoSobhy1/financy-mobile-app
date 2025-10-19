import React, { useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Text, TouchableOpacity, Alert, Modal } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";

import { useAnalysisData } from "./hooks/useAnalysisData";
import { ChartCard, PieChartSection, LineChartSection, BarChartSection, CustomChartCard } from "../../components/analysis/ChartCard";
import Card from "../../components/ui/Card";
import Screen from "../../components/ui/Screen";
import { FloatingActionButton } from "../../components/ui/FloatingActionButton";
import { useToast } from "../../components/ui";
import { UI } from "../../constants";
import { RootState } from "../../store";
import { deleteCustomChart, addCustomChart } from "../../store/slices/analysisSlice";
import { AnalysisStackParamList } from "../../types";
import { subMonths } from "date-fns";

type AnalysisScreenNavigationProp = StackNavigationProp<AnalysisStackParamList, "AnalysisHome">;

// Memoized selectors to prevent unnecessary re-renders
const selectCustomCharts = createSelector([(state: RootState) => state.analysis.customCharts], (customCharts) => Object.values(customCharts));

const selectTransactions = createSelector([(state: RootState) => state.transactions.items], (items) => Object.values(items));

// Simple selector - no transformation needed
const selectCategories = (state: RootState) => state.categories.items;

const selectBudgets = createSelector([(state: RootState) => state.budgets.items], (items) => Object.values(items));

const selectDebts = createSelector([(state: RootState) => state.debts.items], (items) => Object.values(items));

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
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, billingDay);
    }

    const periodName = endDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });

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
  const [comparisonMode, setComparisonMode] = useState<"category" | "total">("category");
  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "week" | "month" | "billing">("billing");
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

    Alert.alert("Delete Chart", `Are you sure you want to delete "${chartName}"? This action cannot be undone.`, [
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
    ]);
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
      filteredTransactions = filteredTransactions.filter((t) => filters.categoryIds.includes(t.categoryId));
    }

    if (filters.transactionType && filters.transactionType !== "both") {
      filteredTransactions = filteredTransactions.filter((t) => t.type === filters.transactionType);
    }

    if (filters.startDate && filters.endDate) {
      filteredTransactions = filteredTransactions.filter((t) => {
        const date = new Date(t.date);
        return date >= new Date(filters.startDate) && date <= new Date(filters.endDate);
      });
    }

    if (chartType === "pie") {
      // Group by category for pie chart
      const categoryData = new Map();

      filteredTransactions.forEach((transaction) => {
        const category = categories[transaction.categoryId];
        if (!category) return;

        const existing = categoryData.get(category.id) || { amount: 0, count: 0 };
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
          data.category.color || [UI.COLORS.PRIMARY, UI.COLORS.SUCCESS, UI.COLORS.WARNING, UI.COLORS.ERROR, UI.COLORS.ACCENT, "#8B5CF6"][index % 6],
      }));
    }

    if (chartType === "line" || chartType === "bar") {
      // Group by month for line/bar chart
      const monthlyData = new Map();

      filteredTransactions.forEach((transaction) => {
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        const monthLabel = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });

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

      return Array.from(monthlyData.values()).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
    }

    return [];
  };

  const processBudgetData = (chartType: string, filters: any = {}) => {
    if (chartType === "pie") {
      return budgets.map((budget, index) => {
        const budgetTransactions = transactions.filter((t) => t.budgetId === budget.id);
        const used = budgetTransactions.reduce((sum, t) => sum + t.amount, 0);

        return {
          name: budget.name,
          amount: Math.abs(used), // Use absolute values
          color: [UI.COLORS.PRIMARY, UI.COLORS.SUCCESS, UI.COLORS.WARNING, UI.COLORS.ERROR, UI.COLORS.ACCENT, "#8B5CF6"][index % 6],
        };
      });
    }

    return [];
  };

  const processBillData = (chartType: string, filters: any = {}) => {
    // Implement bill data processing
    return [];
  };

  const processDebtData = (chartType: string, filters: any = {}) => {
    if (chartType === "pie") {
      return debts.map((debt, index) => ({
        name: debt.name || "Debt",
        amount: Math.abs(debt.totalAmount || 0), // Use absolute values
        color: [UI.COLORS.ERROR, UI.COLORS.WARNING, UI.COLORS.PRIMARY, UI.COLORS.ACCENT, UI.COLORS.SUCCESS, "#8B5CF6"][index % 6],
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
    const total = monthlyComparisonData.reduce((sum, item) => sum + item.amount, 0);
    monthlyComparisonData.forEach((item) => {
      item.percentage = total > 0 ? (item.amount / total) * 100 : 0;
    });

    Alert.alert(
      "Monthly Trends Comparison",
      `Showing activity trends for ${trendsData.length} months:\n${monthlyComparisonData
        .slice(0, 3)
        .map((item, index) => `${index + 1}. ${item.category.name}: $${item.amount.toFixed(0)}`)
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
      ]
    );
  };

  const renderHeader = () => {
    return (
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Financial Analysis</Text>
          <TouchableOpacity style={styles.periodSelector} onPress={() => setPeriodSelectionModal(true)}>
            <Text style={styles.periodSelectorText}>{selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}</Text>
            <Ionicons name="chevron-down" size={16} color={UI.COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>

        <Text style={styles.billingPeriod}>Billing Period: {currentBillingPeriod.name}</Text>
        <Text style={styles.billingPeriodDates}>
          {currentBillingPeriod.startDate.toLocaleDateString()} - {currentBillingPeriod.endDate.toLocaleDateString()}
        </Text>

        {/* Comparison Mode Toggle */}
        <View style={styles.comparisonToggle}>
          <Text style={styles.toggleLabel}>Compare by:</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, comparisonMode === "category" && styles.toggleButtonActive]}
              onPress={() => setComparisonMode("category")}>
              <Text style={[styles.toggleButtonText, comparisonMode === "category" && styles.toggleButtonTextActive]}>Category</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, comparisonMode === "total" && styles.toggleButtonActive]}
              onPress={() => setComparisonMode("total")}>
              <Text style={[styles.toggleButtonText, comparisonMode === "total" && styles.toggleButtonTextActive]}>Total</Text>
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
        (cat) => cat.name.toLowerCase().includes("debt") || cat.name.toLowerCase().includes("loan") || cat.name.toLowerCase().includes("credit")
      )
      .map((cat) => cat.id);

    const billCategoryIds = Object.values(categories)
      .filter(
        (cat) =>
          cat.name.toLowerCase().includes("bill") ||
          cat.name.toLowerCase().includes("utility") ||
          cat.name.toLowerCase().includes("subscription") ||
          cat.name.toLowerCase().includes("rent") ||
          cat.name.toLowerCase().includes("insurance")
      )
      .map((cat) => cat.id);

    // Find the "مصاريفي" budget
    const myExpensesBudget = budgets.find((budget) => budget.name === "مصاريفي");
    const myExpensesBudgetId = myExpensesBudget ? myExpensesBudget.id : null;

    // Calculate expenses by category type and budget assignment
    transactions
      .filter((t) => t.type === "expense" && new Date(t.date) >= currentBillingPeriod.startDate && new Date(t.date) <= currentBillingPeriod.endDate)
      .forEach((t) => {
        const amount = Math.abs(t.amount);

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
    const topCategories = analyticsData.categoryBreakdown.filter((item) => item.category.type === "expense").slice(0, 2);

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
        <Text style={styles.sectionTitle}>Financial Overview</Text>

        {/* Main Summary */}
        <View style={styles.mainSummaryGrid}>
          {mainSummaryItems.map((item, index) => (
            <Card key={index} style={styles.mainSummaryCard} padding="small">
              <View style={styles.overviewCardRow}>
                <Ionicons name={item.icon as any} size={28} color={item.color} />
                <View style={styles.overviewCardTextBlock}>
                  <Text style={styles.overviewCardTitle}>{item.title}</Text>
                  <Text style={[styles.overviewCardValue, { color: item.color }]}>${Math.abs(item.value).toFixed(0)}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* Expense Breakdown */}
        {expenseBreakdownItems.length > 0 && (
          <>
            <Text style={styles.subSectionTitle}>Expense Breakdown</Text>
            <View style={styles.expenseBreakdownGrid}>
              {expenseBreakdownItems.map((item, index) => (
                <Card key={index} style={styles.expenseBreakdownCard} padding="small">
                  <View style={styles.overviewCardRow}>
                    <Ionicons name={item.icon as any} size={24} color={item.color} />
                    <View style={styles.overviewCardTextBlock}>
                      <Text style={styles.overviewCardTitle}>{item.title}</Text>
                      <Text style={[styles.overviewCardValue, { color: item.color }]}>${item.value.toFixed(0)}</Text>
                    </View>
                  </View>
                </Card>
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
                <Card key={index} style={styles.topCategoryCard} padding="small">
                  <View style={styles.categoryCardRow}>
                    <View
                      style={[
                        styles.categoryDot,
                        {
                          backgroundColor: item.category.color || UI.COLORS.PRIMARY,
                        },
                      ]}
                    />
                    <View style={styles.categoryTextBlock}>
                      <Text style={styles.categoryTitle} numberOfLines={1}>
                        {item.category.name}
                      </Text>
                      <Text style={styles.categoryValue}>${Math.abs(item.amount).toFixed(0)}</Text>
                      <Text style={styles.categoryPercentageText}>{item.percentage.toFixed(1)}% of expenses</Text>
                    </View>
                  </View>
                </Card>
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
          [UI.COLORS.PRIMARY, UI.COLORS.SUCCESS, UI.COLORS.WARNING, UI.COLORS.ERROR, UI.COLORS.ACCENT, "#8B5CF6", "#10B981", "#06B6D4"][index % 8],
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

        const periodName = periodEndDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });

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
          name: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
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

        const income = periodTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const expenses = periodTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + Math.abs(t.amount), 0);

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
      const periodsWithData = periodData.filter((p) => p.income > 0 || p.expenses > 0);
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
    const endDateToUse = today < currentBillingPeriod.endDate ? today : currentBillingPeriod.endDate;

    if (comparisonMode === "total") {
      // Show total daily spending
      const dailyTotals = new Map();

      transactions.forEach((transaction) => {
        if (transaction.type !== "expense") return;

        const date = new Date(transaction.date);
        if (date < currentBillingPeriod.startDate || date > endDateToUse) return;

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
        if (!category || !topCategories.find((c) => c.id === category.id)) return;

        const date = new Date(transaction.date);
        if (date < currentBillingPeriod.startDate || date > endDateToUse) return;

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
            [UI.COLORS.PRIMARY, UI.COLORS.SUCCESS, UI.COLORS.WARNING, UI.COLORS.ERROR, UI.COLORS.ACCENT, "#8B5CF6", "#10B981", "#06B6D4"][index % 8],
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

      historicalPeriods.push({ startDate: periodStartDate, endDate: periodEndDate });
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
        const categoryTotal = periodTransactions.filter((t) => t.categoryId === category.id).reduce((sum, t) => sum + Math.abs(t.amount), 0);
        return categoryTotal;
      });
    };

    const currentData = calculatePeriodData(currentPeriod.startDate, currentPeriod.endDate);
    const previousData = calculatePeriodData(previousPeriodStart, previousPeriodEnd);

    // Calculate average from historical periods
    const averageData = topCategories.map((_, index) => {
      const historicalTotals = historicalPeriods.map((period) => calculatePeriodData(period.startDate, period.endDate)[index]);
      return historicalTotals.length > 0 ? historicalTotals.reduce((sum, val) => sum + val, 0) / historicalTotals.length : 0;
    });

    const chartData = {
      labels: topCategories.map((c) => (c.name.length > 10 ? c.name.substring(0, 10) + "..." : c.name)),
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
            <Text style={styles.sectionTitle}>Custom Charts</Text>
            <TouchableOpacity style={styles.addChartButton} onPress={handleCreateChart}>
              <Ionicons name="add" size={20} color={UI.COLORS.TEXT_PRIMARY} />
              <Text style={styles.addChartText}>Add Chart</Text>
            </TouchableOpacity>
          </View>

          <Card style={styles.emptyChartsCard}>
            <View style={styles.emptyChartsContent}>
              <Ionicons name="pie-chart-outline" size={48} color={UI.COLORS.TEXT_MUTED} />
              <Text style={styles.emptyChartsTitle}>No Custom Charts</Text>
              <Text style={styles.emptyChartsDescription}>Create custom charts to visualize your financial data in new ways</Text>
              <TouchableOpacity style={styles.createFirstChartButton} onPress={handleCreateChart}>
                <Text style={styles.createFirstChartButtonText}>Create Your First Chart</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      );
    }

    return (
      <View style={styles.customChartsSection}>
        <View style={styles.customChartsHeader}>
          <View>
            <Text style={styles.sectionTitle}>Custom Charts</Text>
            <Text style={styles.chartCount}>
              {customCharts.length} chart{customCharts.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <TouchableOpacity style={styles.addChartButton} onPress={handleCreateChart}>
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
      { value: "billing", label: "Billing Period", description: "Billing cycle based" },
    ] as const;

    return (
      <Modal visible={periodSelectionModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPeriodSelectionModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Period</Text>
            <TouchableOpacity onPress={() => setPeriodSelectionModal(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={UI.COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period.value}
                style={[styles.periodOption, selectedPeriod === period.value && styles.periodOptionActive]}
                onPress={() => {
                  setSelectedPeriod(period.value);
                  setPeriodSelectionModal(false);
                }}>
                <View style={styles.periodOptionContent}>
                  <Text style={[styles.periodOptionTitle, selectedPeriod === period.value && styles.periodOptionTitleActive]}>{period.label}</Text>
                  <Text style={styles.periodOptionDescription}>{period.description}</Text>
                </View>
                {selectedPeriod === period.value && <Ionicons name="checkmark-circle" size={24} color={UI.COLORS.PRIMARY} />}
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
        onRequestClose={() => setComparisonModal({ visible: false, type: null, title: undefined, data: [] })}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title || `${type === "expense" ? "Expense" : "Income"} Category Comparison`}</Text>
            <TouchableOpacity
              onPress={() => setComparisonModal({ visible: false, type: null, title: undefined, data: [] })}
              style={styles.closeButton}>
              <Ionicons name="close" size={24} color={UI.COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.comparisonSummary}>
              <Text style={styles.summaryText}>
                Total {type === "expense" ? "Expenses" : "Income"}: ${totalAmount.toFixed(0)}
              </Text>
              <Text style={styles.summarySubtext}>{data.length} categories in selected period</Text>
            </View>

            {data.map((item, index) => (
              <View key={item.category.id} style={styles.comparisonItem}>
                <View style={styles.comparisonRank}>
                  <Text style={styles.rankNumber}>#{index + 1}</Text>
                </View>
                <View style={[styles.categoryColorIndicator, { backgroundColor: item.category.color || UI.COLORS.PRIMARY }]} />
                <View style={styles.comparisonDetails}>
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {item.category.name}
                  </Text>
                  <View style={styles.amountRow}>
                    <Text style={styles.categoryAmount}>${item.amount.toFixed(0)}</Text>
                    <Text style={styles.categoryPercentage}>{item.percentage.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${(item.amount / totalAmount) * 100}%`,
                          backgroundColor: item.category.color || UI.COLORS.PRIMARY,
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
                setComparisonModal({ visible: false, type: null, title: undefined, data: [] });
                navigation.navigate("CreateCustomChart");
              }}>
              <Ionicons name="pie-chart" size={20} color={UI.COLORS.TEXT_PRIMARY} />
              <Text style={styles.createChartButtonText}>Create Custom Chart</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderEmptyState = () => {
    return (
      <Card style={styles.emptyCard}>
        <View style={styles.emptyContent}>
          <Ionicons name="analytics-outline" size={64} color={UI.COLORS.TEXT_MUTED} />
          <Text style={styles.emptyTitle}>No Financial Data</Text>
          <Text style={styles.emptyDescription}>Start adding transactions to see your financial analytics and insights.</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => {
              // Navigate to transactions tab - this would need to be handled differently
              // For now, we'll just close this screen
              navigation.goBack();
            }}>
            <Text style={styles.emptyButtonText}>Add First Transaction</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  if (isEmpty) {
    return (
      <Screen>
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={UI.COLORS.PRIMARY} />}>
          {renderEmptyState()}
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={UI.COLORS.PRIMARY} />}>
        {renderHeader()}
        {renderOverview()}
        {renderCategoriesPieChart()}
        {renderMonthlyComparison()}
        {renderCategoriesVsDays()}
        {renderPeriodComparison()}
        {renderCustomCharts()}
      </ScrollView>

      <FloatingActionButton onPress={handleCreateChart} icon="analytics" style={styles.fab} />

      {renderComparisonModal()}
      {renderPeriodSelectionModal()}
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: UI.SPACING.MD,
  },
  header: {
    padding: UI.SPACING.MD,
    paddingBottom: 0,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: UI.SPACING.SM,
  },
  periodSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: UI.COLORS.SURFACE,
    paddingHorizontal: UI.SPACING.MD,
    paddingVertical: UI.SPACING.SM,
    borderRadius: 20,
    gap: UI.SPACING.XS,
  },
  periodSelectorText: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  comparisonToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: UI.SPACING.MD,
    paddingTop: UI.SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER + "30",
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_SECONDARY,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: 20,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: UI.SPACING.MD,
    paddingVertical: UI.SPACING.SM,
    borderRadius: 18,
  },
  toggleButtonActive: {
    backgroundColor: UI.COLORS.PRIMARY,
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: UI.COLORS.TEXT_SECONDARY,
  },
  toggleButtonTextActive: {
    color: UI.COLORS.TEXT_PRIMARY,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.SM,
  },
  billingPeriod: {
    fontSize: 16,
    color: UI.COLORS.TEXT_SECONDARY,
    marginBottom: UI.SPACING.XS,
  },
  billingPeriodDates: {
    fontSize: 14,
    color: UI.COLORS.TEXT_MUTED,
    marginBottom: UI.SPACING.MD,
  },
  overviewContainer: {
    padding: UI.SPACING.MD,
  },
  summaryContainer: {
    padding: UI.SPACING.MD,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.MD,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.SM,
    marginTop: UI.SPACING.LG,
  },
  mainSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: UI.SPACING.SM,
    marginBottom: UI.SPACING.MD,
  },
  mainSummaryCard: {
    flex: 1,
    minWidth: "30%",
    marginBottom: UI.SPACING.SM,
  },
  mainSummaryValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  expenseBreakdownGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: UI.SPACING.SM,
  },
  expenseBreakdownCard: {
    flex: 1,
    minWidth: "47%",
    marginBottom: UI.SPACING.SM,
  },
  expenseBreakdownTitle: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    flex: 1,
  },
  expenseBreakdownValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  topCategoriesGrid: {
    flexDirection: "row",
    gap: UI.SPACING.SM,
  },
  topCategoryCard: {
    flex: 1,
    marginBottom: UI.SPACING.SM,
  },
  topCategoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  topCategoryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
    marginTop: UI.SPACING.XS,
  },
  topCategoryPercentage: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
    textAlign: "right",
  },
  categoryProgressContainer: {
    marginTop: UI.SPACING.SM,
  },
  categoryProgressBar: {
    height: 6,
    backgroundColor: UI.COLORS.BORDER,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: UI.SPACING.XS,
  },
  categoryProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: UI.SPACING.SM,
  },
  summaryCard: {
    flex: 1,
    minWidth: "47%",
  },
  summaryCardContent: {
    paddingHorizontal: UI.SPACING.LG,
    paddingVertical: UI.SPACING.MD,
  },
  summaryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: UI.SPACING.SM,
    gap: UI.SPACING.SM,
  },
  summaryCardTitle: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    flex: 1,
  },
  summaryCardValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  budgetCard: {
    margin: UI.SPACING.MD,
  },
  budgetList: {
    gap: UI.SPACING.MD,
  },
  budgetItem: {
    gap: UI.SPACING.SM,
  },
  budgetInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  budgetName: {
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  budgetAmount: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
  },
  budgetProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: UI.SPACING.SM,
  },
  budgetProgressBar: {
    height: 8,
    backgroundColor: UI.COLORS.BORDER,
    borderRadius: 4,
    flex: 1,
  },
  budgetProgressFill: {
    height: "100%",
    borderRadius: 4,
  },
  budgetPercentage: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
    width: 40,
    textAlign: "right",
  },
  customChartsSection: {
    padding: UI.SPACING.MD,
  },
  customChartsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: UI.SPACING.MD,
  },
  chartCount: {
    fontSize: 14,
    color: UI.COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  addChartButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: UI.SPACING.XS,
    backgroundColor: UI.COLORS.PRIMARY,
    paddingHorizontal: UI.SPACING.MD,
    paddingVertical: UI.SPACING.SM,
    borderRadius: 20,
  },
  addChartText: {
    color: UI.COLORS.TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "500",
  },
  emptyChartsCard: {
    margin: UI.SPACING.MD,
  },
  emptyChartsContent: {
    alignItems: "center",
    padding: UI.SPACING.XL,
    gap: UI.SPACING.MD,
  },
  emptyChartsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center",
  },
  emptyChartsDescription: {
    fontSize: 16,
    color: UI.COLORS.TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 24,
  },
  createFirstChartButton: {
    backgroundColor: UI.COLORS.PRIMARY,
    paddingHorizontal: UI.SPACING.LG,
    paddingVertical: UI.SPACING.MD,
    borderRadius: 8,
    marginTop: UI.SPACING.MD,
  },
  createFirstChartButtonText: {
    color: UI.COLORS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  emptyCard: {
    margin: UI.SPACING.MD,
  },
  emptyContent: {
    alignItems: "center",
    padding: UI.SPACING.XL,
    gap: UI.SPACING.MD,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 16,
    color: UI.COLORS.TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: UI.COLORS.PRIMARY,
    paddingHorizontal: UI.SPACING.LG,
    paddingVertical: UI.SPACING.MD,
    borderRadius: 8,
    marginTop: UI.SPACING.MD,
  },
  emptyButtonText: {
    color: UI.COLORS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
  },
  // Period Selection Modal styles
  periodOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: UI.SPACING.LG,
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: 12,
    marginBottom: UI.SPACING.SM,
  },
  periodOptionActive: {
    backgroundColor: UI.COLORS.PRIMARY + "20",
    borderWidth: 2,
    borderColor: UI.COLORS.PRIMARY,
  },
  periodOptionContent: {
    flex: 1,
  },
  periodOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  periodOptionTitleActive: {
    color: UI.COLORS.PRIMARY,
  },
  periodOptionDescription: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: UI.COLORS.BACKGROUND,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: UI.SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  closeButton: {
    padding: UI.SPACING.SM,
  },
  modalContent: {
    flex: 1,
    padding: UI.SPACING.MD,
  },
  comparisonSummary: {
    backgroundColor: UI.COLORS.SURFACE,
    padding: UI.SPACING.MD,
    borderRadius: 8,
    marginBottom: UI.SPACING.MD,
  },
  summaryText: {
    fontSize: 18,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  summarySubtext: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
  },
  comparisonItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: UI.SPACING.MD,
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: 8,
    marginBottom: UI.SPACING.SM,
  },
  comparisonRank: {
    width: 40,
    alignItems: "center",
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_SECONDARY,
  },
  categoryColorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginHorizontal: UI.SPACING.SM,
  },
  comparisonDetails: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
    fontFamily: "System", // Better Arabic support
    textAlign: "left",
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: UI.SPACING.XS,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  categoryPercentage: {
    fontSize: 14,
    fontWeight: "500",
    color: UI.COLORS.TEXT_SECONDARY,
  },
  progressBar: {
    height: 6,
    backgroundColor: UI.COLORS.BORDER,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  createChartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: UI.SPACING.SM,
    backgroundColor: UI.COLORS.PRIMARY,
    padding: UI.SPACING.MD,
    borderRadius: 8,
    marginTop: UI.SPACING.LG,
  },
  createChartButtonText: {
    color: UI.COLORS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  overviewCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: UI.SPACING.MD,
  },
  overviewCardTextBlock: {
    flex: 1,
    // alignItems: "center",
  },
  overviewCardTitle: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    marginBottom: 4,
    // textAlign: "center",
  },
  overviewCardValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    // textAlign: "center",
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  categoryPercentageText: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  categoryCardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: UI.SPACING.MD,
  },
  categoryDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 2,
  },
  categoryTextBlock: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    fontWeight: "500",
    marginBottom: 2,
  },
  categoryValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
});
