import { WalletBalanceSummary } from "../components/WalletBalanceSummary";
import { WalletGrid } from "../components/WalletGrid";
import { WalletList } from "../components/WalletList";
import { MoveWalletModal } from "../components/MoveWalletModal";

import { styles } from "./WalletManagementScreen.styles";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { useWalletManagementScreen } from "../hooks/useWalletManagementScreen";
import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AppHeader } from "../../../shared/ui/AppHeader";

import { WalletEditorModal } from "../components/WalletEditorModal";
import { TransferModal } from "../components/TransferModal";

const { width } = Dimensions.get("window");
const CARD_MARGIN = 8;
const CARD_WIDTH = (width - 40 - CARD_MARGIN * 2) / 2;

export const WalletManagementScreen: React.FC = () => {
  const { colors, typography, spacing, isDark } = useAppTheme();

  const {
    handleUnarchiveWallet,
    handleMoveAndDeleteWallet,
    wallets,
    walletBalances,
    activeType,
    setActiveType,
    viewMode,
    setViewMode,
    showMoveModal,
    setShowMoveModal,
    walletToMove,
    destinationWalletId,
    setDestinationWalletId,
    showEditorModal,
    setShowEditorModal,
    editingWallet,
    showTransferModal,
    setShowTransferModal,
    fromWalletId,
    toWalletId,
    loadWallets,
    totalNetWorth,
    filteredWallets,
    openAddModal,
    openEditModal,
    handleSaveWallet,
    handleDeleteWallet,
    handleOpenTransfer
  } = useWalletManagementScreen();

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <AppHeader title="Wallets & Accounts" showBack={true} showSettings={false} />

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}>
        {/* Total Net Worth / Balance Card */}
        <WalletBalanceSummary wallets={wallets} totalNetWorth={totalNetWorth} handleOpenTransfer={handleOpenTransfer} openAddModal={openAddModal} />

        {/* Filter Pills & View Mode */}
        <View style={styles.filterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}>
            {(["all", "cash", "bank", "card", "wallet", "secret", "archived"] as const).map((t) => {
              const active = activeType === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: active
                        ? colors.primaryContainer
                        : colors.surfaceVariant,
                    },
                  ]}
                  onPress={() => setActiveType(t)}>
                  <Text
                    style={[
                      typography.bodySmall,
                      {
                        color: active
                          ? colors.onPrimaryContainer
                          : colors.onSurfaceVariant,
                        fontWeight: "700",
                        textTransform: "capitalize",
                      },
                    ]}>
                    {t === "all" ? "All" : t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[styles.viewToggle, { backgroundColor: colors.surfaceVariant }]}
            onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
            <Ionicons
              name={viewMode === "grid" ? "list-outline" : "grid-outline"}
              size={18}
              color={colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>

        {/* Accounts List / Grid */}
        {viewMode === "grid" ? (
          <WalletGrid filteredWallets={filteredWallets} walletBalances={walletBalances} openEditModal={openEditModal} handleUnarchiveWallet={handleUnarchiveWallet} handleOpenTransfer={handleOpenTransfer} handleDeleteWallet={handleDeleteWallet} openAddModal={openAddModal} />
        ) : (
          <WalletList filteredWallets={filteredWallets} walletBalances={walletBalances} openEditModal={openEditModal} handleUnarchiveWallet={handleUnarchiveWallet} handleDeleteWallet={handleDeleteWallet} openAddModal={openAddModal} />
        )}
      </ScrollView>

      {/* Full-featured Add / Edit Wallet Modal */}
      <WalletEditorModal
        visible={showEditorModal}
        editingWallet={editingWallet}
        currentBalance={editingWallet ? walletBalances[editingWallet.id] || 0 : 0}
        onClose={() => setShowEditorModal(false)}
        onSave={handleSaveWallet}
      />

      {/* Reusable Wallet-to-Wallet Transfer Modal */}
      <TransferModal
        visible={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        wallets={wallets}
        initialFromWalletId={fromWalletId}
        initialToWalletId={toWalletId}
        onSuccess={loadWallets}
      />

      {/* Move Transactions & Delete Modal */}
      <MoveWalletModal showMoveModal={showMoveModal} setShowMoveModal={setShowMoveModal} walletToMove={walletToMove} wallets={wallets} destinationWalletId={destinationWalletId} setDestinationWalletId={setDestinationWalletId} handleMoveAndDeleteWallet={handleMoveAndDeleteWallet} />
    </SafeAreaView>
  );
};

export default WalletManagementScreen;
