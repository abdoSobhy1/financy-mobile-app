import { styles } from "../screens/BudgetScreens.styles";
import type { useBudgetListScreen } from "../hooks/useBudgetListScreen";

import { View, Text, TouchableOpacity } from "react-native";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { Shimmer } from "../../../shared/ui";
import { formatCurrency } from "../../../shared/utils";

interface BudgetOverviewProps {
  progressLoaded: ReturnType<typeof useBudgetListScreen>["progressLoaded"];
  spacing: ReturnType<typeof useAppTheme>["spacing"];
  colors: ReturnType<typeof useAppTheme>["colors"];
  typography: ReturnType<typeof useAppTheme>["typography"];
  totalBudget: ReturnType<typeof useBudgetListScreen>["totalBudget"];
  isTotalOver: ReturnType<typeof useBudgetListScreen>["isTotalOver"];
  totalRemaining: ReturnType<typeof useBudgetListScreen>["totalRemaining"];
  totalProgressPercentage: ReturnType<typeof useBudgetListScreen>["totalProgressPercentage"];
  totalSpent: ReturnType<typeof useBudgetListScreen>["totalSpent"];
  ids: ReturnType<typeof useBudgetListScreen>["ids"];
  navigation: ReturnType<typeof useBudgetListScreen>["navigation"];
}
export function BudgetOverview({ progressLoaded, spacing, colors, typography, totalBudget, isTotalOver, totalRemaining, totalProgressPercentage, totalSpent, ids, navigation }: BudgetOverviewProps) {

  if (!progressLoaded) {
    return (
      <View style={{ marginBottom: spacing.lg }}>
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.outlineVariant,
            },
          ]}
        >
          <View style={styles.heroRow}>
            <View>
              <Text
                style={[
                  typography.label,
                  { color: colors.onSurfaceVariant, textTransform: "uppercase" },
                ]}
              >
                Total Monthly Budget
              </Text>
              <View style={{ marginTop: 8 }}>
                <Shimmer width={150} height={32} borderRadius={6} />
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text
                style={[
                  typography.label,
                  { color: colors.onSurfaceVariant, textTransform: "uppercase" },
                ]}
              >
                Remaining
              </Text>
              <View style={{ marginTop: 8 }}>
                <Shimmer width={100} height={24} borderRadius={6} />
              </View>
            </View>
          </View>

          {/* Total Progress Bar Shimmer */}
          <View style={{ marginVertical: 18 }}>
            <Shimmer height={8} borderRadius={4} width="100%" />
          </View>

          <View style={styles.heroRow}>
            <Shimmer width={90} height={14} borderRadius={4} />
            <Shimmer width={60} height={14} borderRadius={4} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.outlineVariant,
          },
        ]}
      >
        <View style={styles.heroRow}>
          <View>
            <Text
              style={[
                typography.label,
                { color: colors.onSurfaceVariant, textTransform: "uppercase" },
              ]}
            >
              Total Monthly Budget
            </Text>
            <Text
              style={[
                typography.h1,
                { color: colors.onSurface, fontSize: 32, marginTop: 4 },
              ]}
            >
              {formatCurrency(totalBudget)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={[
                typography.label,
                { color: colors.onSurfaceVariant, textTransform: "uppercase" },
              ]}
            >
              Remaining
            </Text>
            <Text
              style={[
                typography.h2,
                {
                  color: isTotalOver ? colors.error : colors.primary,
                  fontSize: 20,
                  marginTop: 4,
                },
              ]}
            >
              {formatCurrency(totalRemaining)}
            </Text>
          </View>
        </View>

        {/* Total Progress Bar */}
        <View
          style={[
            styles.progressBarContainer,
            { backgroundColor: colors.surfaceVariant, marginVertical: 16 },
          ]}
        >
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: isTotalOver ? colors.error : colors.primary,
                width: `${Math.min(100, Math.max(0, totalProgressPercentage))}%`,
              },
            ]}
          />
        </View>

        <View style={styles.heroRow}>
          <Text style={[typography.label, { color: colors.onSurfaceVariant }]}>
            {formatCurrency(totalSpent)} spent
          </Text>
          <Text style={[typography.label, { color: colors.onSurfaceVariant }]}>
            {totalProgressPercentage.toFixed(0)}% used
          </Text>
        </View>
      </View>

      {/* Section header for category budgets with in-flow Add Button */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: spacing.md,
          marginBottom: spacing.xs,
          paddingHorizontal: 4,
        }}>
        <Text style={[typography.h3, { color: colors.onBackground }]}>
          Budgets ({ids.length})
        </Text>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: colors.primaryContainer,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
          }}
          onPress={() => navigation.navigate("BudgetForm", {})}>
          <Ionicons name="add" size={18} color={colors.onPrimaryContainer} />
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: colors.onPrimaryContainer,
            }}>
            Add Budget
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

}
