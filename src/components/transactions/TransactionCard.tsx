import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Transaction, Category } from "../../types";
import { formatCurrency, formatDate } from "../../utils";
import { useAppTheme, categoryPalette } from "../../theme";
import {
  getCategoryColorKey,
  getCategoryIconName,
} from "../../utils/categoryDictionary";

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
  const { colors, typography, spacing, radius, isDark } = useAppTheme();

  if (!transaction) return null;

  const paletteKey = getCategoryColorKey(category?.name || "");
  const colorPair = categoryPalette[paletteKey] || categoryPalette.neutral;
  const iconBg = isDark ? colorPair.dark : colorPair.light;
  const iconColor = isDark ? colorPair.textDark : colorPair.textLight;
  const iconName = getCategoryIconName(category);

  const isIncome = transaction.type === "income";
  const isExpense = transaction.type === "expense";
  const amountColor = isIncome
    ? colors.success
    : isExpense
    ? colors.error
    : colors.onSurface;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.large,
          padding: spacing.s16,
          marginBottom: spacing.s8,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.outline,
        },
      ]}
      onPress={() => onPress(transaction)}
      activeOpacity={0.7}>
      {/* Icon Chip per Prompt 2D/3B pattern */}
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: iconBg, marginRight: spacing.s12 },
        ]}>
        <Ionicons name={iconName} size={22} color={iconColor} />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text
          style={[
            typography.titleMedium,
            { color: colors.onSurface, marginBottom: 2 },
          ]}
          numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text
          style={[
            typography.bodySmall,
            { color: colors.onSurfaceVariant },
          ]}
          numberOfLines={1}>
          {category?.name || "Uncategorized"} · {formatDate(transaction.date)}
        </Text>
      </View>

      {/* Amount */}
      <View style={styles.amountWrap}>
        <Text
          style={[
            typography.titleMedium,
            { color: amountColor, fontWeight: "700" },
          ]}>
          {isIncome ? "+" : "-"}
          {formatCurrency(transaction.amount)}
        </Text>
      </View>

      {/* Quick actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => onDuplicate(transaction)}>
          <Ionicons
            name="copy-outline"
            size={16}
            color={colors.onSurfaceVariant}
          />
        </TouchableOpacity>
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => onDelete(transaction)}>
          <Ionicons name="trash-outline" size={16} color={colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  amountWrap: {
    marginRight: 12,
  },
  actions: {
    flexDirection: "column",
    gap: 10,
    opacity: 0.8,
  },
});
