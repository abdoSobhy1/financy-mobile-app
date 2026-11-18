import { AlertService } from "../../../shared/services/AlertService";
import { useEffect, useState, useMemo, useCallback } from "react";
import { LayoutAnimation } from "react-native";

import { useDispatch, useSelector } from "react-redux";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootState, AppDispatch } from "../../../app/store";
import { fetchTransactions, deleteMultipleTransactions } from "../store/transactionsSlice";
import { fetchCategories } from "../../categories/store/categoriesSlice";
import { fetchBudgets } from "../../budgets/store/budgetsSlice";
import { fetchDebts } from "../../debts/store/debtsSlice";
import { fetchSettings } from "../../settings/store/settingsSlice";
import { Transaction, TransactionStackParamList, WalletAccount } from "../../../shared/types";
import { walletService } from "../../wallets/services/walletService";

import { useToast } from "../../../shared/ui";

import { useTransactionActions } from "./useTransactionActions";
import { getDateRangeForBillingPeriod, sumMoney } from "../../../shared/utils";
import { format, isToday, isYesterday, startOfDay, endOfDay, subDays, startOfYear, endOfYear } from "date-fns";

type NavigationProp = StackNavigationProp<
  TransactionStackParamList,
  "TransactionList"
>;

type TimeFilter =
  | "Today"
  | "This Month"
  | "Last Month"
  | "Year"
  | "All Time"
  | "custom";

type TypeFilter = "All" | "Income" | "Expense" | "Transfer";

