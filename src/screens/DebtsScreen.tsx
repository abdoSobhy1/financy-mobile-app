import React, { useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Screen, Card } from "../components/ui";
import { formatCurrency } from "../utils";
import { Debt } from "../types";
import { RootState, AppDispatch } from "../store";
import { fetchDebts, makeDebtPayment } from "../store/slices/debtsSlice";
import { DebtStackParamList } from "../navigation/DebtStackNavigator";

type DebtsScreenNavigationProp = StackNavigationProp<DebtStackParamList, "DebtsList">;

const DebtsScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<DebtsScreenNavigationProp>();
  const { items, ids, loading } = useSelector((state: RootState) => state.debts);

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

  const renderDebtCard = ({ item: debt }: { item: Debt }) => {
    // Calculate progress: (amountPaid / totalAmount) * 100
    const amountPaid = Math.max(0, debt.totalAmount - debt.currentBalance);
    const progressPercentage = debt.totalAmount > 0 ? Math.max(0, Math.min(100, (amountPaid / debt.totalAmount) * 100)) : 0;
    const remainingAmount = Math.max(0, debt.currentBalance);

    return (
      <Card style={styles.debtCard}>
        <View style={styles.debtHeader}>
          <Text style={styles.debtName}>{debt.name}</Text>
          <Text style={[styles.amount, debt.currentBalance > 0 ? styles.debt : styles.paid]}>{formatCurrency(debt.currentBalance)}</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
          </View>
          <Text style={styles.progressText}>{progressPercentage.toFixed(1)}% paid</Text>
        </View>

        <View style={styles.debtDetails}>
          <Text style={styles.originalAmount}>Original: {formatCurrency(debt.totalAmount)}</Text>
          {!!debt.interestRate && <Text style={styles.interestRate}>Interest: {debt.interestRate}%</Text>}
        </View>

        <View style={styles.debtActions}>
          <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => navigation.navigate("DebtForm", { debtId: debt.id })}>
            <Ionicons name="create-outline" size={16} color="#64748B" />
            <Text style={[styles.actionButtonText, styles.editButtonText]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("DebtPayments", { debtId: debt.id, debtName: debt.name })}>
            <Ionicons name="receipt-outline" size={16} color="#8B5CF6" />
            <Text style={styles.actionButtonText}>Payments</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleAddPayment(debt)} disabled={debt.currentBalance <= 0}>
            <Ionicons name="card" size={16} color="#10B981" />
            <Text style={styles.actionButtonText}>Add Payment</Text>
          </TouchableOpacity>

          {debt.currentBalance > 0 && (
            <TouchableOpacity
              style={[styles.actionButton, styles.markPaidButton]}
              onPress={() =>
                dispatch(
                  makeDebtPayment({
                    debtId: debt.id,
                    paymentData: {
                      amount: debt.currentBalance,
                      date: new Date().toISOString(), // Add required date field
                      paymentDate: new Date().toISOString(),
                      principal: debt.currentBalance,
                      interest: 0,
                    },
                  })
                )
              }>
              <Ionicons name="checkmark" size={16} color="#3B82F6" />
              <Text style={styles.actionButtonText}>Mark Paid</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  // Calculate debt analytics
  const totalDebt = debts.reduce((sum, debt) => sum + debt.currentBalance, 0);
  const totalOriginal = debts.reduce((sum, debt) => sum + debt.totalAmount, 0);
  const totalPaid = totalOriginal - totalDebt;
  const averageInterest = debts.length > 0 ? debts.reduce((sum, debt) => sum + (debt.interestRate || 0), 0) / debts.length : 0;
  const monthlyMinimums = debts.reduce((sum, debt) => sum + (debt.minimumPayment || 0), 0);
  const activeDebts = debts.filter((debt) => debt.currentBalance > 0).length;
  const paidOffDebts = debts.filter((debt) => debt.currentBalance <= 0).length;
  const overallProgress = totalOriginal > 0 ? (totalPaid / totalOriginal) * 100 : 0;

  const renderAnalyticsSection = () => (
    <View style={styles.analyticsSection}>
      <Text style={styles.analyticsTitle}>Debt Overview</Text>

      {/* Progress Ring or Bar */}
      <View style={styles.progressRing}>
        <View style={styles.progressRingInner}>
          <Text style={styles.progressPercentage}>{overallProgress.toFixed(1)}%</Text>
          <Text style={styles.progressLabel}>Paid Off</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatCurrency(totalDebt)}</Text>
          <Text style={styles.statLabel}>Total Remaining</Text>
          <Ionicons name="trending-down" size={16} color="#EF4444" />
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatCurrency(totalPaid)}</Text>
          <Text style={styles.statLabel}>Total Paid</Text>
          <Ionicons name="trending-up" size={16} color="#10B981" />
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{activeDebts}</Text>
          <Text style={styles.statLabel}>Active Debts</Text>
          <Ionicons name="card" size={16} color="#F59E0B" />
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatCurrency(monthlyMinimums)}</Text>
          <Text style={styles.statLabel}>Monthly Min.</Text>
          <Ionicons name="calendar" size={16} color="#3B82F6" />
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{paidOffDebts}</Text>
          <Text style={styles.statLabel}>Paid Off</Text>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
        </View>
      </View>

      {averageInterest > 0 && (
        <View style={styles.insightCard}>
          <View style={styles.insightIcon}>
            <Ionicons name="information-circle" size={20} color="#F59E0B" />
          </View>
          <View style={styles.insightContent}>
            <Text style={styles.insightText}>Average interest rate: {averageInterest.toFixed(1)}%</Text>
            {totalDebt > 0 && <Text style={styles.insightSubtext}>Focus on highest interest debts first to save money</Text>}
          </View>
        </View>
      )}
    </View>
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Debts</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("DebtForm", {})}>
          <Ionicons name="add" size={24} color="#10B981" />
        </TouchableOpacity>
      </View>

      {/* Analytics Section */}
      {debts.length > 0 && renderAnalyticsSection()}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : debts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="card-outline" size={64} color="#64748B" />
          <Text style={styles.emptyTitle}>No Debts</Text>
          <Text style={styles.emptyText}>Tap + to add your first debt to start tracking your debt payoff journey</Text>
        </View>
      ) : (
        <View style={styles.debtsContainer}>
          <Text style={styles.sectionTitle}>Your Debts</Text>
          <FlatList
            data={debts}
            renderItem={renderDebtCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  addButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
  },
  list: {
    padding: 8,
    paddingHorizontal: 16,
  },
  debtCard: {
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  debtHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  debtName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#F8FAFC",
    flex: 1,
  },
  amount: {
    fontSize: 20,
    fontWeight: "700",
  },
  debt: {
    color: "#EF4444",
  },
  paid: {
    color: "#10B981",
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 10,
    backgroundColor: "#1E293B",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 5,
  },
  progressText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "right",
  },
  debtDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  originalAmount: {
    fontSize: 16,
    color: "#94A3B8",
  },
  interestRate: {
    fontSize: 16,
    color: "#F59E0B",
  },
  debtActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    gap: 6,
  },
  markPaidButton: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderColor: "rgba(59, 130, 246, 0.2)",
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  editButton: {
    backgroundColor: "rgba(100, 116, 139, 0.1)",
    borderColor: "rgba(100, 116, 139, 0.2)",
  },
  editButtonText: {
    color: "#94A3B8",
  },
  // Analytics Styles
  analyticsSection: {
    padding: 12,
    marginBottom: 4,
  },
  analyticsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
    textAlign: "center",
    marginBottom: 8,
  },
  progressRing: {
    alignSelf: "center",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: "#10B981",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  progressRingInner: {
    alignItems: "center",
  },
  progressPercentage: {
    fontSize: 22,
    fontWeight: "700",
    color: "#10B981",
  },
  progressLabel: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    width: "31%",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.1)",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 4,
  },
  insightCard: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: 8,
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
  insightIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  insightContent: {
    flex: 1,
  },
  insightText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  insightSubtext: {
    fontSize: 12,
    color: "#94A3B8",
    lineHeight: 16,
  },
  debtsContainer: {
    flex: 2,
    minHeight: 400,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 8,
    letterSpacing: 0.3,
    marginHorizontal: 16,
    marginBottom: 4,
  },
});

export default DebtsScreen;
