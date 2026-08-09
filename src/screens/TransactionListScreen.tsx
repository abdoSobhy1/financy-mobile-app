import { AlertService } from "../services/AlertService";
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Platform,
  ActionSheetIOS,
  Alert,
  ScrollView,
  TextInput,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootState, AppDispatch } from "../store";
import {
  fetchTransactions,
  deleteTransaction,
  duplicateTransaction,
} from "../store/slices/transactionsSlice";
import { fetchCategories } from "../store/slices/categoriesSlice";
import { fetchBudgets } from "../store/slices/budgetsSlice";
import { Transaction, TransactionStackParamList } from "../types";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { useTabBarHeight } from "../components/ui";
import { AppHeader } from "../components/ui/AppHeader";

import { formatCurrency } from "../utils";
import {
  format,
  isToday,
  isYesterday,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
} from "date-fns";
import {
  CustomDateRangeModal,
  TransactionFilterModal,
} from "../components/transactions";

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
type TypeFilter = "All" | "Income" | "Expense";

export const TransactionListScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NavigationProp>();
  const { colors, typography, spacing, radius } = useAppTheme();
  const tabBarHeight = useTabBarHeight();

  const { items: transactionsMap, loading } = useSelector(
    (state: RootState) => state.transactions,
  );
  const { items: categories } = useSelector(
    (state: RootState) => state.categories,
  );

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

  useEffect(() => {
    dispatch(fetchTransactions());
    dispatch(fetchCategories());
    dispatch(fetchBudgets());
  }, [dispatch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchTransactions());
    await dispatch(fetchBudgets());
    setRefreshing(false);
  };

  const openFilterModal = () => {
    setTempTimeFilter(timeFilter);
    setTempTypeFilter(typeFilter);
    setTempCategoryIds(new Set(selectedCategoryIds));
    setTempBudgetIds(new Set(selectedBudgetIds));
    setShowFilterModal(true);
  };

  const applyModalFilters = () => {
    setTimeFilter(tempTimeFilter);
    setTypeFilter(tempTypeFilter);
    setSelectedCategoryIds(new Set(tempCategoryIds));
    setSelectedBudgetIds(new Set(tempBudgetIds));
    setShowFilterModal(false);
  };

  const resetModalFilters = () => {
    setTempTimeFilter("This Month");
    setTempTypeFilter("All");
    setTempCategoryIds(new Set());
    setTempBudgetIds(new Set());
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

  const transactions = useMemo(
    () => Object.values(transactionsMap || {}).filter((t) => !t.deleted),
    [transactionsMap],
  );

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (timeFilter === "Today") {
      startDate = startOfDay(now);
      endDate = endOfDay(now);
    } else if (timeFilter === "This Month") {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else if (timeFilter === "Last Month") {
      const lastMonth = subMonths(now, 1);
      startDate = startOfMonth(lastMonth);
      endDate = endOfMonth(lastMonth);
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
        if (t.budgetId && selectedBudgetIds.has(t.budgetId)) return true;
        return false;
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
    searchQuery,
    categories,
  ]);

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
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
      const dailyTotal = data.reduce((sum, t) => {
        return t.type === "income" ? sum + t.amount : sum - t.amount;
      }, 0);

      return {
        title,
        dailyTotal,
        // Wrap array in a single group object so we render a continuous card per date
        data: [{ id: title, items: data }],
      };
    });
  }, [filteredTransactions]);

  const handleTransactionPress = (transaction: Transaction) => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Edit", "Duplicate", "Delete"],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
          title: transaction.description || "Transaction",
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleEdit(transaction);
          if (buttonIndex === 2) handleDuplicate(transaction);
          if (buttonIndex === 3) handleDelete(transaction);
        },
      );
    } else {
      AlertService.alert(
        transaction.description || "Transaction",
        "What would you like to do?",
        [
          { text: "Edit", onPress: () => handleEdit(transaction) },
          { text: "Duplicate", onPress: () => handleDuplicate(transaction) },
          {
            text: "Delete",
            onPress: () => handleDelete(transaction),
            style: "destructive",
          },
          { text: "Cancel", style: "cancel" },
        ],
      );
    }
  };

  const handleEdit = (transaction: Transaction) => {
    navigation.navigate("AddTransaction" as any, {
      editTransaction: transaction,
    });
  };

  const handleDuplicate = async (transaction: Transaction) => {
    try {
      await dispatch(duplicateTransaction(transaction.id)).unwrap();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (transaction: Transaction) => {
    AlertService.alert(
      "Delete",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await dispatch(deleteTransaction(transaction.id)).unwrap();
            } catch (error) {
              console.error(error);
            }
          },
        },
      ],
    );
  };

  const allCategoriesList = useMemo(
    () => Object.values(categories).filter((c) => c && !c.deleted),
    [categories],
  );

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}>
      <StatusBar barStyle="light-content" />

      {/* Standard App Header */}
      <AppHeader title="Transactions" />

      <View style={styles.topContainer}>
        {/* Search Bar & Filter */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons
              name="search"
              size={20}
              color={colors.onSurfaceVariant}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search transactions..."
              placeholderTextColor={colors.onSurfaceVariant}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={openFilterModal}>
            <Ionicons
              name="options-outline"
              size={24}
              color={colors.onBackground}
            />
            {(selectedCategoryIds.size > 0 || selectedBudgetIds.size > 0) && (
              <View
                style={[
                  styles.filterBadge,
                  { backgroundColor: colors.primaryContainer },
                ]}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Segmented Control for Transaction Type (All | Income | Expense) */}
        <View style={styles.segmentedControl}>
          {(["All", "Income", "Expense"] as const).map((t) => {
            const isActive = typeFilter === t;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
                onPress={() => setTypeFilter(t)}
                activeOpacity={0.8}>
                <Text
                  style={[
                    styles.segmentText,
                    isActive && styles.segmentTextActive,
                  ]}>
                  {t}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Horizontal Time Filter Chips (This Month | Last Month | Year | All Time) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeFiltersScroll}>
          {(
            ["This Month", "Last Month", "Year", "All Time"] as TimeFilter[]
          ).map((tf) => {
            const isActive = timeFilter === tf;
            return (
              <TouchableOpacity
                key={tf}
                style={[styles.timeChip, isActive && styles.timeChipActive]}
                onPress={() => setTimeFilter(tf)}
                activeOpacity={0.8}>
                <Text
                  style={[
                    styles.timeChipText,
                    isActive && styles.timeChipTextActive,
                  ]}>
                  {tf}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Transaction Groups List */}
      <SectionList
        sections={groupedTransactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderTitle}>{section.title}</Text>
            <Text
              style={[
                styles.sectionHeaderTotal,
                section.dailyTotal > 0 && { color: colors.tertiary },
              ]}>
              {section.dailyTotal >= 0 ? "+" : "-"}
              {formatCurrency(Math.abs(section.dailyTotal))}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.cardGroupContainer}>
            {item.items.map((tx, idx) => {
              const cat = tx.categoryId ? categories[tx.categoryId] : null;
              const isIncome = tx.type === "income";
              const isLast = idx === item.items.length - 1;

              return (
                <View key={tx.id}>
                  <TouchableOpacity
                    style={styles.txRow}
                    onPress={() => handleTransactionPress(tx)}
                    activeOpacity={0.7}>
                    <View
                      style={[
                        styles.iconBadge,
                        {
                          backgroundColor:
                            (cat?.color || colors.primary) + "20",
                        },
                      ]}>
                      <Ionicons
                        name={
                          (((cat as any)?.icon as any) ||
                            "receipt-outline") as any
                        }
                        size={22}
                        color={cat?.color || colors.primary}
                      />
                    </View>

                    <View style={styles.txCenterCol}>
                      <Text style={styles.txTitleText} numberOfLines={1}>
                        {tx.description || cat?.name || "Transaction"}
                      </Text>
                      <Text style={styles.txSubtitleText} numberOfLines={1}>
                        {cat?.name || "Uncategorized"} •{" "}
                        {format(new Date(tx.date), "hh:mm a")}
                      </Text>
                    </View>

                    <View style={styles.txRightCol}>
                      <Text
                        style={[
                          styles.txAmountText,
                          isIncome && styles.txAmountIncome,
                        ]}>
                        {isIncome ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {!isLast && <View style={styles.separator} />}
                </View>
              );
            })}
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySubtitle}>
                Add your first transaction to see your overview
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => navigation.navigate("AddTransaction" as any)}
                activeOpacity={0.8}>
                <Ionicons
                  name="add"
                  size={20}
                  color={colors.onPrimaryContainer}
                />
                <Text style={styles.emptyAddText}>Add Transaction</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      />

      {/* Filter Modal */}
      <TransactionFilterModal
        visible={showFilterModal}
        filterType={tempTypeFilter}
        filterPeriod={tempTimeFilter}
        selectedCategoryIds={tempCategoryIds}
        selectedBudgetIds={tempBudgetIds}
        onFilterTypeChange={(t) => setTempTypeFilter(t as any)}
        onFilterPeriodChange={(p) => setTempTimeFilter(p as any)}
        onCategoryToggle={toggleCategorySelection}
        onBudgetToggle={toggleBudgetSelection}
        onOpenCustomDate={() => setShowCustomDateModal(true)}
        onReset={resetModalFilters}
        onApply={applyModalFilters}
        onClose={() => setShowFilterModal(false)}
      />

      {/* Custom Date Range Modal */}
      <CustomDateRangeModal
        visible={showCustomDateModal}
        startDate={tempCustomStartDate}
        endDate={tempCustomEndDate}
        onStartDateChange={setTempCustomStartDate}
        onEndDateChange={setTempCustomEndDate}
        onApply={() => {
          setCustomStartDate(tempCustomStartDate);
          setCustomEndDate(tempCustomEndDate);
          setShowCustomDateModal(false);
        }}
        onClose={() => setShowCustomDateModal(false)}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    topContainer: {
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
      gap: 10,
    },
    searchBar: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 14,
      height: 48,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      color: colors.onBackground,
      fontSize: 15,
    },
    filterBtn: {
      width: 48,
      height: 48,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.outlineVariant,
    },
    filterBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      backgroundColor: colors.primary,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
    },
    filterBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.onPrimaryContainer,
    },
    segmentedControl: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 4,
      marginBottom: 14,
    },
    segmentBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 38,
      borderRadius: 20,
    },
    segmentBtnActive: {
      backgroundColor: colors.primaryContainer,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.onSurfaceVariant,
    },
    segmentTextActive: {
      color: colors.onPrimaryContainer,
      fontWeight: "700",
    },
    timeFiltersScroll: {
      paddingBottom: 8,
      gap: 8,
    },
    timeChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: "transparent",
    },
    timeChipActive: {
      backgroundColor: colors.secondaryContainer,
      borderColor: colors.primary,
    },
    timeChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.onSurfaceVariant,
    },
    timeChipTextActive: {
      color: colors.onBackground,
      fontWeight: "700",
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 8,
    },
    sectionHeaderTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.onSurfaceVariant,
      textTransform: "uppercase",
    },
    sectionHeaderTotal: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.onBackground,
    },
    cardGroupContainer: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: 24,
      marginHorizontal: 20,
      marginBottom: 8,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
    },
    txRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    iconBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    txCenterCol: {
      flex: 1,
      justifyContent: "center",
      marginRight: 10,
    },
    txTitleText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.onBackground,
      marginBottom: 3,
    },
    txSubtitleText: {
      fontSize: 13,
      color: colors.onSurfaceVariant,
    },
    txRightCol: {
      alignItems: "flex-end",
      justifyContent: "center",
    },
    txAmountText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.onBackground,
    },
    txAmountIncome: {
      color: colors.tertiary,
    },
    separator: {
      height: 1,
      backgroundColor: colors.outlineVariant,
      marginHorizontal: 16,
    },
    emptyContainer: {
      paddingTop: 60,
      paddingHorizontal: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.onBackground,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.onSurfaceVariant,
      textAlign: "center",
      marginBottom: 24,
      lineHeight: 20,
    },
    emptyAddBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primaryContainer,
      borderRadius: 28,
      paddingHorizontal: 24,
      paddingVertical: 14,
      gap: 6,
    },
    emptyAddText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.onPrimaryContainer,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.75)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      maxHeight: "88%",
      borderWidth: 1,
      borderColor: colors.outlineVariant,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant,
    },
    modalTitleText: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.onBackground,
    },
    modalCloseBtn: {
      padding: 4,
    },
    modalScrollContent: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 30,
    },
    modalSectionTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.onSurfaceVariant,
      letterSpacing: 0.8,
      marginBottom: 12,
      marginTop: 8,
    },
    modalPillWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 24,
    },
    modalChip: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
    },
    modalChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    modalChipText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.onSurfaceVariant,
    },
    modalChipTextActive: {
      color: colors.onBackground,
      fontWeight: "700",
    },
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 20,
    },
    catGridCard: {
      width: "48%",
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
    },
    catGridCardActive: {
      backgroundColor: colors.primaryContainer,
      borderColor: colors.primaryContainer,
    },
    catGridCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    catGridCardText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.onBackground,
    },
    catGridCardTextActive: {
      color: colors.onPrimaryContainer,
      fontWeight: "700",
    },
    modalFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 24,
      paddingVertical: 18,
      borderTopWidth: 1,
      borderTopColor: colors.outlineVariant,
    },
    resetBtn: {
      flex: 1,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      backgroundColor: colors.surface,
    },
    resetBtnText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.onBackground,
    },
    applyBtn: {
      flex: 1,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryContainer,
    },
    applyBtnText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.onPrimaryContainer,
    },
  });

export default TransactionListScreen;
