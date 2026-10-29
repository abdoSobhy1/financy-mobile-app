import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { AppHeader } from "../components/ui/AppHeader";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useTabBarHeight, FilterChips } from "../components/ui";
import { formatCurrency, formatDate } from "../utils";
import { RootState, AppDispatch } from "../store";
import { fetchDebts } from "../store/slices/debtsSlice";
import { DebtStackParamList } from "../types";

type DebtsScreenNavigationProp = StackNavigationProp<
  DebtStackParamList,
  "DebtsList"
>;

const DebtsScreen: React.FC = () => {
  const { colors, typography, spacing, isDark } = useAppTheme();
  const dispatch = useDispatch<AppDispatch>();
  const tabBarHeight = useTabBarHeight();
  const navigation = useNavigation<DebtsScreenNavigationProp>();
  const insets = useSafeAreaInsets();

  const { items, ids, loading } = useSelector(
    (state: RootState) => state.debts
  );

  useEffect(() => {
    dispatch(fetchDebts());
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchDebts());
    }, [dispatch])
  );

  const debts = ids
    .map((id) => items[id])
    .filter((d) => d && !d.deleted);

  // Compute real stats using debt.type ("owed_to_me" vs "i_owe")
  const iOweList = debts.filter((d) => d.type !== "owed_to_me" && d.currentBalance > 0.005);
  const owedToMeList = debts.filter((d) => d.type === "owed_to_me" && d.currentBalance > 0.005);
  const overdueList = debts.filter(
    (d) =>
      d.currentBalance > 0.005 && d.dueDate && new Date(d.dueDate) < new Date()
  );

  const totalYouOwe = iOweList.reduce((sum, d) => sum + d.currentBalance, 0);
  const totalOwedToYou = owedToMeList.reduce(
    (sum, d) => sum + Math.abs(d.currentBalance),
    0
  );
  const netPosition = totalOwedToYou - totalYouOwe;

  const [filter, setFilter] = useState<
    "All Debts" | "Owed to Me" | "I Owe" | "Overdue" | "Paid Off"
  >("All Debts");

  const filteredDebts = debts.filter((d) => {
    if (filter === "Owed to Me") return d.type === "owed_to_me";
    if (filter === "I Owe") return d.type !== "owed_to_me";
    if (filter === "Overdue")
      return (
        d.currentBalance > 0.005 && d.dueDate && new Date(d.dueDate) < new Date()
      );
    if (filter === "Paid Off") return d.currentBalance <= 0.005;
    return true;
  });

  const renderEmptyState = () => (
    <View style={{ padding: spacing.xl, alignItems: "center" }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.surfaceVariant,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.md,
        }}>
        <Ionicons name="card-outline" size={32} color={colors.primary} />
      </View>
      <Text style={[typography.h3, { color: colors.onSurface }]}>
        No Debts Found
      </Text>
      <Text
        style={[
          typography.bodyMedium,
          {
            color: colors.onSurfaceVariant,
            textAlign: "center",
            marginTop: spacing.xs,
          },
        ]}>
        Tap the + button to track a loan, credit card, or personal IOU.
      </Text>
    </View>
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <AppHeader title="Debts" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xs,
          paddingBottom: tabBarHeight + spacing.xl,
        }}>
        {/* Compact Side-by-Side Summary Cards */}
        <View style={styles.summaryGrid}>
          {/* Owed To You Card */}
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.outlineVariant,
              },
            ]}>
            <View style={styles.summaryHeaderRow}>
              <View
                style={[
                  styles.miniIconBadge,
                  { backgroundColor: colors.primary + "22" },
                ]}>
                <Ionicons
                  name="arrow-down-outline"
                  size={16}
                  color={colors.primary}
                />
              </View>
              <Text
                style={[
                  typography.label,
                  { color: colors.onSurfaceVariant, fontSize: 11 },
                ]}>
                OWED TO YOU
              </Text>
            </View>
            <Text
              style={[styles.summaryAmount, { color: colors.primary }]}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {formatCurrency(totalOwedToYou)}
            </Text>
            <Text
              style={[
                typography.bodySmall,
                { color: colors.onSurfaceVariant },
              ]}>
              {owedToMeList.length} active{" "}
              {owedToMeList.length === 1 ? "record" : "records"}
            </Text>
          </View>

          {/* You Owe Card */}
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.outlineVariant,
              },
            ]}>
            <View style={styles.summaryHeaderRow}>
              <View
                style={[
                  styles.miniIconBadge,
                  { backgroundColor: colors.error + "22" },
                ]}>
                <Ionicons
                  name="arrow-up-outline"
                  size={16}
                  color={colors.error}
                />
              </View>
              <Text
                style={[
                  typography.label,
                  { color: colors.onSurfaceVariant, fontSize: 11 },
                ]}>
                YOU OWE
              </Text>
            </View>
            <Text
              style={[styles.summaryAmount, { color: colors.error }]}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {formatCurrency(totalYouOwe)}
            </Text>
            <Text
              style={[
                typography.bodySmall,
                {
                  color:
                    overdueList.length > 0
                      ? colors.error
                      : colors.onSurfaceVariant,
                },
              ]}>
              {overdueList.length > 0
                ? `${overdueList.length} overdue`
                : `${iOweList.length} active`}
            </Text>
          </View>
        </View>

        {/* Net Position Banner */}
        <View
          style={[
            styles.netBanner,
            {
              backgroundColor: colors.surfaceVariant,
              borderColor: colors.outlineVariant,
              marginBottom: spacing.lg,
            },
          ]}>
          <Text
            style={[typography.bodyMedium, { color: colors.onSurfaceVariant }]}>
            Net Debt Position
          </Text>
          <Text
            style={[
              typography.bodyLarge,
              {
                fontWeight: "700",
                color:
                  netPosition >= 0 ? colors.primary : colors.error,
              },
            ]}>
            {netPosition >= 0 ? "+" : "-"}
            {formatCurrency(Math.abs(netPosition))}
          </Text>
        </View>

        {/* Filters */}
        <FilterChips
          options={["All Debts", "Owed to Me", "I Owe", "Overdue", "Paid Off"]}
          selected={filter}
          onSelect={(f) => setFilter(f as any)}
          style={{ marginBottom: spacing.lg }}
        />

        {/* Active Debts List */}
        <View
          style={[
            styles.debtsListCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.outlineVariant,
              borderWidth: 1,
            },
          ]}>
          <View style={styles.debtsListHeader}>
            <Text style={[typography.h3, { color: colors.onBackground }]}>
              {filter} ({filteredDebts.length})
            </Text>
            <TouchableOpacity
              style={[
                styles.addBtn,
                { backgroundColor: colors.primaryContainer },
              ]}
              onPress={() => navigation.navigate("DebtForm", {})}>
              <Ionicons
                name="add"
                size={22}
                color={colors.onPrimaryContainer}
              />
            </TouchableOpacity>
          </View>

          {loading && filteredDebts.length === 0 ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={{ margin: spacing.xl }}
            />
          ) : filteredDebts.length === 0 ? (
            renderEmptyState()
          ) : (
            filteredDebts.map((debt, index) => {
              const isOwedToMe = debt.type === "owed_to_me";
              const isPaid = debt.currentBalance <= 0.005;
              const displayAmount = isPaid ? 0 : Math.abs(debt.currentBalance);
              const totalOriginal = Math.max(
                debt.totalAmount || displayAmount,
                displayAmount,
                1
              );
              const paidPct = isPaid
                ? 100
                : Math.min(
                    100,
                    Math.max(
                      0,
                      Math.round(
                        ((totalOriginal - displayAmount) / totalOriginal) * 100
                      )
                    )
                  );
              const isOverdue =
                !isPaid &&
                debt.dueDate &&
                new Date(debt.dueDate) < new Date();

              let badgeText = isOwedToMe ? "Owed to You" : "Active";
              let badgeColor = isOwedToMe ? colors.primary : colors.secondary;
              let badgeBg = isOwedToMe
                ? colors.primary + "1F"
                : colors.secondary + "1F";

              if (isPaid) {
                badgeText = "Paid Off";
                badgeColor = colors.tertiary;
                badgeBg = colors.tertiary + "22";
              } else if (isOverdue) {
                badgeText = "Overdue";
                badgeColor = colors.error;
                badgeBg = colors.error + "22";
              }

              return (
                <View
                  key={debt.id}
                  style={[
                    styles.debtItemContainer,
                    {
                      borderBottomColor:
                        index === filteredDebts.length - 1
                          ? "transparent"
                          : colors.outlineVariant,
                    },
                  ]}>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    style={styles.debtRow}
                    onPress={() =>
                      navigation.navigate("DebtForm", { debtId: debt.id })
                    }>
                    <View
                      style={[
                        styles.debtIconBox,
                        {
                          backgroundColor: isPaid
                            ? colors.tertiary + "22"
                            : isOwedToMe
                            ? colors.primary + "1F"
                            : colors.error + "1F",
                        },
                      ]}>
                      <Ionicons
                        name={
                          isPaid
                            ? "checkmark-circle"
                            : isOwedToMe
                            ? "person-add-outline"
                            : "card-outline"
                        }
                        size={20}
                        color={
                          isPaid
                            ? colors.tertiary
                            : isOwedToMe
                            ? colors.primary
                            : colors.error
                        }
                      />
                    </View>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text
                        style={[
                          typography.bodyLarge,
                          {
                            color: colors.onBackground,
                            fontWeight: "700",
                            marginBottom: 2,
                          },
                        ]}
                        numberOfLines={1}>
                        {debt.name}
                      </Text>
                      <Text
                        style={[
                          typography.bodySmall,
                          { color: colors.onSurfaceVariant },
                        ]}
                        numberOfLines={1}>
                        {debt.creditor
                          ? `${debt.creditor} • `
                          : debt.description
                          ? `${debt.description} • `
                          : ""}
                        {isPaid
                          ? `Paid off • Total ${formatCurrency(totalOriginal)}`
                          : debt.dueDate
                          ? `Due ${formatDate(debt.dueDate)}`
                          : `Total ${formatCurrency(totalOriginal)}`}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={[
                          typography.bodyLarge,
                          {
                            color: isPaid
                              ? colors.tertiary
                              : isOwedToMe
                              ? colors.primary
                              : colors.error,
                            fontWeight: "700",
                            marginBottom: 4,
                          },
                        ]}>
                        {isPaid ? "" : isOwedToMe ? "+" : "-"}
                        {formatCurrency(displayAmount)}
                      </Text>
                      <View
                        style={[styles.badge, { backgroundColor: badgeBg }]}>
                        <Text
                          style={{
                            fontSize: 10,
                            color: badgeColor,
                            fontWeight: "700",
                          }}>
                          {badgeText}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Progress & Quick Actions Row */}
                  <View style={styles.debtActionsRow}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <View
                        style={[
                          styles.progressTrack,
                          { backgroundColor: colors.surfaceVariant },
                        ]}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${paidPct}%`,
                              backgroundColor: isPaid
                                ? colors.tertiary
                                : isOwedToMe
                                ? colors.primary
                                : colors.secondary,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={{
                          fontSize: 11,
                          color: isPaid
                            ? colors.tertiary
                            : colors.onSurfaceVariant,
                          fontWeight: isPaid ? "600" : "400",
                          marginTop: 4,
                        }}>
                        {paidPct}% paid of {formatCurrency(totalOriginal)}
                      </Text>
                    </View>

                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {!isPaid && (
                        <TouchableOpacity
                          style={[
                            styles.actionPill,
                            { backgroundColor: colors.primaryContainer },
                          ]}
                          onPress={() =>
                            navigation.navigate("AddPayment", {
                              debtId: debt.id,
                              debtName: debt.name,
                              currentBalance: Math.abs(debt.currentBalance),
                              minimumPayment: debt.minimumPayment,
                              interestRate: debt.interestRate,
                            })
                          }>
                          <Ionicons
                            name="cash-outline"
                            size={13}
                            color={colors.onPrimaryContainer}
                          />
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "700",
                              color: colors.onPrimaryContainer,
                              marginLeft: 4,
                            }}>
                            Pay
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[
                          styles.actionPill,
                          {
                            backgroundColor: colors.surfaceVariant,
                            borderColor: colors.outlineVariant,
                            borderWidth: 1,
                          },
                        ]}
                        onPress={() =>
                          navigation.navigate("DebtPayments", {
                            debtId: debt.id,
                            debtName: debt.name,
                          })
                        }>
                        <Ionicons
                          name="time-outline"
                          size={13}
                          color={colors.onSurfaceVariant}
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: colors.onSurfaceVariant,
                            marginLeft: 4,
                          }}>
                          History
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
  },
  summaryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  miniIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  netBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  debtsListCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 40,
  },
  debtsListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  debtItemContainer: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  debtRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  debtIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  debtActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingLeft: 58,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
});

export default DebtsScreen;
