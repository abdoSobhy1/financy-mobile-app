import { styles } from "../screens/DebtsScreen.styles";
import { useDebtsScreen } from "../hooks/useDebtsScreen";

import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import type { ReactNode } from "react";

import { formatCurrency, formatDate } from "../../../shared/utils";

interface DebtPortfolioProps {
  colors: ReturnType<typeof useAppTheme>["colors"];
  typography: ReturnType<typeof useAppTheme>["typography"];
  filter: ReturnType<typeof useDebtsScreen>["filter"];
  filteredDebts: ReturnType<typeof useDebtsScreen>["filteredDebts"];
  navigation: ReturnType<typeof useDebtsScreen>["navigation"];
  loading: ReturnType<typeof useDebtsScreen>["loading"];
  spacing: ReturnType<typeof useAppTheme>["spacing"];
  renderEmptyState: () => ReactNode;
}
export function DebtPortfolio({ colors, typography, filter, filteredDebts, navigation, loading, spacing, renderEmptyState }: DebtPortfolioProps) {
  return (<View
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
  </View>);
}
