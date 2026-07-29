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
import { useAppTheme } from "../theme";
import { Badge } from "../components/ui";
import { addCategory } from "../store/slices/categoriesSlice";
import {
  addTransaction,
  deleteTransaction,
} from "../store/slices/transactionsSlice";

type DashboardNavigationProp = StackNavigationProp<
  TransactionStackParamList,
  "Dashboard"
>;

interface QuickAddSlot {
  id: string;
  name: string;
  color?: string;
  isFallback: boolean;
}

const getCategoryColorKey = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes("food") || n.includes("grocery") || n.includes("dining") || n.includes("اكل") || n.includes("فطار")) return "amber";
  if (n.includes("transport") || n.includes("car") || n.includes("taxi") || n.includes("مواصلات")) return "blue";
  if (n.includes("bill") || n.includes("electric") || n.includes("water") || n.includes("كهرباء") || n.includes("فاتورة")) return "pink";
  if (n.includes("income") || n.includes("salary") || n.includes("saving") || n.includes("راتب")) return "green";
  if (n.includes("fun") || n.includes("entert") || n.includes("movie") || n.includes("رفاهية")) return "purple";
  if (n.includes("health") || n.includes("med") || n.includes("doctor") || n.includes("صحة")) return "rose";
  if (n.includes("util") || n.includes("subscrip") || n.includes("net") || n.includes("انترنت")) return "teal";
  if (n.includes("shop") || n.includes("buy") || n.includes("store") || n.includes("تسوق")) return "orange";
  if (n.includes("edu") || n.includes("tech") || n.includes("book") || n.includes("تعليم")) return "indigo";
  return "neutral";
};

