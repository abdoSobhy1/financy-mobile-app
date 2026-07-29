import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../constants";

interface TransactionEmptyStateProps {
  onAddTransaction: () => void;
}

export const TransactionEmptyState: React.FC<TransactionEmptyStateProps> = ({
  onAddTransaction,
}) => (
  <View style={styles.container}>
    <View style={styles.iconRow}>
      <View style={styles.iconCircle}>
        <Ionicons
          name="swap-horizontal"
          size={22}
          color={UI.COLORS.TEXT_MUTED}
        />
      </View>
      <Text style={styles.label}>No Transactions Yet</Text>
    </View>

    <View style={styles.divider} />

    <TouchableOpacity style={styles.addButton} onPress={onAddTransaction}>
      <Ionicons name="add-circle" size={20} color={UI.COLORS.PRIMARY_LIGHT} />
      <Text style={styles.addText}>Add Your First Transaction</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginTop: UI.SPACING.SM,
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: 16,
    padding: UI.SPACING.LG,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    alignItems: "center",
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: UI.COLORS.CARD,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: UI.COLORS.TEXT_SECONDARY,
  },
  divider: {
    width: "80%",
    height: 1,
    backgroundColor: UI.COLORS.BORDER,
    marginBottom: 16,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addText: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.PRIMARY_LIGHT,
  },
});
