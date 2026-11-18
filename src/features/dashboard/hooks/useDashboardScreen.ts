import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSelector, useDispatch } from "react-redux";
import { Dimensions } from "react-native";
import { subDays } from "date-fns";

import { RootState, AppDispatch } from "../../../app/store";
import { Transaction, WalletAccount, ParsedTransaction } from "../../../shared/types";
import {
  formatCurrency,
  getDateRangeForBillingPeriod,
  parseMoneyInput,
} from "../../../shared/utils";
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
import { computeDashboardMetrics, QuickAddSlot } from "../model/dashboardMetrics";

type DashboardNavigationProp = StackNavigationProp<any, "Dashboard">;

interface BillingRangeState {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
}

function computeBillingRange(billingStartDay: number): BillingRangeState {
  const now = new Date();
  const current = getDateRangeForBillingPeriod(billingStartDay, now);
  const previous = getDateRangeForBillingPeriod(billingStartDay, subDays(current.start, 1));
  return {
    start: current.start,
    end: current.end,
    prevStart: previous.start,
    prevEnd: previous.end,
  };
}

/** Owns screen state and actions; rendering stays in DashboardScreen. */
export function useDashboardScreen() {
  const navigation = useNavigation<DashboardNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { handleTransactionPress } = useTransactionActions();
  const { showSuccess, showError, showInfo } = useToast();

  const transactionsMap = useSelector((state: RootState) => state.transactions.items);
  const categoriesMap = useSelector((state: RootState) => state.categories.items);
  const budgetsMap = useSelector((state: RootState) => state.budgets.items);
  const billingPeriodStartDay = useSelector(
    (state: RootState) => state.settings.data?.billingPeriodStartDay ?? 1,
  );

  const billingRange = useMemo(
    () => computeBillingRange(billingPeriodStartDay),
    [billingPeriodStartDay],
  );
  const [wallets, setWallets] = useState<WalletAccount[]>(() =>
    walletService.getCachedWallets(),
  );
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [hideBalances, setHideBalances] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAddWalletModal, setShowAddWalletModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [fromWalletId, setFromWalletId] = useState<string>("default_cash");
  const [toWalletId, setToWalletId] = useState<string>("default_bank");

  // Reactive derived state from Redux + Wallets + Billing Period
  const allTransactions = useMemo(
    () => Object.values(transactionsMap).filter((t) => !t.deleted),
    [transactionsMap],
  );

  const visibleWallets = useMemo(
    () => getVisibleWallets(wallets.length > 0 ? wallets : walletService.getCachedWallets()),
    [wallets],
  );

  const walletBalances = useMemo(
    () => walletService.calculateWalletBalances(wallets, allTransactions),
    [wallets, allTransactions],
  );

  const daysLeftInPeriod = useMemo(
    () => Math.max(1, Math.ceil((billingRange.end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
    [billingRange.end],
  );

  const metrics = useMemo(() => {
    const secretWalletIds = walletService.getSecretWalletIds(wallets);
    return computeDashboardMetrics({
      allTransactions,
      budgetsMap,
      categoriesMap,
      secretWalletIds,
      start: billingRange.start,
      end: billingRange.end,
      prevStart: billingRange.prevStart,
      prevEnd: billingRange.prevEnd,
    });
  }, [allTransactions, budgetsMap, categoriesMap, wallets, billingRange]);

  const syncDefaultTransferPair = useCallback((walletList: WalletAccount[]) => {
    const nextVisible = walletService.getVisibleWallets(walletList);
    if (nextVisible.length >= 2) {
      setFromWalletId((prev) =>
        nextVisible.some((w) => w.id === prev) ? prev : nextVisible[0].id,
      );
      setToWalletId((prev) =>
        nextVisible.some((w) => w.id === prev) ? prev : nextVisible[1].id,
      );
    } else if (nextVisible.length === 1) {
      setFromWalletId(nextVisible[0].id);
      setToWalletId(nextVisible[0].id);
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem("dashboardHideBalances")
      .then((val) => {
        if (val === "true") setHideBalances(true);
      })
      .catch(() => {});
  }, []);

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

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const refreshOnFocus = async () => {
        try {
          dispatch(fetchTransactions());
          dispatch(fetchCategories());
          dispatch(fetchBudgets());
          const loadedWallets = await walletService.getWallets();

          if (!isActive) return;
          setWallets(loadedWallets);
          syncDefaultTransferPair(loadedWallets);
        } catch (error) {
          console.error("Failed to load dashboard data:", error);
        }
      };

      refreshOnFocus();

      return () => {
        isActive = false;
      };
    }, [dispatch, syncDefaultTransferPair]),
  );

  const toggleHideBalances = useCallback(async () => {
    setHideBalances((prev) => {
      const next = !prev;
      AsyncStorage.setItem("dashboardHideBalances", next ? "true" : "false").catch(() => {});
      return next;
    });
  }, []);

  const maskCurrency = useCallback(
    (amount: number, prefix: string = "") => {
      if (hideBalances) return "••••••";
      return `${prefix}${formatCurrency(amount)}`;
    },
    [hideBalances],
  );

  const handleDismissAlert = useCallback(async (budgetId: string) => {
    try {
      setDismissedAlertIds((prev) => {
        const nextIds = Array.from(new Set([...prev, budgetId]));
        const today = new Date().toDateString();
        AsyncStorage.setItem(
          "overspendingAlertDismissed",
          JSON.stringify({ date: today, ids: nextIds }),
        ).catch(() => {});
        return nextIds;
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleScanComplete = useCallback(
    (ocrResult: OcrReceiptResult, assetUri: string) => {
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
    },
    [navigation],
  );

  const handleQuickAddPress = useCallback(
    async (slot: QuickAddSlot) => {
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
    },
    [dispatch, navigation],
  );

  const handleMorePress = useCallback(() => {
    navigation.navigate("AddTransaction", {});
  }, [navigation]);

  const openAddWalletModal = useCallback(() => {
    setShowAddWalletModal(true);
  }, []);

  const isCreatingWalletRef = useRef(false);

  const handleCreateWalletSubmit = useCallback(
    async (values: WalletEditorFormValues) => {
      if (isCreatingWalletRef.current) return;
      const trimmedName = values.name.trim();
      if (!trimmedName) {
        showError("Please enter an account name");
        return;
      }
      isCreatingWalletRef.current = true;
      const initBal = parseMoneyInput(values.initialBalance);
      try {
        const updatedWallets = await walletService.addWallet({
          name: trimmedName,
          type: values.type,
          icon: values.icon,
          color: values.color,
          initialBalance: initBal,
          isSecret: values.isSecret,
        });
        await dispatch(fetchTransactions());
        setWallets(updatedWallets);
        syncDefaultTransferPair(updatedWallets);
        setShowAddWalletModal(false);
        showSuccess(`Created "${trimmedName}"`);
      } catch (error) {
        console.error("[DashboardScreen] Failed to create account:", error);
        showError("Failed to create account");
      } finally {
        isCreatingWalletRef.current = false;
      }
    },
    [dispatch, showError, showSuccess, syncDefaultTransferPair],
  );

  const handleOpenTransferModal = useCallback(
    (initialFrom?: string) => {
      const currentVisibleWallets = walletService.getVisibleWallets(wallets);
      if (currentVisibleWallets.length < 2) {
        showInfo("Please create another account first to make transfers.");
        return;
      }
      if (initialFrom) setFromWalletId(initialFrom);
      setShowTransferModal(true);
    },
    [wallets, showInfo],
  );

  const handleTransferSuccess = useCallback(async () => {
    const freshWallets = await walletService.getWallets();
    setWallets(freshWallets);
  }, []);

  const { width: SCREEN_WIDTH } = Dimensions.get("window");

  return {
    handleTransferSuccess,
    navigation,
    handleTransactionPress,
    categoriesMap,
    totalIncome: metrics.totalIncome,
    totalExpenses: metrics.totalExpenses,
    budgetedExpenses: metrics.budgetedExpenses,
    balance: metrics.balance,
    balanceChangePct: metrics.balanceChangePct,
    totalBudget: metrics.totalBudget,
    daysLeftInPeriod,
    balanceHistory: metrics.balanceHistory,
    quickAddSlots: metrics.quickAddSlots,
    recentTransactions: metrics.recentTransactions,
    overspentBudgets: metrics.overspentBudgets,
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
