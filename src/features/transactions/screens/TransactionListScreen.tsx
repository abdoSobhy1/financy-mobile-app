import { TransactionListToolbar } from "../components/TransactionListToolbar";
import { TransactionRowItem } from "../components/TransactionRowItem";
import { createStyles } from "../components/TransactionListSection.styles";
import { useTransactionListScreen } from "../hooks/useTransactionListScreen";

import React, { useMemo } from "react";
import { View, Text, SectionList, TouchableOpacity, RefreshControl, StatusBar, Platform, UIManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { useTabBarHeight, ToastOverlay } from "../../../shared/ui";
import { AppHeader } from "../../../shared/ui/AppHeader";

import { formatCurrency } from "../../../shared/utils";

import { CustomDateRangeModal, TransactionFilterModal } from "../components";

export const TransactionListScreen: React.FC = () => {
  const {
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
  } = useTransactionListScreen();
  const { colors, typography, spacing, radius, isDark } = useAppTheme();
  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Standard App Header */}
      {isSelectionMode ? (
        <AppHeader
          title={`${selectedTxIds.size} Selected`}
          showSettings={false}
          rightAction={
            <TouchableOpacity
              onPress={exitSelectionMode}
              style={{ paddingHorizontal: 12, paddingVertical: 6 }}
              activeOpacity={0.7}>
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 16 }}>Done</Text>
            </TouchableOpacity>
          }
        />
      ) : (
        <AppHeader title="Transactions" />
      )}

      <TransactionListToolbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} openFilterModal={openFilterModal} selectedCategoryIds={selectedCategoryIds} selectedBudgetIds={selectedBudgetIds} selectedWalletIds={selectedWalletIds} typeFilter={typeFilter} isSelectionMode={isSelectionMode} handleSelectAll={handleSelectAll} selectedTxIds={selectedTxIds} filteredTransactions={filteredTransactions} handleMassDelete={handleMassDelete} isDeletingBulk={isDeletingBulk} setTypeFilter={setTypeFilter} timeFilter={timeFilter} setTimeFilter={setTimeFilter} totalAmount={totalAmount} />

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
              const isAdjustment = isWalletReconciliation(tx);
              const isFirst = idx === 0;
              const isLast = idx === item.items.length - 1;
              const isOnlyOne = item.items.length === 1;
              const isSelected = selectedTxIds.has(tx.id);

              return (
                <TransactionRowItem
                  key={tx.id}
                  tx={tx}
                  cat={cat}
                  walletsMap={walletsMap}
                  secretWalletIds={secretWalletIds}
                  isAdjustment={isAdjustment}
                  isFirst={isFirst}
                  isLast={isLast}
                  isOnlyOne={isOnlyOne}
                  isSelected={isSelected}
                  isSelectionMode={isSelectionMode}
                  onPress={() => {
                    if (isSelectionMode) {
                      toggleSelectTx(tx.id);
                    } else {
                      handleTransactionPress(tx);
                    }
                  }}
                  onLongPress={() => handleLongPressTx(tx)}
                  colors={colors}
                  styles={styles}
                />
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
        selectedWalletIds={tempWalletIds}
        wallets={wallets}
        onFilterTypeChange={(t) => setTempTypeFilter(t as any)}
        onFilterPeriodChange={(p) => setTempTimeFilter(p as any)}
        onCategoryToggle={toggleCategorySelection}
        onBudgetToggle={toggleBudgetSelection}
        onWalletToggle={toggleWalletSelection}
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
    </View>
  );
};

export default TransactionListScreen;
