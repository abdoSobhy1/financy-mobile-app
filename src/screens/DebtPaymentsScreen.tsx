import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { useToast, FloatingActionButton } from "../components/ui";
import { DebtPaymentCard } from "../components/debt";
import { AppDispatch, RootState } from "../store";
import { fetchDebts, deletePayment } from "../store/slices/debtsSlice";
import { DebtPayment } from "../types";
import { formatCurrency, formatDate } from "../utils";
import { UI } from "../constants";
import { DebtStackParamList } from "../types";
import { db } from "../database/queries";

type DebtPaymentsScreenNavigationProp = StackNavigationProp<
  DebtStackParamList,
  "DebtPayments"
>;
type DebtPaymentsScreenRouteProp = RouteProp<
  DebtStackParamList,
  "DebtPayments"
>;

const DebtPaymentsScreen: React.FC = () => {
  const { colors, typography, spacing, radius, isDark } = useAppTheme();
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<DebtPaymentsScreenNavigationProp>();
  const route = useRoute<DebtPaymentsScreenRouteProp>();
  const { showSuccess, showError } = useToast();

  const { debtId, debtName } = route.params;
  const debt = useSelector((state: RootState) => state.debts.items[debtId]);
  const paymentsByDebtCount = useSelector(
    (state: RootState) => state.debts.paymentsByDebt[debtId]?.length ?? 0,
  );
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPayments = useCallback(
    async (silent?: boolean) => {
      try {
        if (!silent) {
          setLoading(true);
        }
        const debtPayments = await db.debts.getPaymentsByDebt(debtId);
        setPayments(
          debtPayments.sort(
            (a, b) =>
              new Date(b.paymentDate).getTime() -
              new Date(a.paymentDate).getTime(),
          ),
        );
      } catch (error) {
        showError("Failed to load payments");
      } finally {
        setLoading(false);
      }
    },
    [debtId, showError],
  );

  // Revalidate whenever screen comes into focus (e.g. returning from AddPayment modal)
  useFocusEffect(
    useCallback(() => {
      loadPayments(true);
      dispatch(fetchDebts());
    }, [loadPayments, dispatch]),
  );

  // Also revalidate whenever Redux debt balance or payment count changes
  useEffect(() => {
    loadPayments(payments.length > 0);
  }, [debtId, debt?.currentBalance, debt?.updatedAt, paymentsByDebtCount, loadPayments]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadPayments(true), dispatch(fetchDebts())]);
    setRefreshing(false);
  };

  const navigateToAddPayment = () => {
    navigation.navigate("AddPayment", {
      debtId,
      debtName: debt?.name || debtName,
      currentBalance: debt?.currentBalance ?? 0,
      minimumPayment: debt?.minimumPayment,
      interestRate: debt?.interestRate,
    });
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      await dispatch(deletePayment(paymentId)).unwrap();
      await Promise.all([loadPayments(true), dispatch(fetchDebts())]);
      showSuccess("Payment deleted");
    } catch (error) {
      showError("Failed to delete payment");
    }
  };

  const handleEditPayment = (_payment: DebtPayment) => {
    navigateToAddPayment();
  };

  // ── Computed stats ─────────────────────────────────────────
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalPrincipal = payments.reduce(
    (sum, p) => sum + (p.principal || 0),
    0,
  );
  const totalInterest = payments.reduce((sum, p) => sum + (p.interest || 0), 0);
  const avgPayment = payments.length > 0 ? totalPaid / payments.length : 0;
  const latestPaymentDate =
    payments.length > 0 ? payments[0].paymentDate : null;
  const isPaidOff = Boolean(debt && debt.currentBalance <= 0.005);

  // ── Payment renderer ───────────────────────────────────────
  const renderPayment = ({ item }: { item: DebtPayment }) => (
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["top"]}>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  // ── Header ─────────────────────────────────────────
  headerContainer: {
    marginBottom: 8,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: 12,
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(108,92,231,0.1)",
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  navContent: {
    flex: 1,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  navSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  placeholder: { width: 38 },

  // ── Hero Card ──────────────────────────────────────
  heroCard: {
    borderRadius: 20,
    padding: 22,
    overflow: "hidden",
    position: "relative",
  },
  decorCircle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  circle1: { width: 160, height: 160, top: -50, right: -30 },
  circle2: { width: 100, height: 100, bottom: -25, left: -20 },
  heroLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroValue: {
    fontSize: 36,
    fontWeight: "800",
    color: "#2ED573",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroSubtext: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 18,
  },

  // ── Stats Row (inside hero) ────────────────────────
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: "auto",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 12,
  },

  // ── Quick Stats Row ────────────────────────────────
  quickStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: "rgba(20,20,50,0.65)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.15)",
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
    gap: 6,
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  quickStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ── Section Label ──────────────────────────────────
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 12,
  },

  // ── List ───────────────────────────────────────────
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },

  // ── Empty State ────────────────────────────────────
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
    elevation: 4,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});

export default DebtPaymentsScreen;
