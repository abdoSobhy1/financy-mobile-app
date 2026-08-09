import React, { useState, useCallback, useEffect } from "react";
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
import { Dimensions } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { RootState, AppDispatch } from "../store";
import { Transaction, Category, TransactionStackParamList } from "../types";
import { getCurrentBillingPeriod, getPreviousBillingPeriod } from "../utils/billingPeriod";
import { formatCurrency, formatDate } from "../utils";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { Badge } from "../components/ui/Badge";
import { ParsedTransaction } from "../types";
import { Card } from "../components/ui";
import { AppHeader } from "../components/ui/AppHeader";
import { ListRow } from "../components/ui/ListRow";
import { useTabBarHeight } from "../components/ui";
import { IconChip } from "../components/ui/IconChip";
import { addCategory, fetchCategories } from "../store/slices/categoriesSlice";
import { fetchTransactions } from "../store/slices/transactionsSlice";
import { fetchBudgets } from "../store/slices/budgetsSlice";

type DashboardNavigationProp = StackNavigationProp<any, "Dashboard">;

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
  const { colors, typography, spacing, radius, categoryPalette } =
    useAppTheme();
  const tabBarHeight = useTabBarHeight();

  const transactions = useSelector(
    (state: RootState) => state.transactions.items,
  );
  const categoriesMap = useSelector(
    (state: RootState) => state.categories.items,
  );
  const budgetsMap = useSelector(
    (state: RootState) => state.budgets.items,
  );

  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const [balanceChangePct, setBalanceChangePct] = useState<number>(0);
  const [totalBudget, setTotalBudget] = useState<number>(0);
  const [balanceHistory, setBalanceHistory] = useState<number[]>([]);
  const [quickAddSlots, setQuickAddSlots] = useState<QuickAddSlot[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    [],
  );

  useEffect(() => {
    dispatch(fetchTransactions());
    dispatch(fetchCategories());
    dispatch(fetchBudgets());
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadDashboardData = async () => {
        try {
          const { start, end } = await getCurrentBillingPeriod();
          if (!isActive) return;

          const allTransactions = Object.values(transactions).filter(
            (t) => !t.deleted,
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
          const currentBalance = income - expenses;
          setBalance(currentBalance);

          // Calculate previous period balance
          const { start: prevStart, end: prevEnd } = await getPreviousBillingPeriod();
          const prevPeriodTxs = allTransactions.filter((t) => {
            const d = new Date(t.date);
            return d >= prevStart && d <= prevEnd;
          });
          const prevIncome = prevPeriodTxs
            .filter((t) => t.type === "income")
            .reduce((sum, t) => sum + t.amount, 0);
          const prevExpenses = prevPeriodTxs
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0);
          const previousBalance = prevIncome - prevExpenses;

          if (previousBalance !== 0) {
            const pctChange = ((currentBalance - previousBalance) / Math.abs(previousBalance)) * 100;
            setBalanceChangePct(pctChange);
          } else if (currentBalance !== 0) {
            setBalanceChangePct(100);
          } else {
            setBalanceChangePct(0);
          }

          // Calculate budget
          const activeBudgets = Object.values(budgetsMap).filter((b) => !b.deleted);
          const currentTotalBudget = activeBudgets.reduce((sum, b) => sum + b.amount, 0);
          setTotalBudget(currentTotalBudget);

          // Calculate balance history for graph
          const sortedPeriodTxs = [...periodTxs].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          let runningBalance = 0;
          const history = [0];
          sortedPeriodTxs.forEach((t) => {
            runningBalance += t.type === "income" ? t.amount : -t.amount;
            history.push(runningBalance);
          });
          if (history.length < 2) history.push(runningBalance);
          setBalanceHistory(history);

          // 2. Recent transactions preview
          const sortedRecent = [...allTransactions]
            .sort(
              (a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime() ||
                new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
            )
            .slice(0, 5);
          setRecentTransactions(sortedRecent);

          // 3. Compute ranked quick add categories
          const topSlots = computeTopExpenseCategories(
            allTransactions,
            categoriesMap,
            start,
            end,
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
    }, [transactions, categoriesMap, budgetsMap]),
  );

  const computeTopExpenseCategories = (
    txs: Transaction[],
    catsMap: Record<string, Category>,
    start: Date,
    end: Date,
  ): QuickAddSlot[] => {
    const allExpenseTxs = txs.filter((t) => t.type === "expense" && !t.deleted);

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
      (a, b) => (scores[b] || 0) - (scores[a] || 0),
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
          iconName: (cat as any).icon || "receipt-outline",
        });
        pickedIds.add(cat.id);
      }
    }

    // Fill remaining slots
    if (slots.length < 3) {
      for (const cat of Object.values(catsMap)) {
        if (slots.length >= 3) break;
        if (cat.type === "expense" && !cat.deleted && !pickedIds.has(cat.id)) {
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

  const handleVoiceResult = (parsed: ParsedTransaction[]) => {
    // Navigate to AddTransaction with pre-filled data
    if (parsed && parsed.length > 0) {
      // @ts-ignore
      navigation.navigate("AddTransaction", { prefilledData: parsed[0] });
    }
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
          }),
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

  const { width: SCREEN_WIDTH } = Dimensions.get("window");
  const CARD_WIDTH = SCREEN_WIDTH * 0.85;

  const generateSmoothPath = (data: number[], width: number, height: number) => {
    if (data.length < 2) {
      return {
        strokePath: `M 0 ${height / 2} L ${width} ${height / 2}`,
        fillPath: `M 0 ${height / 2} L ${width} ${height / 2} L ${width} ${height} L 0 ${height} Z`,
      };
    }
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const stepX = width / (data.length - 1);
    const padding = height * 0.2;
    const drawHeight = height - padding * 2;
    
    const points = data.map((val, i) => {
      const x = i * stepX;
      const y = height - padding - ((val - min) / range) * drawHeight;
      return { x, y };
    });

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    
    const fillPath = d + ` L ${width} ${height} L 0 ${height} Z`;
    return { strokePath: d, fillPath };
  };

  const budgetPercentUsed = totalBudget > 0 ? Math.min(100, Math.round((totalExpenses / totalBudget) * 100)) : 0;
  const pieRadius = 24;
  const pieStroke = 6;
  const pieCircumference = 2 * Math.PI * pieRadius;
  const pieDashoffset = pieCircumference - (budgetPercentUsed / 100) * pieCircumference;
  const { strokePath, fillPath } = generateSmoothPath(balanceHistory, CARD_WIDTH, 80);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}>
      <StatusBar barStyle="light-content" />

      {/* Shared App Header */}
      <AppHeader title="Dashboard" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: tabBarHeight,
        }}>
        
        {/* Alerts Section (Hardcoded for design preview) */}
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
          <View style={{
            backgroundColor: colors.errorContainer,
            borderRadius: radius.lg,
            padding: spacing.md,
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: spacing.md
            }}>
              <Ionicons name="warning" size={24} color={colors.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.label, { color: colors.onErrorContainer, fontWeight: '700' }]}>
                Groceries Overspent
              </Text>
              <Text style={[typography.bodyMedium, { color: colors.onErrorContainer, opacity: 0.9 }]}>
                You exceeded this budget by $120.00
              </Text>
            </View>
          </View>
        </View>

        {/* Dashboard Summary Cards - Horizontal Scroll */}
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + spacing.md}
          decelerationRate="fast"
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.xl,
            gap: spacing.md,
          }}>
          
          {/* 1. Total Balance Card */}
          <View
            style={{
              width: CARD_WIDTH,
              backgroundColor: colors.tertiaryContainer,
              borderRadius: 32,
              padding: spacing.xl,
              paddingBottom: 0,
              overflow: "hidden",
              justifyContent: "space-between",
            }}>
            <View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: spacing.sm,
                }}>
                <Text
                  style={[
                    typography.label,
                    {
                      color: colors.onTertiaryContainer,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      opacity: 0.7,
                    },
                  ]}>
                  TOTAL BALANCE
                </Text>
                <View
                  style={{
                    backgroundColor: "rgba(0,0,0,0.1)",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.onTertiaryContainer,
                      fontWeight: "bold",
                      opacity: 0.8,
                    }}>
                    {balanceChangePct >= 0 ? "↑" : "↓"} {balanceChangePct > 0 ? "+" : ""}{balanceChangePct.toFixed(1)}%
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  typography.h1,
                  {
                    color: colors.onTertiaryContainer,
                    fontSize: 48,
                    fontWeight: "900",
                  },
                ]}>
                {formatCurrency(balance)}
              </Text>
            </View>
            
            <View style={{ height: 80, marginHorizontal: -spacing.xl, marginTop: spacing.md }}>
              <Svg width="100%" height="100%">
                <Path
                  d={fillPath}
                  fill={colors.onTertiaryContainer}
                  fillOpacity={0.1}
                />
                <Path
                  d={strokePath}
                  fill="none"
                  stroke={colors.onTertiaryContainer}
                  strokeWidth={3}
                  strokeOpacity={0.6}
                />
              </Svg>
            </View>
          </View>

          {/* 2. Monthly Spend Card */}
          <View
            style={{
              width: CARD_WIDTH,
              backgroundColor: colors.secondaryContainer,
              borderRadius: 32,
              padding: spacing.xl,
              justifyContent: "space-between",
            }}>
            <View>
              <Text
                style={[
                  typography.label,
                  {
                    color: colors.onSecondaryContainer,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    opacity: 0.7,
                    marginBottom: spacing.sm,
                  },
                ]}>
                MONTHLY SPEND
              </Text>
              <Text
                style={[
                  typography.h1,
                  {
                    color: colors.onSecondaryContainer,
                    fontSize: 48,
                    fontWeight: "900",
                  },
                ]}>
                {formatCurrency(totalExpenses)}
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.xl }}>
              <View style={{ width: 48, height: 48, marginRight: spacing.md }}>
                <Svg width="48" height="48" viewBox="0 0 60 60">
                  <Circle
                    cx="30"
                    cy="30"
                    r={pieRadius}
                    stroke={colors.onSecondaryContainer}
                    strokeOpacity={0.2}
                    strokeWidth={pieStroke}
                    fill="none"
                  />
                  <Circle
                    cx="30"
                    cy="30"
                    r={pieRadius}
                    stroke={colors.onSecondaryContainer}
                    strokeWidth={pieStroke}
                    fill="none"
                    strokeDasharray={pieCircumference}
                    strokeDashoffset={pieDashoffset}
                    strokeLinecap="round"
                    rotation="-90"
                    origin="30, 30"
                  />
                </Svg>
              </View>
              <View>
                <Text style={[typography.bodyMedium, { color: colors.onSecondaryContainer, opacity: 0.7 }]}>
                  vs. {formatCurrency(totalBudget)} Budget
                </Text>
                <Text style={[typography.label, { color: colors.onSecondaryContainer, opacity: 0.6, marginTop: 2 }]}>
                  {budgetPercentUsed}% Used
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Quick Add Row */}
        <View style={{ marginBottom: spacing.xl, paddingHorizontal: spacing.lg }}>
          <Text
            style={[
              typography.h3,
              {
                color: colors.onBackground,
                marginBottom: spacing.md,
                fontSize: 14,
                textTransform: "uppercase",
              },
            ]}>
            QUICK ADD
          </Text>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {quickAddSlots.map((slot) => (
              <TouchableOpacity
                key={slot.id}
                style={{ alignItems: "center", width: 64 }}
                onPress={() => handleQuickAddPress(slot)}>
                <View
                  style={[
                    styles.circleIcon,
                    { backgroundColor: colors.surface },
                  ]}>
                  <IconChip
                    iconName={slot.iconName as any}
                    colorName={(slot.colorName as any) || "bluegrey"}
                    size={56}
                  />
                </View>
                <Text
                  style={[
                    typography.bodySmall,
                    {
                      color: colors.onBackground,
                      marginTop: spacing.xs,
                      textAlign: "center",
                      fontWeight: "600",
                    },
                  ]}
                  numberOfLines={1}>
                  {slot.name}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Voice / More chip */}
            <TouchableOpacity
              style={{ alignItems: "center", width: 64 }}
              onPress={() => navigation.navigate("VoiceInput")}>
              <View
                style={[
                  styles.moreChip,
                  {
                    backgroundColor: colors.primaryContainer,
                    borderRadius: 28,
                  },
                ]}>
                <Ionicons
                  name="mic-outline"
                  size={28}
                  color={colors.onPrimaryContainer}
                />
              </View>
              <Text
                style={[
                  typography.bodySmall,
                  {
                    color: colors.onBackground,
                    marginTop: spacing.xs,
                    textAlign: "center",
                    fontWeight: "600",
                  },
                ]}
                numberOfLines={1}>
                Voice
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Transactions Preview */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 32,
            padding: spacing.lg,
            paddingBottom: spacing.xxl,
            marginHorizontal: spacing.lg,
          }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: spacing.xl,
            }}>
            <Text style={[typography.h2, { color: colors.onBackground }]}>
              Transactions
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("TransactionList" as any)}>
              <Text
                style={[
                  typography.bodySmall,
                  { color: colors.primary, fontWeight: "bold" },
                ]}>
                View All
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ gap: spacing.md }}>
            {recentTransactions.map((tx) => {
              const category = tx.categoryId
                ? categoriesMap[tx.categoryId]
                : null;
              const isIncome = tx.type === "income";

              return (
                <View
                  key={tx.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: spacing.sm,
                  }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}>
                    <View style={{ marginRight: spacing.md }}>
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: (category?.color || colors.primary) + "20",
                          alignItems: "center",
                          justifyContent: "center",
                        }}>
                        <Ionicons
                          name={
                            (((category as any)?.icon as any) ||
                              "receipt-outline") as any
                          }
                          size={24}
                          color={category?.color || colors.primary}
                        />
                      </View>
                    </View>
                    <View>
                      <Text
                        style={[
                          typography.bodyLarge,
                          { color: colors.onBackground, fontWeight: "600" },
                        ]}>
                        {category?.name || "Uncategorized"}
                      </Text>
                      <Text
                        style={[
                          typography.bodySmall,
                          { color: colors.onSurfaceVariant, marginTop: 2 },
                        ]}>
                        {formatDate(tx.date)}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      typography.h3,
                      { color: isIncome ? "#48C774" : colors.onBackground },
                    ]}>
                    {isIncome ? "+" : "-"}
                    {formatCurrency(tx.amount)}
                  </Text>
                </View>
              );
            })}

            {recentTransactions.length === 0 && (
              <Text
                style={[
                  typography.bodyMedium,
                  {
                    color: colors.onSurfaceVariant,
                    textAlign: "center",
                    marginVertical: spacing.xl,
                  },
                ]}>
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
  notificationButton: {
    padding: 8,
  },
  circleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  moreChip: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
});
