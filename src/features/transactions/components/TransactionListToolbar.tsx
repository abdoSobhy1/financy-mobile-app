import { createStyles } from "./TransactionListSection.styles";
import { useMemo } from "react";
import type { TransactionListScreenController } from "../hooks/useTransactionListScreen";

import { View, Text, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";

import { formatCurrency } from "../../../shared/utils";

type TimeFilter =
  | "Today"
  | "This Month"
  | "Last Month"
  | "Year"
  | "All Time"
  | "custom";
interface TransactionListToolbarProps {
  searchQuery: TransactionListScreenController["searchQuery"];
  setSearchQuery: TransactionListScreenController["setSearchQuery"];
  openFilterModal: TransactionListScreenController["openFilterModal"];
  selectedCategoryIds: TransactionListScreenController["selectedCategoryIds"];
  selectedBudgetIds: TransactionListScreenController["selectedBudgetIds"];
  selectedWalletIds: TransactionListScreenController["selectedWalletIds"];
  typeFilter: TransactionListScreenController["typeFilter"];
  isSelectionMode: TransactionListScreenController["isSelectionMode"];
  handleSelectAll: TransactionListScreenController["handleSelectAll"];
  selectedTxIds: TransactionListScreenController["selectedTxIds"];
  filteredTransactions: TransactionListScreenController["filteredTransactions"];
  handleMassDelete: TransactionListScreenController["handleMassDelete"];
  isDeletingBulk: TransactionListScreenController["isDeletingBulk"];
  setTypeFilter: TransactionListScreenController["setTypeFilter"];
  timeFilter: TransactionListScreenController["timeFilter"];
  setTimeFilter: TransactionListScreenController["setTimeFilter"];
  totalAmount: TransactionListScreenController["totalAmount"];

}
export function TransactionListToolbar({ searchQuery, setSearchQuery, openFilterModal, selectedCategoryIds, selectedBudgetIds, selectedWalletIds, typeFilter, isSelectionMode, handleSelectAll, selectedTxIds, filteredTransactions, handleMassDelete, isDeletingBulk, setTypeFilter, timeFilter, setTimeFilter, totalAmount }: TransactionListToolbarProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (<View style={styles.topContainer}>
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
        {(selectedCategoryIds.size > 0 ||
          selectedBudgetIds.size > 0 ||
          selectedWalletIds.size > 0 ||
          typeFilter === "Transfer") && (
            <View
              style={[
                styles.filterBadge,
                { backgroundColor: colors.primaryContainer },
              ]}
            />
          )}
      </TouchableOpacity>
    </View>

    {/* Multi-Select Action Banner */}
    {isSelectionMode && (
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: colors.surfaceVariant,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
          marginTop: 6,
          marginBottom: 4,
        }}>
        <TouchableOpacity
          onPress={handleSelectAll}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          activeOpacity={0.7}>
          <Ionicons
            name={
              selectedTxIds.size === filteredTransactions.length && filteredTransactions.length > 0
                ? "checkbox"
                : "square-outline"
            }
            size={20}
            color={colors.primary}
          />
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.onSurfaceVariant }}>
            {selectedTxIds.size === filteredTransactions.length && filteredTransactions.length > 0
              ? "Deselect All"
              : `Select All (${filteredTransactions.length})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleMassDelete}
          disabled={selectedTxIds.size === 0 || isDeletingBulk}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: selectedTxIds.size > 0 ? colors.error : colors.outlineVariant,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: radius.sm,
            opacity: selectedTxIds.size > 0 ? 1 : 0.5,
          }}
          activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={16} color={colors.onError} />
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.onError }}>
            {isDeletingBulk ? "Deleting..." : `Delete (${selectedTxIds.size})`}
          </Text>
        </TouchableOpacity>
      </View>
    )}

    {/* Segmented Control for Transaction Type (All | Income | Expense | Transfer) */}
    <View style={styles.segmentedControl}>
      {(["All", "Income", "Expense", "Transfer"] as const).map((t) => {
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

    {/* Total Summary */}
    <View style={{
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.md,
      backgroundColor: colors.surfaceVariant,
      padding: spacing.md,
      borderRadius: radius.md,
      marginTop: 6,
    }}>
      <Text style={[typography.bodyLarge, { color: colors.onSurfaceVariant }]}>
        Total
      </Text>
      <Text
        style={[
          typography.h3,
          { color: totalAmount >= 0 ? colors.primary : colors.error },
        ]}>
        {totalAmount > 0 ? "+" : ""}{formatCurrency(totalAmount)}
      </Text>
    </View>
  </View>);
}
