import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { Card, useToast } from "../components/ui";
import { formatCurrency } from "../utils";
import { AlertService } from "../services/AlertService";

const { width } = Dimensions.get("window");
const CARD_MARGIN = 8;
const CARD_WIDTH = (width - 40 - CARD_MARGIN * 2) / 2;

const WALLET_ICONS = [
  "cash-outline",
  "wallet-outline",
  "business-outline",
  "card-outline",
  "phone-portrait-outline",
  "briefcase-outline",
  "vault-outline",
  "globe-outline",
  "diamond-outline",
  "cart-outline",
  "save-outline",
  "trending-up-outline",
  "receipt-outline",
  "shield-checkmark-outline",
  "pricetag-outline",
  "pie-chart-outline",
];

const WALLET_COLORS = [
  "teal",
  "blue",
  "green",
  "purple",
  "orange",
  "indigo",
  "pink",
  "brown",
  "bluegrey",
  "red",
];

export const WalletManagementScreen: React.FC = () => {
  const { colors, typography, spacing, radius, isDark, currencySymbol } =
    useAppTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { showSuccess, showError } = useToast();

  const transactions = useSelector(
    (state: RootState) => state.transactions.items,
  );

  const [wallets, setWallets] = useState<WalletAccount[]>([]);
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({});
  const [activeType, setActiveType] = useState<"all" | WalletType>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Add / Edit Modal state
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletAccount | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<WalletType>("bank");
  const [formIcon, setFormIcon] = useState("business-outline");
  const [formColor, setFormColor] = useState("blue");
  const [formInitialBalance, setFormInitialBalance] = useState("");

  // Transfer Modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromWalletId, setFromWalletId] = useState("");
  const [toWalletId, setToWalletId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  const loadWallets = useCallback(async () => {
    try {
      const list = await walletService.getWallets();
      const allTx = Object.values(transactions).filter((t) => !t.deleted);
      setWallets(list);
      setWalletBalances(walletService.calculateWalletBalances(list, allTx));
      if (list.length >= 2) {
        setFromWalletId(list[0].id);
        setToWalletId(list[1].id);
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
    return Object.values(walletBalances).reduce((sum, b) => sum + b, 0);
  }, [walletBalances]);

  const filteredWallets = useMemo(() => {
    if (activeType === "all") return wallets;
    return wallets.filter((w) => w.type === activeType);
  }, [wallets, activeType]);

  const openAddModal = () => {
    setEditingWallet(null);
    setFormName("");
    setFormType("bank");
    setFormIcon("business-outline");
    setFormColor("blue");
    setFormInitialBalance("");
    setShowEditorModal(true);
  };

  const openEditModal = (wallet: WalletAccount) => {
    setEditingWallet(wallet);
    setFormName(wallet.name);
    setFormType(wallet.type);
    setFormIcon(wallet.icon || "wallet-outline");
    setFormColor(wallet.color || "teal");
    setFormInitialBalance(wallet.initialBalance?.toString() || "0");
    setShowEditorModal(true);
  };

  const handleSaveWallet = async () => {
    if (!formName.trim()) {
      showError("Please enter an account name");
      return;
    }

    const initBal = parseFloat(formInitialBalance) || 0;
    try {
      if (editingWallet) {
        const updated = await walletService.updateWallet(editingWallet.id, {
          name: formName.trim(),
          type: formType,
          icon: formIcon,
          color: formColor,
          initialBalance: initBal,
        });
        const allTx = Object.values(transactions).filter((t) => !t.deleted);
        setWallets(updated);
        setWalletBalances(walletService.calculateWalletBalances(updated, allTx));
        showSuccess(`Updated "${formName.trim()}"`);
      } else {
        const updated = await walletService.addWallet({
          name: formName.trim(),
          type: formType,
          icon: formIcon,
          color: formColor,
          initialBalance: initBal,
        });
        const allTx = Object.values(transactions).filter((t) => !t.deleted);
        setWallets(updated);
        setWalletBalances(walletService.calculateWalletBalances(updated, allTx));
        showSuccess(`Created "${formName.trim()}"`);
      }
      setShowEditorModal(false);
    } catch {
      showError("Failed to save account");
    }
  };

  const handleDeleteWallet = (wallet: WalletAccount) => {
    if (wallets.length <= 1) {
      showError("You must keep at least one account");
      return;
    }

    AlertService.alert(
      `Delete "${wallet.name}"?`,
      "Transactions linked to this wallet will remain in your history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updated = await walletService.deleteWallet(wallet.id);
            const allTx = Object.values(transactions).filter((t) => !t.deleted);
            setWallets(updated);
            setWalletBalances(walletService.calculateWalletBalances(updated, allTx));
            showSuccess(`Deleted "${wallet.name}"`);
          },
        },
      ],
    );
  };

  const handleTransferSubmit = async () => {
    const amt = parseFloat(transferAmount);
    if (!amt || amt <= 0) {
      showError("Please enter a valid transfer amount");
      return;
    }
    if (fromWalletId === toWalletId) {
      showError("Source and destination accounts must be different");
      return;
    }

    const allTx = Object.values(transactions).filter((t) => !t.deleted);
    const updated = await walletService.transferBetweenWallets(
      fromWalletId,
      toWalletId,
      amt,
    );
    setWallets(updated);
    setWalletBalances(walletService.calculateWalletBalances(updated, allTx));
    setTransferAmount("");
    setShowTransferModal(false);
    showSuccess("Transfer completed successfully");
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
      <AppHeader title="Wallets & Accounts" showBack={true} />

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
              TOTAL BALANCE ACROSS WALLETS
            </Text>
            <View
              style={{
                backgroundColor: "rgba(0,0,0,0.12)",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
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
              onPress={() => setShowTransferModal(true)}
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
                backgroundColor: "rgba(0,0,0,0.12)",
                paddingVertical: 10,
                borderRadius: 16,
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
            {(["all", "cash", "bank", "card", "wallet"] as const).map((t) => {
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
              return (
                <TouchableOpacity
                  key={wallet.id}
                  style={[
                    styles.walletCard,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderColor: colors.outlineVariant,
                    },
                  ]}
                  onPress={() => openEditModal(wallet)}
                  activeOpacity={0.75}>
                  <View style={{ alignItems: "center", marginBottom: 10 }}>
                    <IconChip
                      iconName={(wallet.icon || "wallet-outline") as any}
                      colorName={(wallet.color as any) || "teal"}
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
                      onPress={() => {
                        setFromWalletId(wallet.id);
                        setShowTransferModal(true);
                      }}
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
              return (
                <TouchableOpacity
                  key={wallet.id}
                  style={[
                    styles.walletRow,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderColor: colors.outlineVariant,
                    },
                  ]}
                  onPress={() => openEditModal(wallet)}
                  activeOpacity={0.75}>
                  <IconChip
                    iconName={(wallet.icon || "wallet-outline") as any}
                    colorName={(wallet.color as any) || "teal"}
                    size={40}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text
                      style={[
                        typography.label,
                        { color: colors.onBackground, fontSize: 15 },
                      ]}>
                      {wallet.name}
                    </Text>
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
                  <TouchableOpacity
                    onPress={() => handleDeleteWallet(wallet)}
                    style={{ padding: 6 }}>
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={colors.error}
                    />
                  </TouchableOpacity>
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
      <Modal
        visible={showEditorModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditorModal(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.outlineVariant,
                maxHeight: "90%",
              },
            ]}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: spacing.md,
              }}>
              <Text
                style={[
                  typography.h3,
                  { color: colors.onSurface, fontWeight: "800" },
                ]}>
                {editingWallet ? "Edit Account" : "New Account"}
              </Text>
              <TouchableOpacity onPress={() => setShowEditorModal(false)}>
                <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Live Preview */}
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 14,
                  backgroundColor: colors.surfaceVariant,
                  borderRadius: 20,
                  marginBottom: spacing.md,
                }}>
                <IconChip
                  iconName={formIcon as any}
                  colorName={formColor as any}
                  size={56}
                />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "800",
                    color: colors.onSurface,
                    marginTop: 8,
                  }}>
                  {formName || "Account Name"}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    textTransform: "capitalize",
                    color: colors.onSurfaceVariant,
                  }}>
                  {formType} Account
                </Text>
              </View>

              {/* Name Input */}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: colors.onSurfaceVariant,
                  marginBottom: 6,
                  letterSpacing: 0.5,
                }}>
                ACCOUNT NAME
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.surfaceVariant,
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: colors.onSurface,
                  fontSize: 15,
                  marginBottom: spacing.md,
                }}
                value={formName}
                onChangeText={setFormName}
                placeholder="e.g. CIB Salary, Vodafone Cash, Cash Safe"
                placeholderTextColor={colors.onSurfaceVariant}
              />

              {/* Account Type */}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: colors.onSurfaceVariant,
                  marginBottom: 6,
                  letterSpacing: 0.5,
                }}>
                ACCOUNT TYPE
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  marginBottom: spacing.md,
                }}>
                {(["cash", "bank", "card", "wallet"] as WalletType[]).map((wt) => {
                  const selected = formType === wt;
                  return (
                    <TouchableOpacity
                      key={wt}
                      onPress={() => setFormType(wt)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 12,
                        alignItems: "center",
                        backgroundColor: selected
                          ? colors.primaryContainer
                          : colors.surfaceVariant,
                      }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          textTransform: "capitalize",
                          color: selected
                            ? colors.onPrimaryContainer
                            : colors.onSurface,
                        }}>
                        {wt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Initial Balance */}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: colors.onSurfaceVariant,
                  marginBottom: 6,
                  letterSpacing: 0.5,
                }}>
                INITIAL BALANCE ({currencySymbol.trim()})
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.surfaceVariant,
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: colors.onSurface,
                  fontSize: 16,
                  fontWeight: "700",
                  marginBottom: spacing.md,
                }}
                value={formInitialBalance}
                onChangeText={setFormInitialBalance}
                placeholder="0.00"
                placeholderTextColor={colors.onSurfaceVariant}
                keyboardType="decimal-pad"
              />

              {/* Icon Picker Grid */}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: colors.onSurfaceVariant,
                  marginBottom: 8,
                  letterSpacing: 0.5,
                }}>
                CUSTOM ICON
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: spacing.md,
                }}>
                {WALLET_ICONS.map((ic) => {
                  const selected = formIcon === ic;
                  return (
                    <TouchableOpacity
                      key={ic}
                      onPress={() => setFormIcon(ic)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: selected
                          ? colors.primaryContainer
                          : colors.surfaceVariant,
                        borderWidth: 1,
                        borderColor: selected
                          ? colors.primary
                          : "transparent",
                      }}>
                      <Ionicons
                        name={ic as any}
                        size={22}
                        color={
                          selected
                            ? colors.onPrimaryContainer
                            : colors.onSurface
                        }
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Color Picker Palette */}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: colors.onSurfaceVariant,
                  marginBottom: 8,
                  letterSpacing: 0.5,
                }}>
                CUSTOM COLOR THEME
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: spacing.lg,
                }}>
                {WALLET_COLORS.map((col) => {
                  const selected = formColor === col;
                  return (
                    <TouchableOpacity
                      key={col}
                      onPress={() => setFormColor(col)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 12,
                        backgroundColor: selected
                          ? colors.primaryContainer
                          : colors.surfaceVariant,
                        borderWidth: 1,
                        borderColor: selected
                          ? colors.primary
                          : "transparent",
                      }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          textTransform: "capitalize",
                          color: selected
                            ? colors.onPrimaryContainer
                            : colors.onSurface,
                        }}>
                        {col}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowEditorModal(false)}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 16,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.outlineVariant,
                }}>
                <Text
                  style={{
                    color: colors.onSurfaceVariant,
                    fontWeight: "700",
                    fontSize: 15,
                  }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveWallet}
                style={{
                  flex: 1.5,
                  backgroundColor: colors.primary,
                  paddingVertical: 14,
                  borderRadius: 16,
                  alignItems: "center",
                }}>
                <Text
                  style={{
                    color: colors.onPrimary,
                    fontWeight: "800",
                    fontSize: 15,
                  }}>
                  {editingWallet ? "Save Changes" : "Create Account"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Wallet-to-Wallet Transfer Modal */}
      <Modal
        visible={showTransferModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTransferModal(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.outlineVariant,
              },
            ]}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: spacing.md,
              }}>
              <Text
                style={[
                  typography.h3,
                  { color: colors.onSurface, fontWeight: "800" },
                ]}>
                Transfer Between Accounts
              </Text>
              <TouchableOpacity onPress={() => setShowTransferModal(false)}>
                <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors.onSurfaceVariant,
                marginBottom: 6,
              }}>
              FROM ACCOUNT
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, marginBottom: spacing.md }}>
              {wallets.map((w) => {
                const selected = w.id === fromWalletId;
                return (
                  <TouchableOpacity
                    key={`from_${w.id}`}
                    onPress={() => setFromWalletId(w.id)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 14,
                      backgroundColor: selected
                        ? colors.primaryContainer
                        : colors.surfaceVariant,
                    }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: selected
                          ? colors.onPrimaryContainer
                          : colors.onSurface,
                      }}>
                      {w.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors.onSurfaceVariant,
                marginBottom: 6,
              }}>
              TO ACCOUNT
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, marginBottom: spacing.md }}>
              {wallets.map((w) => {
                const selected = w.id === toWalletId;
                return (
                  <TouchableOpacity
                    key={`to_${w.id}`}
                    onPress={() => setToWalletId(w.id)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 14,
                      backgroundColor: selected
                        ? colors.primaryContainer
                        : colors.surfaceVariant,
                    }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: selected
                          ? colors.onPrimaryContainer
                          : colors.onSurface,
                      }}>
                      {w.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors.onSurfaceVariant,
                marginBottom: 6,
              }}>
              TRANSFER AMOUNT ({currencySymbol.trim()})
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.surfaceVariant,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: colors.onSurface,
                fontSize: 18,
                fontWeight: "800",
                marginBottom: spacing.lg,
              }}
              value={transferAmount}
              onChangeText={setTransferAmount}
              placeholder="0.00"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="decimal-pad"
            />

            <TouchableOpacity
              onPress={handleTransferSubmit}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: "center",
              }}>
              <Text
                style={{
                  color: colors.onPrimary,
                  fontWeight: "800",
                  fontSize: 15,
                }}>
                Confirm Transfer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
