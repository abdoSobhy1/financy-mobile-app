import { useState, useEffect, useRef } from "react";
import { TextInput } from "react-native";

import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../../app/store";
import { addBudget } from "../store/budgetsSlice";
import { useToast } from "../../../shared/ui";
import { VALIDATION } from "../../../shared/constants";

import { BudgetFormData } from "../../../shared/types";
import { useUnsavedChanges } from "../../../shared/hooks";
interface AddBudgetModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}
export function useAddBudgetModal({ visible, onClose, onSuccess }: AddBudgetModalProps) {

  const dispatch = useDispatch<AppDispatch>();
  const { loading: budgetLoading } = useSelector((state: RootState) => state.budgets);
  const { showSuccess, showError } = useToast();

  // Form state
  const [formData, setFormData] = useState<BudgetFormData>({
    name: "",
    amount: "",
    resetDay: 1,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof BudgetFormData, string>>>({});

  const nameRef = useRef<TextInput>(null);
  const amountRef = useRef<TextInput>(null);
  const resetDayRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      // Reset form when modal opens
      setFormData({
        name: "",
        amount: "",
        resetDay: 1,
      });
      setErrors({});
    }
  }, [visible]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof BudgetFormData, string>> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Budget name is required";
    } else if (formData.name.length > VALIDATION.BUDGET.MAX_NAME_LENGTH) {
      newErrors.name = `Budget name must be less than ${VALIDATION.BUDGET.MAX_NAME_LENGTH} characters`;
    }

    // Amount validation
    if (!formData.amount) {
      newErrors.amount = "Amount is required";
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount)) {
        newErrors.amount = "Amount must be a valid number";
      } else if (amount < VALIDATION.BUDGET.MIN_AMOUNT) {
        newErrors.amount = `Amount must be at least $${VALIDATION.BUDGET.MIN_AMOUNT}`;
      } else if (amount > VALIDATION.BUDGET.MAX_AMOUNT) {
        newErrors.amount = `Amount must not exceed $${VALIDATION.BUDGET.MAX_AMOUNT}`;
      }
    }

    // Reset day validation
    if (formData.resetDay < 1 || formData.resetDay > 28) {
      newErrors.resetDay = "Reset day must be between 1 and 28";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const budgetFormData: BudgetFormData = {
        name: formData.name.trim(),
        amount: formData.amount,
        resetDay: formData.resetDay,
      };

      await dispatch(addBudget(budgetFormData)).unwrap();

      showSuccess("Budget created successfully");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to add budget:", error);
      showError("Failed to create budget. Please try again.");
    }
  };

  const updateFormData = (field: keyof BudgetFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const { confirmExit } = useUnsavedChanges({
    hasChanges: visible && (formData.name.trim() !== "" || formData.amount.trim() !== ""),
    title: "Discard Budget",
    isModal: true,
    enabled: visible,
  });
  return { budgetLoading, formData, errors, nameRef, amountRef, resetDayRef, handleSubmit, updateFormData, confirmExit };
}
