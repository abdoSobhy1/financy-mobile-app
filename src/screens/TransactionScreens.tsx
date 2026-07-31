import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActionSheetIOS,
  Platform,
  StatusBar,
} from "react-native";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootState, AppDispatch } from "../store";
import {
  fetchTransactions,
  fetchTransactionStats,
  deleteTransaction,
  addTransaction,
} from "../store/slices/transactionsSlice";
import { fetchCategories } from "../store/slices/categoriesSlice";
import { fetchBudgets } from "../store/slices/budgetsSlice";
import {
  Screen,
  useCustomAlert,
  useToast,
  FloatingActionButton,
} from "../components/ui";
import {
  AdvancedFiltersModal,
  AdvancedFilters,
} from "../components/filters/AdvancedFiltersModal";
import { UI } from "../constants";
import { getCurrentBillingPeriod } from "../utils/billingPeriod";
import {
  Transaction,
  TransactionStackParamList,
  TransactionType,
  ParsedTransaction,
} from "../types";
import { VoiceInputButton, ParsedTransactionReview } from "../components/input";
import {
  TransactionCard,
  TransactionStatsHeader,
  TransactionFilterBar,
  TransactionFilterModal,
  CustomDateRangeModal,
  TransactionEmptyState,
} from "../components/transactions";
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

type TransactionListNavigationProp = StackNavigationProp<
  TransactionStackParamList,
  "TransactionList"
>;

type FilterPeriod = "all" | "month" | "year" | "custom";
type FilterType = "all" | "income" | "expense";

interface DateRange {
  start: Date;
  end: Date;
}

