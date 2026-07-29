import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../store";
import {
  Screen,
  Card,
  Button,
  useCustomAlert,
  useToast,
} from "../components/ui";
import { UI } from "../constants";
import {
  fetchTransactions,
  deleteTransaction,
  duplicateTransaction,
} from "../store/slices/transactionsSlice";
import { fetchCategories } from "../store/slices/categoriesSlice";
import { Transaction, TransactionType } from "../types";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";

type FilterPeriod = "all" | "month" | "year" | "custom";
type FilterType = "all" | "income" | "expense";

interface DateRange {
  start: Date;
  end: Date;
}

export const TransactionManagementScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: transactions, loading } = useSelector(
    (state: RootState) => state.transactions,
  );
  const { items: categories } = useSelector(
    (state: RootState) => state.categories,
  );
  const { showAlert, AlertComponent } = useCustomAlert();
  const { showSuccess, showError } = useToast();

  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("month");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    start: new Date(),
    end: new Date(),
  });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    dispatch(fetchTransactions());
    dispatch(fetchCategories());
  }, [dispatch]);

  const getFilteredTransactions = () => {
    const transactionList = Object.values(transactions || {});

    // Filter by type
    let filtered = transactionList;
    if (filterType !== "all") {
      filtered = filtered.filter((t) => t.type === filterType);
    }

    // Filter by period
    const now = new Date();
    let dateRange: DateRange;

    switch (filterPeriod) {
      case "month":
        dateRange = { start: startOfMonth(now), end: endOfMonth(now) };
        break;
      case "year":
        dateRange = { start: startOfYear(now), end: endOfYear(now) };
        break;
      case "custom":
        dateRange = customDateRange;
        break;
      default:
        return filtered; // "all" - no date filtering
    }

    return filtered.filter((t) => {
      const transactionDate = new Date(t.date);
      return (
        transactionDate >= dateRange.start && transactionDate <= dateRange.end
      );
    });
  };

  const filteredTransactions = getFilteredTransactions();

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
              showSuccess("Transaction deleted successfully");
            } catch (error) {
              showError("Failed to delete transaction");
            }
          },
        },
      ],
    );
  };

  const handleDuplicateTransaction = async (transaction: Transaction) => {
    try {
      await dispatch(duplicateTransaction(transaction.id)).unwrap();
      showSuccess("Transaction duplicated successfully");
    } catch (error) {
      showError("Failed to duplicate transaction");
    }
  };

  const handleCustomDateFilter = () => {
    if (!customStartDate || !customEndDate) {
      showAlert("Validation", "Please enter both start and end dates");
      return;
    }

    const start = new Date(customStartDate);
    const end = new Date(customEndDate);

    if (start > end) {
      showAlert("Validation", "Start date cannot be after end date");
      return;
    }

    setCustomDateRange({ start, end });
    setFilterPeriod("custom");
    setShowCustomDateModal(false);
    setShowFilterModal(false);
  };

  const getCategoryName = (categoryId: string) => {
    return categories[categoryId]?.name || "Unknown Category";
  };

  const formatAmount = (amount: number, type: TransactionType) => {
    const formatted = `$${amount.toFixed(2)}`;
    if (type === "income") return `+${formatted}`;
    if (type === "expense") return `-${formatted}`;
    return formatted;
  };

  const getAmountColor = (type: TransactionType) => {
    if (type === "income") return UI.COLORS.SUCCESS;
    if (type === "expense") return UI.COLORS.ERROR;
    return UI.COLORS.TEXT_PRIMARY;
  };

  const getTypeIcon = (type: TransactionType) => {
    switch (type) {
      case "income":
        return "trending-up";
      case "expense":
        return "trending-down";
      default:
        return "swap-horizontal";
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionLeft}>
        <View
          style={[
            styles.typeIcon,
            { backgroundColor: getAmountColor(item.type) + "20" },
          ]}>
          <Ionicons
            name={getTypeIcon(item.type)}
            size={20}
            color={getAmountColor(item.type)}
          />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.description}>{item.description}</Text>
          <Text style={styles.category}>
            {getCategoryName(item.categoryId)}
          </Text>
          <Text style={styles.date}>
            {format(new Date(item.date), "MMM dd, yyyy")}
          </Text>
        </View>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[styles.amount, { color: getAmountColor(item.type) }]}>
          {formatAmount(item.amount, item.type)}
        </Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDuplicateTransaction(item)}>
            <Ionicons name="copy" size={16} color={UI.COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteTransaction(item)}>
            <Ionicons name="trash" size={16} color={UI.COLORS.ERROR} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const FilterButton = ({
    label,
    isActive,
    onPress,
  }: {
    label: string;
    isActive: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.filterButton, isActive && styles.filterButtonActive]}
      onPress={onPress}>
      <Text
        style={[
          styles.filterButtonText,
          isActive && styles.filterButtonTextActive,
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const getSummary = () => {
    const income = filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    return { income, expenses, net: income - expenses };
  };

  const summary = getSummary();

  return (
    <LinearGradient
      colors={["#0a0a2e", "#1a1040", "#0d0d30"]}
      style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <View style={styles.header}>
          <Text style={styles.title}>Transactions</Text>
          <TouchableOpacity
            style={styles.filterIcon}
            onPress={() => setShowFilterModal(true)}>
            <Ionicons name="filter" size={24} color={UI.COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View
            style={[
              styles.summaryCard,
              { borderLeftColor: UI.COLORS.SUCCESS },
            ]}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryAmount, { color: UI.COLORS.SUCCESS }]}>
              +${summary.income.toFixed(2)}
            </Text>
          </View>
          <View
            style={[styles.summaryCard, { borderLeftColor: UI.COLORS.ERROR }]}>
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={[styles.summaryAmount, { color: UI.COLORS.ERROR }]}>
              -${summary.expenses.toFixed(2)}
            </Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              { borderLeftColor: UI.COLORS.TEXT_PRIMARY },
            ]}>
            <Text style={styles.summaryLabel}>Net</Text>
            <Text
              style={[
                styles.summaryAmount,
                {
                  color: summary.net >= 0 ? UI.COLORS.SUCCESS : UI.COLORS.ERROR,
                },
              ]}>
              ${summary.net.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Active Filters */}
        <View style={styles.activeFilters}>
          <Text style={styles.activeFiltersLabel}>
            Showing {filteredTransactions.length} transactions
          </Text>
          <Text style={styles.activeFiltersText}>
            {filterType !== "all" && `${filterType} • `}
            {filterPeriod === "month" && "This month"}
            {filterPeriod === "year" && "This year"}
            {filterPeriod === "custom" &&
              `${format(customDateRange.start, "MMM dd")} - ${format(customDateRange.end, "MMM dd")}`}
            {filterPeriod === "all" && "All time"}
          </Text>
        </View>

        <FlatList
          data={filteredTransactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => dispatch(fetchTransactions())}
              tintColor={UI.COLORS.PRIMARY}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt" size={48} color={UI.COLORS.TEXT_MUTED} />
              <Text style={styles.emptyStateText}>No transactions found</Text>
              <Text style={styles.emptyStateSubtext}>
                {filterType !== "all" || filterPeriod !== "all"
                  ? "Try adjusting your filters"
                  : "Start by adding your first transaction"}
              </Text>
            </View>
          }
        />

        {/* Filter Modal */}
        <Modal visible={showFilterModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter Transactions</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={UI.COLORS.TEXT_PRIMARY}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Transaction Type</Text>
                <View style={styles.filterButtonGroup}>
                  <FilterButton
                    label="All"
                    isActive={filterType === "all"}
                    onPress={() => setFilterType("all")}
                  />
                  <FilterButton
                    label="Income"
                    isActive={filterType === "income"}
                    onPress={() => setFilterType("income")}
                  />
                  <FilterButton
                    label="Expense"
                    isActive={filterType === "expense"}
                    onPress={() => setFilterType("expense")}
                  />
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Time Period</Text>
                <View style={styles.filterButtonGroup}>
                  <FilterButton
                    label="All Time"
                    isActive={filterPeriod === "all"}
                    onPress={() => setFilterPeriod("all")}
                  />
                  <FilterButton
                    label="This Month"
                    isActive={filterPeriod === "month"}
                    onPress={() => setFilterPeriod("month")}
                  />
                  <FilterButton
                    label="This Year"
                    isActive={filterPeriod === "year"}
                    onPress={() => setFilterPeriod("year")}
                  />
                  <FilterButton
                    label="Custom"
                    isActive={filterPeriod === "custom"}
                    onPress={() => setShowCustomDateModal(true)}
                  />
                </View>
              </View>
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
                  <Ionicons
                    name="close"
                    size={24}
                    color={UI.COLORS.TEXT_PRIMARY}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.dateInputContainer}>
                <Text style={styles.dateInputLabel}>
                  Start Date (YYYY-MM-DD)
                </Text>
                <TextInput
                  style={styles.dateInput}
                  value={customStartDate}
                  onChangeText={setCustomStartDate}
                  placeholder="2024-01-01"
                  placeholderTextColor={UI.COLORS.TEXT_MUTED}
                />
              </View>

              <View style={styles.dateInputContainer}>
                <Text style={styles.dateInputLabel}>End Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.dateInput}
                  value={customEndDate}
                  onChangeText={setCustomEndDate}
                  placeholder="2024-12-31"
                  placeholderTextColor={UI.COLORS.TEXT_MUTED}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowCustomDateModal(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleCustomDateFilter}>
                  <Text style={styles.saveButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <AlertComponent />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: UI.SPACING.LG,
    paddingTop: UI.SPACING.MD,
    paddingBottom: UI.SPACING.SM,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: UI.COLORS.TEXT_PRIMARY,
    letterSpacing: 0.3,
  },
  stickyHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 10,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: UI.COLORS.TEXT_PRIMARY,
    letterSpacing: 0.3,
    marginBottom: 16,
  },
  filterIcon: {
    padding: UI.SPACING.SM,
    borderRadius: UI.CARD_RADIUS,
    backgroundColor: UI.COLORS.SURFACE,
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: UI.SPACING.LG,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: UI.COLORS.CARD,
    borderRadius: UI.CARD_RADIUS,
    padding: UI.SPACING.MD,
    marginHorizontal: UI.SPACING.XS,
    borderLeftWidth: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
    marginBottom: UI.SPACING.XS,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: "600",
  },
  activeFilters: {
    marginBottom: UI.SPACING.MD,
  },
  activeFiltersLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  activeFiltersText: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  list: {
    flex: 1,
  },
  transactionCard: {
    flexDirection: "row",
    backgroundColor: UI.COLORS.CARD,
    borderRadius: UI.CARD_RADIUS,
    padding: UI.SPACING.MD,
    marginBottom: UI.SPACING.SM,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  transactionLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: UI.SPACING.SM,
  },
  transactionInfo: {
    flex: 1,
  },
  description: {
    fontSize: 16,
    fontWeight: "500",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  category: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
  },
  transactionRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  amount: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: UI.SPACING.XS,
  },
  actionButtons: {
    flexDirection: "row",
  },
  actionButton: {
    padding: UI.SPACING.XS,
    marginLeft: UI.SPACING.XS,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: UI.SPACING.XL * 2,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "500",
    color: UI.COLORS.TEXT_SECONDARY,
    marginTop: UI.SPACING.MD,
    marginBottom: UI.SPACING.SM,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: UI.COLORS.TEXT_MUTED,
    textAlign: "center",
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
  dateInputContainer: {
    marginBottom: UI.SPACING.MD,
  },
  dateInputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.SM,
  },
  dateInput: {
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
});
