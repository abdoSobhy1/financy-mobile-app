import React, { useState } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, G } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../components/ui/ThemeProvider";
import { useAnalysisData } from "./hooks/useAnalysisData";
import { AppHeader } from "../../components/ui/AppHeader";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { useTabBarHeight, FilterChips, IconChip } from "../../components/ui";
import { formatCurrency } from "../../utils";

export const AnalysisScreen: React.FC = () => {
  const {
    colors,
    typography,
    spacing,
    isDark,
    resolveCategoryColor,
  } = useAppTheme();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"This Month" | "Last Month" | "3 Months">("This Month");
  const [selectedSliceIndex, setSelectedSliceIndex] = useState<number | null>(null);

  const getDateRange = () => {
    const now = new Date();
    if (filter === "This Month") {
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    }
    if (filter === "Last Month") {
      const lastMonth = subMonths(now, 1);
      return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) };
    }
    if (filter === "3 Months") {
      return { startDate: startOfMonth(subMonths(now, 2)), endDate: endOfMonth(now) };
    }
    return {};
  };

  const { data: analyticsData } = useAnalysisData(getDateRange());
  const tabBarHeight = useTabBarHeight();

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const { summary, categoryBreakdown, monthlyTrends, budgetUsage } = analyticsData;

  const renderSpendingBreakdown = () => {
    const expenses = categoryBreakdown.filter((item) => item.category.type === "expense");
    const totalExpenses = Math.abs(summary.totalExpenses);

    const donutSize = 188;
    const strokeWidth = 18;
    const center = donutSize / 2;
    const radius = center - strokeWidth;
    const circumference = 2 * Math.PI * radius;

    let cumulativePct = 0;
    const activeItem =
      selectedSliceIndex !== null && expenses[selectedSliceIndex]
        ? expenses[selectedSliceIndex]
        : null;

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
            Spending Breakdown
          </Text>
          <Ionicons
            name="pie-chart-outline"
            size={20}
            color={colors.onSurfaceVariant}
          />
        </View>

        {/* Interactive SVG Donut Chart */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setSelectedSliceIndex(null)}
          style={{
            alignItems: "center",
            justifyContent: "center",
            marginVertical: 24,
          }}>
          <View
            style={{
              width: donutSize,
              height: donutSize,
              alignItems: "center",
              justifyContent: "center",
            }}>
            <Svg width={donutSize} height={donutSize}>
              <G rotation="-90" origin={`${center}, ${center}`}>
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={colors.surfaceVariant}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                {totalExpenses > 0 &&
                  expenses.map((item, idx) => {
                    const pct = Math.max(0, Math.min(100, item.percentage)) / 100;
                    const strokeDasharray = `${pct * circumference} ${circumference}`;
                    const strokeDashoffset = -cumulativePct * circumference;
                    cumulativePct += pct;
                    const { iconColor } = resolveCategoryColor(
                      (item.category as any).color
                    );
                    const isDimmed =
                      selectedSliceIndex !== null && selectedSliceIndex !== idx;

                    return (
                      <Circle
                        key={item.category.id || idx}
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke={iconColor}
                        strokeWidth={
                          selectedSliceIndex === idx
                            ? strokeWidth + 4
                            : strokeWidth
                        }
                        strokeOpacity={isDimmed ? 0.3 : 1}
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap={expenses.length === 1 ? "round" : "butt"}
                        fill="transparent"
                      />
                    );
                  })}
              </G>
            </Svg>

            {/* Center Label inside Donut */}
            <View
              style={{
                position: "absolute",
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 24,
              }}>
              <Text
                style={[
                  typography.label,
                  {
                    color: colors.onSurfaceVariant,
                    marginBottom: 4,
                    textAlign: "center",
                  },
                ]}
                numberOfLines={1}>
                {activeItem ? activeItem.category.name : "Total Spent"}
              </Text>
              <Text
                style={[
                  typography.h2,
                  {
                    color: colors.onBackground,
                    fontSize: 22,
                    fontWeight: "800",
                    textAlign: "center",
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit>
                {formatCurrency(
                  activeItem ? Math.abs(activeItem.amount) : totalExpenses
                )}
              </Text>
              {activeItem && (
                <Text
                  style={[
                    typography.bodySmall,
                    { color: colors.primary, fontWeight: "700", marginTop: 2 },
                  ]}>
                  {Math.round(activeItem.percentage)}% of total
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {expenses.length === 0 ? (
          <Text
            style={[
              typography.bodyMedium,
              {
                color: colors.onSurfaceVariant,
                textAlign: "center",
                paddingVertical: 12,
              },
            ]}>
            No expenses recorded for this period.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {expenses.map((item, index) => {
              const isSelected = selectedSliceIndex === index;
              const { iconColor, bgColor } = resolveCategoryColor(
                (item.category as any).color
              );
              return (
                <TouchableOpacity
                  key={item.category.id || index}
                  activeOpacity={0.75}
                  onPress={() =>
                    setSelectedSliceIndex(isSelected ? null : index)
                  }
                  style={[
                    styles.breakdownRow,
                    {
                      backgroundColor: isSelected
                        ? bgColor
                        : colors.surfaceVariant,
                      borderColor: isSelected ? iconColor : "transparent",
                      borderWidth: 1,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 16,
                    },
                  ]}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}>
                    <IconChip
                      iconName={
                        ((item.category as any).icon || "pricetag") as any
                      }
                      colorName={(item.category as any).color || "bluegrey"}
                      size={32}
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      style={[
                        typography.bodyLarge,
                        { color: colors.onBackground, fontWeight: "600", flex: 1 },
                      ]}
                      numberOfLines={1}>
                      {item.category.name}
                    </Text>
                  </View>
                  <Text
                    style={[
                      typography.bodySmall,
                      {
                        color: colors.onSurfaceVariant,
                        width: 46,
                        textAlign: "right",
                        fontWeight: "600",
                      },
                    ]}>
                    {Math.round(item.percentage)}%
                  </Text>
                  <Text
                    style={[
                      typography.bodyLarge,
                      {
                        color: colors.onBackground,
                        fontWeight: "700",
                        minWidth: 84,
                        textAlign: "right",
                      },
                    ]}>
                    {formatCurrency(Math.abs(item.amount))}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const renderCashFlowTrend = () => {
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
  };

  const renderBudgetHealth = () => {
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
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <AppHeader title="Analytics" />
      <FilterChips
        options={["This Month", "Last Month", "3 Months"]}
        selected={filter}
        onSelect={(f) => {
          setSelectedSliceIndex(null);
          setFilter(f as any);
        }}
        style={{
          marginBottom: spacing.lg,
          paddingHorizontal: spacing.lg,
          maxHeight: 44,
        }}
      />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: tabBarHeight,
        }}
        showsVerticalScrollIndicator={false}>
        {renderSpendingBreakdown()}
        {renderCashFlowTrend()}
        {renderBudgetHealth()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 24,
    borderRadius: 24,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
});

export default AnalysisScreen;