const getCategoryIconName = (category?: Category | null, fallbackName?: string): keyof typeof Ionicons.glyphMap => {
  if (category?.icon) return category.icon as keyof typeof Ionicons.glyphMap;
  const n = (category?.name || fallbackName || "").toLowerCase();
  if (n.includes("food") || n.includes("grocery") || n.includes("dining") || n.includes("اكل")) return "cart";
  if (n.includes("transport") || n.includes("car") || n.includes("taxi") || n.includes("مواصلات")) return "car";
  if (n.includes("bill") || n.includes("electric") || n.includes("water") || n.includes("فاتورة")) return "flash";
  if (n.includes("shop") || n.includes("buy") || n.includes("store")) return "bag";
  if (n.includes("fun") || n.includes("entert") || n.includes("movie") || n.includes("رفاهية")) return "film";
  if (n.includes("health") || n.includes("med")) return "heart";
  return "pricetag";
};

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<DashboardNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { colors, isDark, typography, spacing, radius, categoryPalette } = useAppTheme();

  const transactions = useSelector(
    (state: RootState) => state.transactions.items
  );
  const categoriesMap = useSelector(
    (state: RootState) => state.categories.items
  );

  const [periodStart, setPeriodStart] = useState<Date>(new Date());
  const [periodEnd, setPeriodEnd] = useState<Date>(new Date());
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const [quickAddSlots, setQuickAddSlots] = useState<QuickAddSlot[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    []
  );

  // Recalculate dashboard stats and quick add ranking on focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadDashboardData = async () => {
        try {
          const { start, end } = await getCurrentBillingPeriod();
          if (!isActive) return;

          setPeriodStart(start);
          setPeriodEnd(end);

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

          // 2. Recent transactions preview (last 5 across all non-deleted transactions)
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

    // Fall back to trailing 60 days if period has too little data (< 3 unique categories)
    let relevantTxs = periodTxs;
    if (periodCategoryIds.size < 3) {
      const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      relevantTxs = allExpenseTxs.filter((t) => new Date(t.date) >= cutoff);
    }

    // Score categories by recency-weighted transaction count
    const scores: Record<string, number> = {};
    const now = Date.now();
    for (const tx of relevantTxs) {
      const txTime = new Date(tx.date).getTime();
      const daysAgo = Math.max(0, (now - txTime) / (1000 * 60 * 60 * 24));
      // Linear decay over 60 days, min weight 0.1
      const weight = Math.max(0.1, 1 - daysAgo / 60);
      scores[tx.categoryId] = (scores[tx.categoryId] || 0) + weight;
    }

    const sortedCatIds = Object.keys(scores).sort(
      (a, b) => (scores[b] || 0) - (scores[a] || 0)
    );

    const slots: QuickAddSlot[] = [];
    const pickedIds = new Set<string>();
    const pickedNames = new Set<string>();

    // Add top scored expense categories
    for (const catId of sortedCatIds) {
      if (slots.length >= 3) break;
      const cat = catsMap[catId];
      if (cat && cat.type === "expense" && !cat.deleted) {
        slots.push({
          id: cat.id,
          name: cat.name,
          color: cat.color || UI.COLORS.PRIMARY,
          isFallback: false,
        });
        pickedIds.add(cat.id);
        pickedNames.add(cat.name.toLowerCase());
      }
    }

    // Fill remaining slots from existing expense categories if any
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
            color: cat.color || UI.COLORS.PRIMARY,
            isFallback: false,
          });
          pickedIds.add(cat.id);
          pickedNames.add(cat.name.toLowerCase());
        }
      }
    }

    // Fallback hardcoded defaults if still < 3
    const DEFAULT_DEFAULTS = [
      { name: "Food", color: "#FF6B6B" },
      { name: "Transport", color: "#4ECDC4" },
      { name: "Bills", color: "#45B7D1" },
    ];

    for (const def of DEFAULT_DEFAULTS) {
      if (slots.length >= 3) break;
      if (pickedNames.has(def.name.toLowerCase())) continue;

      const existing = Object.values(catsMap).find(
        (c) =>
          c.type === "expense" &&
          !c.deleted &&
          c.name.toLowerCase() === def.name.toLowerCase() &&
          !pickedIds.has(c.id)
      );

      if (existing) {
        slots.push({
          id: existing.id,
          name: existing.name,
          color: existing.color || def.color,
          isFallback: false,
        });
        pickedIds.add(existing.id);
        pickedNames.add(existing.name.toLowerCase());
      } else {
        slots.push({
          id: `default-${def.name.toLowerCase()}`,
          name: def.name,
          color: def.color,
          isFallback: true,
        });
        pickedNames.add(def.name.toLowerCase());
      }
    }

    return slots;
  };

  const handleQuickAddPress = async (slot: QuickAddSlot) => {
    try {
      let categoryId = slot.id;

      if (slot.isFallback) {
        const existing = Object.values(categoriesMap).find(
          (c) =>
            c.type === "expense" &&
            !c.deleted &&
            c.name.toLowerCase() === slot.name.toLowerCase()
        );

        if (existing) {
          categoryId = existing.id;
        } else {
          const created = await dispatch(
            addCategory({
              name: slot.name,
              type: "expense",
              color: slot.color || "#FF6B6B",
            })
          ).unwrap();
          categoryId = created.id;
        }
      }

      navigation.navigate("AddTransaction", {
        categoryId,
        autoFocusAmount: true,
      });
    } catch (error) {
      console.error("Failed to quick-add category:", error);
      navigation.navigate("AddTransaction", {});
    }
  };

  const handleMorePress = () => {
    navigation.navigate("AddTransaction", {});
  };

  const handleTransactionPress = (transaction: Transaction) => {
    navigation.navigate("AddTransaction", { editTransaction: transaction });
  };

  const handleDuplicateTransaction = async (transaction: Transaction) => {
    try {
      await dispatch(
        addTransaction({
          description: transaction.description,
          amount: transaction.amount.toString(),
          type: transaction.type,
          categoryId: transaction.categoryId,
          budgetId: transaction.budgetId,
          date: new Date(),
          note: transaction.note || "",
        })
      );
    } catch (error) {
      console.error("Failed to duplicate transaction:", error);
    }
  };

  const handleDeleteTransaction = async (transaction: Transaction) => {
    try {
      await dispatch(deleteTransaction(transaction.id));
    } catch (error) {
      console.error("Failed to delete transaction:", error);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* ─── Balance Card (Requirement 1) ──────────────────────────── */}
        <View
          style={[
            styles.balanceCard,
            {
              backgroundColor: colors.surface,
              borderRadius: radius.large, // 20px
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.outline,
              padding: spacing.s20,
              marginTop: spacing.s16,
            },
          ]}>
          <Text
            style={[
              typography.labelMedium,
              { color: colors.onSurfaceVariant, marginBottom: spacing.s4 },
            ]}>
            CURRENT PERIOD BALANCE
          </Text>
          <Text style={[typography.displayLarge, { color: colors.onSurface }]}>
            {formatCurrency(balance)}
          </Text>

          <View
            style={[
              styles.badgeRow,
              { marginTop: spacing.s16, gap: spacing.s12 },
            ]}>
            <Badge
              label={`Income: ${formatCurrency(totalIncome)}`}
              variant="success"
              size="small"
              icon="arrow-up"
            />
            <Badge
              label={`Expense: ${formatCurrency(totalExpenses)}`}
              variant="error"
              size="small"
              icon="arrow-down"
            />
          </View>
        </View>

        {/* ─── Quick Add Row (Requirement 2) ─────────────────────────── */}
        <View style={[styles.section, { marginTop: spacing.s24 }]}>
          <Text
            style={[
              typography.titleMedium,
              { color: colors.onSurface, marginBottom: spacing.s12 },
            ]}>
            Quick Add Expense
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.quickAddRow, { gap: spacing.s12 }]}>
            {quickAddSlots.map((slot) => {
              const catObj = categoriesMap[slot.id];
              const paletteKey = getCategoryColorKey(slot.name);
              const colorPair =
                categoryPalette[paletteKey] || categoryPalette.neutral;
              const chipBg = isDark ? colorPair.dark : colorPair.light;
              const chipText = isDark ? colorPair.textDark : colorPair.textLight;
              const iconName = getCategoryIconName(catObj, slot.name);

              return (
                <TouchableOpacity
                  key={slot.id}
                  style={[
                    styles.quickAddChip,
                    {
                      backgroundColor: chipBg,
                      borderRadius: radius.medium, // 16px
                      paddingHorizontal: spacing.s16,
                      paddingVertical: spacing.s8,
                    },
                  ]}
                  onPress={() => handleQuickAddPress(slot)}
                  activeOpacity={0.7}>
                  <View
                    style={[
                      styles.iconCircle28,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.12)"
                          : "rgba(0,0,0,0.06)",
                        marginRight: spacing.s8,
                      },
                    ]}>
                    <Ionicons name={iconName} size={14} color={chipText} />
                  </View>
                  <Text style={[typography.labelMedium, { color: chipText }]}>
                    {slot.name}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Static "+ more" slot (system dynamic accent) */}
            <TouchableOpacity
              style={[
                styles.quickAddChip,
                {
                  backgroundColor: colors.primaryContainer,
                  borderRadius: radius.medium, // 16px
                  paddingHorizontal: spacing.s16,
                  paddingVertical: spacing.s8,
                },
              ]}
              onPress={handleMorePress}
              activeOpacity={0.7}>
              <View
                style={[
                  styles.iconCircle28,
                  {
                    backgroundColor: colors.primary + "25",
                    marginRight: spacing.s8,
                  },
                ]}>
                <Ionicons
                  name="add"
                  size={16}
                  color={colors.onPrimaryContainer}
                />
              </View>
              <Text
                style={[
                  typography.labelMedium,
                  { color: colors.onPrimaryContainer },
                ]}>
                more
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ─── Recent Transactions (Requirement 3) ───────────────────── */}
        <View style={[styles.section, { marginTop: spacing.s24 }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[typography.titleMedium, { color: colors.onSurface }]}>
              Recent Transactions
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("TransactionList")}
              activeOpacity={0.7}>
              <Text style={[typography.labelMedium, { color: colors.primary }]}>
                View all
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.recentCardContainer,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.large, // 20px
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.outline,
                overflow: "hidden",
                marginTop: spacing.s8,
              },
            ]}>
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx, idx) => {
                const catObj = categoriesMap[tx.categoryId];
                const paletteKey = getCategoryColorKey(catObj?.name || "");
                const colorPair =
                  categoryPalette[paletteKey] || categoryPalette.neutral;
                const iconBg = isDark ? colorPair.dark : colorPair.light;
                const iconColor = isDark
                  ? colorPair.textDark
                  : colorPair.textLight;
                const iconName = getCategoryIconName(catObj);
                const isIncome = tx.type === "income";
                const amountColor = isIncome
                  ? colors.success
                  : tx.type === "expense"
                    ? colors.error
                    : colors.onSurface;

                return (
                  <TouchableOpacity
                    key={tx.id}
                    style={[
                      styles.recentRow,
                      {
                        paddingHorizontal: spacing.s16,
                        paddingVertical: spacing.s12,
                        borderTopWidth:
                          idx > 0 ? StyleSheet.hairlineWidth : 0,
                        borderTopColor: colors.outline,
                      },
                    ]}
                    onPress={() => handleTransactionPress(tx)}
                    activeOpacity={0.7}>
                    <View
                      style={[
                        styles.iconCircle36,
                        {
                          backgroundColor: iconBg,
                          marginRight: spacing.s12,
                        },
                      ]}>
                      <Ionicons
                        name={iconName}
                        size={18}
                        color={iconColor}
                      />
                    </View>

                    <View style={styles.rowContent}>
                      <Text
                        style={[
                          typography.bodyMedium,
                          { color: colors.onSurface },
                        ]}
                        numberOfLines={1}>
                        {tx.description}
                      </Text>
                      <Text
                        style={[
                          typography.caption,
                          { color: colors.onSurfaceVariant, marginTop: 2 },
                        ]}>
                        {catObj ? catObj.name + " • " : ""}
                        {formatDate(tx.date)}
                      </Text>
                    </View>

                    <Text
                      style={[typography.labelLarge, { color: amountColor }]}>
                      {isIncome ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View
                style={[
                  styles.emptyStateContainer,
                  { padding: spacing.s24 },
                ]}>
                <Text
                  style={[
                    typography.bodyMedium,
                    { color: colors.onSurfaceVariant, textAlign: "center" },
                  ]}>
                  No recent transactions in this period.
                </Text>
              </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  balanceCard: {
    marginHorizontal: 16,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  section: {
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quickAddRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  quickAddChip: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle28: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  recentCardContainer: {
    width: "100%",
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconCircle36: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: {
    flex: 1,
    marginRight: 12,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});
