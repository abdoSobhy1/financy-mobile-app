import { getAlphaColor } from "../../../shared/utils/colors";
import { styles } from "../screens/DashboardScreen.styles";
import { useDashboardScreen } from "../hooks/useDashboardScreen";

import { View, Text, ScrollView, TouchableOpacity } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Circle } from "react-native-svg";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";

interface DashboardBalanceCardsProps {
  CARD_WIDTH: number;
  activeCardIndex: ReturnType<typeof useDashboardScreen>["activeCardIndex"];
  setActiveCardIndex: ReturnType<typeof useDashboardScreen>["setActiveCardIndex"];
  fillPath: string;
  strokePath: string;
  toggleHideBalances: ReturnType<typeof useDashboardScreen>["toggleHideBalances"];
  hideBalances: ReturnType<typeof useDashboardScreen>["hideBalances"];
  maskCurrency: ReturnType<typeof useDashboardScreen>["maskCurrency"];
  balance: ReturnType<typeof useDashboardScreen>["balance"];
  balanceChangePct: ReturnType<typeof useDashboardScreen>["balanceChangePct"];
  totalIncome: ReturnType<typeof useDashboardScreen>["totalIncome"];
  totalExpenses: ReturnType<typeof useDashboardScreen>["totalExpenses"];
  budgetedExpenses: ReturnType<typeof useDashboardScreen>["budgetedExpenses"];
  totalBudget: ReturnType<typeof useDashboardScreen>["totalBudget"];
  dailySafeToSpend: number;
  pieRadius: 24;
  pieStroke: 6;
  pieCircumference: number;
  pieDashoffset: number;
  budgetPercentUsed: number;
  daysLeftInPeriod: ReturnType<typeof useDashboardScreen>["daysLeftInPeriod"];
  navigation: ReturnType<typeof useDashboardScreen>["navigation"];

}
export function DashboardBalanceCards({ CARD_WIDTH, activeCardIndex, setActiveCardIndex, fillPath, strokePath, toggleHideBalances, hideBalances, maskCurrency, balance, balanceChangePct, totalIncome, totalExpenses, budgetedExpenses, totalBudget, dailySafeToSpend, pieRadius, pieStroke, pieCircumference, pieDashoffset, budgetPercentUsed, daysLeftInPeriod, navigation }: DashboardBalanceCardsProps) {
  const { spacing, colors, isDark, typography } = useAppTheme();

  return (<ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    snapToInterval={CARD_WIDTH + spacing.md}
    snapToAlignment="start"
    disableIntervalMomentum
    decelerationRate="fast"
    onScroll={(e) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / (CARD_WIDTH + spacing.md));
      if (index !== activeCardIndex) {
        setActiveCardIndex(Math.max(0, Math.min(1, index)));
      }
    }}
    scrollEventThrottle={16}
    contentContainerStyle={{
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      gap: spacing.md,
    }}>

    {/* 1. Unified Summary Card */}
    <View
      style={[
        styles.heroCard,
        {
          width: CARD_WIDTH,
          backgroundColor: colors.primaryContainer,
          padding: spacing.xl,
        },
      ]}>

      {/* Absolute Graph Background */}
      <View style={styles.sparklineWrap}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${CARD_WIDTH} 80`} preserveAspectRatio="none">
          <Path d={fillPath} fill={colors.onPrimaryContainer} fillOpacity={isDark ? 0.12 : 0.08} />
          <Path d={strokePath} fill="none" stroke={colors.onPrimaryContainer} strokeWidth={3} strokeOpacity={isDark ? 0.6 : 0.45} />
        </Svg>
      </View>

      <View style={styles.heroCardRow}>

        {/* Left Side: Header, Big Number, % Change */}
        <View style={{ flex: 1, paddingRight: spacing.sm, justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm }}>
            <Text style={[typography.label, { color: colors.onPrimaryContainer, textTransform: "uppercase", letterSpacing: 1, opacity: 0.75 }]}>
              NET BALANCE
            </Text>
            <View
              style={[
                styles.periodBadge,
                {
                  backgroundColor: isDark ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.75)",
                  borderWidth: isDark ? 0 : 1,
                  borderColor: isDark ? "transparent" : getAlphaColor(colors.onPrimaryContainer, "1F"),
                },
              ]}>
              <Text style={{ fontSize: 9, color: colors.onPrimaryContainer, fontWeight: "700" }}>
                THIS PERIOD
              </Text>
            </View>
            <TouchableOpacity
              onPress={toggleHideBalances}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ opacity: 0.75 }}>
              <Ionicons
                name={hideBalances ? "eye-off-outline" : "eye-outline"}
                size={16}
                color={colors.onPrimaryContainer}
              />
            </TouchableOpacity>
          </View>

          <Text
            style={[
              typography.h1,
              {
                color: colors.onPrimaryContainer,
                fontSize: 38,
                fontWeight: "900",
                marginBottom: spacing.sm,
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit>
            {maskCurrency(balance, balance >= 0 ? "+" : "")}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={[
                styles.pctBadge,
                {
                  backgroundColor: isDark ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.75)",
                  borderWidth: isDark ? 0 : 1,
                  borderColor: isDark ? "transparent" : getAlphaColor(colors.onPrimaryContainer, "1F"),
                },
              ]}>
              <Text style={{ fontSize: 10, color: colors.onPrimaryContainer, fontWeight: "700", opacity: 0.9 }}>
                {balanceChangePct >= 0 ? "↑" : "↓"} {balanceChangePct > 0 ? "+" : ""}{balanceChangePct.toFixed(1)}%
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: colors.onPrimaryContainer, opacity: 0.65, fontWeight: "600" }}>
              vs last period
            </Text>
          </View>
        </View>

        {/* Right Side: Stacked Pills */}
        <View style={{ width: 124, gap: spacing.sm }}>

          {/* Income Pill (stacked) */}
          <View
            style={[
              styles.statPill,
              {
                backgroundColor: isDark ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.75)",
                padding: spacing.sm,
                gap: spacing.xs,
                borderWidth: isDark ? 0 : 1,
                borderColor: isDark ? "transparent" : getAlphaColor(colors.onPrimaryContainer, "1F"),
              },
            ]}>
            <View style={[styles.statPillIcon, { backgroundColor: isDark ? "rgba(255,255,255,0.2)" : getAlphaColor(colors.onPrimaryContainer, "1F") }]}>
              <Ionicons name="arrow-down" size={12} color={colors.onPrimaryContainer} />
            </View>
            <View style={{ flex: 1, justifyContent: "center" }}>
              <Text style={[typography.bodySmall, { color: colors.onPrimaryContainer, opacity: 0.8, fontSize: 10, lineHeight: 12 }]} numberOfLines={1} adjustsFontSizeToFit>Income</Text>
              <Text style={[typography.label, { color: colors.onPrimaryContainer, fontWeight: "700", fontSize: 12, lineHeight: 14 }]} numberOfLines={1} adjustsFontSizeToFit>{maskCurrency(totalIncome, "+")}</Text>
            </View>
          </View>

          {/* Expenses Pill (stacked) */}
          <View
            style={[
              styles.statPill,
              {
                backgroundColor: isDark ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.75)",
                padding: spacing.sm,
                gap: spacing.xs,
                borderWidth: isDark ? 0 : 1,
                borderColor: isDark ? "transparent" : getAlphaColor(colors.onPrimaryContainer, "1F"),
              },
            ]}>
            <View style={[styles.statPillIcon, { backgroundColor: isDark ? "rgba(255,255,255,0.2)" : getAlphaColor(colors.onPrimaryContainer, "1F") }]}>
              <Ionicons name="arrow-up" size={12} color={colors.onPrimaryContainer} />
            </View>
            <View style={{ flex: 1, justifyContent: "center" }}>
              <Text style={[typography.bodySmall, { color: colors.onPrimaryContainer, opacity: 0.8, fontSize: 10, lineHeight: 12 }]} numberOfLines={1} adjustsFontSizeToFit>Expenses</Text>
              <Text style={[typography.label, { color: colors.onPrimaryContainer, fontWeight: "700", fontSize: 12, lineHeight: 14 }]} numberOfLines={1} adjustsFontSizeToFit>{maskCurrency(totalExpenses, "-")}</Text>
            </View>
          </View>

        </View>

      </View>

    </View>

    {/* 2. Monthly Spend vs Budget Card (budgeted transactions only) */}
    <View
      style={[
        styles.heroCard,
        {
          width: CARD_WIDTH,
          backgroundColor: colors.primaryContainer,
          padding: spacing.xl,
          justifyContent: "space-between",
        },
      ]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              typography.label,
              {
                color: colors.onPrimaryContainer,
                textTransform: "uppercase",
                letterSpacing: 1,
                opacity: 0.75,
                marginBottom: spacing.sm,
              },
            ]}>
            BUDGETED SPEND
          </Text>
          <Text
            style={[
              typography.h1,
              {
                color: colors.onPrimaryContainer,
                fontSize: 38,
                fontWeight: "900",
                marginBottom: spacing.xs,
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit>
            {maskCurrency(budgetedExpenses)}
          </Text>
        </View>
        {totalBudget > 0 && (
          <View style={{
            backgroundColor: isDark ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.75)",
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 14,
            alignItems: "flex-end",
            borderWidth: isDark ? 0 : 1,
            borderColor: isDark ? "transparent" : getAlphaColor(colors.onPrimaryContainer, "1F"),
          }}>
            <Text style={{ fontSize: 10, color: colors.onPrimaryContainer, opacity: 0.8, fontWeight: "600" }}>
              SAFE DAILY
            </Text>
            <Text style={{ fontSize: 13, color: colors.onPrimaryContainer, fontWeight: "800", marginTop: 1 }}>
              {maskCurrency(dailySafeToSpend)}/d
            </Text>
          </View>
        )}
      </View>

      {totalBudget > 0 ? (
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.md }}>
          <View style={{ width: 48, height: 48, marginRight: spacing.md }}>
            <Svg width="48" height="48" viewBox="0 0 60 60">
              <Circle
                cx="30"
                cy="30"
                r={pieRadius}
                stroke={colors.onPrimaryContainer}
                strokeOpacity={0.2}
                strokeWidth={pieStroke}
                fill="none"
              />
              <Circle
                cx="30"
                cy="30"
                r={pieRadius}
                stroke={colors.onPrimaryContainer}
                strokeWidth={pieStroke}
                fill="none"
                strokeDasharray={pieCircumference}
                strokeDashoffset={pieDashoffset}
                strokeLinecap="round"
                rotation="-90"
                origin="30, 30"
              />
            </Svg>
          </View>
          <View>
            <Text style={[typography.bodyMedium, { color: colors.onPrimaryContainer, opacity: 0.75 }]}>
              vs. {maskCurrency(totalBudget)} Budget
            </Text>
            <Text style={[typography.label, { color: colors.onPrimaryContainer, opacity: 0.9, marginTop: 2 }]}>
              {budgetPercentUsed}% Used • {daysLeftInPeriod}d left
            </Text>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.md }}>
          <Text style={[typography.bodyMedium, { color: colors.onPrimaryContainer, opacity: 0.8 }]}>
            No active budgets set
          </Text>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate("Budgets")}
            activeOpacity={0.75}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: isDark ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.8)",
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 14,
            }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.onPrimaryContainer }}>
              Set Budget
            </Text>
            <Ionicons name="arrow-forward" size={13} color={colors.onPrimaryContainer} />
          </TouchableOpacity>
        </View>
      )}
    </View>

  </ScrollView>);
}
