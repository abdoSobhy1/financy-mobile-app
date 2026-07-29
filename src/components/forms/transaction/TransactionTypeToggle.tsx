import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../theme";
import { TransactionType } from "../../../types";

interface TransactionTypeToggleProps {
  selectedType: TransactionType;
  onTypeChange: (type: TransactionType) => void;
}

const TYPES: { key: TransactionType; label: string; icon: string }[] = [
  { key: "income", label: "Income", icon: "trending-up" },
  { key: "expense", label: "Expense", icon: "trending-down" },
  { key: "transfer", label: "Transfer", icon: "swap-horizontal" },
];

export const TransactionTypeToggle: React.FC<TransactionTypeToggleProps> = ({
  selectedType,
  onTypeChange,
}) => {
  const { colors, typography, spacing, radius } = useAppTheme();

  return (
    <View style={[styles.wrapper, { marginBottom: spacing.s20 }]}>
      <View
        style={[
          styles.track,
          {
            backgroundColor: colors.surfaceVariant,
            borderRadius: radius.full, // Pill shape
            padding: 4,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.outline,
          },
        ]}>
        {TYPES.map((t) => {
          const active = selectedType === t.key;
          const activeBg =
            t.key === "income"
              ? colors.success
              : t.key === "expense"
                ? colors.error
                : colors.primary;

          return (
            <Pressable
              key={t.key}
              style={styles.buttonOuter}
              onPress={() => onTypeChange(t.key)}>
              <View
                style={[
                  styles.button,
                  {
                    backgroundColor: active ? activeBg : "transparent",
                    borderRadius: radius.full,
                    paddingVertical: spacing.s10,
                    paddingHorizontal: spacing.s12,
                  },
                ]}>
                <Ionicons
                  name={t.icon as any}
                  size={16}
                  color={active ? "#FFFFFF" : colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    active ? typography.labelLarge : typography.labelMedium,
                    {
                      color: active ? "#FFFFFF" : colors.onSurfaceVariant,
                    },
                  ]}>
                  {t.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  track: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonOuter: {
    flex: 1,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
});

