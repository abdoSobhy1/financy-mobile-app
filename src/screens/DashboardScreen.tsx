import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSelector, useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { RootState, AppDispatch } from "../store";
import {
  Transaction,
  Category,
  TransactionStackParamList,
} from "../types";
import { getCurrentBillingPeriod } from "../utils/billingPeriod";
import { formatCurrency, formatDate } from "../utils";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui";
import { ListRow } from "../components/ui/ListRow";
import { useTabBarHeight } from "../components/ui";
import { IconChip } from "../components/ui/IconChip";
import { addCategory } from "../store/slices/categoriesSlice";

type DashboardNavigationProp = StackNavigationProp<
  any,
  "Dashboard"
>;

interface QuickAddSlot {
  id: string;
  name: string;
  colorName?: string;
  isFallback: boolean;
  iconName: string;
}

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<DashboardNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { colors, typography, spacing, radius, categoryPalette } = useAppTheme();
  const tabBarHeight = useTabBarHeight();

  const transactions = useSelector(
    (state: RootState) => state.transactions.items
  );
  const categoriesMap = useSelector(
    (state: RootState) => state.categories.items
  );

  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const [quickAddSlots, setQuickAddSlots] = useState<QuickAddSlot[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadDashboardData = async () => {
        try {
          const { start, end } = await getCurrentBillingPeriod();
          if (!isActive) return;

          const allTransactions = Object.values(transactions).filter(
            (t) => !t.deleted
          );

          // 1. Transactions in current billing period
          const periodTxs = allTransactions.filter((t) => {
            const d = new Date(t.date);
            return d >= start && d <= end;
          });

          const income = periodTxs
            .filter((t) => t.type === "income")
            .reduce((sum, t) => sum + t.amount, 0);
          const expenses = periodTxs
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0);

          setTotalIncome(income);
          setTotalExpenses(expenses);
          setBalance(income - expenses);

          // 2. Recent transactions preview
          const sortedRecent = [...allTransactions]
            .sort(
              (a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime() ||
                new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
            )
            .slice(0, 5);
          setRecentTransactions(sortedRecent);

          // 3. Compute ranked quick add categories
          const topSlots = computeTopExpenseCategories(
            allTransactions,
            categoriesMap,
            start,
            end
          );
          setQuickAddSlots(topSlots);
        } catch (error) {
          console.error("Failed to load dashboard data:", error);
        }
      };

      loadDashboardData();

      return () => {
        isActive = false;
      };
    }, [transactions, categoriesMap])
  );

  const computeTopExpenseCategories = (
    txs: Transaction[],
    catsMap: Record<string, Category>,
    start: Date,
    end: Date
  ): QuickAddSlot[] => {
    const allExpenseTxs = txs.filter(
      (t) => t.type === "expense" && !t.deleted
    );

    const periodTxs = allExpenseTxs.filter((t) => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });

    const periodCategoryIds = new Set(periodTxs.map((t) => t.categoryId));

    let relevantTxs = periodTxs;
    if (periodCategoryIds.size < 3) {
      const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      relevantTxs = allExpenseTxs.filter((t) => new Date(t.date) >= cutoff);
    }

    const scores: Record<string, number> = {};
    const now = Date.now();
    for (const tx of relevantTxs) {
      if (!tx.categoryId) continue;
      const txTime = new Date(tx.date).getTime();
      const daysAgo = Math.max(0, (now - txTime) / (1000 * 60 * 60 * 24));
      const weight = Math.max(0.1, 1 - daysAgo / 60);
      scores[tx.categoryId] = (scores[tx.categoryId] || 0) + weight;
    }

    const sortedCatIds = Object.keys(scores).sort(
      (a, b) => (scores[b] || 0) - (scores[a] || 0)
    );

    const slots: QuickAddSlot[] = [];
    const pickedIds = new Set<string>();

    for (const catId of sortedCatIds) {
      if (slots.length >= 3) break;
      const cat = catsMap[catId];
      if (cat && cat.type === "expense" && !cat.deleted) {
        slots.push({
          id: cat.id,
          name: cat.name,
          colorName: "red", // map properly if needed, fallback to something
          isFallback: false,
          iconName: (cat as any).icon || "cart",
        });
        pickedIds.add(cat.id);
      }
    }

    // Fill remaining slots
    if (slots.length < 3) {
      for (const cat of Object.values(catsMap)) {
        if (slots.length >= 3) break;
        if (
          cat.type === "expense" &&
          !cat.deleted &&
          !pickedIds.has(cat.id)
        ) {
          slots.push({
            id: cat.id,
            name: cat.name,
            colorName: "red",
            isFallback: false,
            iconName: (cat as any).icon || "cart",
          });
          pickedIds.add(cat.id);
        }
      }
    }

    // Fallback defaults
    const DEFAULT_DEFAULTS = [
      { name: "Food", iconName: "fast-food", colorName: "orange" },
      { name: "Transport", iconName: "car", colorName: "teal" },
      { name: "Bills", iconName: "document-text", colorName: "bluegrey" },
    ];

    for (const def of DEFAULT_DEFAULTS) {
      if (slots.length >= 3) break;
      slots.push({
        id: `default-${def.name.toLowerCase()}`,
        name: def.name,
        colorName: def.colorName,
        isFallback: true,
        iconName: def.iconName,
      });
    }

    return slots;
  };

  const handleQuickAddPress = async (slot: QuickAddSlot) => {
    try {
      let categoryId = slot.id;

      if (slot.isFallback) {
        const created = await dispatch(
          addCategory({
            name: slot.name,
            type: "expense",
            color: "#FF6B6B",
          })
        ).unwrap();
        categoryId = created.id;
      }

      // @ts-ignore
      navigation.navigate("AddTransaction", {
        categoryId,
        autoFocusAmount: true,
      });
    } catch (error) {
      console.error("Failed to quick-add category:", error);
      // @ts-ignore
      navigation.navigate("AddTransaction", {});
    }
  };

  const handleMorePress = () => {
    // @ts-ignore
    navigation.navigate("AddTransaction", {});
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: tabBarHeight }}>
        
        {/* Header */}
        <Text style={[typography.h2, { color: colors.onBackground, marginBottom: spacing.lg }]}>
          Dashboard
        </Text>

        {/* Balance Card */}
        <Card variant="outlined" style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
          <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginBottom: spacing.xs }]}>
            Total Balance
          </Text>
          <Text style={[typography.h1, { color: colors.onSurface, marginBottom: spacing.md }]}>
            {formatCurrency(balance)}
          </Text>
          
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Badge label={`Income: ${formatCurrency(totalIncome)}`} role="success" />
            <Badge label={`Expense: ${formatCurrency(totalExpenses)}`} role="error" />
          </View>
        </Card>

        {/* Quick Add Row */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={[typography.h3, { color: colors.onBackground, marginBottom: spacing.md }]}>
            Quick Add
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {quickAddSlots.map((slot) => (
              <TouchableOpacity
                key={slot.id}
                style={{ alignItems: 'center', width: 70 }}
                onPress={() => handleQuickAddPress(slot)}>
                <IconChip 
                  iconName={slot.iconName as any} 
                  colorName={slot.colorName as any || 'bluegrey'} 
                  size={56} 
                />
                <Text style={[typography.bodySmall, { color: colors.onBackground, marginTop: spacing.xs, textAlign: 'center' }]} numberOfLines={1}>
                  {slot.name}
                </Text>
              </TouchableOpacity>
            ))}
            
            {/* + More chip */}
            <TouchableOpacity
              style={{ alignItems: 'center', width: 70 }}
              onPress={handleMorePress}>
              <View style={[styles.moreChip, { backgroundColor: colors.tertiary, borderRadius: radius.pill }]}>
                <Ionicons name="add" size={32} color={colors.onTertiary} />
              </View>
              <Text style={[typography.bodySmall, { color: colors.onBackground, marginTop: spacing.xs, textAlign: 'center' }]} numberOfLines={1}>
                More
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Transactions Preview */}
        <View style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <Text style={[typography.h3, { color: colors.onBackground }]}>
              Recent Transactions
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("TransactionList" as any)}>
              <Text style={[typography.bodyMedium, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={{ gap: spacing.sm }}>
            {recentTransactions.map((tx) => {
              const category = tx.categoryId ? categoriesMap[tx.categoryId] : null;
              const isIncome = tx.type === "income";
              
              return (
                <ListRow
                  key={tx.id}
                  title={category?.name || "Uncategorized"}
                  subtitle={tx.description || formatDate(tx.date)}
                  leading={
                    <IconChip
                      iconName={((category as any)?.icon as any) || "help"}
                      colorName="bluegrey"
                      size={40}
                    />
                  }
                  trailing={
                    <Text style={[typography.label, { color: isIncome ? colors.tertiary : colors.error }]}>
                      {isIncome ? "+" : "-"}{formatCurrency(tx.amount)}
                    </Text>
                  }
                  onPress={() => navigation.navigate("AddTransaction" as any, { editTransaction: tx })}
                />
              );
            })}
            
            {recentTransactions.length === 0 && (
              <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center', marginVertical: spacing.xl }]}>
                No recent transactions
              </Text>
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  moreChip: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
