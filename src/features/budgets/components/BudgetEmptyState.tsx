import { styles } from "./BudgetScreens.styles";
import type { BudgetListScreenController } from "../hooks/useBudgetListScreen";

import { View, Text, TouchableOpacity } from "react-native";

import { useAppTheme, type AppTheme } from "../../../shared/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

interface BudgetEmptyStateProps {
  colors: AppTheme["colors"];
  typography: AppTheme["typography"];
  spacing: AppTheme["spacing"];
  navigation: BudgetListScreenController["navigation"];
}
export function BudgetEmptyState({ colors, typography, spacing, navigation }: BudgetEmptyStateProps) {
  return ((
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.surfaceVariant }]}>
        <Ionicons name="wallet-outline" size={48} color={colors.onSurfaceVariant} />
      </View>
      <Text style={[typography.h2, { color: colors.onBackground, textAlign: "center", marginBottom: spacing.sm }]}>
        No Budgets Yet
      </Text>
      <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: "center", marginBottom: spacing.xl, paddingHorizontal: spacing.xl }]}>
        Create budgets to track your spending categories and stay on target.
      </Text>
      <TouchableOpacity
        style={{
          backgroundColor: colors.primary,
          paddingHorizontal: 24,
          paddingVertical: 14,
          borderRadius: 24,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
        onPress={() => navigation.navigate("BudgetForm", {})}
      >
        <Ionicons name="add" size={20} color={colors.onPrimary} />
        <Text style={[typography.bodyMedium, { color: colors.onPrimary, fontWeight: "700" }]}>
          Create First Budget
        </Text>
      </TouchableOpacity>
    </View>
  ));
}
