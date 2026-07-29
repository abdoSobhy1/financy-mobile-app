import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../constants";
import { Wallet } from "../../types";
import { WalletSelector } from "./WalletSelector";

interface TransferModalProps {
  visible: boolean;
  onClose: () => void;
  wallets: Wallet[];
  onTransfer: (data: {
    fromWalletId: string;
    toWalletId: string;
    amount: string;
    description?: string;
    note?: string;
  }) => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  visible,
  onClose,
  wallets,
  onTransfer,
}) => {
  const [fromWalletId, setFromWalletId] = useState<string | undefined>(
    wallets[0]?.id
  );
  const [toWalletId, setToWalletId] = useState<string | undefined>(
    wallets[1]?.id || wallets[0]?.id
  );
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);
    if (!fromWalletId) {
      setError("Please select a source wallet.");
      return;
    }
    if (!toWalletId) {
      setError("Please select a destination wallet.");
      return;
    }
    if (fromWalletId === toWalletId) {
      setError("Source and destination wallets must be different.");
      return;
    }
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    onTransfer({
      fromWalletId,
      toWalletId,
      amount,
      description: description.trim() || "Transfer between wallets",
      note: note.trim() || undefined,
    });
    // Reset
    setAmount("");
    setDescription("");
    setNote("");
    setError(null);
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
            <Text style={styles.modalTitle}>Transfer Money</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons
                name="close"
                size={24}
                color={UI.COLORS.TEXT_SECONDARY}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <WalletSelector
              label="From Wallet"
              wallets={wallets}
              selectedWalletId={fromWalletId}
              onWalletSelect={setFromWalletId}
              showNoneOption={false}
            />

            <WalletSelector
              label="To Wallet"
              wallets={wallets}
              selectedWalletId={toWalletId}
              onWalletSelect={setToWalletId}
              showNoneOption={false}
            />

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                style={styles.modalInput}
                placeholderTextColor={UI.COLORS.TEXT_MUTED}
                keyboardType="numeric"
                autoFocus={true}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                placeholder="e.g. Savings transfer"
                value={description}
                onChangeText={setDescription}
                style={styles.modalInput}
                placeholderTextColor={UI.COLORS.TEXT_MUTED}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Note (Optional)</Text>
              <TextInput
                placeholder="Add a note..."
                value={note}
                onChangeText={setNote}
                style={styles.modalInput}
                placeholderTextColor={UI.COLORS.TEXT_MUTED}
              />
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.transferButton}
              onPress={handleSubmit}>
              <Text style={styles.transferButtonText}>Transfer</Text>
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
    maxHeight: "85%",
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
  errorText: {
    color: UI.COLORS.ERROR,
    fontSize: 14,
    marginBottom: 12,
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
  transferButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: UI.COLORS.PRIMARY,
    alignItems: "center",
  },
  transferButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
