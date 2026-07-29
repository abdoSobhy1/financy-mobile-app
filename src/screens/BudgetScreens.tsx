import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootState, AppDispatch } from "../store";
import {
  fetchBudgets,
  updateBudget,
  deleteBudget,
} from "../store/slices/budgetsSlice";
import { fetchTransactions } from "../store/slices/transactionsSlice";
import { getCurrentBillingPeriod } from "../utils/billingPeriod";
import { getDateRangeForBillingPeriod } from "../utils";
import {
  Screen,
  useCustomAlert,
  useToast,
  FloatingActionButton,
  Badge,
} from "../components/ui";
import { useAppTheme } from "../theme";
import { formatCurrency, percentage } from "../utils";
import { BudgetStackParamList, Budget } from "../types";

import { Shimmer } from "react-native-fast-shimmer";

type BudgetListNavigationProp = StackNavigationProp<
  BudgetStackParamList,
  "BudgetList"
>;

export const BudgetListScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<BudgetListNavigationProp>();
  const { showAlert, AlertComponent } = useCustomAlert();
  const { showSuccess, showError } = useToast();
  const { colors, typography, spacing, radius, isDark } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);

  const {
    items: budgets,
    ids,
    loading,
  } = useSelector((state: RootState) => state.budgets);
  const { items: transactions } = useSelector(
    (state: RootState) => state.transactions,
  );
  const settingsData = useSelector((state: RootState) => state.settings.data);
  const [budgetProgressMap, setBudgetProgressMap] = useState<
    Record<string, { spent: number; remaining: number; percentageUsed: number }>
  >({});
  const [progressLoaded, setProgressLoaded] = useState(false);

  useEffect(() => {
    loadData();
  }, [dispatch]);

  const loadData = async () => {
    try {
      await dispatch(fetchBudgets()).unwrap();
      await dispatch(fetchTransactions()).unwrap();
      try {
        setProgressLoaded(false);
        let start: Date;
        let end: Date;
        if (
          settingsData &&
          typeof settingsData.billingPeriodStartDay === "number"
        ) {
          const range = getDateRangeForBillingPeriod(
            settingsData.billingPeriodStartDay,
          );
          start = range.start;
          end = range.end;
        } else {
          const range = await getCurrentBillingPeriod();
          start = range.start;
          end = range.end;
        }

        const queriesModule = await import("../database/queries");
        const fetchedBudgets = await dispatch(fetchBudgets()).unwrap();

        const promises = (fetchedBudgets || []).map(async (b: any) => {
          try {
            const progress =
              await queriesModule.db.budgets.getBudgetProgressForPeriod(
                b.id,
                start.toISOString(),
                end.toISOString(),
              );
            return { id: b.id, progress };
          } catch (err) {
            console.warn(
              "Failed to load budget progress for period",
              b.id,
              err,
            );
            return { id: b.id, progress: null };
          }
        });

        const results = await Promise.all(promises);
        const map: Record<
          string,
          { spent: number; remaining: number; percentageUsed: number }
        > = {};
        results.forEach((r: any) => {
          if (r.progress) {
            map[r.id] = {
              spent: r.progress.spent,
              remaining: r.progress.remaining,
              percentageUsed: r.progress.percentageUsed,
            };
          }
        });
        setBudgetProgressMap(map);
        setProgressLoaded(true);
      } catch (err) {
        console.warn(
          "Could not compute budget progress for current billing period:",
          err,
        );
        setProgressLoaded(true);
      }
    } catch (error) {
      console.error("Failed to load budget data:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const calculateBudgetSpent = (budgetId: string): number => {
    const prog = budgetProgressMap[budgetId];
    if (prog) return prog.spent;
    return Object.values(transactions)
      .filter((t) => t.budgetId === budgetId && t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const handleEditBudget = (budget: Budget) => {
    navigation.navigate("BudgetForm", { budgetId: budget.id });
  };

  const handleDeleteBudget = (budget: Budget) => {
    showAlert(
      "Delete Budget",
      `Are you sure you want to delete "${budget.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await dispatch(deleteBudget(budget.id)).unwrap();
              showSuccess("Budget deleted successfully");
            } catch (error) {
              showError("Failed to delete budget");
            }
          },
        },
      ],
    );
  };

  // ── Skeleton Card ────────────────────────────────────────────
  const renderSkeletonCard = () => (
    <View
      style={[
        styles.budgetCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.outline,
          borderRadius: radius.large,
        },
      ]}>
      <View style={styles.budgetHeader}>
        <View style={styles.budgetNameContainer}>
          <Shimmer
            style={[styles.skeletonBox, { width: 140, height: 20 }]}
            linearGradients={[
              colors.surfaceVariant + "40",
              colors.surfaceVariant + "80",
              colors.surfaceVariant + "40",
            ]}
            gradientStart={{ x: 0, y: 1 }}
          />
        </View>
        <View style={styles.budgetHeaderRight}>
          <Shimmer
            style={[
              styles.skeletonBox,
              { width: 90, height: 20, marginBottom: 4 },
            ]}
            linearGradients={[
              colors.surfaceVariant + "40",
              colors.surfaceVariant + "80",
              colors.surfaceVariant + "40",
            ]}
            gradientStart={{ x: 0, y: 1 }}
          />
          <Shimmer
            style={[styles.skeletonBox, { width: 90, height: 20 }]}
            linearGradients={[
              colors.surfaceVariant + "40",
              colors.surfaceVariant + "80",
              colors.surfaceVariant + "40",
            ]}
            gradientStart={{ x: 0, y: 1 }}
          />
        </View>
      </View>

      <View style={{ marginBottom: 16 }}>
        <Shimmer
          style={[
            styles.progressBar,
            { backgroundColor: colors.surfaceVariant },
          ]}
          linearGradients={[
            colors.surfaceVariant + "40",
            colors.surfaceVariant + "80",
            colors.surfaceVariant + "40",
          ]}
          gradientStart={{ x: 0, y: 1 }}
        />
      </View>

      <View style={styles.budgetDetails}>
        <View style={styles.detailItem}>
          <Shimmer
            style={[styles.skeletonBox, { width: 100, height: 20 }]}
            linearGradients={[
              colors.surfaceVariant + "40",
              colors.surfaceVariant + "80",
              colors.surfaceVariant + "40",
            ]}
            gradientStart={{ x: 0, y: 1 }}
          />
        </View>
        <View style={styles.detailItem}>
          <Shimmer
            style={[styles.skeletonBox, { width: 100, height: 20 }]}
            linearGradients={[
              colors.surfaceVariant + "40",
              colors.surfaceVariant + "80",
              colors.surfaceVariant + "40",
            ]}
            gradientStart={{ x: 0, y: 1 }}
          />
        </View>
      </View>
    </View>
  );

  // ── Budget Card ──────────────────────────────────────────────
  const renderBudget = ({ item: id }: { item: string }) => {
    const budget = budgets[id];
    if (!budget) return null;

    if (!progressLoaded) return renderSkeletonCard();

    const spent = calculateBudgetSpent(id);
    const remaining = budget.amount - spent;
    const progressPercentage = percentage(spent, budget.amount);
    const isOverBudget = spent > budget.amount;

    // Progress fill color based on semantic role
    const progressFillColor = isOverBudget ? colors.error : colors.success;

    return (
      <View
        style={[
          styles.budgetCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.outline,
            borderRadius: radius.large,
          },
        ]}>
        {/* Header row */}
        <View style={styles.budgetHeader}>
          <View style={styles.budgetNameContainer}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: colors.primaryContainer,
                  borderRadius: radius.medium,
                },
              ]}>
              <Ionicons
                name="wallet"
                size={16}
                color={colors.onPrimaryContainer}
              />
            </View>
            <Text
              style={[
                styles.budgetName,
                { ...typography.titleMedium, color: colors.onSurface },
              ]}>
              {budget.name}
            </Text>
          </View>
          <View style={styles.budgetHeaderRight}>
            <Text
              style={[
                styles.budgetAmount,
                {
                  ...typography.titleMedium,
                  color: isOverBudget ? colors.error : colors.primary,
                },
              ]}>
              {formatCurrency(budget.amount)}
            </Text>
            <View style={styles.budgetActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.surfaceVariant },
                ]}
                onPress={() => handleEditBudget(budget)}>
                <Ionicons
                  name="pencil"
                  size={14}
                  color={colors.onSurfaceVariant}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,107,107,0.12)"
                      : "rgba(186,26,26,0.08)",
                  },
                ]}
                onPress={() => handleDeleteBudget(budget)}>
                <Ionicons name="trash" size={14} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              { backgroundColor: colors.surfaceVariant },
            ]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(progressPercentage, 100)}%`,
                  backgroundColor: progressFillColor,
                },
              ]}
            />
          </View>
          <Text
            style={[
              styles.progressText,
              {
                ...typography.labelMedium,
                color: isOverBudget ? colors.error : colors.onSurfaceVariant,
              },
            ]}>
            {progressPercentage}%
          </Text>
        </View>

        {/* Details row */}
        <View style={styles.budgetDetails}>
          <View style={styles.detailItem}>
            <Text
              style={[
                styles.detailLabel,
                { ...typography.labelSmall, color: colors.onSurfaceVariant },
              ]}>
              Spent
            </Text>
            <Text
              style={[
                styles.detailValue,
                {
                  ...typography.titleSmall,
                  color: isOverBudget ? colors.error : colors.onSurface,
                },
              ]}>
              {formatCurrency(spent)}
            </Text>
          </View>
          <View style={[styles.detailItem, { alignItems: "flex-end" }]}>
            <Text
              style={[
                styles.detailLabel,
                { ...typography.labelSmall, color: colors.onSurfaceVariant },
              ]}>
              Remaining
            </Text>
            <Text
              style={[
                styles.detailValue,
                {
                  ...typography.titleSmall,
                  color: remaining < 0 ? colors.error : colors.onSurface,
                },
              ]}>
              {formatCurrency(remaining)}
            </Text>
          </View>
        </View>

        {/* Over-budget Badge */}
        {isOverBudget && (
          <View style={{ marginTop: spacing.s12, alignItems: "center" }}>
            <Badge variant="error">
              Over budget by {formatCurrency(Math.abs(remaining))}
            </Badge>
          </View>
        )}
      </View>
    );
  };

  // ── Header ───────────────────────────────────────────────────
  const renderHeader = () => (
    <View style={[styles.header, { marginBottom: spacing.s24 }]}>
      <Text
        style={[
          styles.title,
          { ...typography.displaySmall, color: colors.onBackground },
        ]}>
        Budgets
      </Text>
      <Text
        style={[
          styles.subtitle,
          { ...typography.bodyMedium, color: colors.onSurfaceVariant },
        ]}>
        Track your spending and stay on target
      </Text>
    </View>
  );

  // ── Empty State ──────────────────────────────────────────────
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View
        style={[
          styles.emptyIconCircle,
          {
            backgroundColor: colors.primaryContainer,
            borderColor: colors.outline,
            borderRadius: radius.large,
          },
        ]}>
        <Ionicons name="wallet-outline" size={40} color={colors.primary} />
      </View>
      <Text
        style={[
          styles.emptyTitle,
          { ...typography.headlineSmall, color: colors.onBackground },
        ]}>
        No Budgets Yet
      </Text>
      <Text
        style={[
          styles.emptyMessage,
          { ...typography.bodyMedium, color: colors.onSurfaceVariant },
        ]}>
        Create budgets to track your spending categories and stay on target
      </Text>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.emptyButton,
          {
            backgroundColor: colors.primary,
            borderRadius: radius.pill,
          },
        ]}
        onPress={() => navigation.navigate("BudgetForm", {})}>
        <Ionicons name="add-circle" size={18} color={colors.onPrimary} />
        <Text
          style={[
            styles.emptyButtonText,
            { ...typography.labelLarge, color: colors.onPrimary },
          ]}>
          Create Your First Budget
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor="transparent"
          translucent
        />
        <FlatList
          data={ids}
          keyExtractor={(item) => item}
          renderItem={renderBudget}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={!loading ? renderEmptyState : null}
          contentContainerStyle={[
            styles.container,
            { paddingHorizontal: spacing.s16, paddingTop: spacing.s16 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />

        <AlertComponent />

        <FloatingActionButton
          icon="add"
          onPress={() => navigation.navigate("BudgetForm", {})}
          style={{ position: "absolute", bottom: 80, right: 20 }}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingBottom: 120,
  },

  // ── Header ─────────────────────────────────────────
  header: {},
  title: {
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  subtitle: {},

  // ── Budget Card ────────────────────────────────────
  budgetCard: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginBottom: 14,
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  budgetNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  budgetName: {
    letterSpacing: 0.2,
  },
  budgetAmount: {},
  budgetHeaderRight: {
    alignItems: "flex-end",
  },
  budgetActions: {
    flexDirection: "row",
    marginTop: 4,
  },
  actionButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },

  // ── Progress ───────────────────────────────────────
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    minWidth: 38,
    textAlign: "right",
  },

  // ── Details ────────────────────────────────────────
  budgetDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {},

  // ── Empty State ────────────────────────────────────
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    marginBottom: 8,
  },
  emptyMessage: {
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  emptyButtonText: {},

  // ── Skeleton ───────────────────────────────────────
  skeletonBox: {
    height: 16,
    borderRadius: 6,
  },
});

export const BudgetDetailsScreen: React.FC = () => {
  return (
    <Screen>
      <Text
        style={{
          color: "white",
          fontSize: 24,
          textAlign: "center",
          marginTop: 50,
        }}>
        Budget Details Screen
      </Text>
    </Screen>
  );
};
