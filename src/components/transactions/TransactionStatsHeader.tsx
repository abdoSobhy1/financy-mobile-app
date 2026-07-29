import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../constants";
import { formatCurrency } from "../../utils";

type FilterType = "all" | "income" | "expense";

interface TransactionStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

interface TransactionStatsHeaderProps {
  stats: TransactionStats;
  filterType: FilterType;
  onFilterTypeChange: (type: FilterType) => void;
  onAddTransaction: () => void;
}

export const TransactionStatsHeader: React.FC<TransactionStatsHeaderProps> = ({
  stats,
  filterType,
  onFilterTypeChange,
  onAddTransaction,
}) => (
  <View>
    {/* ─── Hero Gradient Card ─────────────────────────────────────── */}
    <LinearGradient
      colors={["#1B1464", "#6C5CE7", "#A29BFE"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}>
      {/* Decorative circles */}
      <View style={[styles.decorCircle, styles.circle1]} />
      <View style={[styles.decorCircle, styles.circle2]} />

      <Text style={styles.welcomeLabel}>Overview</Text>
      <Text style={styles.accountLabel}>Total Balance</Text>
      <Text style={styles.balanceAmount}>{formatCurrency(stats.balance)}</Text>

      {/* Mini stats row */}
      <View style={styles.miniStatsRow}>
        <View style={styles.miniStat}>
          <View style={[styles.miniDot, { backgroundColor: "#2ED573" }]} />
          <Text style={styles.miniLabel}>Income</Text>
          <Text style={[styles.miniValue, { color: "#2ED573" }]}>
            {formatCurrency(stats.totalIncome)}
          </Text>
        </View>
        <View style={styles.miniStatDivider} />
        <View style={styles.miniStat}>
          <View style={[styles.miniDot, { backgroundColor: "#FF6B6B" }]} />
          <Text style={styles.miniLabel}>Expenses</Text>
          <Text style={[styles.miniValue, { color: "#FF6B6B" }]}>
            {formatCurrency(stats.totalExpenses)}
          </Text>
        </View>
      </View>
    </LinearGradient>

    {/* ─── Action Pills ───────────────────────────────────────────── */}
    <View style={styles.actionRow}>
      <TouchableOpacity style={styles.actionPill} onPress={onAddTransaction}>
        <View style={styles.actionIconCircle}>
          <Ionicons name="add" size={18} color="#fff" />
        </View>
        <Text style={styles.actionPillText}>Add</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.actionPill,
          filterType === "expense" && styles.actionPillActive,
        ]}
        onPress={() =>
          onFilterTypeChange(filterType === "expense" ? "all" : "expense")
        }>
        <View
          style={[
            styles.actionIconCircle,
            { backgroundColor: "#FF6B6B" },
            filterType === "expense" && styles.actionIconCircleActive,
          ]}>
          <Ionicons name="trending-down" size={16} color="#fff" />
        </View>
        <Text
          style={[
            styles.actionPillText,
            filterType === "expense" && styles.actionPillTextActive,
          ]}>
          Expenses
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.actionPill,
          filterType === "income" && styles.actionPillActive,
        ]}
        onPress={() =>
          onFilterTypeChange(filterType === "income" ? "all" : "income")
        }>
        <View
          style={[
            styles.actionIconCircle,
            { backgroundColor: "#2ED573" },
            filterType === "income" && styles.actionIconCircleActive,
          ]}>
          <Ionicons name="trending-up" size={16} color="#fff" />
        </View>
        <Text
          style={[
            styles.actionPillText,
            filterType === "income" && styles.actionPillTextActive,
          ]}>
          Income
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  /* ─── Hero Card ─────────────────────────────────────────────── */
  heroCard: {
    borderRadius: 20,
    padding: UI.SPACING.LG,
    paddingBottom: 28,
    overflow: "hidden",
    position: "relative",
  },
  decorCircle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  circle1: {
    width: 180,
    height: 180,
    top: -60,
    right: -40,
  },
  circle2: {
    width: 120,
    height: 120,
    bottom: -30,
    left: -20,
  },
  welcomeLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 2,
  },
  accountLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
    marginBottom: UI.SPACING.MD,
  },
  /* ─── Mini stats inside card ────────────────────────────────── */
  miniStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  miniStat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  miniLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  miniValue: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: "auto",
  },
  miniStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 12,
  },
  /* ─── Action Pills ──────────────────────────────────────────── */
  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 14,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 7,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  actionPillActive: {
    borderColor: UI.COLORS.PRIMARY,
    backgroundColor: UI.COLORS.PRIMARY + "18",
  },
  actionPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  actionPillTextActive: {
    color: UI.COLORS.PRIMARY_LIGHT,
  },
  actionIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: UI.COLORS.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconCircleActive: {
    opacity: 1,
  },
});
