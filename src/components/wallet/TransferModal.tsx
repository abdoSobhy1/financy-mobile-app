import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { WalletAccount } from "../../types";
import { useAppTheme } from "../ui/ThemeProvider";
import { useToast, ToastOverlay } from "../ui";
import { AppDispatch, RootState } from "../../store";
import { fetchTransactions } from "../../store/slices/transactionsSlice";
import { walletService } from "../../services/walletService";
import { formatCurrency } from "../../utils";
import { useUnsavedChanges } from "../../hooks";

export interface TransferModalProps {
  visible: boolean;
  onClose: () => void;
  wallets: WalletAccount[];
  initialFromWalletId?: string;
  initialToWalletId?: string;
  onSuccess?: (fromId: string, toId: string, amount: number) => Promise<void> | void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  visible,
  onClose,
  wallets,
  initialFromWalletId,
  initialToWalletId,
  onSuccess,
}) => {
  const { colors, typography, spacing, radius, currencySymbol } = useAppTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { showSuccess, showError, showInfo } = useToast();

  const budgetsMap = useSelector((state: RootState) => state.budgets.items);

  const [fromWalletId, setFromWalletId] = useState<string>("");
  const [toWalletId, setToWalletId] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [transferBudgetId, setTransferBudgetId] = useState<string>("");
  const [transferError, setTransferError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const amountInputRef = useRef<TextInput>(null);

  const visibleWallets = walletService.getVisibleWallets(wallets);

  useEffect(() => {
    if (visible) {
      if (visibleWallets.length < 2) {
        showInfo("Please create another account first to make transfers.");
        onClose();
        return;
      }

      setTransferAmount("");
      setTransferBudgetId("");
      setTransferError("");
      setLoading(false);

      const defaultFrom =
        initialFromWalletId && visibleWallets.some((w) => w.id === initialFromWalletId)
          ? initialFromWalletId
          : visibleWallets[0]?.id || "";

      const defaultToCandidates = visibleWallets.filter((w) => w.id !== defaultFrom);
      const defaultTo =
        initialToWalletId &&
        initialToWalletId !== defaultFrom &&
        defaultToCandidates.some((w) => w.id === initialToWalletId)
          ? initialToWalletId
          : defaultToCandidates[0]?.id || "";

      setFromWalletId(defaultFrom);
      setToWalletId(defaultTo);
    }
  }, [visible, initialFromWalletId, initialToWalletId, wallets.length]);

  const handleFromWalletChange = (newFromId: string) => {
    setFromWalletId(newFromId);
    if (transferError) setTransferError("");

    // If destination is now the same as source, pick the first other available wallet
    if (toWalletId === newFromId) {
      const otherCandidate = visibleWallets.find((w) => w.id !== newFromId);
      if (otherCandidate) {
        setToWalletId(otherCandidate.id);
      }
    }
  };

  const handleTransferSubmit = async () => {
    const cleaned = transferAmount.trim().replace(/,/g, "");
    const amt = parseFloat(cleaned);

    if (!amt || isNaN(amt) || amt <= 0) {
      setTransferError("Please enter a valid transfer amount");
      amountInputRef.current?.focus();
      return;
    }

    if (!fromWalletId || !toWalletId || fromWalletId === toWalletId) {
      setTransferError("Source and destination accounts must be different");
      return;
    }

    setLoading(true);
    setTransferError("");

    try {
      await walletService.transferBetweenWallets(
        fromWalletId,
        toWalletId,
        amt,
        transferBudgetId || undefined,
      );

      await dispatch(fetchTransactions());

      // If budget assigned, trigger notification if over 80%
      if (transferBudgetId) {
        const targetBudget = budgetsMap[transferBudgetId];
        if (targetBudget && !targetBudget.deleted && targetBudget.alertsEnabled !== false) {
          try {
            const now = new Date();
            const isWeekly = targetBudget.period === "weekly";
            const diffToMon = (now.getDay() + 6) % 7;
            const start = isWeekly
              ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMon, 0, 0, 0, 0)
              : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            const end = isWeekly
              ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMon + 6, 23, 59, 59, 999)
              : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

            const { db } = await import("../../database/queries");
            const progress = await db.budgets.getBudgetProgressForPeriod(
              targetBudget.id,
              start.toISOString(),
              end.toISOString(),
            );
            if (progress && progress.percentageUsed >= 80) {
              const { default: NotificationService } = await import(
                "../../services/notificationService"
              );
              await NotificationService.getInstance().sendBudgetAlertNotification(
                targetBudget.name,
                formatCurrency(progress.spent),
                formatCurrency(targetBudget.amount),
                progress.percentageUsed,
                targetBudget.id,
              );
            }
          } catch {}
        }
      }

      showSuccess("Transfer completed successfully");
      await onSuccess?.(fromWalletId, toWalletId, amt);
      onClose();
    } catch (err: any) {
      console.error("[TransferModal] Error:", err);
      showError(err?.message || "Failed to complete transfer");
    } finally {
      setLoading(false);
    }
  };

  const { confirmExit } = useUnsavedChanges({
    hasChanges: visible && transferAmount.trim() !== "",
    title: "Discard Transfer",
    isModal: true,
    enabled: visible,
  });

  // Only wallets other than fromWalletId can be selected as destination
  const destinationOptions = visibleWallets.filter((w) => w.id !== fromWalletId);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => confirmExit(onClose)}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.outlineVariant,
            },
          ]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.primaryContainer },
                ]}>
                <Ionicons name="swap-horizontal" size={20} color={colors.onPrimaryContainer} />
              </View>
              <Text
                style={[
                  typography.h3,
                  { color: colors.onSurface, fontWeight: "800" },
                ]}>
                Transfer Money
              </Text>
            </View>
            <TouchableOpacity onPress={() => confirmExit(onClose)} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* FROM ACCOUNT */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors.onSurfaceVariant,
                marginBottom: 8,
                letterSpacing: 0.5,
              }}>
              FROM ACCOUNT
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, marginBottom: spacing.md }}>
              {visibleWallets.map((w) => {
                const selected = w.id === fromWalletId;
                return (
                  <TouchableOpacity
                    key={`from_${w.id}`}
                    onPress={() => handleFromWalletChange(w.id)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 14,
                      backgroundColor: selected
                        ? colors.primaryContainer
                        : colors.surfaceVariant,
                      borderWidth: 1,
                      borderColor: selected ? colors.primary : colors.outlineVariant,
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

            {/* TO ACCOUNT (excludes fromWalletId so user cannot select the same wallet) */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors.onSurfaceVariant,
                marginBottom: 8,
                letterSpacing: 0.5,
              }}>
              TO ACCOUNT
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, marginBottom: spacing.md }}>
              {destinationOptions.map((w) => {
                const selected = w.id === toWalletId;
                return (
                  <TouchableOpacity
                    key={`to_${w.id}`}
                    onPress={() => {
                      setToWalletId(w.id);
                      if (transferError) setTransferError("");
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 14,
                      backgroundColor: selected
                        ? colors.primaryContainer
                        : colors.surfaceVariant,
                      borderWidth: 1,
                      borderColor: selected ? colors.primary : colors.outlineVariant,
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

            {/* Optional Budget Assignment */}
            {Object.values(budgetsMap).some((b) => !b.deleted) && (
              <>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: colors.onSurfaceVariant,
                    marginBottom: 8,
                    letterSpacing: 0.5,
                  }}>
                  ASSIGN TO BUDGET (OPTIONAL)
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, marginBottom: spacing.md }}>
                  <TouchableOpacity
                    onPress={() => setTransferBudgetId("")}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 14,
                      backgroundColor: !transferBudgetId
                        ? colors.primaryContainer
                        : colors.surfaceVariant,
                      borderWidth: 1,
                      borderColor: !transferBudgetId ? colors.primary : colors.outlineVariant,
                    }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: !transferBudgetId
                          ? colors.onPrimaryContainer
                          : colors.onSurface,
                      }}>
                      None
                    </Text>
                  </TouchableOpacity>
                  {Object.values(budgetsMap)
                    .filter((b) => !b.deleted)
                    .map((b) => {
                      const selected = b.id === transferBudgetId;
                      return (
                        <TouchableOpacity
                          key={`transfer_b_${b.id}`}
                          onPress={() => setTransferBudgetId(b.id)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 9,
                            borderRadius: 14,
                            backgroundColor: selected
                              ? colors.primaryContainer
                              : colors.surfaceVariant,
                            borderWidth: 1,
                            borderColor: selected ? colors.primary : colors.outlineVariant,
                          }}>
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "700",
                              color: selected
                                ? colors.onPrimaryContainer
                                : colors.onSurface,
                            }}>
                            {b.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </>
            )}

            {/* TRANSFER AMOUNT */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors.onSurfaceVariant,
                marginBottom: 6,
                letterSpacing: 0.5,
              }}>
              TRANSFER AMOUNT ({currencySymbol.trim()})
            </Text>
            <TextInput
              ref={amountInputRef}
              style={{
                backgroundColor: colors.surfaceVariant,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: colors.onSurface,
                fontSize: 18,
                fontWeight: "800",
                borderWidth: 1,
                borderColor: transferError ? colors.error : "transparent",
                marginBottom: transferError ? 4 : spacing.lg,
              }}
              value={transferAmount}
              onChangeText={(text) => {
                setTransferAmount(text);
                if (transferError) setTransferError("");
              }}
              placeholder="0.00"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            {transferError ? (
              <Text
                style={{
                  color: colors.error,
                  fontSize: 12,
                  fontWeight: "600",
                  marginBottom: spacing.md,
                }}>
                {transferError}
              </Text>
            ) : null}

            {/* Action Buttons */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => confirmExit(onClose)}
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
                onPress={handleTransferSubmit}
                disabled={loading}
                style={{
                  flex: 1.5,
                  backgroundColor: colors.primary,
                  paddingVertical: 14,
                  borderRadius: 16,
                  alignItems: "center",
                  opacity: loading ? 0.7 : 1,
                }}>
                <Text
                  style={{
                    color: colors.onPrimary,
                    fontWeight: "800",
                    fontSize: 15,
                  }}>
                  {loading ? "Transferring..." : "Confirm Transfer"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
      <ToastOverlay />
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    maxHeight: "88%",
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    padding: 4,
  },
});
