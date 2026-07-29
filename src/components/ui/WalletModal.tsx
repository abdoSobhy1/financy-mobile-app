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

const PREDEFINED_ICONS = [
  "wallet",
  "card",
  "cash",
  "business",
  "logo-usd",
  "cart",
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent={true}
      presentationStyle="overFullScreen">
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons
                name="close"
                size={24}
                color={UI.COLORS.TEXT_SECONDARY}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Wallet Name</Text>
              <TextInput
                placeholder="e.g. Cash, Debit Card"
                value={name}
                onChangeText={setName}
                style={styles.modalInput}
                placeholderTextColor={UI.COLORS.TEXT_MUTED}
                autoFocus={true}
                maxLength={50}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Initial Balance</Text>
              <TextInput
                placeholder="0.00"
                value={balance}
                onChangeText={setBalance}
                style={styles.modalInput}
                placeholderTextColor={UI.COLORS.TEXT_MUTED}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Icon</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.iconScroll}>
                {PREDEFINED_ICONS.map((iName) => {
                  const isActive = icon === iName;
                  return (
                    <TouchableOpacity
                      key={iName}
                      style={[
                        styles.iconChip,
                        isActive && styles.iconChipActive,
                      ]}
                      onPress={() => setIcon(iName)}>
                      <Ionicons
                        name={iName as any}
                        size={20}
                        color={isActive ? "#fff" : UI.COLORS.TEXT_SECONDARY}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Color</Text>
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

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.createButton,
                !name.trim() && styles.createButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!name.trim()}>
              <Text style={styles.createButtonText}>Save</Text>
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
