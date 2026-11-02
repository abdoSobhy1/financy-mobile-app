import { DebtBalanceSummary } from "../components/DebtBalanceSummary";
import { DebtPortfolio } from "../components/DebtPortfolio";
import { styles } from "./DebtsScreen.styles";
import { useDebtsScreen } from "../hooks/useDebtsScreen";
import React from "react";
import { View, Text, ScrollView, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { AppHeader } from "../../../shared/ui/AppHeader";

import { useTabBarHeight, FilterChips } from "../../../shared/ui";
import { formatCurrency } from "../../../shared/utils";

const DebtsScreen: React.FC = () => {
  const {
    navigation,
    loading,
    iOweList,
    owedToMeList,
    overdueList,
    totalYouOwe,
    totalOwedToYou,
    netPosition,
    filter,
    setFilter,
    filteredDebts
  } = useDebtsScreen();
  const { colors, typography, spacing, isDark } = useAppTheme();
  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();

  const renderEmptyState = () => (
    <View style={{ padding: spacing.xl, alignItems: "center" }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.surfaceVariant,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.md,
        }}>
        <Ionicons name="card-outline" size={32} color={colors.primary} />
      </View>
      <Text style={[typography.h3, { color: colors.onSurface }]}>
        No Debts Found
      </Text>
      <Text
        style={[
          typography.bodyMedium,
          {
            color: colors.onSurfaceVariant,
            textAlign: "center",
            marginTop: spacing.xs,
          },
        ]}>
        Tap the + button to track a loan, credit card, or personal IOU.
      </Text>
    </View>
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <AppHeader title="Debts" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xs,
          paddingBottom: tabBarHeight + spacing.xl,
        }}>
        {/* Compact Side-by-Side Summary Cards */}
        <DebtBalanceSummary colors={colors} typography={typography} totalOwedToYou={totalOwedToYou} owedToMeList={owedToMeList} totalYouOwe={totalYouOwe} overdueList={overdueList} iOweList={iOweList} />

        {/* Net Position Banner */}
        <View
          style={[
            styles.netBanner,
            {
              backgroundColor: colors.surfaceVariant,
              borderColor: colors.outlineVariant,
              marginBottom: spacing.lg,
            },
          ]}>
          <Text
            style={[typography.bodyMedium, { color: colors.onSurfaceVariant }]}>
            Net Debt Position
          </Text>
          <Text
            style={[
              typography.bodyLarge,
              {
                fontWeight: "700",
                color:
                  netPosition >= 0 ? colors.primary : colors.error,
              },
            ]}>
            {netPosition >= 0 ? "+" : "-"}
            {formatCurrency(Math.abs(netPosition))}
          </Text>
        </View>

        {/* Filters */}
        <FilterChips
          options={["All Debts", "Owed to Me", "I Owe", "Overdue", "Paid Off"]}
          selected={filter}
          onSelect={(f) => setFilter(f as any)}
          style={{ marginBottom: spacing.lg }}
        />

        {/* Active Debts List */}
        <DebtPortfolio colors={colors} typography={typography} filter={filter} filteredDebts={filteredDebts} navigation={navigation} loading={loading} spacing={spacing} renderEmptyState={renderEmptyState} />
      </ScrollView>
    </View>
  );
};

export default DebtsScreen;
