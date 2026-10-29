import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store";
import { WalletAccount, WalletType } from "../types";
import { walletService } from "../services/walletService";
import { fetchTransactions } from "../store/slices/transactionsSlice";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { AppHeader } from "../components/ui/AppHeader";
import { IconChip } from "../components/ui/IconChip";
import { Card, useToast, Switch, WalletEditorModal, WalletEditorFormValues, TransferModal, ToastOverlay } from "../components/ui";
import { formatCurrency } from "../utils";
import { AlertService } from "../services/AlertService";

const { width } = Dimensions.get("window");
const CARD_MARGIN = 8;
const CARD_WIDTH = (width - 40 - CARD_MARGIN * 2) / 2;

const getAlphaColor = (color: string, hexAlpha: string = "1F") => {
  if (color && color.startsWith("#") && color.length === 7) {
    return `${color}${hexAlpha}`;
  }
  return color;
};

export const WalletManagementScreen: React.FC = () => {
  const { colors, typography, spacing, radius, isDark, currencySymbol } =
    useAppTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { showSuccess, showError, showInfo } = useToast();

  const transactions = useSelector(
    (state: RootState) => state.transactions.items,
  );

  const [wallets, setWallets] = useState<WalletAccount[]>([]);
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({});
  const [activeType, setActiveType] = useState<"all" | WalletType | "secret" | "archived">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Move Modal state
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [walletToMove, setWalletToMove] = useState<WalletAccount | null>(null);
  const [destinationWalletId, setDestinationWalletId] = useState("");

  // Add / Edit Modal state
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletAccount | null>(null);

  // Transfer Modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromWalletId, setFromWalletId] = useState("");
  const [toWalletId, setToWalletId] = useState("");

  const loadWallets = useCallback(async () => {
    try {
      const list = await walletService.getWallets({ includeArchived: true });
      const allTx = Object.values(transactions).filter((t) => !t.deleted);

      setWallets(list);
      setWalletBalances(
        walletService.calculateWalletBalances(list, allTx),
      );
      const activeList = list.filter((w) => !w.archived);
      if (activeList.length >= 2) {
        setFromWalletId((prev) => prev || activeList[0].id);
        setToWalletId((prev) => prev || activeList[1].id);
      }
    } catch (e) {
      console.warn("Failed to load wallets:", e);
    }
  }, [transactions]);

  useEffect(() => {
    dispatch(fetchTransactions());
    loadWallets();
  }, [dispatch, loadWallets]);

  const totalNetWorth = useMemo(() => {
    return wallets
      .filter((w) => !walletService.isSecretWallet(w))
      .reduce((sum, w) => sum + (walletBalances[w.id] || 0), 0);
  }, [wallets, walletBalances]);

  const filteredWallets = useMemo(() => {
    if (activeType === "archived") {
      return wallets.filter((w) => w.archived);
    }
    const nonArchived = wallets.filter((w) => !w.archived);
    if (activeType === "all") return nonArchived;
    if (activeType === "secret") {
      return nonArchived.filter((w) => walletService.isSecretWallet(w));
    }
    return nonArchived.filter((w) => w.type === activeType);
  }, [wallets, activeType]);

  const openAddModal = () => {
    setEditingWallet(null);
    setShowEditorModal(true);
  };

  const openEditModal = (wallet: WalletAccount) => {
    setEditingWallet(wallet);
    setShowEditorModal(true);
  };

  const isSavingWalletRef = useRef(false);

  const handleSaveWallet = async (values: WalletEditorFormValues) => {
    if (isSavingWalletRef.current) return;

    if (!values.name.trim()) {
      showError("Please enter an account name");
      return;
    }

    isSavingWalletRef.current = true;
    const initBal = parseFloat(values.initialBalance.replace(/,/g, "")) || 0;
    try {
      if (editingWallet) {
        const enteredBal = parseFloat(values.initialBalance.replace(/,/g, "")) || 0;
        const currentBal = walletBalances[editingWallet.id] || 0;
        const diff = enteredBal - currentBal;

        if (Math.abs(diff) > 0.001) {
          const { db } = await import("../database/queries");
          await db.transactions.createTransaction({
            amount: Math.abs(diff),
            type: diff > 0 ? "income" : "expense",
            description: "Balance adjustment",
            accountId: editingWallet.id,
            date: new Date().toISOString(),
            updatedAt: Date.now(),
          });
          await dispatch(fetchTransactions());
        }

        await walletService.updateWallet(editingWallet.id, {
          name: values.name.trim(),
          type: values.type,
          icon: values.icon,
          color: values.color,
          isSecret: values.isSecret,
          initialBalance: editingWallet.initialBalance || 0,
        });
        await loadWallets();
        setShowEditorModal(false);
        showSuccess(`Reconciled and updated "${values.name.trim()}"`);
      } else {
        await walletService.addWallet({
          name: values.name.trim(),
          type: values.type,
          icon: values.icon,
          color: values.color,
          initialBalance: initBal,
          isSecret: values.isSecret,
        });
        await dispatch(fetchTransactions());
        await loadWallets();
        setShowEditorModal(false);
        showSuccess(`Created "${values.name.trim()}"`);
      }
    } catch (err) {
      console.error("[WalletManagementScreen] Failed to save account:", err);
      showError("Failed to save account");
    } finally {
      isSavingWalletRef.current = false;
    }
  };

  const handleDeleteWallet = async (wallet: WalletAccount) => {
    const activeWallets = wallets.filter((w) => !w.archived);
    if (activeWallets.length <= 1 && !wallet.archived) {
      showError("You must keep at least one active account");
      return;
    }

    const txCount = await walletService.countTransactionsForWallet(wallet.id);

    if (txCount === 0) {
      AlertService.alert(
        `Delete "${wallet.name}"?`,
        "This account has no transactions. Would you like to permanently delete it or archive it?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Archive",
            onPress: async () => {
              await walletService.archiveWallet(wallet.id);
              await loadWallets();
              showSuccess(`Archived "${wallet.name}"`);
            },
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              const { db } = await import("../database/queries");
              await db.wallets.hardDeleteWallet(wallet.id);
              await loadWallets();
              showSuccess(`Permanently deleted "${wallet.name}"`);
            },
          },
        ],
      );
    } else {
      AlertService.alert(
        `"${wallet.name}" has ${txCount} transaction${txCount > 1 ? "s" : ""}`,
        "You can archive it (keeps history and balance math) or move all its transactions to another wallet and delete it.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Archive",
            onPress: async () => {
              await walletService.archiveWallet(wallet.id);
              await loadWallets();
              showSuccess(`Archived "${wallet.name}"`);
            },
          },
          {
            text: "Move & Delete",
            style: "destructive",
            onPress: () => {
              const otherWallets = wallets.filter(
                (w) => w.id !== wallet.id && !w.archived,
              );
              if (otherWallets.length === 0) {
                showError("No other active account available to receive transactions.");
                return;
              }
              setWalletToMove(wallet);
              setDestinationWalletId(otherWallets[0].id);
              setShowMoveModal(true);
            },
          },
        ],
      );
    }
  };

  const handleOpenTransfer = (initialFrom?: string) => {
    const visibleWallets = walletService.getVisibleWallets(wallets);
    if (visibleWallets.length < 2) {
      showInfo("Please create another account first to make transfers.");
      return;
    }
    if (initialFrom) setFromWalletId(initialFrom);
    setShowTransferModal(true);
  };

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
        <Card
          variant="default"
          style={{
            backgroundColor: colors.primaryContainer,
            borderRadius: 28,
            padding: spacing.xl,
            marginBottom: spacing.lg,
          }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: spacing.xs,
            }}>
            <Text
              style={[
                typography.label,
                {
                  color: colors.onPrimaryContainer,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  opacity: 0.8,
                },
              ]}>
              TOTAL BALANCE
            </Text>
            <View
              style={{
                backgroundColor: isDark ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.75)",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
                borderWidth: isDark ? 0 : 1,
                borderColor: isDark ? "transparent" : getAlphaColor(colors.onPrimaryContainer, "1F"),
              }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: colors.onPrimaryContainer,
                }}>
                {wallets.length} Accounts
              </Text>
            </View>
          </View>
          <Text
            style={[
              typography.h1,
              {
                color: colors.onPrimaryContainer,
                fontSize: 34,
                fontWeight: "900",
                marginBottom: spacing.md,
              },
            ]}>
            {formatCurrency(totalNetWorth)}
          </Text>

          {/* Transfer & Add Action Buttons inside Header Card */}
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <TouchableOpacity
              onPress={() => handleOpenTransfer()}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                backgroundColor: colors.primary,
                paddingVertical: 10,
                borderRadius: 16,
              }}>
              <Ionicons name="swap-horizontal" size={18} color={colors.onPrimary} />
              <Text
                style={{
                  color: colors.onPrimary,
                  fontWeight: "700",
                  fontSize: 14,
                }}>
                Transfer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={openAddModal}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                backgroundColor: isDark ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.75)",
                paddingVertical: 10,
                borderRadius: 16,
                borderWidth: isDark ? 0 : 1,
                borderColor: isDark ? "transparent" : getAlphaColor(colors.onPrimaryContainer, "1F"),
              }}>
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={colors.onPrimaryContainer}
              />
              <Text
                style={{
                  color: colors.onPrimaryContainer,
                  fontWeight: "700",
                  fontSize: 14,
                }}>
                New Account
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

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
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginHorizontal: -CARD_MARGIN,
            }}>
            {filteredWallets.map((wallet) => {
              const bal = walletBalances[wallet.id] || 0;
              const isSecret = walletService.isSecretWallet(wallet);
              return (
                <TouchableOpacity
                  key={wallet.id}
                  style={[
                    styles.walletCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isSecret ? colors.error : colors.outlineVariant,
                      borderWidth: isSecret ? 1.5 : 1,
                    },
                  ]}
                  onPress={() => openEditModal(wallet)}
                  activeOpacity={0.75}>
                  <View style={{ alignItems: "center", marginBottom: 10 }}>
                    <IconChip
                      iconName={
                        (wallet.icon ||
                          (isSecret ? "lock-closed-outline" : "wallet-outline")) as any
                      }
                      colorName={(wallet.color as any) || (isSecret ? "gray" : "teal")}
                      size={48}
                    />
                  </View>
                  <Text
                    style={[
                      typography.label,
                      {
                        color: colors.onBackground,
                        textAlign: "center",
                        fontSize: 15,
                        fontWeight: "700",
                      },
                    ]}
                    numberOfLines={1}>
                    {wallet.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      textTransform: "capitalize",
                      color: colors.onSurfaceVariant,
                      marginTop: 2,
                    }}>
                    {wallet.type}
                  </Text>
                  {isSecret && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 3,
                        backgroundColor: "rgba(239, 68, 68, 0.15)",
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 6,
                        marginTop: 4,
                      }}>
                      <Ionicons
                        name="lock-closed"
                        size={10}
                        color={colors.error}
                      />
                      <Text
                        style={{
                          fontSize: 9,
                          fontWeight: "700",
                          color: colors.error,
                        }}>
                        Secret · Excluded
                      </Text>
                    </View>
                  )}
                  {Boolean(wallet.archived) && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 3,
                        backgroundColor: colors.surfaceVariant,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 6,
                        marginTop: 4,
                      }}>
                      <Ionicons
                        name="archive-outline"
                        size={10}
                        color={colors.onSurfaceVariant}
                      />
                      <Text
                        style={{
                          fontSize: 9,
                          fontWeight: "700",
                          color: colors.onSurfaceVariant,
                        }}>
                        Archived
                      </Text>
                    </View>
                  )}
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "800",
                      color: colors.onBackground,
                      marginTop: 8,
                    }}
                    numberOfLines={1}>
                    {formatCurrency(bal)}
                  </Text>

                  {/* Actions Row */}
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 12,
                      marginTop: 12,
                      paddingTop: 10,
                      borderTopWidth: 1,
                      borderTopColor: colors.outlineVariant,
                    }}>
                    {wallet.archived ? (
                      <TouchableOpacity
                        onPress={async () => {
                          await walletService.unarchiveWallet(wallet.id);
                          await loadWallets();
                          showSuccess(`Unarchived "${wallet.name}"`);
                        }}
                        style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons
                          name="arrow-undo-outline"
                          size={16}
                          color={colors.primary}
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: colors.primary,
                          }}>
                          Restore
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <TouchableOpacity
                          onPress={() => openEditModal(wallet)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons
                            name="pencil-outline"
                            size={16}
                            color={colors.primary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleOpenTransfer(wallet.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons
                            name="swap-horizontal"
                            size={16}
                            color={colors.primary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteWallet(wallet)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color={colors.error}
                          />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Quick Add Card */}
            <TouchableOpacity
              style={[
                styles.addCard,
                {
                  borderColor: colors.outlineVariant,
                  backgroundColor: colors.surface,
                },
              ]}
              onPress={openAddModal}
              activeOpacity={0.7}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.primaryContainer,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}>
                <Ionicons name="add" size={26} color={colors.onPrimaryContainer} />
              </View>
              <Text
                style={[
                  typography.label,
                  { color: colors.primary, fontWeight: "700" },
                ]}>
                Add Account
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filteredWallets.map((wallet) => {
              const bal = walletBalances[wallet.id] || 0;
              const isSecret = walletService.isSecretWallet(wallet);
              return (
                <TouchableOpacity
                  key={wallet.id}
                  style={[
                    styles.walletRow,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isSecret ? colors.error : colors.outlineVariant,
                      borderWidth: isSecret ? 1.5 : 1,
                    },
                  ]}
                  onPress={() => openEditModal(wallet)}
                  activeOpacity={0.75}>
                  <IconChip
                    iconName={
                      (wallet.icon ||
                        (isSecret ? "lock-closed-outline" : "wallet-outline")) as any
                    }
                    colorName={(wallet.color as any) || (isSecret ? "gray" : "teal")}
                    size={40}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text
                        style={[
                          typography.label,
                          { color: colors.onBackground, fontSize: 15 },
                        ]}>
                        {wallet.name}
                      </Text>
                      {isSecret && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 3,
                            backgroundColor: "rgba(239, 68, 68, 0.15)",
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}>
                          <Ionicons
                            name="lock-closed"
                            size={10}
                            color={colors.error}
                          />
                          <Text
                            style={{
                              fontSize: 9,
                              fontWeight: "700",
                              color: colors.error,
                            }}>
                            Secret · Excluded
                          </Text>
                        </View>
                      )}
                      {Boolean(wallet.archived) && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 3,
                            backgroundColor: colors.surfaceVariant,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}>
                          <Ionicons
                            name="archive-outline"
                            size={10}
                            color={colors.onSurfaceVariant}
                          />
                          <Text
                            style={{
                              fontSize: 9,
                              fontWeight: "700",
                              color: colors.onSurfaceVariant,
                            }}>
                            Archived
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        textTransform: "capitalize",
                        color: colors.onSurfaceVariant,
                      }}>
                      {wallet.type} · Initial: {formatCurrency(wallet.initialBalance || 0)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", marginRight: 8 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "800",
                        color: colors.onBackground,
                      }}>
                      {formatCurrency(bal)}
                    </Text>
                  </View>
                  {wallet.archived ? (
                    <TouchableOpacity
                      onPress={async () => {
                        await walletService.unarchiveWallet(wallet.id);
                        await loadWallets();
                        showSuccess(`Unarchived "${wallet.name}"`);
                      }}
                      style={{ padding: 6 }}>
                      <Ionicons
                        name="arrow-undo-outline"
                        size={18}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleDeleteWallet(wallet)}
                      style={{ padding: 6 }}>
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={colors.error}
                      />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[
                styles.walletAddRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.outlineVariant,
                },
              ]}
              onPress={openAddModal}
              activeOpacity={0.7}>
              <Ionicons
                name="add-circle-outline"
                size={22}
                color={colors.primary}
              />
              <Text
                style={[
                  typography.label,
                  { color: colors.primary, fontWeight: "700" },
                ]}>
                Add New Account
              </Text>
            </TouchableOpacity>
          </View>
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
        onSuccess={async () => {
          await loadWallets();
        }}
      />

      {/* Move Transactions & Delete Modal */}
      <Modal
        visible={showMoveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMoveModal(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
            padding: spacing.lg,
          }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: spacing.lg,
              width: "100%",
              maxWidth: 400,
              borderWidth: 1,
              borderColor: colors.outlineVariant,
            }}>
            <Text
              style={[
                typography.h3,
                { color: colors.onSurface, fontWeight: "700", marginBottom: 8 },
              ]}>
              Move Transactions
            </Text>
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.onSurfaceVariant, marginBottom: spacing.md },
              ]}>
              Select the active wallet to receive all transactions from "{walletToMove?.name}" before deleting it:
            </Text>
            <View style={{ gap: 8, marginBottom: spacing.lg }}>
              {wallets
                .filter((w) => w.id !== walletToMove?.id && !w.archived)
                .map((w) => {
                  const selected = destinationWalletId === w.id;
                  return (
                    <TouchableOpacity
                      key={w.id}
                      onPress={() => setDestinationWalletId(w.id)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: selected
                          ? colors.primaryContainer
                          : colors.surfaceVariant,
                      }}>
                      <Text
                        style={{
                          fontWeight: "600",
                          color: selected
                            ? colors.onPrimaryContainer
                            : colors.onSurface,
                        }}>
                        {w.name}
                      </Text>
                      {selected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: colors.surfaceVariant,
                }}
                onPress={() => setShowMoveModal(false)}>
                <Text style={{ fontWeight: "700", color: colors.onSurface }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: colors.error,
                }}
                onPress={async () => {
                  if (!walletToMove || !destinationWalletId) return;
                  try {
                    await walletService.reassignTransactions(
                      walletToMove.id,
                      destinationWalletId,
                    );
                    const { db } = await import("../database/queries");
                    await db.wallets.hardDeleteWallet(walletToMove.id);
                    await dispatch(fetchTransactions());
                    await loadWallets();
                    setShowMoveModal(false);
                    showSuccess(
                      `Moved transactions and deleted "${walletToMove.name}"`,
                    );
                  } catch {
                    showError("Failed to move transactions and delete wallet");
                  }
                }}>
                <Text style={{ fontWeight: "700", color: "#FFFFFF" }}>
                  Move & Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <ToastOverlay />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  viewToggle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  walletCard: {
    width: CARD_WIDTH,
    margin: CARD_MARGIN,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  addCard: {
    width: CARD_WIDTH,
    margin: CARD_MARGIN,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
  },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  walletAddRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
  },
});

export default WalletManagementScreen;
