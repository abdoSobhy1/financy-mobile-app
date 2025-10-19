import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { Screen, useToast } from "../components/ui";
import { DebtPaymentCard } from "../components/debt";
import { AppDispatch } from "../store";
import { DebtPayment } from "../types";
import { formatCurrency } from "../utils";
import { UI } from "../constants";
import { DebtStackParamList } from "../navigation/DebtStackNavigator";
import { db } from "../database/queries";

type DebtPaymentsScreenNavigationProp = StackNavigationProp<DebtStackParamList, "DebtPayments">;
type DebtPaymentsScreenRouteProp = RouteProp<DebtStackParamList, "DebtPayments">;

const DebtPaymentsScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<DebtPaymentsScreenNavigationProp>();
  const route = useRoute<DebtPaymentsScreenRouteProp>();
  const { showSuccess, showError } = useToast();

  const { debtId, debtName } = route.params;
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, [debtId]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const debtPayments = await db.debts.getPaymentsByDebt(debtId);
      setPayments(debtPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()));
    } catch (error) {
      showError("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      // You'll need to implement deletePayment in the debts repository
      await db.debts.deletePayment(paymentId);
      await loadPayments(); // Refresh the list
    } catch (error) {
      showError("Failed to delete payment");
    }
  };

  const handleEditPayment = (payment: DebtPayment) => {
    // For now, navigate to AddPayment with pre-filled data
    // You could create a separate EditPaymentScreen later
    navigation.navigate("AddPayment", {
      debtId,
      debtName,
      currentBalance: 0,
      minimumPayment: 0,
      interestRate: 0,
    });
  };

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  const renderPayment = ({ item }: { item: DebtPayment }) => (
    <DebtPaymentCard payment={item} onEdit={handleEditPayment} onDelete={handleDeletePayment} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={64} color={UI.COLORS.TEXT_SECONDARY} style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>No Payments Yet</Text>
      <Text style={styles.emptySubtitle}>Start making payments to track your progress on this debt.</Text>
    </View>
  );

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={UI.COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.title}>{debtName}</Text>
        <View style={styles.placeholder} />
      </View>

      {payments.length > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Total Paid</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(totalPaid)}</Text>
          <Text style={styles.paymentCount}>
            {payments.length} payment{payments.length !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      <FlatList
        data={payments}
        renderItem={renderPayment}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={loading ? null : renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() =>
          navigation.navigate("AddPayment", {
            debtId,
            debtName,
            currentBalance: 0, // You might want to pass the actual debt here
            minimumPayment: 0,
            interestRate: 0,
          })
        }>
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: UI.SPACING.LG,
    paddingVertical: UI.SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
  },

  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: UI.COLORS.SURFACE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    flex: 1,
    textAlign: "center",
    marginHorizontal: UI.SPACING.MD,
  },

  placeholder: {
    width: 32,
  },

  summary: {
    backgroundColor: UI.COLORS.SURFACE,
    margin: UI.SPACING.LG,
    padding: UI.SPACING.LG,
    borderRadius: UI.CARD_RADIUS,
    alignItems: "center",
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },

  summaryLabel: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    marginBottom: 4,
  },

  summaryAmount: {
    fontSize: 24,
    fontWeight: "700",
    color: UI.COLORS.SUCCESS,
    marginBottom: 4,
  },

  paymentCount: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
  },

  listContainer: {
    paddingHorizontal: UI.SPACING.LG,
    paddingBottom: 100,
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: UI.SPACING.XL,
    paddingVertical: UI.SPACING.XL * 2,
  },

  emptyIcon: {
    marginBottom: UI.SPACING.LG,
    opacity: 0.5,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.SM,
    textAlign: "center",
  },

  emptySubtitle: {
    fontSize: 16,
    color: UI.COLORS.TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 24,
  },

  addButton: {
    position: "absolute",
    right: UI.SPACING.LG,
    bottom: UI.SPACING.LG + 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: UI.COLORS.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default DebtPaymentsScreen;
