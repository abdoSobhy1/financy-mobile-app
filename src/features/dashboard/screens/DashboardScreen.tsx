import { DashboardBalanceCards } from "../components/DashboardBalanceCards";
import { DashboardWalletsSection } from "../components/DashboardWalletsSection";
import { DashboardQuickAddSection } from "../components/DashboardQuickAddSection";
import { DashboardRecentTransactions } from "../components/DashboardRecentTransactions";

import { styles } from "./DashboardScreen.styles";
import { useDashboardScreen } from "../hooks/useDashboardScreen";
import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import { formatCurrency } from "../../../shared/utils";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";

import { useTabBarHeight } from "../../../shared/ui";
import { WalletEditorModal } from "../../wallets/components/WalletEditorModal";

import { TransferModal } from "../../wallets/components/TransferModal";
import { AppHeader } from "../../../shared/ui/AppHeader";

import { ReceiptScanModal } from "../../receipts/components/ReceiptScanModal";

export const DashboardScreen: React.FC = () => {
  const {
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
  } = useDashboardScreen();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radius, isDark } =
    useAppTheme();
  const tabBarHeight = useTabBarHeight();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Shared App Header */}
      <AppHeader title="Dashboard" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: tabBarHeight,
        }}>

        {/* Alerts Section (In-App Overspending Banners) */}
        {overspentBudgets.some((ob) => !dismissedAlertIds.includes(ob.id)) && (
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm }}>
            {overspentBudgets
              .filter((ob) => !dismissedAlertIds.includes(ob.id))
              .map((ob) => (
                <View
                  key={ob.id}
                  style={[
                    styles.alertBanner,
                    {
                      backgroundColor: colors.errorContainer,
                      borderRadius: radius.lg,
                      padding: spacing.md,
                    },
                  ]}>
                  <View style={[styles.alertIconWrap, { marginRight: spacing.md }]}>
                    <Ionicons name="warning" size={24} color={colors.error} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.label, { color: colors.onErrorContainer, fontWeight: "700" }]}>
                      {ob.name} Overspent
                    </Text>
                    <Text style={[typography.bodyMedium, { color: colors.onErrorContainer, opacity: 0.9 }]}>
                      You exceeded this budget by {formatCurrency(ob.excess)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDismissAlert(ob.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ padding: 8 }}>
                    <Ionicons name="close" size={20} color={colors.onErrorContainer} />
                  </TouchableOpacity>
                </View>
              ))}
          </View>
        )}

        {/* Dashboard Summary Cards - Horizontal Scroll */}
        <DashboardBalanceCards
          SCREEN_WIDTH={SCREEN_WIDTH}
          activeCardIndex={activeCardIndex}
          setActiveCardIndex={setActiveCardIndex}
          balanceHistory={balanceHistory}
          toggleHideBalances={toggleHideBalances}
          hideBalances={hideBalances}
          maskCurrency={maskCurrency}
          balance={balance}
          balanceChangePct={balanceChangePct}
          totalIncome={totalIncome}
          totalExpenses={totalExpenses}
          budgetedExpenses={budgetedExpenses}
          totalBudget={totalBudget}
          daysLeftInPeriod={daysLeftInPeriod}
          navigation={navigation}
        />

        {/* Carousel Pagination Dots */}
        <View style={[styles.paginationRow, { marginBottom: spacing.lg }]}>
          {[0, 1].map((idx) => {
            const active = activeCardIndex === idx;
            return (
              <View
                key={`dot_${idx}`}
                style={[
                  styles.paginationDot,
                  {
                    width: active ? 18 : 6,
                    backgroundColor: active ? colors.primary : colors.outlineVariant,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Wallets & Accounts Strip */}
        <DashboardWalletsSection navigation={navigation} openAddWalletModal={openAddWalletModal} handleOpenTransferModal={handleOpenTransferModal} visibleWallets={visibleWallets} walletBalances={walletBalances} maskCurrency={maskCurrency} />

        {/* Quick Add Row */}
        <DashboardQuickAddSection quickAddSlots={quickAddSlots} handleQuickAddPress={handleQuickAddPress} navigation={navigation} setShowScanModal={setShowScanModal} />

        {/* Recent Transactions Preview */}
        <DashboardRecentTransactions navigation={navigation} recentTransactions={recentTransactions} categoriesMap={categoriesMap} wallets={wallets} handleTransactionPress={handleTransactionPress} maskCurrency={maskCurrency} handleMorePress={handleMorePress} />
      </ScrollView>

      {/* Reusable Transfer Modal */}
      <TransferModal
        visible={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        wallets={wallets}
        initialFromWalletId={fromWalletId}
        initialToWalletId={toWalletId}
        onSuccess={handleTransferSuccess}
      />

      {/* Shared Create Account / Wallet Modal */}
      <WalletEditorModal
        visible={showAddWalletModal}
        onClose={() => setShowAddWalletModal(false)}
        onSave={handleCreateWalletSubmit}
      />

      <ReceiptScanModal
        visible={showScanModal}
        onClose={() => setShowScanModal(false)}
        categories={categoriesMap}
        onScanComplete={handleScanComplete}
      />

    </View>
  );
};
