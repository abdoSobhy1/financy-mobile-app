import { styles } from "./TransferModal.styles";
import { useTransferModal } from "../hooks/useTransferModal";
import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { WalletAccount } from "../../../shared/types";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { ToastOverlay } from "../../../shared/ui";

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
  const { budgetsMap, fromWalletId, toWalletId, setToWalletId, transferAmount, setTransferAmount, transferBudgetId, setTransferBudgetId, transferError, setTransferError, loading, amountInputRef, visibleWallets, handleFromWalletChange, handleTransferSubmit, confirmExit, destinationOptions } = useTransferModal({ visible, onClose, wallets, initialFromWalletId, initialToWalletId, onSuccess });
  const { colors, typography, spacing, radius, currencySymbol } = useAppTheme();

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
