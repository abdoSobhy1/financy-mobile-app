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
import { useAppTheme } from "../components/ui/ThemeProvider";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTabBarHeight } from "../components/ui";
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
  Card,
  Badge,
} from "../components/ui";
import { UI } from "../constants";
import { formatCurrency, percentage } from "../utils";
import { BudgetStackParamList, Budget } from "../types";

import { Shimmer } from "react-native-fast-shimmer";

type BudgetListNavigationProp = StackNavigationProp<
  BudgetStackParamList,
  "BudgetList"
>;

export const BudgetListScreen: React.FC = () => {
  const { colors, typography, spacing, radius } = useAppTheme();
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<BudgetListNavigationProp>();
  const tabBarHeight = useTabBarHeight();
  const { showAlert, AlertComponent } = useCustomAlert();
  const { showSuccess, showError } = useToast();
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
    <Card variant="outlined" style={{ marginBottom: spacing.md, padding: spacing.lg }}>
      <View style={styles.budgetHeader}>
        <View style={styles.budgetNameContainer}>
          <Shimmer
            style={[styles.skeletonBox, { width: 140, height: 20 }]}
            linearGradients={["#6c5ce726", "#6c5ce74d", "#6c5ce726"]}
            gradientStart={{ x: 0, y: 1 }}
          />
        </View>
        <View style={styles.budgetHeaderRight}>
          <Shimmer
            style={[
              styles.skeletonBox,
              { width: 90, height: 20, marginBottom: 4 },
            ]}
            linearGradients={["#6c5ce726", "#6c5ce74d", "#6c5ce726"]}
            gradientStart={{ x: 0, y: 1 }}
          />
          <Shimmer
            style={[styles.skeletonBox, { width: 90, height: 20 }]}
            linearGradients={["#6c5ce726", "#6c5ce74d", "#6c5ce726"]}
            gradientStart={{ x: 0, y: 1 }}
          />
        </View>
      </View>

      <View style={{ marginBottom: 16 }}>
        <Shimmer
          style={[
            styles.progressBar,
            { backgroundColor: "rgba(108,92,231,0.12)" },
          ]}
          linearGradients={["#6c5ce726", "#6c5ce74d", "#6c5ce726"]}
          gradientStart={{ x: 0, y: 1 }}
        />
      </View>

      <View style={styles.budgetDetails}>
        <View style={styles.detailItem}>
          <Shimmer
            style={[styles.skeletonBox, { width: 100, height: 20 }]}
            linearGradients={["#6c5ce726", "#6c5ce74d", "#6c5ce726"]}
            gradientStart={{ x: 0, y: 1 }}
          />
        </View>
        <View style={styles.detailItem}>
          <Shimmer
            style={[styles.skeletonBox, { width: 100, height: 20 }]}
            linearGradients={["#6c5ce726", "#6c5ce74d", "#6c5ce726"]}
            gradientStart={{ x: 0, y: 1 }}
          />
        </View>
      </View>
    </Card>
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

    // Choose progress bar gradient based on state
    const progressColors: [string, string] = isOverBudget
      ? [colors.error, colors.error]
      : [colors.primary, colors.primary];

    return (
      <Card variant="outlined" style={{ marginBottom: spacing.md, padding: spacing.lg }}>
        {/* Header row */}
        <View style={styles.budgetHeader}>
          <View style={styles.budgetNameContainer}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryContainer }]}>
              <Ionicons
                name="wallet"
                size={16}
                color={colors.onPrimaryContainer}
              />
            </View>
            <Text style={[styles.budgetName, { color: colors.onSurface }]}>{budget.name}</Text>
          </View>
          <View style={styles.budgetHeaderRight}>
            <Text
              style={[
                styles.budgetAmount,
                { color: colors.primary },
                isOverBudget && { color: colors.error },
              ]}>
              {formatCurrency(budget.amount)}
            </Text>
            <View style={styles.budgetActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => handleEditBudget(budget)}>
                <Ionicons
                  name="pencil"
                  size={14}
                  color={colors.onSurfaceVariant}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.errorContainer }]}
                onPress={() => handleDeleteBudget(budget)}>
                <Ionicons
                  name="trash"
                  size={14}
                  color={colors.onErrorContainer}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.surfaceVariant }]}>
            <LinearGradient
              colors={progressColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressFill,
                { width: `${Math.min(progressPercentage, 100)}%` },
              ]}
            />
          </View>
          <Text
            style={[
              styles.progressText,
              { color: colors.onSurfaceVariant },
              isOverBudget && { color: colors.error },
            ]}>
            {progressPercentage}%
          </Text>
        </View>

        {/* Details row */}
        <View style={styles.budgetDetails}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>Spent</Text>
            <Text
              style={[
                styles.detailValue,
                { color: colors.onSurface },
                isOverBudget && { color: colors.error },
              ]}>
              {formatCurrency(spent)}
            </Text>
          </View>
          <View style={[styles.detailItem, { alignItems: "flex-end" }]}>
            <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>Remaining</Text>
            <Text
              style={[
                styles.detailValue,
                { color: colors.onSurface },
                remaining < 0 && { color: colors.error },
              ]}>
              {formatCurrency(remaining)}
            </Text>
          </View>
        </View>

        {/* Over-budget warning */}
        {isOverBudget && (
          <View style={[styles.warningContainer, { backgroundColor: colors.errorContainer, borderColor: colors.error }]}>
            <Ionicons
              name="warning"
              size={14}
              color={colors.onErrorContainer}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.warningText, { color: colors.onErrorContainer }]}>
              Over budget by {formatCurrency(Math.abs(remaining))}
            </Text>
          </View>
        )}
      </Card>
    );
  };

  // ── Header ───────────────────────────────────────────────────

  let totalBudget = 0;
  let totalSpent = 0;
  
  if (progressLoaded) {
    ids.forEach(id => {
      const budget = budgets[id];
      if (budget) {
        totalBudget += budget.amount;
        totalSpent += calculateBudgetSpent(id);
      }
    });
  }
  const totalRemaining = totalBudget - totalSpent;
  const totalProgressPercentage = totalBudget > 0 ? percentage(totalSpent, totalBudget) : 0;

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl, paddingHorizontal: spacing.sm }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceVariant, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="person" size={20} color={colors.onSurfaceVariant} />
        </View>
        <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceVariant, alignItems: "center", justifyContent: "center" }} onPress={() => navigation.navigate("BudgetForm", {})}>
          <Ionicons name="add" size={24} color={colors.primaryContainer} />
        </TouchableOpacity>
      </View>

      <Card variant="outlined" style={{ padding: spacing.xl, marginBottom: spacing.md, backgroundColor: colors.surfaceVariant, borderColor: colors.outlineVariant }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={[typography.label, { color: colors.onSurfaceVariant, textTransform: "uppercase" }]}>Total Monthly Budget</Text>
          <Text style={[typography.label, { color: colors.onSurfaceVariant, textTransform: "uppercase" }]}>Remaining</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: spacing.xl }}>
          <Text style={[typography.h1, { color: colors.primaryContainer, fontSize: 36 }]}>
            {formatCurrency(totalBudget)}
          </Text>
          <Text style={[typography.h2, { color: colors.secondaryContainer, fontSize: 20, marginBottom: 4 }]}>
            {formatCurrency(totalRemaining)}
          </Text>
        </View>
        
        <View style={[styles.progressBar, { backgroundColor: colors.background, height: 12, borderRadius: 6, marginBottom: 12 }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.primaryContainer, width: `${Math.min(totalProgressPercentage, 100)}%`, borderRadius: 6 }]} />
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>{formatCurrency(totalSpent)} spent</Text>
          <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>{totalProgressPercentage}% used</Text>
        </View>
      </Card>
    </View>
  );

  // ── Empty State ──────────────────────────────────────────────
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryContainer }]}>
        <Ionicons name="wallet-outline" size={40} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.onBackground }]}>No Budgets Yet</Text>
      <Text style={[styles.emptyMessage, { color: colors.onSurfaceVariant }]}>
        Create budgets to track your spending categories and stay on target
      </Text>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate("BudgetForm", {})}>
        <View style={[styles.emptyButton, { backgroundColor: colors.primary }]}>
          <Ionicons name="add-circle" size={18} color={colors.onPrimary} />
          <Text style={[styles.emptyButtonText, { color: colors.onPrimary }]}>Create Your First Budget</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["top"]}>
      <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <FlatList
          data={ids}
          keyExtractor={(item) => item}
          renderItem={renderBudget}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={!loading ? renderEmptyState : null}
          contentContainerStyle={[styles.container, { paddingBottom: tabBarHeight }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={UI.COLORS.PRIMARY}
            />
          }
          showsVerticalScrollIndicator={false}
        />

        <AlertComponent />

        <FloatingActionButton
          icon="add"
          onPress={() => navigation.navigate("BudgetForm", {})}
          style={{ position: "absolute", bottom: tabBarHeight + spacing.md, right: spacing.lg }}
        />
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 20,
  },

  // ── Header ─────────────────────────────────────────
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: UI.COLORS.TEXT_PRIMARY,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: UI.COLORS.TEXT_MUTED,
    fontWeight: "400",
  },

  // ── Budget Card ────────────────────────────────────
  budgetCard: {
    backgroundColor: "transparent",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
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
    borderRadius: 10,
    backgroundColor: "rgba(108,92,231,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  budgetName: {
    fontSize: 17,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
    letterSpacing: 0.2,
  },
  budgetAmount: {
    fontSize: 17,
    fontWeight: "700",
    color: UI.COLORS.PRIMARY_LIGHT,
  },
  overBudgetAmount: {
    color: "#FF6B6B",
  },
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
    backgroundColor: "rgba(255,255,255,0.04)",
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
    backgroundColor: "rgba(108,92,231,0.12)",
    borderRadius: 4,
    marginRight: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    fontWeight: "700",
    color: UI.COLORS.TEXT_SECONDARY,
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
    fontSize: 11,
    fontWeight: "600",
    color: UI.COLORS.TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  overBudgetText: {
    color: "#FF6B6B",
  },

  // ── Warning ────────────────────────────────────────
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,107,107,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.2)",
  },
  warningText: {
    fontSize: 13,
    color: "#FF6B6B",
    fontWeight: "600",
  },

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
    borderRadius: 40,
    backgroundColor: "rgba(108,92,231,0.1)",
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 15,
    color: UI.COLORS.TEXT_MUTED,
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
    shadowColor: UI.COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },

  // ── Skeleton ───────────────────────────────────────
  skeletonBox: {
    height: 16,
    borderRadius: 6,
    backgroundColor: "rgba(108,92,231,0.12)",
  },

  // ── Legacy modal styles (kept for compatibility) ───
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: UI.COLORS.BACKGROUND,
    borderRadius: UI.CARD_RADIUS * 2,
    padding: UI.SPACING.LG,
    width: "90%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: UI.SPACING.LG,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  inputContainer: {
    marginBottom: UI.SPACING.MD,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.SM,
  },
  input: {
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    borderRadius: UI.CARD_RADIUS,
    padding: UI.SPACING.MD,
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    backgroundColor: UI.COLORS.SURFACE,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: UI.SPACING.LG,
    gap: UI.SPACING.MD,
  },
  cancelButton: {
    paddingHorizontal: UI.SPACING.LG,
    paddingVertical: UI.SPACING.MD,
    borderRadius: UI.CARD_RADIUS,
    backgroundColor: UI.COLORS.SURFACE,
  },
  cancelButtonText: {
    fontSize: 16,
    color: UI.COLORS.TEXT_SECONDARY,
  },
  saveButton: {
    paddingHorizontal: UI.SPACING.LG,
    paddingVertical: UI.SPACING.MD,
    borderRadius: UI.CARD_RADIUS,
    backgroundColor: UI.COLORS.PRIMARY,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
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
