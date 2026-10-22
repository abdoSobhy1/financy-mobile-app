import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useTabBarHeight, IconChip, Screen, AppHeader } from "../components/ui";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootState, AppDispatch } from "../store";
import { fetchBudgets, deleteBudget } from "../store/slices/budgetsSlice";
import { fetchTransactions } from "../store/slices/transactionsSlice";
import { fetchCategories } from "../store/slices/categoriesSlice";
import { getCurrentBillingPeriod } from "../utils/billingPeriod";
import { getDateRangeForBillingPeriod, formatCurrency, percentage, formatRelativeTime } from "../utils";
import { startOfWeek, endOfWeek } from "date-fns";
import { BudgetStackParamList, Transaction } from "../types";

type BudgetListNavigationProp = StackNavigationProp<
  BudgetStackParamList,
  "BudgetList"
>;

export const BudgetListScreen: React.FC = () => {
  const { colors, typography, spacing, isDark } = useAppTheme();
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<BudgetListNavigationProp>();
  const tabBarHeight = useTabBarHeight();
  
  const [refreshing, setRefreshing] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [budgetProgressMap, setBudgetProgressMap] = useState<
    Record<string, { spent: number; remaining: number; percentageUsed: number }>
  >({});

  const { items: budgets, ids, loading: budgetsLoading } = useSelector((state: RootState) => state.budgets);
  const { items: transactions } = useSelector((state: RootState) => state.transactions);
  const { items: categoriesMap } = useSelector((state: RootState) => state.categories);
  const settingsData = useSelector((state: RootState) => state.settings.data);

  useEffect(() => {
    loadData();
  }, [dispatch, Object.keys(budgets).length, Object.keys(transactions).length]);

  const loadData = async () => {
    try {
      await dispatch(fetchBudgets()).unwrap();
      await dispatch(fetchTransactions()).unwrap();
      await dispatch(fetchCategories()).unwrap();
      
      setProgressLoaded(false);
      let start: Date;
      let end: Date;
      
      if (settingsData && typeof settingsData.billingPeriodStartDay === "number") {
        const range = getDateRangeForBillingPeriod(settingsData.billingPeriodStartDay);
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
          const isWeekly = b.period === "weekly";
          const bStart = isWeekly ? startOfWeek(new Date(), { weekStartsOn: 1 }) : start;
          const bEnd = isWeekly ? endOfWeek(new Date(), { weekStartsOn: 1 }) : end;
          const progress = await queriesModule.db.budgets.getBudgetProgressForPeriod(
            b.id,
            bStart.toISOString(),
            bEnd.toISOString(),
          );
          return { id: b.id, progress };
        } catch (err) {
          return { id: b.id, progress: null };
        }
      });

      const results = await Promise.all(promises);
      const map: Record<string, { spent: number; remaining: number; percentageUsed: number }> = {};
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
    } catch (error) {
      console.error("Failed to load budget data", error);
      setProgressLoaded(true);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalBudget = ids.reduce((sum, id) => sum + (budgets[id]?.amount || 0), 0);
  let totalSpent = 0;
  if (progressLoaded) {
    totalSpent = ids.reduce((sum, id) => {
      const p = budgetProgressMap[id];
      return sum + (p ? p.spent : 0);
    }, 0);
  } else {
    const allTxs = Object.values(transactions).filter((t) => !t.deleted && t.type === "expense");
    totalSpent = ids.reduce((sum, id) => {
      const budgetTxs = allTxs.filter((t) => t.budgetId === id);
      const bSpent = budgetTxs.reduce((s, t) => s + t.amount, 0);
      return sum + bSpent;
    }, 0);
  }

  const totalRemaining = totalBudget - totalSpent;
  const totalProgressPercentage = totalBudget > 0 ? percentage(totalSpent, totalBudget) : 0;
  const isTotalOver = totalSpent > totalBudget;

  const renderHeader = () => (
    <View style={{ marginBottom: spacing.lg }}>
      <View style={[styles.heroCard, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant }]}>
        <View style={styles.heroRow}>
          <View>
            <Text style={[typography.label, { color: colors.onSurfaceVariant, textTransform: "uppercase" }]}>Total Monthly Budget</Text>
            <Text style={[typography.h1, { color: colors.onSurface, fontSize: 32, marginTop: 4 }]}>
              {formatCurrency(totalBudget)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[typography.label, { color: colors.onSurfaceVariant, textTransform: "uppercase" }]}>Remaining</Text>
            <Text style={[typography.h2, { color: isTotalOver ? colors.error : colors.primary, fontSize: 20, marginTop: 4 }]}>
              {formatCurrency(totalRemaining)}
            </Text>
          </View>
        </View>

        {/* Total Progress Bar */}
        <View style={[styles.progressBarContainer, { backgroundColor: colors.surfaceVariant, marginVertical: 16 }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: isTotalOver ? colors.error : colors.primary,
                width: `${Math.min(100, Math.max(0, totalProgressPercentage))}%`,
              },
            ]}
          />
        </View>

        <View style={styles.heroRow}>
          <Text style={[typography.label, { color: colors.onSurfaceVariant }]}>{formatCurrency(totalSpent)} spent</Text>
          <Text style={[typography.label, { color: colors.onSurfaceVariant }]}>{totalProgressPercentage.toFixed(0)}% used</Text>
        </View>
      </View>
    </View>
  );

  const renderSkeletonCard = () => (
    <View style={[styles.budgetCard, { backgroundColor: colors.surface }]}>
      <View style={{ height: 24, backgroundColor: colors.surfaceVariant, width: 120, borderRadius: 4, marginBottom: 8 }} />
      <View style={{ height: 16, backgroundColor: colors.surfaceVariant, width: 80, borderRadius: 4, marginBottom: 16 }} />
      <View style={[styles.progressBarContainer, { backgroundColor: colors.surfaceVariant }]} />
    </View>
  );

  const renderBudget = ({ item: id }: { item: string }) => {
    const budget = budgets[id];
    if (!budget) return null;
    if (!progressLoaded) return renderSkeletonCard();

    const spent = budgetProgressMap[id]?.spent || 0;
    const remaining = budget.amount - spent;
    const progressPercentage = percentage(spent, budget.amount);
    const isOverBudget = spent > budget.amount;

    const category = budget.categoryId ? categoriesMap[budget.categoryId] : null;
    const iconName = (category?.icon as any) || "wallet-outline";
    const iconColor = category?.color || colors.primary;

    const progressColor = isOverBudget ? colors.error : progressPercentage > 80 ? "#FDCB6E" : colors.primary;
    const progressBg = isOverBudget ? colors.errorContainer : colors.surfaceVariant;

    return (
      <TouchableOpacity 
        style={[
          styles.budgetCard,
          {
            backgroundColor: colors.surface,
            borderColor: isOverBudget ? colors.error + "40" : colors.outlineVariant,
            borderWidth: 1,
          },
        ]}
        activeOpacity={0.8}
        onPress={() => {
          navigation.navigate("BudgetDetails", { budgetId: id });
        }}
      >
        <View style={styles.budgetRow}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <IconChip icon={iconName} color={iconColor} size="md" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[typography.h3, { color: colors.onSurface }]} numberOfLines={1}>
                {budget.name}
              </Text>
              <Text style={[typography.label, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                {formatCurrency(spent)} / {formatCurrency(budget.amount)} • {budget.period === "weekly" ? "Weekly" : "Monthly"}
                {category ? ` • ${category.name}` : ""}
              </Text>
            </View>
          </View>
          
          <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
            <Text style={[typography.h3, { color: isOverBudget ? colors.error : colors.primary, fontSize: 15 }]}>
              {isOverBudget ? `${formatCurrency(Math.abs(remaining))} over` : `${formatCurrency(remaining)} left`}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("BudgetForm", { budgetId: id })}
              style={{ marginTop: 4, padding: 2 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[typography.caption, { color: colors.onSurfaceVariant, fontWeight: "600" }]}>
                Edit ›
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.progressBarContainer, { backgroundColor: progressBg, marginTop: 16 }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: progressColor,
                width: `${Math.min(100, Math.max(0, progressPercentage))}%`,
              },
            ]}
          />
        </View>

        {isOverBudget && (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
            <Ionicons name="warning" size={14} color={colors.error} />
            <Text style={[typography.label, { color: colors.error, marginLeft: 6 }]}>Over budget limit</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.surfaceVariant }]}>
        <Ionicons name="wallet-outline" size={48} color={colors.onSurfaceVariant} />
      </View>
      <Text style={[typography.h2, { color: colors.onBackground, textAlign: "center", marginBottom: spacing.sm }]}>
        No Budgets Yet
      </Text>
      <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: "center", marginBottom: spacing.xl, paddingHorizontal: spacing.xl }]}>
        Create budgets to track your spending categories and stay on target.
      </Text>
      <TouchableOpacity
        style={{
          backgroundColor: colors.primary,
          paddingHorizontal: 24,
          paddingVertical: 14,
          borderRadius: 24,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
        onPress={() => navigation.navigate("BudgetForm", {})}
      >
        <Ionicons name="add" size={20} color={colors.onPrimary} />
        <Text style={[typography.bodyMedium, { color: colors.onPrimary, fontWeight: "700" }]}>
          Create First Budget
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      <AppHeader
        title="Budgets"
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate("BudgetForm", {})}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.surfaceVariant,
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityLabel="Create new budget"
          >
            <Ionicons name="add" size={22} color={colors.onBackground} />
          </TouchableOpacity>
        }
      />
      
      <FlatList
        data={ids}
        keyExtractor={(item) => item}
        renderItem={renderBudget}
        ListHeaderComponent={ids.length > 0 ? renderHeader : null}
        ListEmptyComponent={!budgetsLoading ? renderEmptyState : null}
        contentContainerStyle={[styles.container, { paddingBottom: tabBarHeight + 100 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

export const BudgetDetailsScreen: React.FC = () => {
  const { colors, typography, spacing, isDark } = useAppTheme();
  const route = useRoute<RouteProp<BudgetStackParamList, "BudgetDetails">>();
  const navigation = useNavigation<StackNavigationProp<BudgetStackParamList, "BudgetDetails">>();
  const dispatch = useDispatch<AppDispatch>();
  const tabBarHeight = useTabBarHeight();

  const { budgetId } = route.params;
  const budget = useSelector((state: RootState) => state.budgets.items[budgetId]);
  const transactions = useSelector((state: RootState) => state.transactions.items);
  const categoriesMap = useSelector((state: RootState) => state.categories.items);
  const settingsData = useSelector((state: RootState) => state.settings.data);

  const periodRange = useMemo(() => {
    if (budget?.period === "weekly") {
      return {
        start: startOfWeek(new Date(), { weekStartsOn: 1 }),
        end: endOfWeek(new Date(), { weekStartsOn: 1 }),
      };
    }
    const startDay = settingsData?.billingPeriodStartDay ?? 1;
    return getDateRangeForBillingPeriod(startDay);
  }, [budget?.period, settingsData?.billingPeriodStartDay]);

  const budgetTransactions = useMemo(() => {
    if (!budget) return [];
    const startMs = periodRange.start.getTime();
    const endMs = periodRange.end.getTime();
    return Object.values(transactions)
      .filter((tx) => {
        if (tx.deleted || tx.type !== "expense") return false;
        const txMs = new Date(tx.date).getTime();
        if (txMs < startMs || txMs > endMs) return false;
        if (tx.budgetId === budgetId) return true;
        if (budget.categoryId && tx.categoryId === budget.categoryId) return true;
        return false;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, budget, budgetId, periodRange]);

  if (!budget) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Text style={[typography.h3, { color: colors.onBackground }]}>Budget not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
            <Text style={[typography.bodyMedium, { color: colors.primary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const spent = budgetTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const remaining = budget.amount - spent;
  const progressPercentage = percentage(spent, budget.amount);
  const isOver = spent > budget.amount;
  const daysLeft = Math.max(1, Math.ceil((periodRange.end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const safeDaily = Math.max(0, remaining / daysLeft);
  const category = budget.categoryId ? categoriesMap[budget.categoryId] : null;

  const handleDelete = () => {
    Alert.alert(
      "Delete Budget",
      `Are you sure you want to delete "${budget.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await dispatch(deleteBudget(budget.id));
            navigation.goBack();
          },
        },
      ]
    );
  };

  const renderTransactionItem = ({ item: tx }: { item: Transaction }) => {
    const cat = categoriesMap[tx.categoryId];
    return (
      <TouchableOpacity
        style={[
          styles.txItem,
          { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
        ]}
        onPress={() => (navigation as any).navigate("AddTransaction", { editTransaction: tx })}
        activeOpacity={0.75}
      >
        <IconChip
          icon={(cat?.icon as any) || "pricetag-outline"}
          color={cat?.color || colors.primary}
          size="md"
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[typography.bodyLarge, { color: colors.onSurface, fontWeight: "600" }]} numberOfLines={1}>
            {tx.description || cat?.name || "Expense"}
          </Text>
          <Text style={[typography.caption, { color: colors.onSurfaceVariant, marginTop: 2 }]}>
            {cat?.name || "Uncategorized"} • {formatRelativeTime(tx.date)}
          </Text>
        </View>
        <Text style={[typography.bodyLarge, { color: colors.onSurface, fontWeight: "700" }]}>
          -{formatCurrency(tx.amount)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      <View style={styles.detailsHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.onBackground} />
        </TouchableOpacity>
        <Text style={[typography.h2, { color: colors.onBackground, flex: 1, textAlign: "center" }]} numberOfLines={1}>
          {budget.name}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate("BudgetForm", { budgetId: budget.id })}
            style={[styles.headerBtn, { backgroundColor: colors.surfaceVariant, borderRadius: 20 }]}
          >
            <Ionicons name="create-outline" size={20} color={colors.onBackground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            style={[styles.headerBtn, { backgroundColor: colors.errorContainer, borderRadius: 20 }]}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={budgetTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransactionItem}
        contentContainerStyle={[styles.container, { paddingBottom: tabBarHeight + 100 }]}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.lg }}>
            <View style={[styles.heroCard, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant }]}>
              <View style={styles.heroRow}>
                <View>
                  <Text style={[typography.label, { color: colors.onSurfaceVariant, textTransform: "uppercase" }]}>
                    Spent This Period
                  </Text>
                  <Text style={[typography.h1, { color: colors.onSurface, fontSize: 32, marginTop: 4 }]}>
                    {formatCurrency(spent)}
                  </Text>
                  <Text style={[typography.caption, { color: colors.onSurfaceVariant, marginTop: 2 }]}>
                    of {formatCurrency(budget.amount)} limit {category ? `• ${category.name}` : ""}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[typography.label, { color: colors.onSurfaceVariant, textTransform: "uppercase" }]}>
                    {isOver ? "Over Limit" : "Safe Daily"}
                  </Text>
                  <Text style={[typography.h2, { color: isOver ? colors.error : colors.primary, fontSize: 20, marginTop: 4 }]}>
                    {isOver ? formatCurrency(Math.abs(remaining)) : `${formatCurrency(safeDaily)}/d`}
                  </Text>
                  <Text style={[typography.caption, { color: colors.onSurfaceVariant, marginTop: 2 }]}>
                    {daysLeft} days left
                  </Text>
                </View>
              </View>

              <View style={[styles.progressBarContainer, { backgroundColor: colors.surfaceVariant, marginVertical: 16 }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: isOver ? colors.error : colors.primary,
                      width: `${Math.min(100, Math.max(0, progressPercentage))}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.heroRow}>
                <Text style={[typography.label, { color: colors.onSurfaceVariant }]}>
                  {isOver ? `${formatCurrency(Math.abs(remaining))} over budget` : `${formatCurrency(remaining)} remaining`}
                </Text>
                <Text style={[typography.label, { color: colors.onSurfaceVariant }]}>
                  {progressPercentage.toFixed(0)}% used
                </Text>
              </View>
            </View>

            <Text style={[typography.h3, { color: colors.onBackground, marginTop: 24, marginBottom: 8 }]}>
              Transactions ({budgetTransactions.length})
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Ionicons name="receipt-outline" size={40} color={colors.onSurfaceVariant} />
            <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginTop: 12 }]}>
              No expenses recorded for this budget yet.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  detailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    padding: 24,
    borderRadius: 24,
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  budgetCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
  },
  budgetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    width: "100%",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  txItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
});
