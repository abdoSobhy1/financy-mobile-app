import React, { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Circle } from "react-native-svg";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { subtractMoney } from "../../../shared/utils";
import { getAlphaColor } from "../../../shared/utils/colors";
import type { DashboardScreenController } from "../hooks/useDashboardScreen";
import { generateSmoothPath } from "../model/dashboardMetrics";
import { styles } from "./DashboardSections.styles";

const SPARKLINE_HEIGHT = 80;
const PIE_RADIUS = 24;
const PIE_STROKE = 6;
const PIE_CIRCUMFERENCE = 2 * Math.PI * PIE_RADIUS;
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

interface DashboardBalanceCardsProps {
  SCREEN_WIDTH: number;
  activeCardIndex: DashboardScreenController["activeCardIndex"];
  setActiveCardIndex: DashboardScreenController["setActiveCardIndex"];
  balanceHistory: DashboardScreenController["balanceHistory"];
  toggleHideBalances: DashboardScreenController["toggleHideBalances"];
  hideBalances: DashboardScreenController["hideBalances"];
  maskCurrency: DashboardScreenController["maskCurrency"];
  balance: DashboardScreenController["balance"];
  balanceChangePct: DashboardScreenController["balanceChangePct"];
  totalIncome: DashboardScreenController["totalIncome"];
  totalExpenses: DashboardScreenController["totalExpenses"];
  budgetedExpenses: DashboardScreenController["budgetedExpenses"];
  totalBudget: DashboardScreenController["totalBudget"];
  daysLeftInPeriod: DashboardScreenController["daysLeftInPeriod"];
  navigation: DashboardScreenController["navigation"];
}

interface StatPillProps {
  iconName: "arrow-down" | "arrow-up";
  label: string;
  valueText: string;
}

