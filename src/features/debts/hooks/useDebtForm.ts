import { useState, useEffect, useRef, useMemo } from "react";
import { TextInput } from "react-native";
import { useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { DebtStackParamList } from "../../../shared/types";
import { useToast } from "../../../shared/ui";
import { AppDispatch } from "../../../app/store";
import { addDebt, updateDebt, deleteDebt } from "../store/debtsSlice";
import { Debt, DebtDirection } from "../../../shared/types";

import { AlertService } from "../../../shared/services/AlertService";
import { useUnsavedChanges } from "../../../shared/hooks";
interface DebtFormProps {
  debt?: Debt | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}
interface FormData {
  name: string;
  type: DebtDirection;
  totalAmount: string;
  interestRate: string;
  minimumPayment: string;
  creditor: string;
  description: string;
  dueDate?: Date | null;
}
type DebtFormNavigationProp = StackNavigationProp<DebtStackParamList, "DebtForm">;
export function useDebtForm({
  debt,
  onSuccess,
  onCancel,
}: DebtFormProps) {

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<DebtFormNavigationProp>();
  const { showSuccess, showError } = useToast();

  const isEditing = !!debt;

  const [formData, setFormData] = useState<FormData>({
    name: "",
    type: "i_owe",
    totalAmount: "",
    interestRate: "",
    minimumPayment: "",
    creditor: "",
    description: "",
    dueDate: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const totalAmountRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const creditorRef = useRef<TextInput>(null);
  const minPaymentRef = useRef<TextInput>(null);
  const interestRateRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);

  useEffect(() => {
    if (debt) {
      setFormData({
        name: debt.name || "",
        type: debt.type === "owed_to_me" ? "owed_to_me" : "i_owe",
        totalAmount: debt.totalAmount?.toString() || "",
        interestRate: debt.interestRate?.toString() || "",
        minimumPayment: debt.minimumPayment?.toString() || "",
        creditor: debt.creditor || "",
        description: debt.description || "",
        dueDate: debt.dueDate ? new Date(debt.dueDate) : null,
      });
      if (debt.description) {
        setShowMore(true);
      }
    }
  }, [debt]);

  const hasChanges = useMemo(() => {
    if (isEditing && debt) {
      const origName = debt.name || "";
      const origType = debt.type === "owed_to_me" ? "owed_to_me" : "i_owe";
      const origTotal = debt.totalAmount?.toString() || "";
      const origInterest = debt.interestRate?.toString() || "";
      const origMin = debt.minimumPayment?.toString() || "";
      const origCreditor = debt.creditor || "";
      const origDesc = debt.description || "";
      const origDue = debt.dueDate ? new Date(debt.dueDate).getTime() : null;
      const currentDue = formData.dueDate ? formData.dueDate.getTime() : null;

      return (
        formData.name !== origName ||
        formData.type !== origType ||
        formData.totalAmount !== origTotal ||
        formData.interestRate !== origInterest ||
        formData.minimumPayment !== origMin ||
        formData.creditor !== origCreditor ||
        formData.description !== origDesc ||
        currentDue !== origDue
      );
    } else {
      return (
        formData.totalAmount.trim() !== "" ||
        formData.name.trim() !== "" ||
        formData.creditor.trim() !== "" ||
        formData.minimumPayment.trim() !== "" ||
        formData.interestRate.trim() !== "" ||
        formData.description.trim() !== "" ||
        formData.dueDate !== null
      );
    }
  }, [isEditing, debt, formData]);

  const { markAsSaved, resetSaved } = useUnsavedChanges({
    hasChanges,
    isEditing,
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const amountNum = Number(formData.totalAmount.replace(/,/g, ""));

    if (!formData.totalAmount.trim()) {
      newErrors.totalAmount = "Amount is required";
    } else if (isNaN(amountNum) || amountNum <= 0) {
      newErrors.totalAmount = "Please enter a valid amount greater than 0";
    }

    if (!formData.name.trim()) {
      newErrors.name = "Debt name is required";
    }

    if (
      formData.interestRate &&
      (isNaN(Number(formData.interestRate)) || Number(formData.interestRate) < 0)
    ) {
      newErrors.interestRate = "Please enter a valid interest rate";
    }

    if (
      formData.minimumPayment &&
      (isNaN(Number(formData.minimumPayment)) ||
        Number(formData.minimumPayment) <= 0)
    ) {
      newErrors.minimumPayment = "Please enter a valid minimum payment";
    }

    setErrors(newErrors);
    if (newErrors.totalAmount) {
      showError(newErrors.totalAmount);
    } else if (newErrors.name) {
      showError(newErrors.name);
    } else if (newErrors.minimumPayment) {
      showError(newErrors.minimumPayment);
    } else if (newErrors.interestRate) {
      showError(newErrors.interestRate);
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const cleanAmount = Number(formData.totalAmount.replace(/,/g, ""));
      const debtData = {
        name: formData.name.trim(),
        type: formData.type,
        totalAmount: cleanAmount,
        currentBalance: isEditing ? debt!.currentBalance : cleanAmount,
        interestRate: formData.interestRate
          ? Number(formData.interestRate)
          : undefined,
        minimumPayment: formData.minimumPayment
          ? Number(formData.minimumPayment)
          : undefined,
        creditor: formData.creditor.trim() || undefined,
        description: formData.description.trim() || undefined,
        dueDate: formData.dueDate ? formData.dueDate.toISOString() : undefined,
      };

      if (isEditing) {
        await dispatch(
          updateDebt({
            id: debt!.id,
            updates: debtData,
          }),
        ).unwrap();
        showSuccess("Debt updated successfully!");
      } else {
        await dispatch(addDebt(debtData)).unwrap();
        showSuccess("Debt added successfully!");
      }

      markAsSaved();
      if (onSuccess) {
        onSuccess();
      } else {
        navigation.goBack();
      }
    } catch (error) {
      resetSaved();
      console.error("Debt operation error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      const action = isEditing ? "update" : "add";
      showError(`Failed to ${action} debt: ${errorMessage}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!debt) return;

    AlertService.alert(
      "Delete Debt",
      `Are you sure you want to delete "${debt.name}" and all its payment history? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await dispatch(deleteDebt(debt.id)).unwrap();
              showSuccess("Debt deleted successfully!");
              markAsSaved();
              if (onSuccess) {
                onSuccess();
              } else {
                navigation.goBack();
              }
            } catch (error) {
              resetSaved();
              console.error("Debt deletion error:", error);
              showError("Failed to delete debt. Please try again.");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };
  return { navigation, isEditing, formData, setFormData, errors, loading, showDatePicker, setShowDatePicker, showMore, setShowMore, totalAmountRef, nameRef, creditorRef, minPaymentRef, interestRateRef, descriptionRef, handleSubmit, handleDelete, updateField };
}
