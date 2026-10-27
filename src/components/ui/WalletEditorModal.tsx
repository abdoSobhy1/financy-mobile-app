import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WalletAccount, WalletType } from "../../types";
import { useAppTheme } from "./ThemeProvider";
import { IconChip } from "./IconChip";
import { Switch } from "./Switch";

export const WALLET_ICONS = [
  "cash-outline",
  "wallet-outline",
  "business-outline",
  "card-outline",
  "phone-portrait-outline",
  "briefcase-outline",
  "lock-closed-outline",
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

export const WALLET_COLORS = [
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
  const { colors, typography, spacing, currencySymbol } = useAppTheme();

  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<WalletType>("bank");
  const [formIcon, setFormIcon] = useState("business-outline");
  const [formColor, setFormColor] = useState("blue");
  const [formInitialBalance, setFormInitialBalance] = useState("");
  const [formIsSecret, setFormIsSecret] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editingWallet) {
        setFormName(editingWallet.name);
        setFormType(editingWallet.type);
        setFormIcon(editingWallet.icon || "wallet-outline");
        setFormColor(editingWallet.color || "teal");
        setFormInitialBalance(currentBalance.toString());
        setFormIsSecret(
          Boolean(editingWallet.isSecret || (editingWallet as any).type === "secret")
        );
      } else {
        setFormName("");
        setFormType("bank");
        setFormIcon("business-outline");
        setFormColor("blue");
        setFormInitialBalance("");
        setFormIsSecret(false);
      }
    }
  }, [visible, editingWallet, currentBalance]);

  const handleSave = () => {
    onSave({
      name: formName,
      type: formType,
      icon: formIcon,
      color: formColor,
      initialBalance: formInitialBalance,
      isSecret: formIsSecret,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
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
            <TouchableOpacity onPress={onClose}>
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
                        fontSize: 11,
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

            {/* Secret Wallet Toggle (Matches Settings Switch Row) */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                const nextVal = !formIsSecret;
                setFormIsSecret(nextVal);
                if (nextVal) {
                  setFormIcon("lock-closed-outline");
                }
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: colors.surfaceVariant,
                padding: spacing.md,
                borderRadius: 14,
                marginBottom: spacing.md,
              }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: formIsSecret
                    ? colors.errorContainer
                    : colors.primaryContainer,
                  marginRight: 10,
                }}>
                <Ionicons
                  name="lock-closed"
                  size={16}
                  color={formIsSecret ? colors.error : colors.primary}
                />
              </View>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: colors.onSurface,
                  }}>
                  Secret Wallet
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.onSurfaceVariant,
                    marginTop: 2,
                  }}>
                  Money added will not show up in totals unless assigned to a budget
                </Text>
              </View>
              <Switch
                value={formIsSecret}
                onValueChange={(val) => {
                  setFormIsSecret(val);
                  if (val) {
                    setFormIcon("lock-closed-outline");
                  }
                }}
              />
            </TouchableOpacity>

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
              style={{
                backgroundColor: colors.surfaceVariant,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: colors.onSurface,
                fontSize: 16,
                fontWeight: "700",
                marginBottom: 4,
              }}
              value={formInitialBalance}
              onChangeText={setFormInitialBalance}
              placeholder="0.00"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="decimal-pad"
            />
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
                      borderColor: selected ? colors.primary : "transparent",
                    }}>
                    <Ionicons
                      name={ic as any}
                      size={22}
                      color={
                        selected ? colors.onPrimaryContainer : colors.onSurface
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
                      borderColor: selected ? colors.primary : "transparent",
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
              onPress={onClose}
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
              onPress={handleSave}
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
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
  },
});
