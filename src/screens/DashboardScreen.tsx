import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSelector, useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { Dimensions } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { RootState, AppDispatch } from "../store";
import { Transaction, Category, TransactionStackParamList, WalletAccount, WalletType } from "../types";
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
import { useTransactionActions } from "../hooks/useTransactionActions";
import { walletService } from "../services/walletService";

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
  const { colors, typography, spacing, radius, isDark } =
    useAppTheme();
  const tabBarHeight = useTabBarHeight();
  const { handleTransactionPress } = useTransactionActions();

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
  const [budgetedExpenses, setBudgetedExpenses] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const [balanceChangePct, setBalanceChangePct] = useState<number>(0);
  const [totalBudget, setTotalBudget] = useState<number>(0);
  const [daysLeftInPeriod, setDaysLeftInPeriod] = useState<number>(1);
  const [balanceHistory, setBalanceHistory] = useState<number[]>([]);
  const [quickAddSlots, setQuickAddSlots] = useState<QuickAddSlot[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [overspentBudgets, setOverspentBudgets] = useState<{ id: string; name: string; excess: number }[]>([]);

  const [showAlert, setShowAlert] = useState(true);
  const [hideBalances, setHideBalances] = useState(false);

  // Multi-Wallet State
  const [wallets, setWallets] = useState<WalletAccount[]>([]);
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({});
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromWalletId, setFromWalletId] = useState<string>("default_cash");
  const [toWalletId, setToWalletId] = useState<string>("default_bank");
  const [transferAmount, setTransferAmount] = useState<string>("");

  useEffect(() => {
    dispatch(fetchTransactions());
    dispatch(fetchCategories());
    dispatch(fetchBudgets());
    AsyncStorage.getItem("dashboardHideBalances")
      .then((val) => {
        if (val === "true") setHideBalances(true);
      })
      .catch(() => {});
  }, [dispatch]);

  const toggleHideBalances = async () => {
    const next = !hideBalances;
    setHideBalances(next);
    try {
      await AsyncStorage.setItem("dashboardHideBalances", next ? "true" : "false");
    } catch {}
  };

  const maskCurrency = (amount: number, prefix: string = "") => {
    if (hideBalances) return "••••••";
    return `${prefix}${formatCurrency(amount)}`;
  };

  useEffect(() => {
    const checkAlert = async () => {
      try {
        const dismissedDate = await AsyncStorage.getItem("overspendingAlertDismissedDate");
        const today = new Date().toDateString();
        if (dismissedDate === today) {
          setShowAlert(false);
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkAlert();
  }, []);

  const handleDismissAlert = async () => {
    try {
      setShowAlert(false);
      const today = new Date().toDateString();
      await AsyncStorage.setItem("overspendingAlertDismissedDate", today);
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadDashboardData = async () => {
        try {
          const { start, end } = await getCurrentBillingPeriod();
          if (!isActive) return;

          const daysRemaining = Math.max(
            1,
            Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          );
          setDaysLeftInPeriod(daysRemaining);

          const allTransactions = Object.values(transactions).filter(
            (t) => !t.deleted,
          );

          // Load Wallets & Compute Live Balances
          const loadedWallets = await walletService.getWallets();
          if (isActive) {
            setWallets(loadedWallets);
            setWalletBalances(
              walletService.calculateWalletBalances(loadedWallets, allTransactions),
            );
            if (loadedWallets.length >= 2) {
              setFromWalletId((prev) => prev || loadedWallets[0].id);
              setToWalletId((prev) => prev || loadedWallets[1].id);
            }
          }

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
          // Only count transactions that are assigned to a budget
          const budgeted = periodTxs
            .filter((t) => t.type === "expense" && !!t.budgetId)
            .reduce((sum, t) => sum + t.amount, 0);

          setTotalIncome(income);
          setTotalExpenses(expenses);
          setBudgetedExpenses(budgeted);
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

          // Calculate overspent budgets
          const overspent: { id: string; name: string; excess: number }[] = [];
          activeBudgets.forEach((b) => {
            if (b.alertsEnabled) {
              const spent = periodTxs
                .filter((t) => t.budgetId === b.id && t.type === "expense")
                .reduce((sum, t) => sum + t.amount, 0);
              if (spent > b.amount) {
                overspent.push({ id: b.id, name: b.name, excess: spent - b.amount });
              }
            }
          });
          setOverspentBudgets(overspent);

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

    const sortedCatIds = Object.keys(scores).sort((a, b) => {
      const scoreDiff = (scores[b] || 0) - (scores[a] || 0);
      if (scoreDiff !== 0) return scoreDiff;
      // Tiebreaker: total usage count (entryCount)
      const countA = (catsMap[a] as any)?.entryCount || 0;
      const countB = (catsMap[b] as any)?.entryCount || 0;
      return countB - countA;
    });

    const slots: QuickAddSlot[] = [];
    const pickedIds = new Set<string>();

    for (const catId of sortedCatIds) {
      if (slots.length >= 10) break;
      const cat = catsMap[catId];
      if (cat && cat.type === "expense" && !cat.deleted) {
        slots.push({
          id: cat.id,
          name: cat.name,
          colorName: (cat as any).color || "bluegrey",
          isFallback: false,
          iconName: (cat as any).icon || "receipt-outline",
        });
        pickedIds.add(cat.id);
      }
    }

    // Fill remaining slots
    if (slots.length < 10) {
      for (const cat of Object.values(catsMap)) {
        if (slots.length >= 10) break;
        if (cat.type === "expense" && !cat.deleted && !pickedIds.has(cat.id)) {
          slots.push({
            id: cat.id,
            name: cat.name,
            colorName: (cat as any).color || "bluegrey",
            isFallback: false,
            iconName: (cat as any).icon || "cart",
          });
          pickedIds.add(cat.id);
        }
      }
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

  const handleTransferSubmit = async () => {
    const amt = parseFloat(transferAmount);
    if (!amt || amt <= 0 || fromWalletId === toWalletId) return;
    const allTransactions = Object.values(transactions).filter((t) => !t.deleted);
    const updatedWallets = await walletService.transferBetweenWallets(
      fromWalletId,
      toWalletId,
      amt,
    );
    setWallets(updatedWallets);
    setWalletBalances(
      walletService.calculateWalletBalances(updatedWallets, allTransactions),
    );
    setTransferAmount("");
    setShowTransferModal(false);
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

  const budgetPercentUsed = totalBudget > 0 ? Math.min(100, Math.round((budgetedExpenses / totalBudget) * 100)) : 0;
  const remainingBudget = Math.max(0, totalBudget - budgetedExpenses);
  const dailySafeToSpend = remainingBudget / Math.max(1, daysLeftInPeriod);
  const pieRadius = 24;
  const pieStroke = 6;
  const pieCircumference = 2 * Math.PI * pieRadius;
  const pieDashoffset = pieCircumference - (budgetPercentUsed / 100) * pieCircumference;
  const { strokePath, fillPath } = generateSmoothPath(balanceHistory, CARD_WIDTH, 80);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Shared App Header */}
      <AppHeader title="Dashboard" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: tabBarHeight,
        }}>

        {/* Alerts Section (Dynamic Overspending Alerts) */}
        {showAlert && overspentBudgets.length > 0 && (
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm }}>
            {overspentBudgets.map((ob) => (
              <View key={ob.id} style={{
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
                    {ob.name} Overspent
                  </Text>
                  <Text style={[typography.bodyMedium, { color: colors.onErrorContainer, opacity: 0.9 }]}>
                    You exceeded this budget by {formatCurrency(ob.excess)}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleDismissAlert} style={{ padding: 8 }}>
                  <Ionicons name="close" size={20} color={colors.onErrorContainer} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

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

          {/* 1. Unified Summary Card */}
          <View
            style={{
              width: CARD_WIDTH,
              backgroundColor: colors.primaryContainer,
              borderRadius: 32,
              padding: spacing.xl,
              overflow: "hidden",
              justifyContent: "center",
              minHeight: 185,
            }}>

            {/* Absolute Graph Background */}
            <View style={{ position: "absolute", bottom: -5, left: 0, right: 0, height: "60%" }}>
              <Svg width="100%" height="100%" viewBox={`0 0 ${CARD_WIDTH} 80`} preserveAspectRatio="none">
                <Path d={fillPath} fill={colors.onPrimaryContainer} fillOpacity={0.12} />
                <Path d={strokePath} fill="none" stroke={colors.onPrimaryContainer} strokeWidth={3} strokeOpacity={0.6} />
              </Svg>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", flex: 1 }}>

              {/* Left Side: Header, Big Number, NET BALANCE */}
              <View style={{ flex: 1, paddingRight: spacing.sm }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm, flexWrap: "wrap", gap: spacing.xs }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[typography.label, { color: colors.onPrimaryContainer, textTransform: "uppercase", letterSpacing: 1, opacity: 0.75 }]}>
                      TOTAL BALANCE
                    </Text>
                    <TouchableOpacity
                      onPress={toggleHideBalances}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{ opacity: 0.75 }}>
                      <Ionicons
                        name={hideBalances ? "eye-off-outline" : "eye-outline"}
                        size={16}
                        color={colors.onPrimaryContainer}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={{ backgroundColor: "rgba(0,0,0,0.12)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ fontSize: 10, color: colors.onPrimaryContainer, fontWeight: "bold", opacity: 0.85 }}>
                      {balanceChangePct >= 0 ? "↑" : "↓"} {balanceChangePct > 0 ? "+" : ""}{balanceChangePct.toFixed(1)}%
                    </Text>
                  </View>
                </View>

                <Text style={[typography.h1, { color: colors.onPrimaryContainer, fontSize: 38, fontWeight: "900", marginBottom: spacing.xs }]} numberOfLines={1} adjustsFontSizeToFit>
                  {maskCurrency(balance, balance >= 0 ? "+" : "")}
                </Text>
              </View>

              {/* Right Side: Stacked Pills */}
              <View style={{ width: 124, gap: spacing.sm }}>

                {/* Income Pill (stacked) */}
                <View style={{ backgroundColor: "rgba(0,0,0,0.15)", borderRadius: 16, padding: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="arrow-down" size={12} color={colors.onPrimaryContainer} />
                  </View>
                  <View style={{ flex: 1, justifyContent: "center" }}>
                    <Text style={[typography.bodySmall, { color: colors.onPrimaryContainer, opacity: 0.8, fontSize: 10, lineHeight: 12 }]} numberOfLines={1} adjustsFontSizeToFit>Income</Text>
                    <Text style={[typography.label, { color: colors.onPrimaryContainer, fontWeight: "700", fontSize: 12, lineHeight: 14 }]} numberOfLines={1} adjustsFontSizeToFit>{maskCurrency(totalIncome, "+")}</Text>
                  </View>
                </View>

                {/* Expenses Pill (stacked) */}
                <View style={{ backgroundColor: "rgba(0,0,0,0.15)", borderRadius: 16, padding: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="arrow-up" size={12} color={colors.onPrimaryContainer} />
                  </View>
                  <View style={{ flex: 1, justifyContent: "center" }}>
                    <Text style={[typography.bodySmall, { color: colors.onPrimaryContainer, opacity: 0.8, fontSize: 10, lineHeight: 12 }]} numberOfLines={1} adjustsFontSizeToFit>Expenses</Text>
                    <Text style={[typography.label, { color: colors.onPrimaryContainer, fontWeight: "700", fontSize: 12, lineHeight: 14 }]} numberOfLines={1} adjustsFontSizeToFit>{maskCurrency(totalExpenses, "-")}</Text>
                  </View>
                </View>

              </View>

            </View>

          </View>

          {/* 2. Monthly Spend vs Budget Card (budgeted transactions only) */}
          <View
            style={{
              width: CARD_WIDTH,
              backgroundColor: colors.primaryContainer,
              borderRadius: 32,
              padding: spacing.xl,
              justifyContent: "space-between",
              minHeight: 185,
            }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    typography.label,
                    {
                      color: colors.onPrimaryContainer,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      opacity: 0.75,
                      marginBottom: spacing.sm,
                    },
                  ]}>
                  BUDGETED SPEND
                </Text>
                <Text
                  style={[
                    typography.h1,
                    {
                      color: colors.onPrimaryContainer,
                      fontSize: 38,
                      fontWeight: "900",
                      marginBottom: spacing.xs,
                    },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit>
                  {maskCurrency(budgetedExpenses)}
                </Text>
              </View>
              {totalBudget > 0 && (
                <View style={{ backgroundColor: "rgba(0,0,0,0.14)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 10, color: colors.onPrimaryContainer, opacity: 0.8, fontWeight: "600" }}>
                    SAFE DAILY
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.onPrimaryContainer, fontWeight: "800", marginTop: 1 }}>
                    {maskCurrency(dailySafeToSpend)}/d
                  </Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.md }}>
              <View style={{ width: 48, height: 48, marginRight: spacing.md }}>
                <Svg width="48" height="48" viewBox="0 0 60 60">
                  <Circle
                    cx="30"
                    cy="30"
                    r={pieRadius}
                    stroke={colors.onPrimaryContainer}
                    strokeOpacity={0.2}
                    strokeWidth={pieStroke}
                    fill="none"
                  />
                  <Circle
                    cx="30"
                    cy="30"
                    r={pieRadius}
                    stroke={colors.onPrimaryContainer}
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
                <Text style={[typography.bodyMedium, { color: colors.onPrimaryContainer, opacity: 0.75 }]}>
                  vs. {maskCurrency(totalBudget)} Budget
                </Text>
                <Text style={[typography.label, { color: colors.onPrimaryContainer, opacity: 0.9, marginTop: 2 }]}>
                  {budgetPercentUsed}% Used • {daysLeftInPeriod}d left
                </Text>
              </View>
            </View>
          </View>


        </ScrollView>

        {/* Wallets & Accounts Strip */}
        <View style={{ marginBottom: spacing.xl }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: spacing.lg,
              marginBottom: spacing.sm,
            }}>
            <TouchableOpacity
              onPress={() =>
                (navigation as any).navigate("Settings", {
                  screen: "WalletManagement",
                })
              }
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text
                style={[
                  typography.h3,
                  {
                    color: colors.onBackground,
                    fontSize: 14,
                    textTransform: "uppercase",
                  },
                ]}>
                WALLETS & ACCOUNTS
              </Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={colors.onSurfaceVariant}
              />
            </TouchableOpacity>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TouchableOpacity
                onPress={() => setShowTransferModal(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: colors.surface,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 12,
                }}>
                <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
                  Transfer
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  (navigation as any).navigate("Settings", {
                    screen: "WalletManagement",
                  })
                }
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: colors.surface,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 12,
                }}>
                <Ionicons name="settings-outline" size={14} color={colors.primary} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
                  Manage
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              gap: spacing.sm,
            }}>
            {wallets.map((w) => {
              const bal = walletBalances[w.id] || 0;
              return (
                <TouchableOpacity
                  key={w.id}
                  onPress={() =>
                    (navigation as any).navigate("Settings", {
                      screen: "WalletManagement",
                    })
                  }
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    minWidth: 145,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}>
                  <IconChip
                    iconName={(w.icon || "wallet-outline") as any}
                    colorName={(w.color as any) || "teal"}
                    size={38}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: colors.onSurfaceVariant,
                      }}
                      numberOfLines={1}>
                      {w.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: colors.onBackground,
                        marginTop: 2,
                      }}
                      numberOfLines={1}>
                      {maskCurrency(bal)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

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
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={{ gap: 8, paddingRight: spacing.md }}>
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
            </ScrollView>

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
                <TouchableOpacity
                  key={tx.id}
                  onPress={() => handleTransactionPress(tx)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 4,
                  }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}>
                    <IconChip
                      iconName={((category as any)?.icon || "receipt-outline") as any}
                      colorName={(category?.color as any) || "bluegrey"}
                      size={44}
                      style={{ marginRight: 14 }}
                    />
                    <View style={{ flex: 1, justifyContent: "center", marginRight: 10 }}>
                      <Text
                        style={{ fontSize: 15, fontWeight: "600", color: colors.onBackground, marginBottom: 3 }}
                        numberOfLines={1}>
                        {tx.description || category?.name || "Transaction"}
                      </Text>
                      <Text
                        style={{ fontSize: 13, color: colors.onSurfaceVariant }}
                        numberOfLines={1}>
                        {category?.name || "Uncategorized"} • {formatDate(tx.date)}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end", justifyContent: "center" }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: isIncome ? colors.tertiary : colors.onBackground,
                      }}>
                      {maskCurrency(tx.amount, isIncome ? "+" : "-")}
                    </Text>
                  </View>
                </TouchableOpacity>
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

      {/* Wallet-to-Wallet Transfer Modal */}
      <Modal
        visible={showTransferModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTransferModal(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            padding: spacing.lg,
          }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 24,
              padding: spacing.lg,
            }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: spacing.md,
              }}>
              <Text style={[typography.h3, { color: colors.onBackground }]}>
                Transfer Between Wallets
              </Text>
              <TouchableOpacity onPress={() => setShowTransferModal(false)}>
                <Ionicons name="close" size={22} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: colors.onSurfaceVariant,
                marginBottom: 6,
              }}>
              FROM ACCOUNT
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, marginBottom: spacing.md }}>
              {wallets.map((w) => {
                const selected = w.id === fromWalletId;
                return (
                  <TouchableOpacity
                    key={`from_${w.id}`}
                    onPress={() => setFromWalletId(w.id)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 14,
                      backgroundColor: selected
                        ? colors.primary
                        : colors.background,
                    }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: selected ? "#FFFFFF" : colors.onBackground,
                      }}>
                      {w.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: colors.onSurfaceVariant,
                marginBottom: 6,
              }}>
              TO ACCOUNT
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, marginBottom: spacing.md }}>
              {wallets.map((w) => {
                const selected = w.id === toWalletId;
                return (
                  <TouchableOpacity
                    key={`to_${w.id}`}
                    onPress={() => setToWalletId(w.id)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 14,
                      backgroundColor: selected
                        ? colors.primary
                        : colors.background,
                    }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: selected ? "#FFFFFF" : colors.onBackground,
                      }}>
                      {w.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: colors.onSurfaceVariant,
                marginBottom: 6,
              }}>
              AMOUNT
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.background,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: colors.onBackground,
                fontSize: 16,
                fontWeight: "700",
                marginBottom: spacing.lg,
              }}
              value={transferAmount}
              onChangeText={setTransferAmount}
              placeholder="0.00"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="decimal-pad"
            />

            <TouchableOpacity
              onPress={handleTransferSubmit}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: "center",
              }}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>
                Confirm Transfer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


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