/** Owns screen state and actions; rendering stays in TransactionListScreen. */
export function useTransactionListScreen() {

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NavigationProp>();
  const { handleTransactionPress } = useTransactionActions();

  const { items: transactionsMap, loading } = useSelector(
    (state: RootState) => state.transactions,
  );
  const { items: categories } = useSelector(
    (state: RootState) => state.categories,
  );
  const { data: settingsData } = useSelector(
    (state: RootState) => state.settings,
  );
  const { showSuccess, showError, showInfo } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("This Month");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedWalletIds, setSelectedWalletIds] = useState<Set<string>>(
    new Set(),
  );

  // Multi-select state
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState<boolean>(false);

  // Filter Modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  // Temporary state inside Modal
  const [tempTimeFilter, setTempTimeFilter] = useState<TimeFilter>(timeFilter);
  const [tempTypeFilter, setTempTypeFilter] = useState<TypeFilter>(typeFilter);
  const [tempCategoryIds, setTempCategoryIds] = useState<Set<string>>(
    new Set(),
  );
  const [tempBudgetIds, setTempBudgetIds] = useState<Set<string>>(
    new Set(),
  );
  const [tempWalletIds, setTempWalletIds] = useState<Set<string>>(
    new Set(),
  );

  // Custom Date Modal state
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date>(
    new Date(new Date().setMonth(new Date().getMonth() - 1)),
  );
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());

  // Temporary custom dates inside the modal
  const [tempCustomStartDate, setTempCustomStartDate] =
    useState<Date>(customStartDate);
  const [tempCustomEndDate, setTempCustomEndDate] =
    useState<Date>(customEndDate);
  const [wallets, setWallets] = useState<WalletAccount[]>(() =>
    walletService.getCachedWallets(),
  );
  const [secretWalletIds, setSecretWalletIds] = useState<Set<string>>(() =>
    walletService.getSecretWalletIds(walletService.getCachedWallets()),
  );

  const walletsMap = useMemo(() => {
    const map: Record<string, WalletAccount> = {};
    wallets.forEach((w) => {
      map[w.id] = w;
    });
    return map;
  }, [wallets]);

  const loadSecretWalletIds = async () => {
    try {
      const loadedWallets = await walletService.getWallets();
      setWallets(loadedWallets);
      setSecretWalletIds(walletService.getSecretWalletIds(loadedWallets));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    dispatch(fetchTransactions());
    dispatch(fetchCategories());
    dispatch(fetchBudgets());
    dispatch(fetchSettings());
    loadSecretWalletIds();
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchTransactions());
      dispatch(fetchBudgets());
      dispatch(fetchSettings());
      loadSecretWalletIds();
    }, [dispatch]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchTransactions()),
      dispatch(fetchBudgets()),
      dispatch(fetchSettings()),
      loadSecretWalletIds(),
    ]);
    setRefreshing(false);
  };

  const openFilterModal = () => {
    setTempTimeFilter(timeFilter);
    setTempTypeFilter(typeFilter);
    setTempCategoryIds(new Set(selectedCategoryIds));
    setTempBudgetIds(new Set(selectedBudgetIds));
    setTempWalletIds(new Set(selectedWalletIds));
    setShowFilterModal(true);
  };

  const applyModalFilters = () => {
    setTimeFilter(tempTimeFilter);
    setTypeFilter(tempTypeFilter);
    setSelectedCategoryIds(new Set(tempCategoryIds));
    setSelectedBudgetIds(new Set(tempBudgetIds));
    setSelectedWalletIds(new Set(tempWalletIds));
    setShowFilterModal(false);
  };

  const resetModalFilters = () => {
    setTempTimeFilter("This Month");
    setTempTypeFilter("All");
    setTempCategoryIds(new Set());
    setTempBudgetIds(new Set());
    setTempWalletIds(new Set());
  };

  const toggleCategorySelection = (catId: string) => {
    setTempCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  const toggleBudgetSelection = (budgetId: string) => {
    setTempBudgetIds((prev) => {
      const next = new Set(prev);
      if (next.has(budgetId)) {
        next.delete(budgetId);
      } else {
        next.add(budgetId);
      }
      return next;
    });
  };

  const toggleWalletSelection = (walletId: string) => {
    setTempWalletIds((prev) => {
      const next = new Set(prev);
      if (next.has(walletId)) {
        next.delete(walletId);
      } else {
        next.add(walletId);
      }
      return next;
    });
  };

  const transactions = useMemo(
    () => Object.values(transactionsMap || {}).filter((t) => !t.deleted),
    [transactionsMap],
  );

  const isWalletReconciliation = useCallback((t: Transaction) => {
    return (
      t.description === "Balance adjustment" ||
      t.description?.toLowerCase().includes("balance adjustment") ||
      t.description?.toLowerCase().includes("reconcil") ||
      (t as any).category === "Adjustment"
    );
  }, []);

  const isExcludedFromCalculations = useCallback(
    (t: Transaction) => {
      if (walletService.isSecretTransactionExcluded(t, secretWalletIds)) return true;
      if (isWalletReconciliation(t)) return true;
      if (t.type === "transfer") return true;
      return false;
    },
    [secretWalletIds, isWalletReconciliation],
  );

  const toggleSelectTx = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    const billingStartDay = settingsData?.billingPeriodStartDay ?? 1;

    if (timeFilter === "Today") {
      startDate = startOfDay(now);
      endDate = endOfDay(now);
    } else if (timeFilter === "This Month") {
      const currentPeriod = getDateRangeForBillingPeriod(billingStartDay, now);
      startDate = currentPeriod.start;
      endDate = currentPeriod.end;
    } else if (timeFilter === "Last Month") {
      const currentPeriod = getDateRangeForBillingPeriod(billingStartDay, now);
      const prevPeriodEnd = subDays(currentPeriod.start, 1);
      const prevPeriod = getDateRangeForBillingPeriod(billingStartDay, prevPeriodEnd);
      startDate = prevPeriod.start;
      endDate = prevPeriod.end;
    } else if (timeFilter === "Year") {
      startDate = startOfYear(now);
      endDate = endOfYear(now);
    } else if (timeFilter === "custom") {
      startDate = new Date(customStartDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // "All Time" - no date bounds
      startDate = undefined;
      endDate = undefined;
    }

    return transactions
      .filter((t) => {
        if (!startDate || !endDate) return true;
        const d = new Date(t.date);
        return d >= startDate && d <= endDate;
      })
      .filter((t) => {
        if (typeFilter === "All") return true;
        return typeFilter.toLowerCase() === t.type;
      })
      .filter((t) => {
        if (selectedCategoryIds.size === 0) return true;
        return t.categoryId && selectedCategoryIds.has(t.categoryId);
      })
      .filter((t) => {
        if (selectedBudgetIds.size === 0) return true;
        if (selectedBudgetIds.has("unbudgeted") && !t.budgetId) return true;
        if (t.budgetId && selectedBudgetIds.has(t.budgetId)) return true;
        return false;
      })
      .filter((t) => {
        if (selectedWalletIds.size === 0) return true;
        return (
          (t.accountId && selectedWalletIds.has(t.accountId)) ||
          (t.toAccountId && selectedWalletIds.has(t.toAccountId))
        );
      })
      .filter((t) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const desc = (t.description || "").toLowerCase();
        const catName = (
          (t.categoryId ? categories[t.categoryId]?.name : "") || ""
        ).toLowerCase();
        return desc.includes(query) || catName.includes(query);
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [
    transactions,
    timeFilter,
    typeFilter,
    selectedCategoryIds,
    selectedBudgetIds,
    selectedWalletIds,
    searchQuery,
    categories,
    settingsData?.billingPeriodStartDay,
    customStartDate,
    customEndDate,
  ]);

  const handleSelectAll = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (selectedTxIds.size === filteredTransactions.length && filteredTransactions.length > 0) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(filteredTransactions.map((t) => t.id)));
    }
  }, [selectedTxIds.size, filteredTransactions]);

  const handleLongPressTx = useCallback((tx: Transaction) => {
    if (!isSelectionMode) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsSelectionMode(true);
      setSelectedTxIds(new Set([tx.id]));
    }
  }, [isSelectionMode]);

  const exitSelectionMode = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSelectionMode(false);
    setSelectedTxIds(new Set());
  }, []);

  const handleMassDelete = useCallback(() => {
    if (selectedTxIds.size === 0) {
      showInfo("No transactions selected");
      return;
    }

    const count = selectedTxIds.size;
    AlertService.alert(
      "Delete Transactions",
      `Are you sure you want to delete ${count} selected ${count === 1 ? "transaction" : "transactions"}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeletingBulk(true);
              const idsArray = Array.from(selectedTxIds);
              await dispatch(deleteMultipleTransactions(idsArray)).unwrap();
              dispatch(fetchBudgets());
              dispatch(fetchDebts());
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setSelectedTxIds(new Set());
              setIsSelectionMode(false);
              showSuccess(`Deleted ${count} ${count === 1 ? "transaction" : "transactions"}`);
            } catch (err: any) {
              console.error("Failed to delete transactions:", err);
              showError("Failed to delete selected transactions");
            } finally {
              setIsDeletingBulk(false);
            }
          },
        },
      ],
    );
  }, [selectedTxIds, dispatch, showSuccess, showError, showInfo]);

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[]; } = {};
    filteredTransactions.forEach((t) => {
      const d = new Date(t.date);
      let title = "";
      if (isToday(d)) title = `TODAY, ${format(d, "MMM d").toUpperCase()}`;
      else if (isYesterday(d))
        title = `YESTERDAY, ${format(d, "MMM d").toUpperCase()}`;
      else title = format(d, "MMM d, yyyy").toUpperCase();

      if (!groups[title]) groups[title] = [];
      groups[title].push(t);
    });

    return Object.keys(groups).map((title) => {
      const data = groups[title];
      const dailyTotal = sumMoney(data, (t) => {
        if (isExcludedFromCalculations(t)) return 0;
        if (t.type === "income") return t.amount;
        if (t.type === "expense") return -t.amount;
        return 0;
      });

      return {
        title,
        dailyTotal,
        // Wrap array in a single group object so we render a continuous card per date
        data: [{ id: title, items: data }],
      };
    });
  }, [filteredTransactions, isExcludedFromCalculations]);

  const totalAmount = useMemo(() => {
    return sumMoney(filteredTransactions, (t) => {
      if (isExcludedFromCalculations(t)) return 0;
      return t.type === "income" ? t.amount : -t.amount;
    });
  }, [filteredTransactions, isExcludedFromCalculations]);

  const allCategoriesList = useMemo(
    () => Object.values(categories).filter((c) => c && !c.deleted),
    [categories],
  );
  return {
    navigation,
    handleTransactionPress,
    loading,
    categories,
    refreshing,
    searchQuery,
    setSearchQuery,
    timeFilter,
    setTimeFilter,
    typeFilter,
    setTypeFilter,
    selectedCategoryIds,
    selectedBudgetIds,
    selectedWalletIds,
    isSelectionMode,
    selectedTxIds,
    isDeletingBulk,
    showFilterModal,
    setShowFilterModal,
    tempTimeFilter,
    setTempTimeFilter,
    tempTypeFilter,
    setTempTypeFilter,
    tempCategoryIds,
    tempBudgetIds,
    tempWalletIds,
    showCustomDateModal,
    setShowCustomDateModal,
    setCustomStartDate,
    setCustomEndDate,
    tempCustomStartDate,
    setTempCustomStartDate,
    tempCustomEndDate,
    setTempCustomEndDate,
    wallets,
    secretWalletIds,
    walletsMap,
    handleRefresh,
    openFilterModal,
    applyModalFilters,
    resetModalFilters,
    toggleCategorySelection,
    toggleBudgetSelection,
    toggleWalletSelection,
    isWalletReconciliation,
    toggleSelectTx,
    filteredTransactions,
    handleSelectAll,
    handleLongPressTx,
    exitSelectionMode,
    handleMassDelete,
    groupedTransactions,
    totalAmount
  };
}

export type TransactionListScreenController = ReturnType<typeof useTransactionListScreen>;