function StatPill({ iconName, label, valueText }: StatPillProps) {
  const { spacing, colors, isDark, typography } = useAppTheme();
  const pillBorderColor = isDark
    ? "transparent"
    : getAlphaColor(colors.onPrimaryContainer, "1F");

  return (
    <View
      style={[
        styles.statPill,
        {
          backgroundColor: isDark ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.75)",
          padding: spacing.sm,
          gap: spacing.xs,
          borderWidth: isDark ? 0 : 1,
          borderColor: pillBorderColor,
        },
      ]}>
      <View
        style={[
          styles.statPillIcon,
          {
            backgroundColor: isDark
              ? "rgba(255,255,255,0.2)"
              : getAlphaColor(colors.onPrimaryContainer, "1F"),
          },
        ]}>
        <Ionicons name={iconName} size={12} color={colors.onPrimaryContainer} />
      </View>
      <View style={styles.statPillContent}>
        <Text
          style={[
            typography.bodySmall,
            styles.statPillTitle,
            { color: colors.onPrimaryContainer },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit>
          {label}
        </Text>
        <Text
          style={[
            typography.label,
            styles.statPillValue,
            { color: colors.onPrimaryContainer },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit>
          {valueText}
        </Text>
      </View>
    </View>
  );
}

export function DashboardBalanceCards({
  SCREEN_WIDTH,
  activeCardIndex,
  setActiveCardIndex,
  balanceHistory,
  toggleHideBalances,
  hideBalances,
  maskCurrency,
  balance,
  balanceChangePct,
  totalIncome,
  totalExpenses,
  budgetedExpenses,
  totalBudget,
  daysLeftInPeriod,
  navigation,
}: DashboardBalanceCardsProps) {
  const { spacing, colors, isDark, typography } = useAppTheme();
  const cardWidth = SCREEN_WIDTH * 0.85;
  const snapInterval = cardWidth + spacing.md;
  const badgeBorderColor = isDark
    ? "transparent"
    : getAlphaColor(colors.onPrimaryContainer, "1F");

  const { strokePath, fillPath } = useMemo(
    () => generateSmoothPath(balanceHistory, cardWidth, SPARKLINE_HEIGHT),
    [balanceHistory, cardWidth],
  );

  const budgetPercentUsed =
    totalBudget > 0
      ? Math.min(100, Math.round((budgetedExpenses / totalBudget) * 100))
      : 0;
  const remainingBudget = Math.max(0, subtractMoney(totalBudget, budgetedExpenses));
  const dailySafeToSpend = remainingBudget / Math.max(1, daysLeftInPeriod);
  const pieDashoffset =
    PIE_CIRCUMFERENCE - (budgetPercentUsed / 100) * PIE_CIRCUMFERENCE;

  const pctSign = balanceChangePct > 0 ? "+" : "";
  const pctArrow = balanceChangePct >= 0 ? "↑" : "↓";

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={snapInterval}
      snapToAlignment="start"
      disableIntervalMomentum
      decelerationRate="fast"
      onScroll={(e) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / snapInterval);
        const clamped = Math.max(0, Math.min(1, index));
        if (clamped !== activeCardIndex) {
          setActiveCardIndex(clamped);
        }
      }}
      scrollEventThrottle={16}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
        gap: spacing.md,
      }}>
      {/* 1. Net Balance Card */}
      <View
        style={[
          styles.heroCard,
          {
            width: cardWidth,
            backgroundColor: colors.primaryContainer,
            padding: spacing.xl,
          },
        ]}>
        <View style={styles.sparklineWrap}>
          <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${cardWidth} ${SPARKLINE_HEIGHT}`}
            preserveAspectRatio="none">
            <Path
              d={fillPath}
              fill={colors.onPrimaryContainer}
              fillOpacity={isDark ? 0.12 : 0.08}
            />
            <Path
              d={strokePath}
              fill="none"
              stroke={colors.onPrimaryContainer}
              strokeWidth={3}
              strokeOpacity={isDark ? 0.6 : 0.45}
            />
          </Svg>
        </View>

        <View style={styles.heroCardRow}>
          <View style={[styles.balanceLeftColumn, { paddingRight: spacing.sm }]}>
            <View style={[styles.balanceHeaderRow, { marginBottom: spacing.sm }]}>
              <Text
                style={[
                  typography.label,
                  styles.headerSectionLabel,
                  { color: colors.onPrimaryContainer },
                ]}>
                NET BALANCE
              </Text>
              <View
                style={[
                  styles.periodBadge,
                  {
                    backgroundColor: isDark
                      ? "rgba(0,0,0,0.12)"
                      : "rgba(255,255,255,0.75)",
                    borderWidth: isDark ? 0 : 1,
                    borderColor: badgeBorderColor,
                  },
                ]}>
                <Text
                  style={[
                    styles.periodBadgeText,
                    { color: colors.onPrimaryContainer },
                  ]}>
                  THIS PERIOD
                </Text>
              </View>
              <TouchableOpacity
                onPress={toggleHideBalances}
                hitSlop={HIT_SLOP}
                style={styles.eyeToggleButton}>
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
                styles.heroAmountText,
                {
                  color: colors.onPrimaryContainer,
                  marginBottom: spacing.sm,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {maskCurrency(balance, balance >= 0 ? "+" : "")}
            </Text>

            <View style={styles.balanceHeaderRow}>
              <View
                style={[
                  styles.pctBadge,
                  {
                    backgroundColor: isDark
                      ? "rgba(0,0,0,0.14)"
                      : "rgba(255,255,255,0.75)",
                    borderWidth: isDark ? 0 : 1,
                    borderColor: badgeBorderColor,
                  },
                ]}>
                <Text
                  style={[
                    styles.pctBadgeText,
                    { color: colors.onPrimaryContainer },
                  ]}>
                  {pctArrow} {pctSign}
                  {balanceChangePct.toFixed(1)}%
                </Text>
              </View>
              <Text
                style={[
                  styles.vsPeriodText,
                  { color: colors.onPrimaryContainer },
                ]}>
                vs last period
              </Text>
            </View>
          </View>

          <View style={[styles.statsColumn, { gap: spacing.sm }]}>
            <StatPill
              iconName="arrow-down"
              label="Income"
              valueText={maskCurrency(totalIncome, "+")}
            />
            <StatPill
              iconName="arrow-up"
              label="Expenses"
              valueText={maskCurrency(totalExpenses, "-")}
            />
          </View>
        </View>
      </View>

      {/* 2. Budgeted Spend Card */}
      <View
        style={[
          styles.budgetHeroCard,
          {
            width: cardWidth,
            backgroundColor: colors.primaryContainer,
            padding: spacing.xl,
          },
        ]}>
        <View style={styles.budgetTopRow}>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                typography.label,
                styles.headerSectionLabel,
                {
                  color: colors.onPrimaryContainer,
                  marginBottom: spacing.sm,
                },
              ]}>
              BUDGETED SPEND
            </Text>
            <Text
              style={[
                typography.h1,
                styles.heroAmountText,
                {
                  color: colors.onPrimaryContainer,
                  marginBottom: spacing.xs,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {maskCurrency(budgetedExpenses)}
            </Text>
          </View>
          {totalBudget > 0 && (
            <View
              style={[
                styles.budgetSafeBadge,
                {
                  backgroundColor: isDark
                    ? "rgba(0,0,0,0.14)"
                    : "rgba(255,255,255,0.75)",
                  borderWidth: isDark ? 0 : 1,
                  borderColor: badgeBorderColor,
                },
              ]}>
              <Text
                style={[
                  styles.budgetSafeLabel,
                  { color: colors.onPrimaryContainer },
                ]}>
                SAFE DAILY
              </Text>
              <Text
                style={[
                  styles.budgetSafeValue,
                  { color: colors.onPrimaryContainer },
                ]}>
                {maskCurrency(dailySafeToSpend)}/d
              </Text>
            </View>
          )}
        </View>

        {totalBudget > 0 ? (
          <View style={[styles.budgetProgressRow, { marginTop: spacing.md }]}>
            <View style={[styles.budgetRingWrap, { marginRight: spacing.md }]}>
              <Svg width="48" height="48" viewBox="0 0 60 60">
                <Circle
                  cx="30"
                  cy="30"
                  r={PIE_RADIUS}
                  stroke={colors.onPrimaryContainer}
                  strokeOpacity={0.2}
                  strokeWidth={PIE_STROKE}
                  fill="none"
                />
                <Circle
                  cx="30"
                  cy="30"
                  r={PIE_RADIUS}
                  stroke={colors.onPrimaryContainer}
                  strokeWidth={PIE_STROKE}
                  fill="none"
                  strokeDasharray={PIE_CIRCUMFERENCE}
                  strokeDashoffset={pieDashoffset}
                  strokeLinecap="round"
                  rotation="-90"
                  origin="30, 30"
                />
              </Svg>
            </View>
            <View>
              <Text
                style={[
                  typography.bodyMedium,
                  { color: colors.onPrimaryContainer, opacity: 0.75 },
                ]}>
                vs. {maskCurrency(totalBudget)} Budget
              </Text>
              <Text
                style={[
                  typography.label,
                  { color: colors.onPrimaryContainer, opacity: 0.9, marginTop: 2 },
                ]}>
                {budgetPercentUsed}% Used • {daysLeftInPeriod}d left
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.budgetEmptyRow, { marginTop: spacing.md }]}>
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.onPrimaryContainer, opacity: 0.8 },
              ]}>
              No active budgets set
            </Text>
            <TouchableOpacity
              onPress={() => (navigation as any).navigate("Budgets")}
              activeOpacity={0.75}
              style={[
                styles.setBudgetButton,
                {
                  backgroundColor: isDark
                    ? "rgba(0,0,0,0.16)"
                    : "rgba(255,255,255,0.8)",
                },
              ]}>
              <Text
                style={[
                  styles.setBudgetButtonText,
                  { color: colors.onPrimaryContainer },
                ]}>
                Set Budget
              </Text>
              <Ionicons
                name="arrow-forward"
                size={13}
                color={colors.onPrimaryContainer}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
