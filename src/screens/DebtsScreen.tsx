import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useTabBarHeight } from "../components/ui";
import { formatCurrency } from "../utils";
import { Debt } from "../types";
import { RootState, AppDispatch } from "../store";
import { fetchDebts } from "../store/slices/debtsSlice";
import { DebtStackParamList } from "../navigation/DebtStackNavigator";

type DebtsScreenNavigationProp = StackNavigationProp<DebtStackParamList, "DebtsList">;

const DebtsScreen: React.FC = () => {
  const { colors, typography, spacing, radius } = useAppTheme();
  const dispatch = useDispatch<AppDispatch>();
  const tabBarHeight = useTabBarHeight();
  const navigation = useNavigation<DebtsScreenNavigationProp>();
  
  const { items, ids, loading } = useSelector((state: RootState) => state.debts);

  useEffect(() => {
    dispatch(fetchDebts());
  }, [dispatch]);

  const debts = ids.map((id) => items[id]).filter(Boolean);

  // Compute stats
  const totalYouOwe = debts.reduce((sum, d) => sum + (d.currentBalance > 0 ? d.currentBalance : 0), 0);
  const totalOwedToYou = debts.reduce((sum, d) => sum + (d.currentBalance < 0 ? Math.abs(d.currentBalance) : 0), 0);

  const [filter, setFilter] = useState<"All Debts" | "Owed to Me" | "I Owe" | "Overdue">("All Debts");

  const filteredDebts = debts.filter(d => {
    if (filter === "Owed to Me") return d.currentBalance < 0;
    if (filter === "I Owe") return d.currentBalance > 0;
    // We don't track overdue dates accurately in the mock, but we'll include it for the UI
    if (filter === "Overdue") return d.currentBalance > 0 && d.dueDate && new Date(d.dueDate) < new Date();
    return true;
  });

  const renderEmptyState = () => (
    <View style={{ padding: spacing.xl, alignItems: "center" }}>
      <Ionicons name="card-outline" size={48} color={colors.primary} style={{ marginBottom: spacing.md }} />
      <Text style={[typography.h3, { color: colors.onSurface }]}>No Debts Found</Text>
      <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: "center", marginTop: spacing.sm }]}>
        Tap the + button to add a new debt record.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceVariant }]}>
            <Ionicons name="person" size={16} color={colors.onSurfaceVariant} />
          </View>
          <Text style={[typography.h2, { color: colors.onBackground, marginLeft: spacing.md }]}>
            August Overview
          </Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color={colors.onBackground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: tabBarHeight + spacing.xl }}>
        
        {/* Total Owed To You Card */}
        <View style={[styles.heroCard, { backgroundColor: colors.surfaceVariant, marginBottom: spacing.md }]}>
          <Text style={[typography.label, { color: colors.onSurfaceVariant, letterSpacing: 1 }]}>
            TOTAL OWED TO YOU
          </Text>
          <Text style={[styles.heroAmount, { color: colors.primaryContainer }]}>
            {formatCurrency(totalOwedToYou)}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="arrow-up" size={16} color={colors.primaryContainer} style={{ marginRight: 4 }} />
            <Text style={[typography.bodySmall, { color: colors.primaryContainer }]}>+0% from last month</Text>
          </View>
        </View>

        {/* Total You Owe Card */}
        <View style={[styles.heroCard, { backgroundColor: colors.surfaceVariant, marginBottom: spacing.xl }]}>
          <Text style={[typography.label, { color: colors.onSurfaceVariant, letterSpacing: 1 }]}>
            TOTAL YOU OWE
          </Text>
          <Text style={[styles.heroAmount, { color: colors.errorContainer }]}>
            {formatCurrency(totalYouOwe)}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="arrow-down" size={16} color={colors.errorContainer} style={{ marginRight: 4 }} />
            <Text style={[typography.bodySmall, { color: colors.errorContainer }]}>+$0 this week</Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xl }}>
          {["All Debts", "Owed to Me", "I Owe", "Overdue"].map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f as any)}
              style={[
                styles.filterChip,
                {
                  borderColor: colors.outlineVariant,
                  backgroundColor: filter === f ? "rgba(128, 203, 196, 0.15)" : "transparent"
                }
              ]}
            >
              <Text style={[typography.bodyMedium, { 
                color: filter === f ? colors.primaryContainer : colors.onSurfaceVariant,
                fontWeight: filter === f ? "600" : "400"
              }]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Active Debts List */}
        <View style={[styles.debtsListCard, { backgroundColor: colors.surfaceVariant }]}>
          <View style={styles.debtsListHeader}>
            <Text style={[typography.h3, { color: colors.onBackground }]}>Active Debts</Text>
            <TouchableOpacity 
              style={[styles.addBtn, { backgroundColor: colors.primaryContainer }]}
              onPress={() => navigation.navigate("DebtForm", {})}
            >
              <Ionicons name="add" size={24} color={colors.onPrimaryContainer} />
            </TouchableOpacity>
          </View>

          {loading && filteredDebts.length === 0 ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ margin: spacing.xl }} />
          ) : filteredDebts.length === 0 ? (
            renderEmptyState()
          ) : (
            filteredDebts.map((debt, index) => {
              const isOwedToMe = debt.currentBalance < 0;
              const displayAmount = Math.abs(debt.currentBalance);
              const isPaid = debt.currentBalance === 0;
              const isOverdue = debt.currentBalance > 0 && debt.dueDate && new Date(debt.dueDate) < new Date();
              
              let badgeText = "Active";
              let badgeColor = colors.primaryContainer;
              let badgeBg = "rgba(128,203,196,0.15)";
              
              if (isPaid) {
                badgeText = "Paid";
                badgeColor = colors.onSurfaceVariant;
                badgeBg = "rgba(255,255,255,0.05)";
              } else if (isOverdue) {
                badgeText = "Overdue";
                badgeColor = colors.errorContainer;
                badgeBg = "rgba(255,107,107,0.15)";
              }
              
              return (
                <TouchableOpacity 
                  key={debt.id} 
                  style={[styles.debtRow, { borderBottomColor: index === filteredDebts.length - 1 ? "transparent" : "rgba(255,255,255,0.05)" }]}
                  onPress={() => navigation.navigate("DebtForm", { debtId: debt.id })}
                >
                  <View style={[styles.debtIconBox, { backgroundColor: isOwedToMe ? "rgba(128,203,196,0.15)" : "rgba(255,107,107,0.15)" }]}>
                    <Ionicons name="person" size={20} color={isOwedToMe ? colors.primaryContainer : colors.errorContainer} />
                  </View>
                  <View style={{ flex: 1, marginRight: 16 }}>
                    <Text style={[typography.bodyLarge, { color: colors.onBackground, fontWeight: "600", marginBottom: 2 }]} numberOfLines={1}>
                      {debt.name}
                    </Text>
                    {debt.description && (
                      <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                        {debt.description}
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[typography.bodyLarge, { 
                      color: isPaid ? colors.onSurfaceVariant : isOwedToMe ? colors.primaryContainer : colors.errorContainer, 
                      fontWeight: "600", 
                      marginBottom: 4 
                    }]}>
                      {isPaid ? "" : isOwedToMe ? "+" : "-"}{formatCurrency(displayAmount)}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                      <Text style={{ fontSize: 10, color: badgeColor, fontWeight: "600" }}>{badgeText}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    padding: 24,
    borderRadius: 24,
  },
  heroAmount: {
    fontSize: 44,
    fontWeight: "700",
    marginVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 12,
  },
  debtsListCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 40,
  },
  debtsListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  debtRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  debtIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
});

export default DebtsScreen;
