import { useState, useCallback, useEffect, useRef } from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSelector, useDispatch } from "react-redux";

import { Dimensions } from "react-native";

import { RootState, AppDispatch } from "../../../app/store";
import { Transaction, Category, WalletAccount } from "../../../shared/types";
import { getCurrentBillingPeriod, getPreviousBillingPeriod } from "../../budgets/utils/billingPeriod";
import { formatCurrency } from "../../../shared/utils";

import { ParsedTransaction } from "../../../shared/types";
import { useToast } from "../../../shared/ui";

import type { WalletEditorFormValues } from "../../wallets/components/WalletEditorModal";

import { addCategory, fetchCategories } from "../../categories/store/categoriesSlice";
import { fetchTransactions } from "../../transactions/store/transactionsSlice";
import { fetchBudgets } from "../../budgets/store/budgetsSlice";
import { useTransactionActions } from "../../transactions/hooks/useTransactionActions";
import { walletService } from "../../wallets/services/walletService";
import { getVisibleWallets } from "../../wallets/model/walletVisibility";

import { OcrReceiptResult } from "../../receipts/services/ocrService";
import { prefetchOcrQuota } from "../../receipts/services/ocrRateLimitService";

type DashboardNavigationProp = StackNavigationProp<any, "Dashboard">;

interface QuickAddSlot {
  id: string;
  name: string;
  colorName?: string;
  isFallback: boolean;
  iconName: string;
}

