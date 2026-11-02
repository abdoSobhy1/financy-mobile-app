import { useAnalysisScreen } from "../hooks/useAnalysisScreen";
import { styles } from "../screens/AnalysisScreen.styles";
import { Ionicons } from "@expo/vector-icons";

import { Text, View } from "react-native";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";

import { formatCurrency } from "../../../shared/utils";

interface CashFlowTrendProps {
  monthlyTrends: ReturnType<typeof useAnalysisScreen>["monthlyTrends"];
  colors: ReturnType<typeof useAppTheme>["colors"];
  typography: ReturnType<typeof useAppTheme>["typography"];
  summary: ReturnType<typeof useAnalysisScreen>["summary"];
}
export function CashFlowTrend({ monthlyTrends, colors, typography, summary }: CashFlowTrendProps) {

  const data = monthlyTrends.slice(-4);
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.income, d.expenses)),
    1
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.outlineVariant,
          borderWidth: 1,
        },
      ]}>
      <View style={styles.cardHeader}>
        <Text style={[typography.h3, { color: colors.onBackground }]}>
          Cash Flow Trend
        </Text>
        <Ionicons
          name="stats-chart"
          size={20}
          color={colors.onSurfaceVariant}
        />
      </View>

      <Text
        style={[
          typography.bodyMedium,
          {
            color: summary.balance >= 0 ? colors.primary : colors.error,
            fontWeight: "600",
            marginTop: 4,
            marginBottom: 28,
          },
        ]}>
        {summary.balance >= 0 ? "+" : ""}
        {formatCurrency(summary.balance)} Net Cash Flow
      </Text>

      {/* Bar Chart Area */}
      <View
        style={{
          height: 150,
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-around",
        }}>
        {data.map((d, i) => {
          const incomeHeight = (d.income / maxVal) * 130;
          const expenseHeight = (d.expenses / maxVal) * 130;

          return (
            <View key={i} style={{ alignItems: "center", width: 58 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  gap: 6,
                }}>
                {/* Income Bar */}
                <View
                  style={{
                    width: 14,
                    height: Math.max(incomeHeight, 6),
                    backgroundColor: colors.primary,
                    borderRadius: 4,
                  }}
                />
                {/* Expense Bar */}
                <View
                  style={{
                    width: 14,
                    height: Math.max(expenseHeight, 6),
                    backgroundColor: colors.error,
                    opacity: 0.75,
                    borderRadius: 4,
                  }}
                />
              </View>
              <Text
                style={[
                  typography.label,
                  {
                    color: colors.onSurfaceVariant,
                    marginTop: 10,
                    fontSize: 11,
                  },
                ]}>
                {d.month.split(" ")[0]}
              </Text>
            </View>
          );
        })}
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          marginTop: 22,
          gap: 24,
        }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={[typography.label, { color: colors.onSurfaceVariant }]}>
            Income ({formatCurrency(summary.totalIncome)})
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={[
              styles.dot,
              { backgroundColor: colors.error, opacity: 0.75 },
            ]}
          />
          <Text style={[typography.label, { color: colors.onSurfaceVariant }]}>
            Expense ({formatCurrency(Math.abs(summary.totalExpenses))})
          </Text>
        </View>
      </View>
    </View>
  );

}
