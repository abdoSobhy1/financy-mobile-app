import { BudgetSkeletonCard } from "./BudgetSkeletonCard";
import { styles } from "./BudgetScreens.styles";
import type { BudgetListScreenController } from "../hooks/useBudgetListScreen";

import { View, Text, TouchableOpacity } from "react-native";

import { useAppTheme, type AppTheme } from "../../../shared/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { IconChip } from "../../../shared/ui";
import { formatCurrency, percentage } from "../../../shared/utils";

interface BudgetListCardProps {
  budgets: BudgetListScreenController["budgets"];
  progressLoaded: BudgetListScreenController["progressLoaded"];
  colors: AppTheme["colors"];
  budgetProgressMap: BudgetListScreenController["budgetProgressMap"];
  categoriesMap: BudgetListScreenController["categoriesMap"];
  navigation: BudgetListScreenController["navigation"];
  typography: AppTheme["typography"];
}
export function BudgetListCard({ budgets, progressLoaded, colors, budgetProgressMap, categoriesMap, navigation, typography, item: id }: BudgetListCardProps & { item: string; }) {

  const budget = budgets[id];
  if (!budget) return null;
  if (!progressLoaded) return <BudgetSkeletonCard colors={colors} />;

  const spent = budgetProgressMap[id]?.spent || 0;
  const remaining = budget.amount - spent;
  const progressPercentage = percentage(spent, budget.amount);
  const isOverBudget = spent > budget.amount;

  const category = budget.categoryId ? categoriesMap[budget.categoryId] : null;
  const iconName = (category?.icon as any) || "wallet-outline";
  const iconColor = category?.color || colors.primary;

  const progressColor = isOverBudget ? colors.error : progressPercentage > 80 ? "#FDCB6E" : colors.primary;
  const progressBg = isOverBudget ? colors.errorContainer : colors.surfaceVariant;

  return (
    <TouchableOpacity
      style={[
        styles.budgetCard,
        {
          backgroundColor: colors.surface,
          borderColor: isOverBudget ? colors.error + "40" : colors.outlineVariant,
          borderWidth: 1,
        },
      ]}
      activeOpacity={0.8}
      onPress={() => {
        navigation.navigate("BudgetDetails", { budgetId: id });
      }}
    >
      <View style={styles.budgetRow}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <IconChip icon={iconName} color={iconColor} size="md" />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={[typography.h3, { color: colors.onSurface }]} numberOfLines={1}>
              {budget.name}
            </Text>
            <Text style={[typography.label, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
              {formatCurrency(spent)} / {formatCurrency(budget.amount)} • {budget.period === "weekly" ? "Weekly" : "Monthly"}
              {category ? ` • ${category.name}` : ""}
            </Text>
          </View>
        </View>

        <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
          <Text style={[typography.h3, { color: isOverBudget ? colors.error : colors.primary, fontSize: 15 }]}>
            {isOverBudget ? `${formatCurrency(Math.abs(remaining))} over` : `${formatCurrency(remaining)} left`}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("BudgetForm", { budgetId: id })}
            style={{ marginTop: 4, padding: 2 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[typography.caption, { color: colors.onSurfaceVariant, fontWeight: "600" }]}>
              Edit ›
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.progressBarContainer, { backgroundColor: progressBg, marginTop: 16 }]}>
        <View
          style={[
            styles.progressBarFill,
            {
              backgroundColor: progressColor,
              width: `${Math.min(100, Math.max(0, progressPercentage))}%`,
            },
          ]}
        />
      </View>

      {isOverBudget && (
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
          <Ionicons name="warning" size={14} color={colors.error} />
          <Text style={[typography.label, { color: colors.error, marginLeft: 6 }]}>Over budget limit</Text>
        </View>
      )}
    </TouchableOpacity>
  );

}
