import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../../constants";
import { TransactionType } from "../../../types";

interface TransactionTypeToggleProps {
  selectedType: TransactionType;
  onTypeChange: (type: TransactionType) => void;
}

const TYPES: { key: TransactionType; label: string; icon: string }[] = [
  { key: "income", label: "Income", icon: "trending-up" },
  { key: "expense", label: "Expense", icon: "trending-down" },
];

export const TransactionTypeToggle: React.FC<TransactionTypeToggleProps> = ({
  selectedType,
  onTypeChange,
}) => (
  <View style={styles.wrapper}>
    <View style={styles.track}>
      {TYPES.map((t) => {
        const active = selectedType === t.key;
        return (
          <Pressable
            key={t.key}
            style={styles.buttonOuter}
            onPress={() => onTypeChange(t.key)}>
            {active ? (
              <LinearGradient
                colors={[UI.COLORS.PRIMARY, UI.COLORS.PRIMARY_DARK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.button, styles.buttonActive]}>
                <Ionicons name={t.icon as any} size={18} color="#fff" />
                <Text style={[styles.label, styles.labelActive]}>
                  {t.label}
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.button}>
                <Ionicons
                  name={t.icon as any}
                  size={18}
                  color={UI.COLORS.TEXT_MUTED}
                />
                <Text style={styles.label}>{t.label}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
  },
  track: {
    flexDirection: "row",
    backgroundColor: "rgba(20,20,50,0.7)",
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.12)",
  },
  buttonOuter: {
    flex: 1,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonActive: {
    // purple glow shadow
    shadowColor: UI.COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: UI.COLORS.TEXT_MUTED,
  },
  labelActive: {
    color: "#fff",
    fontWeight: "700",
  },
});
