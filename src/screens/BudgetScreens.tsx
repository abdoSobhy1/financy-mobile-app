import React, { useEffect, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useTabBarHeight } from "../components/ui";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootState, AppDispatch } from "../store";
import { fetchBudgets } from "../store/slices/budgetsSlice";
import { fetchTransactions } from "../store/slices/transactionsSlice";
import { fetchCategories } from "../store/slices/categoriesSlice";
import { getCurrentBillingPeriod } from "../utils/billingPeriod";
import { getDateRangeForBillingPeriod } from "../utils";
import {
  Screen,
  FloatingActionButton,
  AppHeader,
} from "../components/ui";
import { UI } from "../constants";
import { formatCurrency, percentage } from "../utils";
import { BudgetStackParamList, Budget, Category } from "../types";

type BudgetListNavigationProp = StackNavigationProp<
  BudgetStackParamList,
  "BudgetList"
>;

export const BudgetListScreen: React.FC = () => {
  const { colors, typography, spacing, radius } = useAppTheme();
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
  }, [dispatch]);

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
          const progress = await queriesModule.db.budgets.getBudgetProgressForPeriod(
            b.id,
            start.toISOString(),
            end.toISOString(),
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
    // Fallback naive calculation
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
      <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
        <View style={styles.heroRow}>
          <View>
            <Text style={[typography.label, { color: colors.onSurfaceVariant, textTransform: "uppercase" }]}>Total Monthly Budget</Text>
            <Text style={[typography.h1, { color: colors.onSurface, fontSize: 32, marginTop: 4 }]}>
              {formatCurrency(totalBudget)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[typography.label, { color: colors.onSurfaceVariant, textTransform: "uppercase" }]}>Remaining</Text>
            <Text style={[typography.h2, { color: isTotalOver ? colors.error : colors.primaryContainer, fontSize: 20, marginTop: 4 }]}>
              {formatCurrency(totalRemaining)}
            </Text>
          </View>
        </View>

        {/* Total Progress Bar */}
        <View style={[styles.progressBarContainer, { backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 16 }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: isTotalOver ? colors.error : colors.primaryContainer,
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
    const iconName = "wallet";
    const iconColor = category && category.color ? category.color : colors.primaryContainer;

    const progressColor = isOverBudget ? colors.error : colors.primaryContainer;
    const progressBg = isOverBudget ? "rgba(255,100,100,0.15)" : "rgba(255,255,255,0.1)";

    return (
      <TouchableOpacity 
        style={[styles.budgetCard, { backgroundColor: colors.surface, borderColor: isOverBudget ? "rgba(255,0,0,0.2)" : "transparent", borderWidth: 1 }]}
        activeOpacity={0.8}
        onPress={() => {
          // Mock navigation to details or edit form
        }}
      >
        <View style={styles.budgetRow}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={[styles.iconCircle, { backgroundColor: "rgba(255,255,255,0.05)" }]}>
              <Ionicons name={iconName as any} size={20} color={iconColor} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={[typography.h3, { color: colors.onSurface }]}>{budget.name}</Text>
              <Text style={[typography.label, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                {formatCurrency(spent)} / {formatCurrency(budget.amount)}
              </Text>
            </View>
          </View>
          
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[typography.h3, { color: isOverBudget ? colors.error : colors.primaryContainer, fontSize: 15 }]}>
              {isOverBudget ? `-${formatCurrency(Math.abs(remaining))} over` : `${formatCurrency(remaining)} left`}
            </Text>
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
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <AppHeader title="Budgets" />
      
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

      <FloatingActionButton
        icon="add"
        onPress={() => navigation.navigate("BudgetForm", {})}
        style={{ position: "absolute", bottom: tabBarHeight + spacing.md, right: spacing.lg }}
      />
    </SafeAreaView>
  );
};

export const BudgetDetailsScreen: React.FC = () => {
  return (
    <Screen>
      <Text style={{ color: "white", fontSize: 24, textAlign: "center", marginTop: 50 }}>
        Budget Details Screen
      </Text>
    </Screen>
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
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
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
