import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { FloatingActionButton } from "../components/ui";
import { formatCurrency } from "../utils";
import { Debt } from "../types";
import { RootState, AppDispatch } from "../store";
import { fetchDebts, makeDebtPayment } from "../store/slices/debtsSlice";
import { DebtStackParamList } from "../navigation/DebtStackNavigator";
import { UI } from "../constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_PADDING = 20;
const PAGE_WIDTH = SCREEN_WIDTH - HERO_PADDING * 2; // matches the hero card inner width

type DebtsScreenNavigationProp = StackNavigationProp<
  DebtStackParamList,
  "DebtsList"
>;

// ── Isolated Hero Carousel (manages its own page state) ──────
interface HeroPage {
  label: string;
  value: string;
  valueColor: string;
  subtitle: string;
}

const HeroCarousel = React.memo(({ pages }: { pages: HeroPage[] }) => {
  const [activePage, setActivePage] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / PAGE_WIDTH);
    if (idx >= 0 && idx < pages.length) {
      setActivePage(idx);
    }
  };

  return (
    <LinearGradient
      colors={["#1B1464", "#6C5CE7", "#A29BFE"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={heroStyles.heroCard}>
      <View style={[heroStyles.decorCircle, heroStyles.circle1]} />
      <View style={[heroStyles.decorCircle, heroStyles.circle2]} />

      <ScrollView
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={{ marginHorizontal: -UI.SPACING.LG }}>
        {pages.map((page, i) => (
          <View
            key={i}
            style={{
              width: PAGE_WIDTH,
              paddingHorizontal: UI.SPACING.LG,
            }}>
            <Text style={heroStyles.heroLabel}>{page.label}</Text>
            <Text style={[heroStyles.heroValue, { color: page.valueColor }]}>
              {page.value}
            </Text>
            <Text style={heroStyles.heroSubtitle}>{page.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={heroStyles.dotRow}>
        {pages.map((_, i) => (
          <View
            key={i}
            style={[heroStyles.dot, activePage === i && heroStyles.dotActive]}
          />
        ))}
      </View>
    </LinearGradient>
  );
});

const heroStyles = StyleSheet.create({
  heroCard: {
    borderRadius: 20,
    padding: UI.SPACING.LG,
    paddingBottom: 20,
    overflow: "hidden",
    position: "relative",
  },
  decorCircle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  circle1: { width: 180, height: 180, top: -60, right: -40 },
  circle2: { width: 120, height: 120, bottom: -30, left: -20 },
  heroLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroValue: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    marginBottom: 8,
  },
  dotRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  dotActive: {
    width: 20,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
});

// ── Main Screen ──────────────────────────────────────────────
const DebtsScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<DebtsScreenNavigationProp>();
  const { items, ids, loading } = useSelector(
    (state: RootState) => state.debts,
  );

  useEffect(() => {
    dispatch(fetchDebts());
  }, [dispatch]);

  const debts = ids.map((id) => items[id]).filter(Boolean);

  const handleAddPayment = (debt: Debt) => {
    navigation.navigate("AddPayment", {
      debtId: debt.id,
      debtName: debt.name,
      currentBalance: debt.currentBalance,
      minimumPayment: debt.minimumPayment,
      interestRate: debt.interestRate,
    });
  };

  // ── Analytics ────────────────────────────────────────────────
  const totalDebt = debts.reduce((sum, d) => sum + d.currentBalance, 0);
  const totalOriginal = debts.reduce((sum, d) => sum + d.totalAmount, 0);
  const totalPaid = totalOriginal - totalDebt;
  const averageInterest =
    debts.length > 0
      ? debts.reduce((sum, d) => sum + (d.interestRate || 0), 0) / debts.length
      : 0;
  const monthlyMinimums = debts.reduce(
    (sum, d) => sum + (d.minimumPayment || 0),
    0,
  );
  const activeDebts = debts.filter((d) => d.currentBalance > 0).length;
  const paidOffDebts = debts.filter((d) => d.currentBalance <= 0).length;
  const overallProgress =
    totalOriginal > 0 ? (totalPaid / totalOriginal) * 100 : 0;

  // ── Pages for the hero card carousel ─────────────────────────
  const heroPages: HeroPage[] = [
    {
      label: "Overall Progress",
      value: `${overallProgress.toFixed(1)}%`,
      valueColor: "#fff",
      subtitle: `${formatCurrency(totalPaid)} paid of ${formatCurrency(totalOriginal)}`,
    },
    {
      label: "Remaining Balance",
      value: formatCurrency(totalDebt),
      valueColor: "#FF6B6B",
      subtitle: `${activeDebts} active · ${paidOffDebts} paid off`,
    },
    {
      label: "Total Paid",
      value: formatCurrency(totalPaid),
      valueColor: "#2ED573",
      subtitle: `${overallProgress.toFixed(1)}% of total debt cleared`,
    },
    {
      label: "Monthly Commitment",
      value: formatCurrency(monthlyMinimums),
      valueColor: "#fff",
      subtitle: `Avg. interest rate: ${averageInterest.toFixed(1)}%`,
    },
  ];

  // ── Debt Card ────────────────────────────────────────────────
  const renderDebtCard = ({ item: debt }: { item: Debt }) => {
    const amountPaid = Math.max(0, debt.totalAmount - debt.currentBalance);
    const progressPercentage =
      debt.totalAmount > 0
        ? Math.max(0, Math.min(100, (amountPaid / debt.totalAmount) * 100))
        : 0;
    const isPaidOff = debt.currentBalance <= 0;

    const progressColors: [string, string] = isPaidOff
      ? ["#10B981", "#059669"]
      : [UI.COLORS.PRIMARY, UI.COLORS.PRIMARY_DARK];

    return (
      <View style={styles.debtCard}>
        <View style={styles.debtHeader}>
          <View style={styles.debtNameRow}>
            <View style={styles.iconCircle}>
              <Ionicons
                name={isPaidOff ? "checkmark-circle" : "card"}
                size={16}
                color={isPaidOff ? "#10B981" : UI.COLORS.PRIMARY_LIGHT}
              />
            </View>
            <Text style={styles.debtName}>{debt.name}</Text>
          </View>
          <Text
            style={[
              styles.debtAmount,
              isPaidOff ? styles.paidColor : styles.debtColor,
            ]}>
            {formatCurrency(debt.currentBalance)}
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={progressColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressFill,
                { width: `${Math.max(progressPercentage, 2)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {progressPercentage.toFixed(1)}%
          </Text>
        </View>

        <View style={styles.debtDetails}>
          <View>
            <Text style={styles.detailLabel}>Original</Text>
            <Text style={styles.detailValue}>
              {formatCurrency(debt.totalAmount)}
            </Text>
          </View>
          {!!debt.interestRate && (
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.detailLabel}>Interest</Text>
              <Text style={[styles.detailValue, { color: "#F59E0B" }]}>
                {debt.interestRate}%
              </Text>
            </View>
          )}
        </View>

        <View style={styles.debtActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              navigation.navigate("DebtForm", { debtId: debt.id })
            }>
            <Ionicons
              name="create-outline"
              size={14}
              color={UI.COLORS.TEXT_MUTED}
            />
            <Text
              style={[styles.actionBtnText, { color: UI.COLORS.TEXT_MUTED }]}>
              Edit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              navigation.navigate("DebtPayments", {
                debtId: debt.id,
                debtName: debt.name,
              })
            }>
            <Ionicons
              name="receipt-outline"
              size={14}
              color={UI.COLORS.PRIMARY_LIGHT}
            />
            <Text
              style={[
                styles.actionBtnText,
                { color: UI.COLORS.PRIMARY_LIGHT },
              ]}>
              History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnHighlight]}
            onPress={() => handleAddPayment(debt)}
            disabled={isPaidOff}>
            <Ionicons name="card" size={14} color="#10B981" />
            <Text style={[styles.actionBtnText, { color: "#10B981" }]}>
              Pay
            </Text>
          </TouchableOpacity>

          {!isPaidOff && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() =>
                dispatch(
                  makeDebtPayment({
                    debtId: debt.id,
                    paymentData: {
                      amount: debt.currentBalance,
                      date: new Date().toISOString(),
                      paymentDate: new Date().toISOString(),
                      principal: debt.currentBalance,
                      interest: 0,
                    },
                  }),
                )
              }>
              <Ionicons name="checkmark" size={14} color="#3B82F6" />
              <Text style={[styles.actionBtnText, { color: "#3B82F6" }]}>
                Clear
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ── Header ─────────────────────────────────────────────────
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {debts.length > 0 && <Text style={styles.sectionTitle}>Debts</Text>}
      <HeroCarousel pages={heroPages} />

      {/* Insight card */}
      {averageInterest > 0 && totalDebt > 0 && (
        <View style={styles.insightCard}>
          <View style={styles.insightIconBox}>
            <Ionicons name="bulb" size={16} color="#F59E0B" />
          </View>
          <Text style={styles.insightText}>
            Focus on highest interest debts first to save money
          </Text>
        </View>
      )}
    </View>
  );

  // ── Empty State ──────────────────────────────────────────────
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="card-outline" size={40} color={UI.COLORS.PRIMARY} />
      </View>
      <Text style={styles.emptyTitle}>No Debts</Text>
      <Text style={styles.emptyText}>
        Tap + to add your first debt and start tracking your payoff journey
      </Text>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate("DebtForm", {})}>
        <LinearGradient
          colors={[UI.COLORS.PRIMARY, UI.COLORS.PRIMARY_DARK]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyButton}>
          <Ionicons name="add-circle" size={18} color="#fff" />
          <Text style={styles.emptyButtonText}>Add Your First Debt</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient
      colors={["#0a0a2e", "#1a1040", "#0d0d30"]}
      style={styles.gradient}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />

        {loading && debts.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={UI.COLORS.PRIMARY} />
          </View>
        ) : debts.length === 0 ? (
          <View style={styles.centered}>{renderEmptyState()}</View>
        ) : (
          <FlatList
            data={debts}
            renderItem={renderDebtCard}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        <FloatingActionButton
          icon="add"
          onPress={() => navigation.navigate("DebtForm", {})}
          style={{ position: "absolute", bottom: 80, right: 20 }}
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },

  // ── Header ─────────────────────────────────────────
  headerContainer: {
    paddingTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: UI.COLORS.TEXT_PRIMARY,
    letterSpacing: 0.3,
    marginBottom: 16,
    marginTop: 24,
  },

  // ── Insight ────────────────────────────────────────
  insightCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245,158,11,0.06)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.15)",
    marginTop: 14,
  },
  insightIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(245,158,11,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  insightText: {
    fontSize: 13,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    flex: 1,
  },

  // ── Loading / Centered ─────────────────────────────
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  // ── List ───────────────────────────────────────────
  list: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  // ── Debt Card ──────────────────────────────────────
  debtCard: {
    backgroundColor: "rgba(20,20,50,0.65)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#6c5ce726",
    padding: 18,
    marginBottom: 14,
  },
  debtHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  debtNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(108,92,231,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  debtName: {
    fontSize: 17,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
    flex: 1,
    letterSpacing: 0.2,
  },
  debtAmount: { fontSize: 17, fontWeight: "700" },
  debtColor: { color: "#FF6B6B" },
  paidColor: { color: "#10B981" },

  // ── Progress ───────────────────────────────────────
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(108,92,231,0.12)",
    borderRadius: 4,
    marginRight: 10,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },
  progressText: {
    fontSize: 13,
    fontWeight: "700",
    color: UI.COLORS.TEXT_SECONDARY,
    minWidth: 42,
    textAlign: "right",
  },

  // ── Details ────────────────────────────────────────
  debtDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: UI.COLORS.TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
  },

  // ── Actions ────────────────────────────────────────
  debtActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.12)",
    gap: 4,
  },
  actionBtnHighlight: {
    backgroundColor: "rgba(16,185,129,0.08)",
    borderColor: "rgba(16,185,129,0.2)",
  },
  actionBtnText: { fontSize: 12, fontWeight: "600" },

  // ── Empty State ────────────────────────────────────
  emptyState: { alignItems: "center", paddingHorizontal: 32 },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(108,92,231,0.1)",
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: UI.COLORS.TEXT_MUTED,
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
    shadowColor: UI.COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  emptyButtonText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});

export default DebtsScreen;
