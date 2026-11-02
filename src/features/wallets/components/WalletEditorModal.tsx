import { WalletPreview } from "./WalletPreview";
import { WalletTypePicker } from "./WalletTypePicker";
import { WalletPrivacyToggle } from "./WalletPrivacyToggle";
import { WalletIconPicker } from "./WalletIconPicker";
import { WalletColorPicker } from "./WalletColorPicker";
import { useWalletEditorModal } from "../hooks/useWalletEditorModal";
import { styles } from "./WalletEditorModal.styles";
import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WalletAccount, WalletType } from "../../../shared/types";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";

import { ToastOverlay } from "../../../shared/ui/ToastProvider";
export { WALLET_COLORS, WALLET_ICONS } from "../model/walletEditorOptions";

export interface WalletEditorFormValues {
  name: string;
  type: WalletType;
  icon: string;
  color: string;
  initialBalance: string;
  isSecret: boolean;
}

interface WalletEditorModalProps {
  visible: boolean;
  editingWallet?: WalletAccount | null;
  currentBalance?: number;
  onClose: () => void;
  onSave: (values: WalletEditorFormValues) => Promise<void> | void;
}

export const WalletEditorModal: React.FC<WalletEditorModalProps> = ({
  visible,
  editingWallet = null,
  currentBalance = 0,
  onClose,
  onSave,
}) => {
  const { formName, setFormName, formType, setFormType, formIcon, setFormIcon, formColor, setFormColor, formInitialBalance, setFormInitialBalance, formIsSecret, setFormIsSecret, errors, setErrors, isSubmitting, nameInputRef, balanceInputRef, handleSave, confirmExit } = useWalletEditorModal({ visible, editingWallet, currentBalance, onClose, onSave });
  const { colors, typography, spacing, currencySymbol } = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => confirmExit(onClose)}>
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
            <TouchableOpacity onPress={() => confirmExit(onClose)}>
              <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Live Preview */}
            <WalletPreview colors={colors} spacing={spacing} formIcon={formIcon} formColor={formColor} formName={formName} formType={formType} />

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
              ref={nameInputRef}
              style={{
                backgroundColor: colors.surfaceVariant,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: colors.onSurface,
                fontSize: 15,
                borderWidth: 1,
                borderColor: errors.name ? colors.error : "transparent",
                marginBottom: errors.name ? 4 : spacing.md,
              }}
              value={formName}
              onChangeText={(text) => {
                setFormName(text);
                if (errors.name) {
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              placeholder="e.g. CIB Salary, Vodafone Cash, Cash Safe"
              placeholderTextColor={colors.onSurfaceVariant}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => balanceInputRef.current?.focus()}
            />
            {errors.name && (
              <Text
                style={{
                  color: colors.error,
                  fontSize: 12,
                  fontWeight: "600",
                  marginBottom: spacing.md,
                }}>
                {errors.name}
              </Text>
            )}

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
            <WalletTypePicker spacing={spacing} formType={formType} setFormType={setFormType} colors={colors} />

            {/* Secret Wallet Toggle (Matches Settings Switch Row) */}
            <WalletPrivacyToggle formIsSecret={formIsSecret} setFormIsSecret={setFormIsSecret} setFormIcon={setFormIcon} colors={colors} spacing={spacing} />

            {/* Initial / Reconcile Balance */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors.onSurfaceVariant,
                marginBottom: 6,
                letterSpacing: 0.5,
              }}>
              {editingWallet
                ? `RECONCILE BALANCE (${currencySymbol.trim()})`
                : `INITIAL BALANCE (${currencySymbol.trim()})`}
            </Text>
            <TextInput
              ref={balanceInputRef}
              style={{
                backgroundColor: colors.surfaceVariant,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: colors.onSurface,
                fontSize: 16,
                fontWeight: "700",
                borderWidth: 1,
                borderColor: errors.initialBalance ? colors.error : "transparent",
                marginBottom: errors.initialBalance ? 4 : 4,
              }}
              value={formInitialBalance}
              onChangeText={(text) => {
                setFormInitialBalance(text);
                if (errors.initialBalance) {
                  setErrors((prev) => ({ ...prev, initialBalance: undefined }));
                }
              }}
              placeholder="0.00"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            {errors.initialBalance && (
              <Text
                style={{
                  color: colors.error,
                  fontSize: 12,
                  fontWeight: "600",
                  marginBottom: 4,
                }}>
                {errors.initialBalance}
              </Text>
            )}
            <Text
              style={{
                fontSize: 11,
                color: colors.onSurfaceVariant,
                marginBottom: spacing.md,
              }}>
              {editingWallet
                ? 'Enter the actual current balance. An adjustment transaction named "Balance adjustment" will be created for the difference.'
                : "Starting balance for this account."}
            </Text>

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
            <WalletIconPicker spacing={spacing} formIcon={formIcon} setFormIcon={setFormIcon} colors={colors} />

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
            <WalletColorPicker spacing={spacing} formColor={formColor} setFormColor={setFormColor} colors={colors} />
          </ScrollView>

          {/* Action Buttons */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              disabled={isSubmitting}
              onPress={() => confirmExit(onClose)}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.outlineVariant,
                opacity: isSubmitting ? 0.6 : 1,
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
              disabled={isSubmitting}
              onPress={handleSave}
              style={{
                flex: 1.5,
                backgroundColor: colors.primary,
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: "center",
                opacity: isSubmitting ? 0.7 : 1,
              }}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text
                  style={{
                    color: colors.onPrimary,
                    fontWeight: "800",
                    fontSize: 15,
                  }}>
                  {editingWallet ? "Save Changes" : "Create Account"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <ToastOverlay visible={visible} priority={1} />
    </Modal>
  );
};
