import { useState, useCallback, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSelector, useDispatch } from "react-redux";
import { Dimensions } from "react-native";

import { RootState, AppDispatch } from "../../../app/store";
import { Transaction, WalletAccount, ParsedTransaction } from "../../../shared/types";
import { getCurrentBillingPeriod, getPreviousBillingPeriod } from "../../budgets/utils/billingPeriod";
import { formatCurrency, parseMoneyInput } from "../../../shared/utils";
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
import {
  computeDashboardMetrics,
  OverspentBudgetAlert,
  QuickAddSlot,
} from "../model/dashboardMetrics";

type DashboardNavigationProp = StackNavigationProp<any, "Dashboard">;

/** Owns screen state and actions; rendering stays in DashboardScreen. */
export function useDashboardScreen() {
  const navigation = useNavigation<DashboardNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { handleTransactionPress } = useTransactionActions();
  const { showSuccess, showError, showInfo } = useToast();

  const transactions = useSelector((state: RootState) => state.transactions.items);
  const categoriesMap = useSelector((state: RootState) => state.categories.items);
  const budgetsMap = useSelector((state: RootState) => state.budgets.items);

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
  const [overspentBudgets, setOverspentBudgets] = useState<OverspentBudgetAlert[]>([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

  const [hideBalances, setHideBalances] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);

  const [wallets, setWallets] = useState<WalletAccount[]>(() =>
    walletService.getCachedWallets(),
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
    prefetchOcrQuota();
  }, []);

  const handleDismissAlert = async (budgetId: string) => {
    try {
      const nextIds = Array.from(new Set([...dismissedAlertIds, budgetId]));
      setDismissedAlertIds(nextIds);
      const today = new Date().toDateString();
      await AsyncStorage.setItem(
        "overspendingAlertDismissed",
        JSON.stringify({ date: today, ids: nextIds }),
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
          const [{ start, end }, { start: prevStart, end: prevEnd }] =
            await Promise.all([
              getCurrentBillingPeriod(),
              getPreviousBillingPeriod(),
            ]);
          if (!isActive) return;

          const daysRemaining = Math.max(
            1,
            Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          );
          setDaysLeftInPeriod(daysRemaining);

          const allTransactions: Transaction[] = (
            Array.isArray(fetchResult)
              ? fetchResult
              : Object.values(fetchResult || {})
          ).filter((t: any) => !t.deleted) as Transaction[];

          const loadedWallets = await walletService.getWallets();
          const secretWalletIds = walletService.getSecretWalletIds(loadedWallets);

          if (!isActive) return;
          setWallets(loadedWallets);
          setWalletBalances(
            walletService.calculateWalletBalances(loadedWallets, allTransactions),
          );
          const nextVisibleWallets = walletService.getVisibleWallets(loadedWallets);
          if (nextVisibleWallets.length >= 2) {
            setFromWalletId((prev) =>
              nextVisibleWallets.some((w) => w.id === prev)
                ? prev
                : nextVisibleWallets[0].id,
            );
            setToWalletId((prev) =>
              nextVisibleWallets.some((w) => w.id === prev)
                ? prev
                : nextVisibleWallets[1].id,
            );
          } else if (nextVisibleWallets.length === 1) {
            setFromWalletId(nextVisibleWallets[0].id);
            setToWalletId(nextVisibleWallets[0].id);
          }

          const metrics = computeDashboardMetrics({
            allTransactions,
            budgetsMap,
            categoriesMap,
            secretWalletIds,
            start,
            end,
            prevStart,
            prevEnd,
          });

          setTotalIncome(metrics.totalIncome);
          setTotalExpenses(metrics.totalExpenses);
          setBudgetedExpenses(metrics.budgetedExpenses);
          setBalance(metrics.balance);
          setBalanceChangePct(metrics.balanceChangePct);
          setTotalBudget(metrics.totalBudget);
          setOverspentBudgets(metrics.overspentBudgets);
          setBalanceHistory(metrics.balanceHistory);
          setRecentTransactions(metrics.recentTransactions);
          setQuickAddSlots(metrics.quickAddSlots);
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
    const initBal = parseMoneyInput(values.initialBalance);
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
      const nonSecretTransactions = allTransactions.filter(
        (t) => !walletService.isSecretTransactionExcluded(t, secretWalletIds),
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
    const currentVisibleWallets = walletService.getVisibleWallets(wallets);
    if (currentVisibleWallets.length < 2) {
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
    SCREEN_WIDTH,
  };
}

export type DashboardScreenController = ReturnType<typeof useDashboardScreen>;
