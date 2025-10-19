import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootState, AppDispatch } from "../store";
import { fetchBudgets, updateBudget, deleteBudget } from "../store/slices/budgetsSlice";
import { fetchTransactions } from "../store/slices/transactionsSlice";
import { getCurrentBillingPeriod } from "../utils/billingPeriod";
import { Screen, Card, Button, useCustomAlert, useToast, FloatingActionButton } from "../components/ui";
import { UI } from "../constants";
import { formatCurrency, percentage } from "../utils";
import { BudgetStackParamList, Budget } from "../types";

type BudgetListNavigationProp = StackNavigationProp<BudgetStackParamList, "BudgetList">;

export const BudgetListScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<BudgetListNavigationProp>();
  const { showAlert, AlertComponent } = useCustomAlert();
  const { showSuccess, showError } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const { items: budgets, ids, loading } = useSelector((state: RootState) => state.budgets);
  const { items: transactions } = useSelector((state: RootState) => state.transactions);
  const [budgetProgressMap, setBudgetProgressMap] = useState<Record<string, { spent: number; remaining: number; percentageUsed: number }>>({});

  useEffect(() => {
    // Add a small delay to ensure database is fully initialized
    const timer = setTimeout(() => {
      loadData();
    }, 100);

    return () => clearTimeout(timer);
  }, [dispatch]);

  const loadData = async () => {
    try {
      await dispatch(fetchBudgets()).unwrap();
      await dispatch(fetchTransactions()).unwrap();
      // Compute per-budget progress for the current billing period so UI reflects the correct period
      try {
        const { start, end } = await getCurrentBillingPeriod();
        const queriesModule = await import("../database/queries");
        const fetchedBudgets = await dispatch(fetchBudgets()).unwrap();

        const promises = (fetchedBudgets || []).map(async (b: any) => {
          try {
            const progress = await queriesModule.db.budgets.getBudgetProgressForPeriod(b.id, start.toISOString(), end.toISOString());
            return { id: b.id, progress };
          } catch (err) {
            console.warn("Failed to load budget progress for period", b.id, err);
            return { id: b.id, progress: null };
          }
        });

        const results = await Promise.all(promises);
        const map: Record<string, { spent: number; remaining: number; percentageUsed: number }> = {};
        results.forEach((r: any) => {
          if (r.progress) {
            map[r.id] = { spent: r.progress.spent, remaining: r.progress.remaining, percentageUsed: r.progress.percentageUsed };
          }
        });
        setBudgetProgressMap(map);
      } catch (err) {
        console.warn("Could not compute budget progress for current billing period:", err);
      }
    } catch (error) {
      console.error("Failed to load budget data:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      // Don't throw - let the UI handle gracefully
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const calculateBudgetSpent = (budgetId: string): number => {
    // Prefer period-specific progress if available (current billing period)
    const prog = budgetProgressMap[budgetId];
    if (prog) return prog.spent;

    // Fallback: sum all historical transactions (legacy behavior)
    return Object.values(transactions)
      .filter((t) => t.budgetId === budgetId && t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const handleEditBudget = (budget: Budget) => {
    navigation.navigate("BudgetForm", { budgetId: budget.id });
  };

  const handleDeleteBudget = (budget: Budget) => {
    showAlert("Delete Budget", `Are you sure you want to delete "${budget.name}"? This action cannot be undone.`, [
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
    ]);
  };

  const renderBudget = ({ item: id }: { item: string }) => {
    const budget = budgets[id];
    if (!budget) return null;

    const spent = calculateBudgetSpent(id);
    const remaining = budget.amount - spent;
    const progressPercentage = percentage(spent, budget.amount);
    const isOverBudget = spent > budget.amount;

    return (
      <Card style={styles.budgetCard}>
        <View style={styles.budgetHeader}>
          <View style={styles.budgetNameContainer}>
            <Ionicons name="wallet" size={20} color={UI.COLORS.PRIMARY} style={styles.budgetIcon} />
            <Text style={styles.budgetName}>{budget.name}</Text>
          </View>
          <View style={styles.budgetHeaderRight}>
            <Text style={[styles.budgetAmount, isOverBudget && styles.overBudgetAmount]}>{formatCurrency(budget.amount)}</Text>
            <View style={styles.budgetActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleEditBudget(budget)}>
                <Ionicons name="pencil" size={16} color={UI.COLORS.TEXT_SECONDARY} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteBudget(budget)}>
                <Ionicons name="trash" size={16} color={UI.COLORS.ERROR} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(progressPercentage, 100)}%` }, isOverBudget && styles.overBudgetFill]} />
          </View>
          <Text style={styles.progressText}>{progressPercentage}%</Text>
        </View>

        <View style={styles.budgetDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Spent</Text>
            <Text style={[styles.detailValue, isOverBudget && styles.overBudgetText]}>{formatCurrency(spent)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Remaining</Text>
            <Text style={[styles.detailValue, remaining < 0 && styles.overBudgetText]}>{formatCurrency(remaining)}</Text>
          </View>
        </View>

        {isOverBudget && (
          <View style={styles.warningContainer}>
            <View style={styles.warningContent}>
              <Ionicons name="warning" size={16} color={UI.COLORS.ERROR} style={styles.warningIcon} />
              <Text style={styles.warningText}>Over budget by {formatCurrency(Math.abs(remaining))}</Text>
            </View>
          </View>
        )}
      </Card>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Budgets</Text>
      <Button
        title="Add Budget"
        onPress={() => navigation.navigate("BudgetForm", {})}
        style={styles.addButton}
        icon="add-circle"
        iconPosition="left"
      />
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No Budgets Yet</Text>
      <Text style={styles.emptyMessage}>Create budgets to track your spending categories and stay on target</Text>
      <Button
        title="Create Your First Budget"
        onPress={() => navigation.navigate("BudgetForm", {})}
        style={styles.emptyButton}
        icon="add-circle"
        iconPosition="left"
      />
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={ids}
        keyExtractor={(item) => item}
        renderItem={renderBudget}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={UI.COLORS.PRIMARY} />}
        showsVerticalScrollIndicator={false}
      />

      <AlertComponent />

      <FloatingActionButton icon="add" onPress={() => navigation.navigate("BudgetForm", {})} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: UI.SPACING.MD,
  },
  header: {
    marginBottom: UI.SPACING.LG,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.MD,
  },
  addButton: {
    marginVertical: UI.SPACING.SM,
  },
  budgetCard: {
    marginBottom: UI.SPACING.MD,
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: UI.SPACING.MD,
  },
  budgetNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  budgetIcon: {
    marginRight: UI.SPACING.SM,
  },
  budgetName: {
    fontSize: 18,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  budgetAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: UI.COLORS.PRIMARY,
  },
  overBudgetAmount: {
    color: UI.COLORS.ERROR,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: UI.SPACING.MD,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: UI.COLORS.BORDER,
    borderRadius: 4,
    marginRight: UI.SPACING.SM,
  },
  progressFill: {
    height: "100%",
    backgroundColor: UI.COLORS.SUCCESS,
    borderRadius: 4,
  },
  overBudgetFill: {
    backgroundColor: UI.COLORS.ERROR,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: UI.COLORS.TEXT_SECONDARY,
    minWidth: 35,
  },
  budgetDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
    textTransform: "uppercase",
    marginBottom: UI.SPACING.XS,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  overBudgetText: {
    color: UI.COLORS.ERROR,
  },
  warningContainer: {
    marginTop: UI.SPACING.SM,
    padding: UI.SPACING.SM,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: UI.CARD_RADIUS / 2,
  },
  warningContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  warningIcon: {
    marginRight: UI.SPACING.XS,
  },
  warningText: {
    fontSize: 14,
    color: UI.COLORS.ERROR,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.SM,
  },
  emptyMessage: {
    fontSize: 16,
    color: UI.COLORS.TEXT_SECONDARY,
    textAlign: "center",
    marginBottom: UI.SPACING.LG,
    paddingHorizontal: UI.SPACING.LG,
  },
  emptyButton: {
    minWidth: 200,
  },
  budgetHeaderRight: {
    alignItems: "flex-end",
  },
  budgetActions: {
    flexDirection: "row",
    marginTop: UI.SPACING.XS,
  },
  actionButton: {
    padding: UI.SPACING.XS,
    marginLeft: UI.SPACING.XS,
  },
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
      <Text style={{ color: "white", fontSize: 24, textAlign: "center", marginTop: 50 }}>Budget Details Screen</Text>
    </Screen>
  );
};
