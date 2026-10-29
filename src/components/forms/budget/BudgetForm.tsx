import React, { useState, useEffect, useMemo, useRef } from "react";
import { View, TextInput, Keyboard } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { useToast } from "../../ui";
import { AppDispatch, RootState } from "../../../store";
import { addBudget, updateBudget } from "../../../store/slices/budgetsSlice";
import { Budget } from "../../../types";
import { UnifiedForm } from "../UnifiedForm";
import { FormField } from "../FormField";

interface BudgetFormProps {
  budget?: Budget | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  name: string;
  amount: string;
  resetDay: string;
}

export const BudgetForm: React.FC<BudgetFormProps> = ({
  budget,
  onSuccess,
  onCancel,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const { showSuccess, showError } = useToast();

  const { loading } = useSelector((state: RootState) => state.budgets);

  const isEditing = !!budget;

  const [formData, setFormData] = useState<FormData>({
    name: "",
    amount: "",
    resetDay: "1",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const nameRef = useRef<TextInput>(null);
  const amountRef = useRef<TextInput>(null);
  const resetDayRef = useRef<TextInput>(null);

  // Initialize form data when editing
  useEffect(() => {
    if (budget) {
      setFormData({
        name: budget.name || "",
        amount: budget.amount?.toString() || "",
        resetDay: budget.resetDay?.toString() || "1",
      });
    }
  }, [budget]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Budget name is required";

    if (!formData.amount.trim()) {
      newErrors.amount = "Amount is required";
    } else if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = "Please enter a valid amount";
    }

    const resetDay = Number(formData.resetDay);
    if (isNaN(resetDay) || resetDay < 1 || resetDay > 31) {
      newErrors.resetDay = "Reset day must be between 1 and 31";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const budgetData = {
        name: formData.name.trim(),
        amount: formData.amount, // Keep as string to match interface
        resetDay: Number(formData.resetDay),
        categoryId: undefined,
      };

      // DEBUG: log the exact payload before dispatch so we can confirm resetDay is correct
      console.log(
        "BudgetForm: submitting budgetData:",
        JSON.stringify(budgetData),
      );

      if (isEditing) {
        await dispatch(
          updateBudget({
            id: budget!.id,
            updates: budgetData,
          }),
        ).unwrap();
        showSuccess("Budget updated successfully!");
      } else {
        await dispatch(addBudget(budgetData)).unwrap();
        showSuccess("Budget added successfully!");
      }

      onSuccess?.();
      setTimeout(() => navigation.goBack(), 1000);
    } catch (error) {
      console.error("Budget operation error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      const action = isEditing ? "update" : "add";
      showError(
        `Failed to ${action} budget: ${errorMessage}. Please try again.`,
      );
    }
  };

  const handleCancel = () => {
    onCancel?.();
    navigation.goBack();
  };

  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Compute form validity reactively
  const isFormValid = useMemo(() => {
    // Check if there are any validation errors
    const hasErrors = Object.keys(errors).length > 0;

    // Check required fields
    const hasRequiredFields = !!(
      formData.name.trim() && formData.amount.trim()
    );

    return !hasErrors && hasRequiredFields;
  }, [errors, formData.name, formData.amount]);

  return (
    <UnifiedForm
      title={isEditing ? "Edit Budget" : "Add Budget"}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitLabel={isEditing ? "Update Budget" : "Add Budget"}
      loading={loading}
      isValid={isFormValid}>
      <FormField
        ref={nameRef}
        label="Budget Name"
        icon="wallet-outline"
        required
        placeholder="Monthly Groceries, Entertainment, etc."
        value={formData.name}
        onChangeText={(text) => updateField("name", text)}
        error={errors.name}
        autoFocus={!isEditing}
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => amountRef.current?.focus()}
      />

      <FormField
        ref={amountRef}
        label="Amount"
        icon="cash-outline"
        required
        placeholder="0.00"
        value={formData.amount}
        onChangeText={(text) => updateField("amount", text)}
        keyboardType="numeric"
        error={errors.amount}
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => resetDayRef.current?.focus()}
      />

      {/* Reset Day Input */}
      <FormField
        ref={resetDayRef}
        label="Reset Day"
        value={formData.resetDay}
        onChangeText={(value) => updateField("resetDay", value)}
        placeholder="Enter day (1-31)"
        keyboardType="numeric"
        icon="calendar"
        required={true}
        error={errors.resetDay}
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
      />
    </UnifiedForm>
  );
};

export default BudgetForm;
