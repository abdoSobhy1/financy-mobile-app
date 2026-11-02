import { useState, useEffect, useRef, useMemo } from "react";
import { TextInput } from "react-native";

import { useDispatch, useSelector } from "react-redux";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { useToast } from "../../../shared/ui";
import { AppDispatch, RootState } from "../../../app/store";
import { makeDebtPayment } from "../store/debtsSlice";
import { formatCurrency } from "../../../shared/utils";

import { useUnsavedChanges } from "../../../shared/hooks";
import { DebtStackParamList } from "../../../shared/types";

type AddPaymentScreenNavigationProp = StackNavigationProp<
  DebtStackParamList,
  "AddPayment"
>;

type AddPaymentScreenRouteProp = RouteProp<DebtStackParamList, "AddPayment">;

/** Owns screen state and actions; rendering stays in AddPaymentScreen. */
export function useAddPaymentScreen() {

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<AddPaymentScreenNavigationProp>();
  const route = useRoute<AddPaymentScreenRouteProp>();
  const { showSuccess, showError } = useToast();

  const { debtId, debtName } = route.params;
  const liveDebt = useSelector((state: RootState) => state.debts.items[debtId]);
  const currentBalance = liveDebt?.currentBalance ?? route.params.currentBalance;
  const minimumPayment = liveDebt?.minimumPayment ?? route.params.minimumPayment;
  const interestRate = liveDebt?.interestRate ?? route.params.interestRate;

  const [paymentData, setPaymentData] = useState({
    amount: "",
    principal: "",
    interest: "",
    note: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const amountRef = useRef<TextInput>(null);
  const principalRef = useRef<TextInput>(null);
  const interestRef = useRef<TextInput>(null);
  const noteRef = useRef<TextInput>(null);

  const hasChanges = useMemo(() => {
    return (
      paymentData.amount.trim() !== "" ||
      paymentData.principal.trim() !== "" ||
      paymentData.interest.trim() !== "" ||
      paymentData.note.trim() !== ""
    );
  }, [paymentData]);

  const { markAsSaved, resetSaved } = useUnsavedChanges({
    hasChanges,
  });

  // Auto-calculate principal/interest split
  useEffect(() => {
    if (paymentData.amount && !paymentData.principal && !paymentData.interest) {
      const amount = Number(paymentData.amount);
      if (interestRate && amount > 0) {
        const monthlyRate = interestRate / 100 / 12;
        const interestPayment = currentBalance * monthlyRate;
        const principalPayment = Math.max(0, amount - interestPayment);
        setPaymentData((prev) => ({
          ...prev,
          principal: principalPayment.toFixed(2),
          interest: Math.min(interestPayment, amount).toFixed(2),
        }));
      } else {
        setPaymentData((prev) => ({
          ...prev,
          principal: amount.toFixed(2),
          interest: "0.00",
        }));
      }
    }
  }, [paymentData.amount, interestRate, currentBalance]);

  const validatePayment = () => {
    const newErrors: Record<string, string> = {};
    if (!paymentData.amount.trim())
      newErrors.amount = "Payment amount is required";
    else if (
      isNaN(Number(paymentData.amount)) ||
      Number(paymentData.amount) <= 0
    )
      newErrors.amount = "Please enter a valid payment amount";
    else if (Number(paymentData.amount) > currentBalance + 0.01)
      newErrors.amount = `Cannot exceed balance (${formatCurrency(currentBalance)})`;

    const totalSplit =
      Number(paymentData.principal || 0) + Number(paymentData.interest || 0);
    if (Math.abs(totalSplit - Number(paymentData.amount)) > 0.01)
      newErrors.split = "Principal + Interest must equal payment amount";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validatePayment()) return;
    setLoading(true);
    try {
      await dispatch(
        makeDebtPayment({
          debtId,
          paymentData: {
            amount: Number(paymentData.amount),
            date: new Date().toISOString(),
            paymentDate: new Date().toISOString(),
            principal: Number(paymentData.principal || paymentData.amount),
            interest: Number(paymentData.interest || 0),
            note: paymentData.note.trim() || undefined,
          },
        }),
      ).unwrap();
      showSuccess("Payment recorded successfully!");
      markAsSaved();
      navigation.goBack();
    } catch (error) {
      resetSaved();
      showError("Failed to record payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAmount = (percentage: number) => {
    const amount = (currentBalance * percentage).toFixed(2);
    setPaymentData((prev) => ({
      ...prev,
      amount,
      principal: "",
      interest: "",
    }));
  };
  return {
    navigation,
    debtName,
    currentBalance,
    minimumPayment,
    interestRate,
    paymentData,
    setPaymentData,
    errors,
    setErrors,
    loading,
    amountRef,
    principalRef,
    interestRef,
    noteRef,
    handleSubmit,
    handleQuickAmount
  };
}
