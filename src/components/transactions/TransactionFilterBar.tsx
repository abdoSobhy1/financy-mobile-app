import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { UI } from "../../constants";

interface TransactionFilterBarProps {
  transactionCount: number;
  activeFilterCount: number;
  onOpenFilters: () => void;
}

export const TransactionFilterBar: React.FC<TransactionFilterBarProps> = ({
  transactionCount,
  activeFilterCount,
  onOpenFilters,
}) => (
  <View style={styles.container}>
    <Text style={styles.sectionTitle}>Transactions</Text>
    <View style={styles.right}>
      <Text style={styles.countText}>{transactionCount} items</Text>
      <TouchableOpacity
        style={[
          styles.filterBtn,
          activeFilterCount > 0 && styles.filterBtnActive,
        ]}
        onPress={onOpenFilters}>
        <Ionicons
          name="filter"
          size={16}
          color={
            activeFilterCount > 0
              ? UI.COLORS.PRIMARY_LIGHT
              : UI.COLORS.TEXT_SECONDARY
          }
        />
        {activeFilterCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeFilterCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: UI.SPACING.MD,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
    letterSpacing: 0.5,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  countText: {
    fontSize: 13,
    color: UI.COLORS.TEXT_MUTED,
    fontWeight: "500",
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  filterBtnActive: {
    borderColor: UI.COLORS.PRIMARY,
    backgroundColor: UI.COLORS.PRIMARY + "15",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: UI.COLORS.PRIMARY,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: UI.COLORS.BACKGROUND,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
});
