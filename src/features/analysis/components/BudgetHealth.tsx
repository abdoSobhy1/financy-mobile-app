import type { useAnalysisScreen } from "../hooks/useAnalysisScreen";
import { styles } from "../screens/AnalysisScreen.styles";

import { Text, TouchableOpacity, View } from "react-native";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";

import { formatCurrency } from "../../../shared/utils";

interface BudgetHealthProps {
  navigation: ReturnType<typeof useAnalysisScreen>["navigation"];
  budgetUsage: ReturnType<typeof useAnalysisScreen>["budgetUsage"];
}
export function BudgetHealth({ navigation, budgetUsage }: BudgetHealthProps) {
  const { colors, spacing, typography } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.outlineVariant,
          borderWidth: 1,
          marginBottom: spacing.xxl,
        },
      ]}>
      <View style={[styles.cardHeader, { marginBottom: 20 }]}>
        <Text style={[typography.h3, { color: colors.onBackground }]}>
          Budget Health
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Budgets")}>
          <Text style={[typography.label, { color: colors.primary }]}>
            Manage Budgets
          </Text>
        </TouchableOpacity>
      </View>

      {budgetUsage.length === 0 ? (
        <Text
          style={[
            typography.bodyMedium,
            {
              color: colors.onSurfaceVariant,
              textAlign: "center",
              paddingVertical: 12,
            },
          ]}>
          No active budgets configured yet.
        </Text>
      ) : (
        <View style={{ gap: 20 }}>
          {budgetUsage.map((b, index) => {
            const isOver = b.status === "over";
            const progressColor = isOver ? colors.error : colors.primary;
            const trackColor = colors.surfaceVariant;
            const remainingOrOver = isOver
              ? b.used - b.budget.amount
              : b.budget.amount - b.used;

            return (
              <View key={b.budget.id || index}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}>
                  <Text
                    style={[
                      typography.bodyLarge,
                      { color: colors.onBackground, fontWeight: "600" },
                    ]}>
                    {b.budget.name} {isOver ? "(Over)" : ""}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text
                      style={[
                        typography.bodyMedium,
                        {
                          color: isOver ? colors.error : colors.onBackground,
                          fontWeight: "700",
                        },
                      ]}>
                      {formatCurrency(b.used)}
                    </Text>
                    <Text
                      style={[
                        typography.bodySmall,
                        { color: colors.onSurfaceVariant },
                      ]}>
                      {" "}
                      / {formatCurrency(b.budget.amount)}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.progressBar,
                    { backgroundColor: trackColor },
                  ]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(b.percentage, 100)}%`,
                        backgroundColor: progressColor,
                      },
                    ]}
                  />
                </View>

                <Text
                  style={[
                    typography.label,
                    {
                      color: isOver
                        ? colors.error
                        : colors.onSurfaceVariant,
                      marginTop: 6,
                      fontSize: 11,
                    },
                  ]}>
                  {isOver
                    ? `${formatCurrency(remainingOrOver)} over limit`
                    : `${Math.round(b.percentage)}% spent • ${formatCurrency(
                      remainingOrOver
                    )} left`}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

}
