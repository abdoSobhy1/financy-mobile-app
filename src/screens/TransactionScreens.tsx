import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActionSheetIOS, Platform, Modal, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootState, AppDispatch } from "../store";
import { fetchTransactions, fetchTransactionStats, deleteTransaction, addTransaction } from "../store/slices/transactionsSlice";
import { fetchCategories } from "../store/slices/categoriesSlice";
import { fetchBudgets } from "../store/slices/budgetsSlice";
import { Screen, Card, Button, useCustomAlert, useToast, FloatingActionButton, CustomDatePicker } from "../components/ui";
import { AdvancedFiltersModal, AdvancedFilters } from "../components/filters/AdvancedFiltersModal";
import { UI } from "../constants";
import { formatCurrency, formatDate } from "../utils";
import { getCurrentBillingPeriod } from "../utils/billingPeriod";
import { Transaction, TransactionStackParamList, TransactionType } from "../types";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

type TransactionListNavigationProp = StackNavigationProp<TransactionStackParamList, "TransactionList">;

type FilterPeriod = "all" | "month" | "year" | "custom";
type FilterType = "all" | "income" | "expense";

interface DateRange {
  start: Date;
  end: Date;
}

export const TransactionListScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<TransactionListNavigationProp>();
  const { showAlert, AlertComponent } = useCustomAlert();
  const { showSuccess, showError } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("month");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    start: new Date(),
    end: new Date(),
  });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    transactionTypes: ["income", "expense", "debt"],
    categoryIds: [],
    excludeZeroAmounts: false,
    onlyRecentTransactions: false,
  });

  const [currentBillingPeriod, setCurrentBillingPeriod] = useState<DateRange | null>(null);

  const { items, ids, loading, stats } = useSelector((state: RootState) => state.transactions);
  const { items: categories } = useSelector((state: RootState) => state.categories);

  useEffect(() => {
    // Add a small delay to ensure database is fully initialized
    const timer = setTimeout(() => {
      loadData();
    }, 100);

    return () => clearTimeout(timer);
  }, [dispatch]);

  // Reload billing period when screen comes into focus (in case settings changed)
  useFocusEffect(
    React.useCallback(() => {
      loadBillingPeriod();
    }, [])
  );

  const loadBillingPeriod = async () => {
    try {
      const billingPeriod = await getCurrentBillingPeriod();
      setCurrentBillingPeriod(billingPeriod);
      console.log("Billing period loaded:", billingPeriod);
    } catch (error) {
      console.error("Failed to load billing period:", error);
    }
  };

  const loadData = async () => {
    try {
      console.log("Loading transaction data...");

      const transactionResult = await dispatch(fetchTransactions()).unwrap();
      console.log("Transactions loaded:", transactionResult.length);

      const categoriesResult = await dispatch(fetchCategories()).unwrap();
      console.log("Categories loaded:", categoriesResult.length);

      const budgetsResult = await dispatch(fetchBudgets()).unwrap();
      console.log("Budgets loaded:", budgetsResult.length);

      const statsResult = await dispatch(fetchTransactionStats()).unwrap();
      console.log("Transaction stats loaded:", statsResult);

      // Load billing period for date filtering
      await loadBillingPeriod();

      console.log("Transaction data loading completed successfully");
    } catch (error) {
      console.error("Failed to load data:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      // Don't throw - let the UI handle gracefully
    }
  };

  const getFilteredTransactions = () => {
    let transactionList = ids.map((id) => items[id]).filter(Boolean);

    // Apply advanced filters

    // 1. Transaction type filter
    if (advancedFilters.transactionTypes.length < 3) {
      transactionList = transactionList.filter((t) => advancedFilters.transactionTypes.includes(t.type));
    }

    // 2. Date range filter
    if (advancedFilters.dateRange) {
      transactionList = transactionList.filter((t) => {
        const transactionDate = new Date(t.date);
        return transactionDate >= advancedFilters.dateRange!.start && transactionDate <= advancedFilters.dateRange!.end;
      });
    }

    // 3. Budget filter
    if (advancedFilters.budgetId) {
      transactionList = transactionList.filter((t) => t.budgetId === advancedFilters.budgetId);
    }

    // 4. Category filter
    if (advancedFilters.categoryIds.length > 0) {
      transactionList = transactionList.filter((t) => advancedFilters.categoryIds.includes(t.categoryId));
    }

    // 5. Exclude zero amounts filter
    if (advancedFilters.excludeZeroAmounts) {
      transactionList = transactionList.filter((t) => t.amount !== 0);
    }

    // 6. Recent transactions only filter (last 90 days)
    if (advancedFilters.onlyRecentTransactions) {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      transactionList = transactionList.filter((t) => new Date(t.date) >= ninetyDaysAgo);
    }

    // Legacy filters for backward compatibility (will be removed after migration)
    if (filterType !== "all") {
      transactionList = transactionList.filter((t) => t.type === filterType);
    }

    // Legacy date period filter
    if (filterPeriod !== "all") {
      const now = new Date();
      let dateRange: DateRange;

      switch (filterPeriod) {
        case "month":
          // Use billing period instead of calendar month
          if (currentBillingPeriod) {
            dateRange = currentBillingPeriod;
          } else {
            // Fallback to calendar month if billing period not loaded
            dateRange = { start: startOfMonth(now), end: endOfMonth(now) };
          }
          break;
        case "year":
          dateRange = { start: startOfYear(now), end: endOfYear(now) };
          break;
        case "custom":
          dateRange = customDateRange;
          break;
        default:
          return transactionList;
      }

      transactionList = transactionList.filter((t) => {
        const transactionDate = new Date(t.date);
        return transactionDate >= dateRange.start && transactionDate <= dateRange.end;
      });
    }

    return transactionList;
  };

  const handleCustomDateFilter = () => {
    if (!customStartDate || !customEndDate) {
      showAlert("Validation", "Please select both start and end dates");
      return;
    }

    if (customStartDate > customEndDate) {
      showAlert("Validation", "Start date cannot be after end date");
      return;
    }

    setCustomDateRange({ start: customStartDate, end: customEndDate });
    setFilterPeriod("custom");
    setShowCustomDateModal(false);
    setShowFilterModal(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleTransactionPress = (transaction: Transaction) => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Edit", "Duplicate", "Delete"],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
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
        }
      );
    } else {
      showAlert("Transaction Actions", "Choose an action:", [
        { text: "Cancel", style: "cancel" },
        { text: "Edit", onPress: () => handleEditTransaction(transaction) },
        { text: "Duplicate", onPress: () => handleDuplicateTransaction(transaction) },
        { text: "Delete", style: "destructive", onPress: () => handleDeleteTransaction(transaction) },
      ]);
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    // Navigate to edit screen with pre-filled data
    navigation.navigate("AddTransaction", { editTransaction: transaction });
  };

  const handleDuplicateTransaction = async (transaction: Transaction) => {
    try {
      const duplicatedTransaction = {
        amount: transaction.amount.toString(),
        description: `${transaction.description} (Copy)`,
        categoryId: transaction.categoryId,
        budgetId: transaction.budgetId,
        type: transaction.type,
        date: new Date(),
      };

      await dispatch(addTransaction(duplicatedTransaction)).unwrap();
      showAlert("Success", "Transaction duplicated successfully");
    } catch (error) {
      showAlert("Error", "Failed to duplicate transaction");
    }
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    showAlert("Delete Transaction", `Are you sure you want to delete "${transaction.description}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await dispatch(deleteTransaction(transaction.id)).unwrap();
            showSuccess("Transaction deleted successfully");
          } catch (error) {
            showError("Failed to delete transaction");
          }
        },
      },
    ]);
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const category = categories[item.categoryId];

    if (!item) return null;

    return (
      <Card style={styles.transactionCard} onPress={() => handleTransactionPress(item)}>
        <View style={styles.transactionRow}>
          <View style={styles.transactionIcon}>
            <Ionicons
              name={item.type === "income" ? "trending-up" : "trending-down"}
              size={24}
              color={item.type === "income" ? UI.COLORS.SUCCESS : UI.COLORS.ERROR}
            />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionDescription}>{item.description}</Text>
            <Text style={styles.transactionCategory}>{category?.name || "Unknown Category"}</Text>
            <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.transactionRight}>
            <View style={styles.transactionAmount}>
              <Text style={[styles.amountText, item.type === "income" ? styles.incomeAmount : styles.expenseAmount]}>
                {item.type === "income" ? "+" : "-"}
                {formatCurrency(item.amount)}
              </Text>
              <Text style={styles.transactionType}>{item.type.toUpperCase()}</Text>
            </View>
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickActionButton} onPress={() => handleDuplicateTransaction(item)}>
                <Ionicons name="copy" size={16} color={UI.COLORS.TEXT_SECONDARY} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionButton} onPress={() => handleDeleteTransaction(item)}>
                <Ionicons name="trash" size={16} color={UI.COLORS.ERROR} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  const getFilteredStats = () => {
    const filtered = getFilteredTransactions();
    const totalIncome = filtered.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = filtered.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
    };
  };

  const renderHeader = () => {
    const filteredStats = getFilteredStats();

    return (
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>

        <Card variant="blur" style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Income</Text>
              <Text style={[styles.statValue, styles.incomeAmount]}>{formatCurrency(filteredStats.totalIncome)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Expenses</Text>
              <Text style={[styles.statValue, styles.expenseAmount]}>{formatCurrency(filteredStats.totalExpenses)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Balance</Text>
              <Text style={[styles.statValue, filteredStats.balance >= 0 ? styles.incomeAmount : styles.expenseAmount]}>
                {formatCurrency(filteredStats.balance)}
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.actionButtonsContainer}>
          <Button
            title="Add Transaction"
            onPress={() => navigation.navigate("AddTransaction", {})}
            style={StyleSheet.flatten([styles.addButton, styles.primaryButton])}
            icon="add-circle"
            iconPosition="left"
          />
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No Transactions Yet</Text>
      <Text style={styles.emptyMessage}>Start tracking your finances by adding your first transaction</Text>
      <Button
        title="Add Your First Transaction"
        onPress={() => navigation.navigate("AddTransaction", {})}
        style={styles.emptyButton}
        icon="add-circle"
        iconPosition="left"
      />
    </View>
  );

  const filteredTransactions = getFilteredTransactions();

  const FilterButton = ({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) => (
    <TouchableOpacity style={[styles.filterButton, isActive && styles.filterButtonActive]} onPress={onPress}>
      <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderFilterHeader = () => {
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

    const activeFiltersCount = getActiveFilterCount();

    return (
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Showing {filteredTransactions.length} transactions</Text>
          <TouchableOpacity
            style={[styles.filterIconButton, activeFiltersCount > 0 && styles.activeFilterButton]}
            onPress={() => setShowAdvancedFilters(true)}>
            <Ionicons name="filter" size={20} color={UI.COLORS.TEXT_PRIMARY} />
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        {activeFiltersCount > 0 && (
          <Text style={styles.filterInfo}>
            {activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""} active
          </Text>
        )}
      </View>
    );
  };

  return (
    <Screen>
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        ListHeaderComponent={() => (
          <>
            {renderHeader()}
            {renderFilterHeader()}
          </>
        )}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={UI.COLORS.PRIMARY} />}
        showsVerticalScrollIndicator={false}
      />

      {/* Filter Modal */}
      <Modal visible={showFilterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Transactions</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={UI.COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Transaction Type</Text>
              <View style={styles.filterButtonGroup}>
                <FilterButton label="All" isActive={filterType === "all"} onPress={() => setFilterType("all")} />
                <FilterButton label="Income" isActive={filterType === "income"} onPress={() => setFilterType("income")} />
                <FilterButton label="Expense" isActive={filterType === "expense"} onPress={() => setFilterType("expense")} />
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Time Period</Text>
              <View style={styles.filterButtonGroup}>
                <FilterButton label="All Time" isActive={filterPeriod === "all"} onPress={() => setFilterPeriod("all")} />
                <FilterButton label="This Month" isActive={filterPeriod === "month"} onPress={() => setFilterPeriod("month")} />
                <FilterButton label="This Year" isActive={filterPeriod === "year"} onPress={() => setFilterPeriod("year")} />
                <FilterButton label="Custom" isActive={filterPeriod === "custom"} onPress={() => setShowCustomDateModal(true)} />
              </View>
            </View>

            <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilterModal(false)}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Date Range Modal */}
      <Modal visible={showCustomDateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Custom Date Range</Text>
              <TouchableOpacity onPress={() => setShowCustomDateModal(false)}>
                <Ionicons name="close" size={24} color={UI.COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <CustomDatePicker
                value={customStartDate}
                onDateChange={setCustomStartDate}
                label="Start Date"
                placeholder="Select start date"
                style={styles.datePicker}
              />
            </View>

            <View style={styles.inputContainer}>
              <CustomDatePicker
                value={customEndDate}
                onDateChange={setCustomEndDate}
                label="End Date"
                placeholder="Select end date"
                style={styles.datePicker}
                minimumDate={customStartDate} // Ensure end date is after start date
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCustomDateModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleCustomDateFilter}>
                <Text style={styles.saveButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Advanced Filters Modal */}
      <AdvancedFiltersModal
        visible={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        onApply={(filters) => {
          setAdvancedFilters(filters);
          // Clear legacy filters when using advanced filters
          setFilterType("all");
          setFilterPeriod("all");
        }}
        currentFilters={advancedFilters}
      />

      <AlertComponent />

      <FloatingActionButton icon="add" onPress={() => navigation.navigate("AddTransaction", {})} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: UI.SPACING.MD,
  },
  header: {
    marginBottom: UI.SPACING.LG,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.MD,
  },
  statsCard: {
    marginBottom: UI.SPACING.MD,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
    textTransform: "uppercase",
    marginBottom: UI.SPACING.XS,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  addButton: {
    marginVertical: UI.SPACING.SM,
  },
  transactionCard: {
    marginBottom: UI.SPACING.SM,
  },
  transactionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  transactionIcon: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: UI.SPACING.SM,
  },
  transactionInfo: {
    flex: 1,
    marginRight: UI.SPACING.MD,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  transactionCategory: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    marginBottom: UI.SPACING.XS,
  },
  transactionDate: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
  },
  transactionAmount: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: UI.SPACING.XS,
  },
  incomeAmount: {
    color: UI.COLORS.SUCCESS,
  },
  expenseAmount: {
    color: UI.COLORS.ERROR,
  },
  transactionType: {
    fontSize: 10,
    color: UI.COLORS.TEXT_MUTED,
    textTransform: "uppercase",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.SM,
  },
  emptyMessage: {
    fontSize: 16,
    color: UI.COLORS.TEXT_SECONDARY,
    textAlign: "center",
    marginBottom: UI.SPACING.LG,
    paddingHorizontal: UI.SPACING.LG,
  },
  emptyButton: {
    minWidth: 200,
  },
  transactionRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  quickActions: {
    flexDirection: "row",
    marginTop: UI.SPACING.XS,
  },
  quickActionButton: {
    padding: UI.SPACING.XS,
    marginLeft: UI.SPACING.XS,
  },
  filterContainer: {
    marginBottom: UI.SPACING.MD,
    paddingHorizontal: UI.SPACING.MD,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: UI.SPACING.XS,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  filterInfo: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
  },
  filterIconButton: {
    padding: UI.SPACING.SM,
    borderRadius: UI.CARD_RADIUS,
    backgroundColor: UI.COLORS.SURFACE,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: UI.COLORS.BACKGROUND,
    borderTopLeftRadius: UI.CARD_RADIUS * 2,
    borderTopRightRadius: UI.CARD_RADIUS * 2,
    padding: UI.SPACING.LG,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: UI.SPACING.LG,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  filterSection: {
    marginBottom: UI.SPACING.LG,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.MD,
  },
  filterButtonGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: UI.SPACING.SM,
  },
  filterButton: {
    paddingHorizontal: UI.SPACING.MD,
    paddingVertical: UI.SPACING.SM,
    borderRadius: UI.CARD_RADIUS,
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  filterButtonActive: {
    backgroundColor: UI.COLORS.PRIMARY,
    borderColor: UI.COLORS.PRIMARY,
  },
  filterButtonText: {
    fontSize: 14,
    color: UI.COLORS.TEXT_PRIMARY,
  },
  filterButtonTextActive: {
    color: UI.COLORS.TEXT_PRIMARY,
    fontWeight: "500",
  },
  applyButton: {
    backgroundColor: UI.COLORS.PRIMARY,
    borderRadius: UI.CARD_RADIUS,
    paddingVertical: UI.SPACING.MD,
    alignItems: "center",
    marginTop: UI.SPACING.MD,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  inputContainer: {
    marginBottom: UI.SPACING.MD,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.SM,
  },
  input: {
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    borderRadius: UI.CARD_RADIUS,
    padding: UI.SPACING.MD,
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    backgroundColor: UI.COLORS.SURFACE,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: UI.SPACING.LG,
    gap: UI.SPACING.MD,
  },
  cancelButton: {
    paddingHorizontal: UI.SPACING.LG,
    paddingVertical: UI.SPACING.MD,
    borderRadius: UI.CARD_RADIUS,
    backgroundColor: UI.COLORS.SURFACE,
  },
  cancelButtonText: {
    fontSize: 16,
    color: UI.COLORS.TEXT_SECONDARY,
  },
  saveButton: {
    paddingHorizontal: UI.SPACING.LG,
    paddingVertical: UI.SPACING.MD,
    borderRadius: UI.CARD_RADIUS,
    backgroundColor: UI.COLORS.PRIMARY,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: UI.SPACING.MD,
    marginTop: UI.SPACING.MD,
  },
  primaryButton: {
    flex: 1,
  },
  datePicker: {
    marginBottom: UI.SPACING.SM,
  },
  activeFilterButton: {
    backgroundColor: UI.COLORS.PRIMARY + "20",
    borderColor: UI.COLORS.PRIMARY,
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: UI.COLORS.PRIMARY,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: UI.COLORS.BACKGROUND,
  },
});

export const AddTransactionScreen: React.FC = () => {
  return (
    <Screen>
      <Text style={{ color: "white", fontSize: 24, textAlign: "center", marginTop: 50 }}>Add Transaction Screen</Text>
    </Screen>
  );
};

export const EditTransactionScreen: React.FC = () => {
  return (
    <Screen>
      <Text style={{ color: "white", fontSize: 24, textAlign: "center", marginTop: 50 }}>Edit Transaction Screen</Text>
    </Screen>
  );
};