export const TransactionListScreen: React.FC = () => {
  const { colors, typography, spacing, radius } = useAppTheme();
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<TransactionListNavigationProp>();
  const { showAlert, AlertComponent } = useCustomAlert();
  const { showSuccess, showError } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("month");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    start: new Date(),
    end: new Date(),
  });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(
    undefined,
  );
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(
    undefined,
  );

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    transactionTypes: ["income", "expense", "debt"],
    categoryIds: [],
    excludeZeroAmounts: false,
    onlyRecentTransactions: false,
  });

  const [currentBillingPeriod, setCurrentBillingPeriod] =
    useState<DateRange | null>(null);

  const { items, ids, loading, stats } = useSelector(
    (state: RootState) => state.transactions,
  );
  const { items: categories } = useSelector(
    (state: RootState) => state.categories,
  );

  // ── Voice input state ──────────────────────────────────────────────
  const [voiceResults, setVoiceResults] = useState<ParsedTransaction[]>([]);
  const [showVoiceReview, setShowVoiceReview] = useState(false);

  const handleVoiceResult = useCallback((results: ParsedTransaction[]) => {
    setVoiceResults(results);
    setShowVoiceReview(true);
  }, []);

  const handleAcceptVoiceResults = useCallback(
    async (results: ParsedTransaction[]) => {
      setShowVoiceReview(false);
      setVoiceResults([]);
      try {
        for (const tx of results) {
          console.log("🎤 Saving voice transaction:", JSON.stringify(tx));
          await dispatch(
            addTransaction({
              amount: (tx.amount ?? 0).toString(),
              description: tx.description ?? "Voice transaction",
              type: tx.type ?? "expense",
              date: tx.date ?? new Date(),
              categoryId: tx.categoryId ?? "",
              budgetId: tx.budgetId,
            }),
          ).unwrap();
        }
        showSuccess(
          `${results.length} transaction${results.length > 1 ? "s" : ""} added!`,
        );
      } catch (error) {
        console.error("[Voice] Failed to add transactions:", error);
        showError("Failed to add transactions");
      }
    },
    [dispatch, showSuccess, showError],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 100);
    return () => clearTimeout(timer);
  }, [dispatch]);

  useFocusEffect(
    React.useCallback(() => {
      loadBillingPeriod();
      loadData();
    }, []),
  );

  const loadBillingPeriod = async () => {
    try {
      const period = await getCurrentBillingPeriod();
      setCurrentBillingPeriod({
        start: period.start,
        end: period.end,
      });
      // Default advanced filters to billing period
      setAdvancedFilters((prev) => ({
        ...prev,
        dateRange: prev.dateRange ?? { start: period.start, end: period.end },
      }));
    } catch (error) {
      console.error("Failed to load billing period:", error);
    }
  };

  const loadData = async () => {
    try {
      await Promise.all([
        dispatch(fetchTransactions()).unwrap(),
        dispatch(fetchTransactionStats()).unwrap(),
        dispatch(fetchCategories()).unwrap(),
        dispatch(fetchBudgets()).unwrap(),
      ]);
    } catch (error) {
      console.error("Failed to load transaction data:", error);
    }
  };

  // ── Filtering ──────────────────────────────────────────────────────
  const getFilteredTransactions = () => {
    let transactions = ids
      .map((id) => items[id])
      .filter((t): t is Transaction => t != null);

    // Advanced filters
    if (advancedFilters.transactionTypes.length < 3) {
      transactions = transactions.filter((t) =>
        advancedFilters.transactionTypes.includes(t.type),
      );
    }
    if (advancedFilters.categoryIds.length > 0) {
      transactions = transactions.filter((t) =>
        advancedFilters.categoryIds.includes(t.categoryId),
      );
    }
    if (advancedFilters.budgetId) {
      transactions = transactions.filter(
        (t) => t.budgetId === advancedFilters.budgetId,
      );
    }
    if (advancedFilters.noBudget) {
      transactions = transactions.filter(
        (t) => t.type !== "income" && !t.budgetId,
      );
    }
    if (advancedFilters.excludeZeroAmounts) {
      transactions = transactions.filter((t) => t.amount !== 0);
    }
    if (advancedFilters.amountRange) {
      const { min, max } = advancedFilters.amountRange;
      if (min !== undefined) {
        transactions = transactions.filter((t) => Math.abs(t.amount) >= min);
      }
      if (max !== undefined) {
        transactions = transactions.filter((t) => Math.abs(t.amount) <= max);
      }
    }
    if (advancedFilters.dateRange) {
      const start = advancedFilters.dateRange.start;
      const end = advancedFilters.dateRange.end;
      transactions = transactions.filter((t) => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
    }

    // Legacy filters
    if (filterType !== "all") {
      transactions = transactions.filter((t) => t.type === filterType);
    }

    if (filterPeriod !== "all") {
      const now = new Date();
      let start: Date;
      let end: Date;

      switch (filterPeriod) {
        case "month":
          if (currentBillingPeriod) {
            start = currentBillingPeriod.start;
            end = currentBillingPeriod.end;
          } else {
            start = startOfMonth(now);
            end = endOfMonth(now);
          }
          break;
        case "year":
          start = startOfYear(now);
          end = endOfYear(now);
          break;
        case "custom":
          start = customDateRange.start;
          end = customDateRange.end;
          break;
        default:
          return transactions;
      }

      transactions = transactions.filter((t) => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
    }

    return transactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  };

  const handleCustomDateFilter = () => {
    if (customStartDate && customEndDate) {
      setCustomDateRange({
        start: customStartDate,
        end: customEndDate,
      });
      setFilterPeriod("custom");
      setShowCustomDateModal(false);
      setShowFilterModal(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ── Transaction actions ────────────────────────────────────────────
  const handleTransactionPress = (transaction: Transaction) => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Edit", "Duplicate", "Delete"],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
          title: transaction.description,
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            case 1:
              handleEditTransaction(transaction);
              break;
            case 2:
              handleDuplicateTransaction(transaction);
              break;
            case 3:
              handleDeleteTransaction(transaction);
              break;
          }
        },
      );
    } else {
      showAlert(transaction.description, "What would you like to do?", [
        { text: "Edit", onPress: () => handleEditTransaction(transaction) },
        {
          text: "Duplicate",
          onPress: () => handleDuplicateTransaction(transaction),
        },
        {
          text: "Delete",
          onPress: () => handleDeleteTransaction(transaction),
          style: "destructive",
        },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
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
          note: transaction.note,
        }),
      ).unwrap();
      showSuccess("Transaction duplicated!");
    } catch (error) {
      showError("Failed to duplicate transaction");
    }
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    showAlert(
      "Delete Transaction",
      `Are you sure you want to delete "${transaction.description}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await dispatch(deleteTransaction(transaction.id)).unwrap();
              showSuccess("Transaction deleted");
            } catch (error) {
              showError("Failed to delete transaction");
            }
          },
        },
      ],
    );
  };

  // ── Computed values ────────────────────────────────────────────────
  const filteredTransactions = getFilteredTransactions();

  const getFilteredStats = () => {
    const totalIncome = filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
    };
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (advancedFilters.dateRange) count++;
    if (advancedFilters.transactionTypes.length < 3) count++;
    if (advancedFilters.budgetId) count++;
    if (advancedFilters.categoryIds.length > 0) count++;
    if (advancedFilters.excludeZeroAmounts) count++;
    if (advancedFilters.onlyRecentTransactions) count++;
    return count;
  };

  const navigateToAdd = () => navigation.navigate("AddTransaction", {});

  // ── Render ─────────────────────────────────────────────────────────
  const headerComponent = (
    <View style={styles.stickyHeader}>
      <TransactionStatsHeader
        stats={getFilteredStats()}
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        onAddTransaction={navigateToAdd}
      />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, padding: UI.SPACING.MD, backgroundColor: colors.background }} edges={["top"]}>
      <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />

        <Text style={styles.screenTitle}>Transactions</Text>
        <>
          {headerComponent}
          <TransactionFilterBar
            transactionCount={filteredTransactions.length}
            activeFilterCount={getActiveFilterCount()}
            onOpenFilters={() => setShowAdvancedFilters(true)}
          />
        </>
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TransactionCard
              transaction={item}
              category={categories[item.categoryId]}
              onPress={handleTransactionPress}
              onDuplicate={handleDuplicateTransaction}
              onDelete={handleDeleteTransaction}
            />
          )}
          ListEmptyComponent={
            !loading ? (
              <TransactionEmptyState onAddTransaction={navigateToAdd} />
            ) : null
          }
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={UI.COLORS.PRIMARY}
            />
          }
          showsVerticalScrollIndicator={false}
        />

        {/* Filter Modal */}
        <TransactionFilterModal
          visible={showFilterModal}
          filterType={filterType}
          filterPeriod={filterPeriod}
          onFilterTypeChange={setFilterType}
          onFilterPeriodChange={setFilterPeriod}
          onOpenCustomDate={() => setShowCustomDateModal(true)}
          onClose={() => setShowFilterModal(false)}
        />

        {/* Custom Date Range Modal */}
        <CustomDateRangeModal
          visible={showCustomDateModal}
          startDate={customStartDate}
          endDate={customEndDate}
          onStartDateChange={setCustomStartDate}
          onEndDateChange={setCustomEndDate}
          onApply={handleCustomDateFilter}
          onClose={() => setShowCustomDateModal(false)}
        />

        {/* Advanced Filters Modal */}
        <AdvancedFiltersModal
          visible={showAdvancedFilters}
          onClose={() => setShowAdvancedFilters(false)}
          onApply={(filters) => {
            setAdvancedFilters(filters);
            setFilterType("all");
            setFilterPeriod("all");
          }}
          currentFilters={advancedFilters}
        />

        <AlertComponent />

        <View style={{ bottom: 88, right: 20, position: "absolute", gap: 10 }}>
          <VoiceInputButton onResult={handleVoiceResult} />
          <FloatingActionButton icon="add" onPress={navigateToAdd} />
        </View>

        {voiceResults.length > 0 && (
          <ParsedTransactionReview
            parsed={voiceResults}
            visible={showVoiceReview}
            onAccept={handleAcceptVoiceResults}
            onDismiss={() => {
              setShowVoiceReview(false);
              setVoiceResults([]);
            }}
          />
        )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: UI.COLORS.TEXT_PRIMARY,
    letterSpacing: 0.3,
    marginBottom: 16,
  },
  stickyHeader: {
    backgroundColor: "transparent",
  },
});
