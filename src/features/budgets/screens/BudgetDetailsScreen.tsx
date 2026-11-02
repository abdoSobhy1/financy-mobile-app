import { styles } from "./BudgetScreens.styles";
import { useBudgetDetailsScreen } from "../hooks/useBudgetDetailsScreen";

import React from "react";
import { View, Text, FlatList, TouchableOpacity, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useTabBarHeight, IconChip, Screen } from "../../../shared/ui";

import { formatCurrency, formatRelativeTime } from "../../../shared/utils";
import { Transaction } from "../../../shared/types";

export const BudgetDetailsScreen: React.FC = () => {
  const { navigation, budgetId, budget, categoriesMap, periodRange, budgetTransactions, spent, remaining, progressPercentage, isOver, daysLeft, safeDaily, category, handleDelete } = useBudgetDetailsScreen();
  const { colors, typography, spacing, isDark } = useAppTheme();
  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();

  if (!budget) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Text style={[typography.h3, { color: colors.onBackground }]}>Budget not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
            <Text style={[typography.bodyMedium, { color: colors.primary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const renderTransactionItem = ({ item: tx }: { item: Transaction; }) => {
    const cat = tx.categoryId ? categoriesMap[tx.categoryId] : null;
    return (
      <TouchableOpacity
        style={[
          styles.txItem,
          { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
        ]}
        onPress={() => (navigation as any).navigate("AddTransaction", { editTransaction: tx })}
        activeOpacity={0.75}
      >
        <IconChip
          icon={(cat?.icon as any) || "pricetag-outline"}
          color={cat?.color || colors.primary}
          size="md"
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[typography.bodyLarge, { color: colors.onSurface, fontWeight: "600" }]} numberOfLines={1}>
            {tx.description || cat?.name || "Expense"}
          </Text>
          <Text style={[typography.caption, { color: colors.onSurfaceVariant, marginTop: 2 }]}>
            {cat?.name || "Uncategorized"} • {formatRelativeTime(tx.date)}
          </Text>
        </View>
        <Text style={[typography.bodyLarge, { color: colors.onSurface, fontWeight: "700" }]}>
          -{formatCurrency(tx.amount)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.safeArea,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      <View style={styles.detailsHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.onBackground} />
        </TouchableOpacity>
        <Text style={[typography.h2, { color: colors.onBackground, flex: 1, textAlign: "center" }]} numberOfLines={1}>
          {budget.name}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate("BudgetForm", { budgetId: budget.id })}
            style={[styles.headerBtn, { backgroundColor: colors.surfaceVariant, borderRadius: 20 }]}
          >
            <Ionicons name="create-outline" size={20} color={colors.onBackground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            style={[styles.headerBtn, { backgroundColor: colors.errorContainer, borderRadius: 20 }]}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={budgetTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransactionItem}
        contentContainerStyle={[styles.container, { paddingBottom: tabBarHeight + 100 }]}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.lg }}>
            <View style={[styles.heroCard, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant }]}>
              <View style={styles.heroRow}>
                <View>
                  <Text style={[typography.label, { color: colors.onSurfaceVariant, textTransform: "uppercase" }]}>
                    Spent This Period
                  </Text>
                  <Text style={[typography.h1, { color: colors.onSurface, fontSize: 32, marginTop: 4 }]}>
                    {formatCurrency(spent)}
                  </Text>
                  <Text style={[typography.caption, { color: colors.onSurfaceVariant, marginTop: 2 }]}>
                    of {formatCurrency(budget.amount)} limit {category ? `• ${category.name}` : ""}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[typography.label, { color: colors.onSurfaceVariant, textTransform: "uppercase" }]}>
                    {isOver ? "Over Limit" : "Safe Daily"}
                  </Text>
                  <Text style={[typography.h2, { color: isOver ? colors.error : colors.primary, fontSize: 20, marginTop: 4 }]}>
                    {isOver ? formatCurrency(Math.abs(remaining)) : `${formatCurrency(safeDaily)}/d`}
                  </Text>
                  <Text style={[typography.caption, { color: colors.onSurfaceVariant, marginTop: 2 }]}>
                    {daysLeft} days left
                  </Text>
                </View>
              </View>

              <View style={[styles.progressBarContainer, { backgroundColor: colors.surfaceVariant, marginVertical: 16 }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: isOver ? colors.error : colors.primary,
                      width: `${Math.min(100, Math.max(0, progressPercentage))}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.heroRow}>
                <Text style={[typography.label, { color: colors.onSurfaceVariant }]}>
                  {isOver ? `${formatCurrency(Math.abs(remaining))} over budget` : `${formatCurrency(remaining)} remaining`}
                </Text>
                <Text style={[typography.label, { color: colors.onSurfaceVariant }]}>
                  {progressPercentage.toFixed(0)}% used
                </Text>
              </View>
            </View>

            <Text style={[typography.h3, { color: colors.onBackground, marginTop: 24, marginBottom: 8 }]}>
              Transactions ({budgetTransactions.length})
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Ionicons name="receipt-outline" size={40} color={colors.onSurfaceVariant} />
            <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginTop: 12 }]}>
              No expenses recorded for this budget yet.
            </Text>
          </View>
        }
      />
    </View>
  );
};