/** Owns screen state and actions; rendering stays in DashboardScreen. */
export function useDashboardScreen() {

  const navigation = useNavigation<DashboardNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { handleTransactionPress } = useTransactionActions();
  const { showSuccess, showError, showInfo } = useToast();

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
  const [overspentBudgets, setOverspentBudgets] = useState<
    { id: string; name: string; excess: number; spent: number; amount: number; }[]
  >([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

  const [hideBalances, setHideBalances] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);

  // Multi-Wallet State
  const [wallets, setWallets] = useState<WalletAccount[]>(() =>
    walletService.getCachedWallets()
  );
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({});
  const visibleWallets = getVisibleWallets(
    wallets.length > 0 ? wallets : walletService.getCachedWallets(),
  );
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAddWalletModal, setShowAddWalletModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [fromWalletId, setFromWalletId] = useState<string>("default_cash");
  const [toWalletId, setToWalletId] = useState<string>("default_bank");

  useEffect(() => {
    dispatch(fetchTransactions());
    dispatch(fetchCategories());
    dispatch(fetchBudgets());
    AsyncStorage.getItem("dashboardHideBalances")
      .then((val) => {
        if (val === "true") setHideBalances(true);
      })
      .catch(() => { });
  }, [dispatch]);

  const toggleHideBalances = async () => {
    const next = !hideBalances;
    setHideBalances(next);
    try {
      await AsyncStorage.setItem("dashboardHideBalances", next ? "true" : "false");
    } catch { }
  };

  const maskCurrency = (amount: number, prefix: string = "") => {
    if (hideBalances) return "••••••";
    return `${prefix}${formatCurrency(amount)}`;
  };

  useEffect(() => {
    const checkDismissedAlerts = async () => {
      try {
        const stored = await AsyncStorage.getItem("overspendingAlertDismissed");
        const today = new Date().toDateString();
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.date === today && Array.isArray(parsed.ids)) {
            setDismissedAlertIds(parsed.ids);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkDismissedAlerts();
    // Pre-warm OCR quota in the background so opening the scan modal & camera never blocks the UI
    prefetchOcrQuota();
  }, []);

  const handleDismissAlert = async (budgetId: string) => {
    try {
      const nextIds = Array.from(new Set([...dismissedAlertIds, budgetId]));
      setDismissedAlertIds(nextIds);
      const today = new Date().toDateString();
      await AsyncStorage.setItem(
        "overspendingAlertDismissed",
        JSON.stringify({ date: today, ids: nextIds })
      );
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadDashboardData = async () => {
        try {
          const fetchResult = await dispatch(fetchTransactions()).unwrap();
          const { start, end } = await getCurrentBillingPeriod();
          if (!isActive) return;

          const daysRemaining = Math.max(
            1,
            Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          );
          setDaysLeftInPeriod(daysRemaining);

          const allTransactions: Transaction[] = (
            Array.isArray(fetchResult)
              ? fetchResult
              : Object.values(fetchResult || {})
          ).filter((t: any) => !t.deleted) as Transaction[];

          // Load Wallets & Compute Live Balances (Current Period Values)
          const loadedWallets = await walletService.getWallets();
          const secretWalletIds = walletService.getSecretWalletIds(loadedWallets);
          const fallbackWallet =
            loadedWallets.find((w) => !walletService.isSecretWallet(w)) ||
            loadedWallets[0];
          const fallbackWalletId = fallbackWallet?.id || "default_cash";

          // 1. Transactions in current billing period
          const periodTxs = allTransactions.filter((t) => {
            const d = new Date(t.date);
            return d >= start && d <= end;
          });

          if (isActive) {
            setWallets(loadedWallets);
            // Wallets show actual account balances:
            const computedBalances = walletService.calculateWalletBalances(
              loadedWallets,
              allTransactions,
            );
            setWalletBalances(computedBalances);
            const visibleWallets = walletService.getVisibleWallets(loadedWallets);
            if (visibleWallets.length >= 2) {
              setFromWalletId((prev) =>
                visibleWallets.some((w) => w.id === prev) ? prev : visibleWallets[0].id,
              );
              setToWalletId((prev) =>
                visibleWallets.some((w) => w.id === prev) ? prev : visibleWallets[1].id,
              );
            } else if (visibleWallets.length === 1) {
              setFromWalletId(visibleWallets[0].id);
              setToWalletId(visibleWallets[0].id);
            }
          }

          const isSecretExcluded = (t: Transaction) =>
            walletService.isSecretTransactionExcluded(t, secretWalletIds);
          const isAdjustment = (t: Transaction) =>
            t.description === "Balance adjustment";

          // Filter out secret wallet transactions from totals (unless they had a budget)
          const publicPeriodTxs = periodTxs.filter((t) => !isSecretExcluded(t));

          const income = publicPeriodTxs
            .filter((t) => t.type === "income" && !isAdjustment(t))
            .reduce((sum, t) => sum + t.amount, 0);
          const expenses = publicPeriodTxs
            .filter(
              (t) =>
                !isAdjustment(t) &&
                (t.type === "expense" || (t.type === "transfer" && Boolean(t.budgetId))),
            )
            .reduce((sum, t) => sum + t.amount, 0);
          // Only count transactions that are assigned to a budget
          const budgeted = publicPeriodTxs
            .filter(
              (t) =>
                !isAdjustment(t) &&
                Boolean(t.budgetId) &&
                (t.type === "expense" || t.type === "transfer"),
            )
            .reduce((sum, t) => sum + t.amount, 0);

          setTotalIncome(income);
          setTotalExpenses(expenses);
          setBudgetedExpenses(budgeted);
          const currentBalance = income - expenses;
          // Net balance ONLY shows current period value:
          setBalance(currentBalance);

          // Calculate previous period balance (excluding secret wallet and adjustments)
          const { start: prevStart, end: prevEnd } = await getPreviousBillingPeriod();
          const prevPeriodTxs = allTransactions.filter((t) => {
            const d = new Date(t.date);
            return d >= prevStart && d <= prevEnd;
          });
          const prevPublicPeriodTxs = prevPeriodTxs.filter((t) => !isSecretExcluded(t));
          const prevIncome = prevPublicPeriodTxs
            .filter((t) => t.type === "income" && !isAdjustment(t))
            .reduce((sum, t) => sum + t.amount, 0);
          const prevExpenses = prevPublicPeriodTxs
            .filter(
              (t) =>
                !isAdjustment(t) &&
                (t.type === "expense" || (t.type === "transfer" && Boolean(t.budgetId))),
            )
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

          // Calculate overspent budgets for in-app banners AND phone notifications
          const overspent: {
            id: string;
            name: string;
            excess: number;
            spent: number;
            amount: number;
          }[] = [];
          activeBudgets.forEach((b) => {
            if (b.alertsEnabled !== false && b.amount > 0) {
              const spent = publicPeriodTxs
                .filter(
                  (t) =>
                    (t.budgetId === b.id ||
                      (Boolean(b.categoryId) && t.categoryId === b.categoryId)) &&
                    (t.type === "expense" ||
                      (t.type === "transfer" && t.budgetId === b.id)) &&
                    !isAdjustment(t),
                )
                .reduce((sum, t) => sum + t.amount, 0);
              if (spent > b.amount) {
                overspent.push({
                  id: b.id,
                  name: b.name,
                  excess: spent - b.amount,
                  spent,
                  amount: b.amount,
                });
              }
            }
          });
          setOverspentBudgets(overspent);

          // Calculate balance history for graph (tracks period progression from 0 to currentBalance)
          const sortedPeriodTxs = [...publicPeriodTxs]
            .filter(
              (t) =>
                !isAdjustment(t) &&
                (t.type !== "transfer" || Boolean(t.budgetId)),
            )
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          let runningBalance = 0;
          const history = [0];
          sortedPeriodTxs.forEach((t) => {
            if (t.type === "income") {
              runningBalance += t.amount;
              history.push(runningBalance);
            } else if (
              t.type === "expense" ||
              (t.type === "transfer" && Boolean(t.budgetId))
            ) {
              runningBalance -= t.amount;
              history.push(runningBalance);
            }
          });
          if (history.length < 2) history.push(runningBalance);
          setBalanceHistory(history);

          // 2. Recent transactions preview (exclude secret transactions without a budget)
          const nonSecretTransactions = allTransactions.filter((t) => !isSecretExcluded(t));
          const sortedRecent = [...nonSecretTransactions]
            .sort(
              (a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime() ||
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )
            .slice(0, 5);
          setRecentTransactions(sortedRecent);

          // 3. Compute ranked quick add categories (exclude secret transactions)
          const topSlots = computeTopExpenseCategories(
            nonSecretTransactions,
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
    }, [dispatch, categoriesMap, budgetsMap]),
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

  const handleScanComplete = (ocrResult: OcrReceiptResult, assetUri: string) => {
    const parsedItems: ParsedTransaction[] =
      ocrResult.items && ocrResult.items.length > 0
        ? ocrResult.items.map((it) => ({
          amount: it.price,
          type: ocrResult.type || "expense",
          description:
            it.quantity && it.quantity > 1
              ? `${it.quantity}x ${it.name}`
              : it.name,
          date: ocrResult.date || new Date(),
          note: ocrResult.description
            ? `From: ${ocrResult.description}`
            : undefined,
          confidence: 0.9,
          rawText: `${it.name} ${it.price}`,
          categoryId: it.categoryId || ocrResult.categoryId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        }))
        : ocrResult.amount
          ? [
            {
              amount: ocrResult.amount,
              type: ocrResult.type || "expense",
              description: ocrResult.description || "Receipt Purchase",
              date: ocrResult.date || new Date(),
              confidence: ocrResult.confidence || 0.8,
              rawText: ocrResult.rawText?.slice(0, 50) || "",
              categoryId: ocrResult.categoryId,
            },
          ]
          : [];

    navigation.navigate("VoiceVerify", {
      parsedTransactions: parsedItems.map((item) => ({
        ...item,
        date: item.date?.toISOString(),
      })),
      source: "ocr",
      receiptSummary: {
        merchant: ocrResult.description,
        type: ocrResult.type || "expense",
        totalAmount: ocrResult.amount,
        itemsSum: ocrResult.itemsSum,
        discount: ocrResult.discount,
        date: ocrResult.date?.toISOString(),
        unrecognizedLines: ocrResult.debugReport?.unrecognizedLines,
      },
      rawText: ocrResult.rawText,
      imageUri: assetUri,
    });
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

  const openAddWalletModal = () => {
    setShowAddWalletModal(true);
  };

  const isCreatingWalletRef = useRef(false);

  const handleCreateWalletSubmit = async (values: WalletEditorFormValues) => {
    if (isCreatingWalletRef.current) return;
    if (!values.name.trim()) {
      showError("Please enter an account name");
      return;
    }
    isCreatingWalletRef.current = true;
    const initBal = parseFloat(values.initialBalance.replace(/,/g, "")) || 0;
    try {
      const updatedWallets = await walletService.addWallet({
        name: values.name.trim(),
        type: values.type,
        icon: values.icon,
        color: values.color,
        initialBalance: initBal,
        isSecret: values.isSecret,
      });
      const fetchResult = await dispatch(fetchTransactions()).unwrap();
      const allTransactions: Transaction[] = (
        Array.isArray(fetchResult)
          ? fetchResult
          : Object.values(fetchResult || {})
      ).filter((t: any) => !t.deleted) as Transaction[];
      setWallets(updatedWallets);
      setWalletBalances(
        walletService.calculateWalletBalances(updatedWallets, allTransactions),
      );
      const secretWalletIds = walletService.getSecretWalletIds(updatedWallets);
      const isSecretExcluded = (t: Transaction) =>
        walletService.isSecretTransactionExcluded(t, secretWalletIds);
      const nonSecretTransactions = allTransactions.filter(
        (t) => !isSecretExcluded(t),
      );
      const sortedRecent = [...nonSecretTransactions]
        .sort(
          (a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime() ||
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 5);
      setRecentTransactions(sortedRecent);
      setShowAddWalletModal(false);
      showSuccess(`Created "${values.name.trim()}"`);
    } catch (error) {
      console.error("[DashboardScreen] Failed to create account:", error);
      showError("Failed to create account");
    } finally {
      isCreatingWalletRef.current = false;
    }
  };

  const handleOpenTransferModal = (initialFrom?: string) => {
    const visibleWallets = walletService.getVisibleWallets(wallets);
    if (visibleWallets.length < 2) {
      showInfo("Please create another account first to make transfers.");
      return;
    }
    if (initialFrom) setFromWalletId(initialFrom);
    setShowTransferModal(true);
  };

  const { width: SCREEN_WIDTH } = Dimensions.get("window");
  const handleTransferSuccess = async () => {
    const freshWallets = await walletService.getWallets();
    const allTransactions = Object.values(transactions).filter((t) => !t.deleted);
    setWallets(freshWallets);
    setWalletBalances(
      walletService.calculateWalletBalances(freshWallets, allTransactions),
    );
  };

  return {
    handleTransferSuccess,
    navigation,
    handleTransactionPress,
    categoriesMap,
    totalIncome,
    totalExpenses,
    budgetedExpenses,
    balance,
    balanceChangePct,
    totalBudget,
    daysLeftInPeriod,
    balanceHistory,
    quickAddSlots,
    recentTransactions,
    overspentBudgets,
    dismissedAlertIds,
    hideBalances,
    activeCardIndex,
    setActiveCardIndex,
    wallets,
    visibleWallets,
    walletBalances,
    showTransferModal,
    setShowTransferModal,
    showAddWalletModal,
    setShowAddWalletModal,
    showScanModal,
    setShowScanModal,
    fromWalletId,
    toWalletId,
    toggleHideBalances,
    maskCurrency,
    handleDismissAlert,
    handleScanComplete,
    handleQuickAddPress,
    handleMorePress,
    openAddWalletModal,
    handleCreateWalletSubmit,
    handleOpenTransferModal,
    SCREEN_WIDTH
  };
}
