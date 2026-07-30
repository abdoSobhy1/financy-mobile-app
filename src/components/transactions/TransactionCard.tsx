import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../constants";
import { Transaction, Category } from "../../types";
import { formatCurrency, formatDate } from "../../utils";

interface TransactionCardProps {
  transaction: Transaction;
  category?: Category | null;
  onPress: (transaction: Transaction) => void;
  onDuplicate: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  category,
  onPress,
  onDuplicate,
  onDelete,
}) => {
  if (!transaction) return null;

  const isIncome = transaction.type === "income";
  const iconName = isIncome ? "arrow-down-circle" : "arrow-up-circle";
  const accentColor = isIncome ? UI.COLORS.SUCCESS : UI.COLORS.ERROR;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(transaction)}
      activeOpacity={0.7}>
      {/* Icon */}
      <View
        style={[styles.iconCircle, { backgroundColor: accentColor + "18" }]}>
        <Ionicons name={iconName} size={22} color={accentColor} />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.description} numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text style={styles.categoryText} numberOfLines={1}>
          {category?.name || "Uncategorized"} · {formatDate(transaction.date)}
        </Text>
      </View>

      {/* Amount */}
      <View style={styles.amountWrap}>
        <Text style={[styles.amount, { color: accentColor }]}>
          {isIncome ? "+" : "-"}
          {formatCurrency(transaction.amount)}
        </Text>
      </View>

      {/* Quick actions (swipe-alternative) */}
      <View style={styles.actions}>
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => onDuplicate(transaction)}>
          <Ionicons
            name="copy-outline"
            size={16}
            color={UI.COLORS.TEXT_MUTED}
          />
        </TouchableOpacity>
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => onDelete(transaction)}>
          <Ionicons name="trash-outline" size={16} color={UI.COLORS.ERROR} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  description: {
    fontSize: 15,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: 3,
  },
  categoryText: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
  },
  amountWrap: {
    marginRight: 10,
  },
  amount: {
    fontSize: 15,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "column",
    gap: 8,
    opacity: 0.7,
  },
});
