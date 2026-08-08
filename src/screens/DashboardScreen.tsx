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
import { Transaction, Category, TransactionStackParamList } from "../types";
import { getCurrentBillingPeriod } from "../utils/billingPeriod";
import { formatCurrency, formatDate } from "../utils";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui";
import { AppHeader } from "../components/ui/AppHeader";
import { ListRow } from "../components/ui/ListRow";
import { useTabBarHeight } from "../components/ui";
import { IconChip } from "../components/ui/IconChip";
import { addCategory } from "../store/slices/categoriesSlice";

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

  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const [quickAddSlots, setQuickAddSlots] = useState<QuickAddSlot[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    [],
  );

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
          setBalance(income - expenses);

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
    }, [transactions, categoriesMap]),
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
          iconName: (cat as any).icon || "cart",
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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}>
      <StatusBar barStyle="light-content" />
      
      {/* Shared App Header */}
      <AppHeader
        title="Dashboard"
        showSettings={false}
        rightAction={
          <TouchableOpacity style={styles.notificationButton} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={24} color={colors.onBackground} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: tabBarHeight,
        }}>
        
        {/* Balance Card */}
        <Card
          variant="default"
          style={{ 
            padding: spacing.xl, 
            marginBottom: spacing.xl, 
            backgroundColor: "#A8DADC", // Light cyan from mockup
            borderRadius: 32,
          }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
            <Text
              style={[
                typography.label,
                { color: "#455A64", textTransform: "uppercase", letterSpacing: 1 },
              ]}>
              TOTAL BALANCE
            </Text>
            <View style={{ backgroundColor: "rgba(0,0,0,0.1)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ fontSize: 12, color: "#455A64", fontWeight: "bold" }}>↑ +2.4%</Text>
            </View>
          </View>
          
          <Text
            style={[
              typography.h1,
              { color: "#1D3557", fontSize: 48, fontWeight: "900", marginBottom: spacing.xl },
            ]}>
            {formatCurrency(balance)}
          </Text>
          
          {/* Mockup chart line abstraction */}
          <View style={{ height: 40, borderBottomWidth: 2, borderBottomColor: "rgba(0,0,0,0.1)" }}>
             {/* A stylized path could go here; using a placeholder border for now */}
          </View>
        </Card>

        {/* Quick Add Row */}
        <View style={{ marginBottom: spacing.xl }}>
          <Text
            style={[
              typography.h3,
              { color: colors.onBackground, marginBottom: spacing.md, fontSize: 14, textTransform: "uppercase" },
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
                <View style={[styles.circleIcon, { backgroundColor: colors.surface }]}>
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
              onPress={handleMorePress}>
              <View
                style={[
                  styles.moreChip,
                  {
                    backgroundColor: "#E0F7FA",
                    borderRadius: 28,
                  },
                ]}>
                <Ionicons name="mic-outline" size={28} color="#006064" />
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
        <View style={{ backgroundColor: colors.surface, borderRadius: 32, padding: spacing.lg, paddingBottom: spacing.xxl }}>
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
              <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: "bold" }]}>
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
                <View key={tx.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                    <View style={{ marginRight: spacing.md }}>
                      <IconChip
                        iconName={((category as any)?.icon as any) || "cafe-outline"}
                        colorName="bluegrey"
                        size={48}
                      />
                    </View>
                    <View>
                      <Text style={[typography.bodyLarge, { color: colors.onBackground, fontWeight: "600" }]}>
                        {category?.name || "Uncategorized"}
                      </Text>
                      <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: 2 }]}>
                        {formatDate(tx.date)}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      typography.h3,
                      { color: isIncome ? "#48C774" : colors.onBackground },
                    ]}>
                    {isIncome ? "+" : "-"}{formatCurrency(tx.amount)}
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
