import { styles } from "./DebtPaymentsScreen.styles";
import { useDebtPaymentsScreen } from "../hooks/useDebtPaymentsScreen";
import React from "react";
import { View, Text, FlatList, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";

import { Ionicons } from "@expo/vector-icons";

import { FloatingActionButton } from "../../../shared/ui";
import { DebtPaymentCard } from "../components";

import { DebtPayment } from "../../../shared/types";
import { formatCurrency, formatDate } from "../../../shared/utils";

const DebtPaymentsScreen: React.FC = () => {
  const {
    navigation,
    debtName,
    payments,
    loading,
    refreshing,
    handleRefresh,
    navigateToAddPayment,
    handleDeletePayment,
    handleEditPayment,
    totalPaid,
    totalPrincipal,
    totalInterest,
    avgPayment,
    latestPaymentDate,
    isPaidOff
  } = useDebtPaymentsScreen();
  const { colors, typography, spacing, radius, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  // ── Payment renderer ───────────────────────────────────────
  const renderPayment = ({ item }: { item: DebtPayment; }) => (
    <DebtPaymentCard
      payment={item}
      onEdit={handleEditPayment}
      onDelete={handleDeletePayment}
    />
  );

  // ── Header ─────────────────────────────────────────────────
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Navigation bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surfaceVariant, borderColor: colors.outlineVariant }]}
          onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back"
            size={18}
            color={colors.onSurfaceVariant}
          />
        </TouchableOpacity>
        <View style={styles.navContent}>
          <Text style={[styles.navTitle, { color: colors.onBackground }]} numberOfLines={1}>
            {debtName}
          </Text>
          <Text style={[styles.navSubtitle, { color: colors.onSurfaceVariant }]}>Payment History</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Hero summary card */}
      {payments.length > 0 && (
        <View
          style={[styles.heroCard, { backgroundColor: colors.primaryContainer }]}>
          {/* Decorative */}
          <View style={[styles.decorCircle, styles.circle1]} />
          <View style={[styles.decorCircle, styles.circle2]} />

          {/* Total paid */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={[styles.heroLabel, { color: colors.onPrimaryContainer, opacity: 0.8 }]}>Total Paid</Text>
            {isPaidOff && (
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.tertiary + "28", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 }}>
                <Ionicons name="checkmark-circle" size={14} color={colors.tertiary} />
                <Text style={{ fontSize: 11, fontWeight: "700", color: colors.tertiary }}>Paid Off</Text>
              </View>
            )}
          </View>
          <Text style={[styles.heroValue, { color: colors.onPrimaryContainer }]}>{formatCurrency(totalPaid)}</Text>
          {latestPaymentDate && (
            <Text style={[styles.heroSubtext, { color: colors.onPrimaryContainer, opacity: 0.7 }]}>
              Last payment: {formatDate(latestPaymentDate)}
            </Text>
          )}

          {/* Mini stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: colors.tertiary }]} />
              <Text style={[styles.statLabel, { color: colors.onPrimaryContainer, opacity: 0.7 }]}>Principal</Text>
              <Text style={[styles.statValue, { color: colors.tertiary }]}>
                {formatCurrency(totalPrincipal)}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.onPrimaryContainer, opacity: 0.2 }]} />
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: colors.tertiary }]} />
              <Text style={[styles.statLabel, { color: colors.onPrimaryContainer, opacity: 0.7 }]}>Interest</Text>
              <Text style={[styles.statValue, { color: colors.tertiary }]}>
                {formatCurrency(totalInterest)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Quick stats below hero */}
      {/* Quick stats below hero */}
      {payments.length > 0 && (
        <View style={styles.quickStatsRow}>
          <View style={[styles.quickStatCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.outlineVariant }]}>
            <Ionicons name="receipt" size={16} color={colors.primary} />
            <Text style={[styles.quickStatValue, { color: colors.onSurface }]}>{payments.length}</Text>
            <Text style={[styles.quickStatLabel, { color: colors.onSurfaceVariant }]}>Payments</Text>
          </View>
          <View style={[styles.quickStatCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.outlineVariant }]}>
            <Ionicons name="trending-up" size={16} color={colors.tertiary} />
            <Text style={[styles.quickStatValue, { color: colors.onSurface }]}>
              {formatCurrency(avgPayment)}
            </Text>
            <Text style={[styles.quickStatLabel, { color: colors.onSurfaceVariant }]}>Avg. Payment</Text>
          </View>
        </View>
      )}

      {/* Section label */}
      {payments.length > 0 && (
        <Text style={[styles.sectionLabel, { color: colors.primary }]}>All Payments</Text>
      )}
    </View>
  );

  // ── Empty State ────────────────────────────────────────────
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryContainer }]}>
        <Ionicons name={isPaidOff ? "checkmark-circle-outline" : "receipt-outline"} size={40} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.onBackground }]}>
        {isPaidOff ? "Debt Paid Off" : "No Payments Yet"}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
        {isPaidOff
          ? "This debt has been fully paid off."
          : "Start making payments to track your progress on this debt."}
      </Text>
      {!isPaidOff && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={navigateToAddPayment}>
          <View style={[styles.emptyButton, { backgroundColor: colors.primary }]}>
            <Ionicons name="add-circle" size={18} color={colors.onPrimary} />
            <Text style={[styles.emptyButtonText, { color: colors.onPrimary }]}>Record a Payment</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {loading && payments.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={payments}
          renderItem={renderPayment}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {!isPaidOff && (
        <FloatingActionButton
          icon="add"
          onPress={navigateToAddPayment}
          style={{ position: "absolute", bottom: 30, right: 20 }}
        />
      )}
    </View>
  );
};

export default DebtPaymentsScreen;
