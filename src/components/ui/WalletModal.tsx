import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../constants";
import { Wallet, WalletFormData } from "../../types";
import { useAppTheme } from "../../theme";
import { IconPicker } from "./IconPicker";

const PREDEFINED_COLORS = [
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EF4444",
  "#F59E0B",
  "#EC4899",
  "#06B6D4",
  "#64748B",
];

interface WalletModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (walletData: WalletFormData) => void;
  initialWallet?: Wallet | null;
  title?: string;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  visible,
  onClose,
  onSave,
  initialWallet,
  title = "Add Wallet",
}) => {
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [color, setColor] = useState("#10B981");
  const [icon, setIcon] = useState("wallet");

  useEffect(() => {
    if (initialWallet) {
      setName(initialWallet.name);
      setBalance(String(initialWallet.balance));
      setColor(initialWallet.color || "#10B981");
      setIcon(initialWallet.icon || "wallet");
    } else {
      setName("");
      setBalance("");
      setColor("#10B981");
      setIcon("wallet");
    }
  }, [initialWallet, visible]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      balance: balance.trim() || "0",
      color,
      icon,
    });
    onClose();
  };

  const { colors, radius, spacing, typography } = useAppTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent={true}
      presentationStyle="overFullScreen">
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modal,
            {
              backgroundColor: colors.surface,
              borderRadius: radius.large,
              borderColor: colors.outline,
              borderWidth: StyleSheet.hairlineWidth,
            },
          ]}>
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: colors.outlineVariant },
            ]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons
                name="close"
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Wallet Name
              </Text>
              <TextInput
                placeholder="e.g. Cash, Debit Card"
                value={name}
                onChangeText={setName}
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.outline,
                    color: colors.onSurface,
                    borderRadius: radius.medium,
                  },
                ]}
                placeholderTextColor={colors.textMuted}
                autoFocus={true}
                maxLength={50}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Initial Balance
              </Text>
              <TextInput
                placeholder="0.00"
                value={balance}
                onChangeText={setBalance}
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.outline,
                    color: colors.onSurface,
                    borderRadius: radius.medium,
                  },
                ]}
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Icon
              </Text>
              <IconPicker
                selectedIcon={icon}
                onSelectIcon={setIcon}
                selectedColor={color}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Color
              </Text>
              <View style={styles.colorGrid}>
                {PREDEFINED_COLORS.map((c) => {
                  const isActive = color === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorOption,
                        { backgroundColor: c },
                        isActive && styles.colorOptionActive,
                      ]}
                      onPress={() => setColor(c)}>
                      {isActive && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View
            style={[
              styles.modalFooter,
              { borderTopColor: colors.outlineVariant },
            ]}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderRadius: radius.medium,
                },
              ]}
              onPress={onClose}>
              <Text
                style={[
                  styles.cancelButtonText,
                  { color: colors.textSecondary },
                ]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.createButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.medium,
                },
                !name.trim() && styles.createButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!name.trim()}>
              <Text
                style={[
                  styles.createButtonText,
                  { color: colors.onPrimary },
                ]}>
                Save
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
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#1C1C24",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_SECONDARY,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#fff",
  },
  iconScroll: {
    flexDirection: "row",
  },
  iconChip: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  iconChipActive: {
    backgroundColor: UI.COLORS.PRIMARY,
    borderColor: UI.COLORS.PRIMARY_LIGHT,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  colorOptionActive: {
    borderWidth: 2,
    borderColor: "#fff",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: UI.COLORS.TEXT_SECONDARY,
  },
  createButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: UI.COLORS.PRIMARY,
    alignItems: "center",
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
