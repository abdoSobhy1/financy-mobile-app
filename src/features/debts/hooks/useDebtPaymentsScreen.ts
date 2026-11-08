import { useEffect, useState, useCallback } from "react";

import { useDispatch, useSelector } from "react-redux";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { useToast } from "../../../shared/ui";

import { AppDispatch, RootState } from "../../../app/store";
import { fetchDebts, deletePayment } from "../store/debtsSlice";
import { DebtPayment } from "../../../shared/types";

import { DebtStackParamList } from "../../../shared/types";
import { db } from "../../../infrastructure/database/repositories";

type DebtPaymentsScreenNavigationProp = StackNavigationProp<
  DebtStackParamList,
  "DebtPayments"
>;

type DebtPaymentsScreenRouteProp = RouteProp<
  DebtStackParamList,
  "DebtPayments"
>;

/** Owns screen state and actions; rendering stays in DebtPaymentsScreen. */
export function useDebtPaymentsScreen() {

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
  return {
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
  };
}

export type DebtPaymentsScreenController = ReturnType<typeof useDebtPaymentsScreen>;
