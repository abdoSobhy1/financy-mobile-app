import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../store";
import {
  addWallet,
  editWallet,
  removeWallet,
  transferBetweenWallets,
} from "../store/slices/walletsSlice";
import { useAppTheme } from "../theme";
import {
  WalletModal,
  TransferModal,
  CustomAlert,
  useCustomAlert,
} from "../components/ui";
import { Wallet, WalletFormData } from "../types";

export const WalletsScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: walletsMap } = useSelector(
    (state: RootState) => state.wallets
  );
  const wallets = Object.values(walletsMap);
  const { colors, typography, spacing, radius, isDark } = useAppTheme();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [transferVisible, setTransferVisible] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalBalance = wallets.reduce(
    (acc, w) => acc + Number(w.balance || 0),
    0
  );

  const handleOpenAdd = () => {
    setEditingWallet(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (wallet: Wallet) => {
    setEditingWallet(wallet);
    setModalVisible(true);
  };

  const handleSaveWallet = async (formData: WalletFormData) => {
    try {
      if (editingWallet) {
        await dispatch(
          editWallet({
            id: editingWallet.id,
            updates: formData,
          })
        ).unwrap();
      } else {
        await dispatch(addWallet(formData)).unwrap();
      }
      setModalVisible(false);
    } catch (error: any) {
      console.error("Failed to save wallet:", error);
      showAlert(
        "Error",
        error?.message || "Failed to save wallet. Please try again."
      );
    }
  };

  const handleDeleteWallet = (wallet: Wallet) => {
    showAlert(
      "Delete Wallet",
      `Are you sure you want to delete "${wallet.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(wallet.id);
            try {
              await dispatch(removeWallet(wallet.id)).unwrap();
            } catch (error: any) {
              console.error("Failed to delete wallet:", error);
              showAlert(
                "Error",
                error?.message || "Failed to delete wallet."
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleTransfer = async (transferData: any) => {
    try {
      await dispatch(
        transferBetweenWallets({
          fromWalletId: transferData.fromWalletId,
          toWalletId: transferData.toWalletId,
          amount: transferData.amount,
          date: transferData.date,
          description: transferData.description,
          note: transferData.note,
        })
      ).unwrap();
      setTransferVisible(false);
    } catch (error: any) {
      console.error("Transfer failed:", error);
      showAlert(
        "Transfer Failed",
        error?.message || "Unable to transfer funds."
      );
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.outlineVariant,
          },
        ]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.onSurface}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
          Wallets
        </Text>
        <TouchableOpacity
          style={styles.headerBtnRight}
          onPress={handleOpenAdd}
          accessibilityRole="button"
          accessibilityLabel="Add wallet">
          <Ionicons
            name="add"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Total Balance Hero Card */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderRadius: radius.large,
              borderColor: colors.outline,
              borderWidth: StyleSheet.hairlineWidth,
              padding: spacing.s20,
              marginBottom: spacing.s20,
            },
          ]}>
          <Text
            style={[
              typography.labelMedium,
              { color: colors.textSecondary, marginBottom: spacing.s4 },
            ]}>
            TOTAL BALANCE
          </Text>
          <Text
            style={[
              typography.displayMedium,
              { color: colors.primary, fontWeight: "700" },
            ]}>
            ${totalBalance.toFixed(2)}
          </Text>
          <View style={styles.heroFooter}>
            <Text
              style={[
                typography.bodySmall,
                { color: colors.textSecondary },
              ]}>
              Across {wallets.length} {wallets.length === 1 ? "wallet" : "wallets"}
            </Text>
            {wallets.length >= 2 && (
              <TouchableOpacity
                style={[
                  styles.transferBadgeBtn,
                  {
                    backgroundColor: colors.primaryContainer,
                    borderRadius: radius.full,
                  },
                ]}
                onPress={() => setTransferVisible(true)}>
                <Ionicons
                  name="swap-horizontal"
                  size={16}
                  color={colors.onPrimaryContainer}
                />
                <Text
                  style={[
                    typography.labelMedium,
                    {
                      color: colors.onPrimaryContainer,
                      fontWeight: "600",
                    },
                  ]}>
                  Transfer
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Wallets List Section */}
        <View style={styles.listSection}>
          <Text
            style={[
              typography.titleMedium,
              { color: colors.onSurface, marginBottom: spacing.s12 },
            ]}>
            Your Wallets
          </Text>

          {wallets.length === 0 ? (
            <View
              style={[
                styles.emptyContainer,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderRadius: radius.large,
                  padding: spacing.s24,
                },
              ]}>
              <Ionicons
                name="wallet-outline"
                size={48}
                color={colors.textSecondary}
              />
              <Text
                style={[
                  typography.titleMedium,
                  {
                    color: colors.onSurface,
                    marginTop: spacing.s12,
                    textAlign: "center",
                  },
                ]}>
                No Wallets Yet
              </Text>
              <Text
                style={[
                  typography.bodyMedium,
                  {
                    color: colors.textSecondary,
                    textAlign: "center",
                    marginTop: spacing.s4,
                    marginBottom: spacing.s16,
                  },
                ]}>
                Create your first wallet to track your balances and transactions.
              </Text>
              <TouchableOpacity
                style={[
                  styles.emptyAddBtn,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: radius.medium,
                  },
                ]}
                onPress={handleOpenAdd}>
                <Ionicons
                  name="add-circle"
                  size={20}
                  color={colors.onPrimary}
                />
                <Text
                  style={[
                    typography.labelLarge,
                    { color: colors.onPrimary, fontWeight: "600" },
                  ]}>
                  Add First Wallet
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            wallets.map((wallet) => (
              <TouchableOpacity
                key={wallet.id}
                activeOpacity={0.8}
                onPress={() => handleOpenEdit(wallet)}
                style={[
                  styles.walletCard,
                  {
                    backgroundColor: colors.surface,
                    borderRadius: radius.large,
                    borderColor: colors.outline,
                    borderWidth: StyleSheet.hairlineWidth,
                    padding: spacing.s16,
                    marginBottom: spacing.s12,
                  },
                ]}>
                <View style={styles.walletCardLeft}>
                  <View
                    style={[
                      styles.iconBadge,
                      {
                        backgroundColor:
                          wallet.color || colors.primary,
                        borderRadius: radius.full,
                      },
                    ]}>
                    <Ionicons
                      name={(wallet.icon as any) || "wallet"}
                      size={22}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.walletCardInfo}>
                    <Text
                      style={[
                        typography.titleMedium,
                        { color: colors.onSurface, fontWeight: "600" },
                      ]}
                      numberOfLines={1}>
                      {wallet.name}
                    </Text>
                    <Text
                      style={[
                        typography.displaySmall,
                        {
                          color: colors.primary,
                          fontWeight: "700",
                          fontSize: 22,
                          marginTop: 2,
                        },
                      ]}>
                      ${Number(wallet.balance || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.walletCardActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleOpenEdit(wallet)}
                    accessibilityLabel={`Edit ${wallet.name}`}>
                    <Ionicons
                      name="pencil-outline"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteWallet(wallet)}
                    disabled={deletingId === wallet.id}
                    accessibilityLabel={`Delete ${wallet.name}`}>
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={colors.error}
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Add Wallet Button Row */}
        <TouchableOpacity
          style={[
            styles.addWalletRowBtn,
            {
              backgroundColor: colors.surfaceVariant,
              borderRadius: radius.large,
              borderColor: colors.outline,
              borderWidth: StyleSheet.hairlineWidth,
              padding: spacing.s16,
              marginTop: spacing.s8,
            },
          ]}
          onPress={handleOpenAdd}>
          <Ionicons
            name="add-circle-outline"
            size={24}
            color={colors.primary}
          />
          <Text
            style={[
              typography.titleMedium,
              { color: colors.primary, fontWeight: "600" },
            ]}>
            Add Another Wallet
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Wallet Modal for Create & Edit */}
      <WalletModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveWallet}
        initialWallet={editingWallet}
        title={editingWallet ? "Edit Wallet" : "Add Wallet"}
      />

      {/* Transfer Modal */}
      <TransferModal
        visible={transferVisible}
        onClose={() => setTransferVisible(false)}
        onTransfer={handleTransfer}
      />

      {/* Alert Component */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        actions={alertConfig.actions}
        onDismiss={hideAlert}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBtnRight: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {},
  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  transferBadgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  listSection: {},
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  walletCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  walletCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
  },
  iconBadge: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  walletCardInfo: {
    flex: 1,
  },
  walletCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  addWalletRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
});

export default WalletsScreen;
