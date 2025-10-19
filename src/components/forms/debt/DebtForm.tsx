import React, { useState, useEffect, useMemo } from "react";
import { Alert } from "react-native";
import { useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { useToast, CustomDatePicker } from "../../ui";
import { AppDispatch } from "../../../store";
import { addDebt, updateDebt, deleteDebt } from "../../../store/slices/debtsSlice";
import { Debt } from "../../../types";
import { UnifiedForm } from "../UnifiedForm";
import { FormField } from "../FormField";

interface DebtFormProps {
  debt?: Debt | null; // If provided, we're editing; if null/undefined, we're creating
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  name: string;
  totalAmount: string;
  interestRate: string;
  minimumPayment: string;
  creditor: string;
  description: string;
  dueDate?: Date | null;
}

export const DebtForm: React.FC<DebtFormProps> = ({ debt, onSuccess, onCancel }) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const { showSuccess, showError } = useToast();

  const isEditing = !!debt;

  const [formData, setFormData] = useState<FormData>({
    name: "",
    totalAmount: "",
    interestRate: "",
    minimumPayment: "",
    creditor: "",
    description: "",
    dueDate: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Initialize form data when editing
  useEffect(() => {
    if (debt) {
      setFormData({
        name: debt.name || "",
        totalAmount: debt.totalAmount?.toString() || "",
        interestRate: debt.interestRate?.toString() || "",
        minimumPayment: debt.minimumPayment?.toString() || "",
        creditor: debt.creditor || "",
        description: debt.description || "",
        dueDate: debt.dueDate ? new Date(debt.dueDate) : null,
      });
    }
  }, [debt]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Debt name is required";
    if (!formData.totalAmount.trim()) newErrors.totalAmount = "Amount is required";
    else if (isNaN(Number(formData.totalAmount)) || Number(formData.totalAmount) <= 0) {
      newErrors.totalAmount = "Please enter a valid amount";
    }

    if (formData.interestRate && (isNaN(Number(formData.interestRate)) || Number(formData.interestRate) < 0)) {
      newErrors.interestRate = "Please enter a valid interest rate";
    }

    if (formData.minimumPayment && (isNaN(Number(formData.minimumPayment)) || Number(formData.minimumPayment) <= 0)) {
      newErrors.minimumPayment = "Please enter a valid minimum payment";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const debtData = {
        name: formData.name.trim(),
        totalAmount: Number(formData.totalAmount),
        currentBalance: isEditing ? debt!.currentBalance : Number(formData.totalAmount), // Keep current balance when editing
        interestRate: formData.interestRate ? Number(formData.interestRate) : undefined,
        minimumPayment: formData.minimumPayment ? Number(formData.minimumPayment) : undefined,
        creditor: formData.creditor.trim() || undefined,
        description: formData.description.trim() || undefined,
        dueDate: formData.dueDate ? formData.dueDate.toISOString() : undefined,
      };

      if (isEditing) {
        await dispatch(
          updateDebt({
            id: debt!.id,
            updates: debtData,
          })
        ).unwrap();
        showSuccess("Debt updated successfully!");
      } else {
        await dispatch(addDebt(debtData)).unwrap();
        showSuccess("Debt added successfully!");
      }

      onSuccess?.();
      setTimeout(() => navigation.goBack(), 1000);
    } catch (error) {
      console.error("Debt operation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      const action = isEditing ? "update" : "add";
      showError(`Failed to ${action} debt: ${errorMessage}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    navigation.goBack();
  };

  const handleDelete = () => {
    if (!debt) return;

    Alert.alert("Delete Debt", `Are you sure you want to delete "${debt.name}" and all its payment history? This action cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await dispatch(deleteDebt(debt.id)).unwrap();
            showSuccess("Debt deleted successfully!");
            onSuccess?.();
            setTimeout(() => navigation.goBack(), 1000);
          } catch (error) {
            console.error("Debt deletion error:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            showError(`Failed to delete debt: ${errorMessage}. Please try again.`);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const updateField = (field: keyof FormData, value: string) => {
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
    const hasRequiredFields = !!(formData.name.trim() && formData.totalAmount.trim());

    return !hasErrors && hasRequiredFields;
  }, [errors, formData.name, formData.totalAmount]);

  return (
    <UnifiedForm
      title={isEditing ? "Edit Debt" : "Add Debt"}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onDelete={isEditing ? handleDelete : undefined}
      showDeleteButton={isEditing}
      submitLabel={isEditing ? "Update Debt" : "Add Debt"}
      loading={loading}
      isValid={isFormValid}>
      <FormField
        label="Debt Name"
        icon="card-outline"
        required
        placeholder="Credit Card, Student Loan, etc."
        value={formData.name}
        onChangeText={(text) => updateField("name", text)}
        error={errors.name}
        autoFocus={!isEditing}
      />

      <FormField
        label="Total Amount"
        icon="cash-outline"
        required
        placeholder="0.00"
        value={formData.totalAmount}
        onChangeText={(text) => updateField("totalAmount", text)}
        keyboardType="numeric"
        error={errors.totalAmount}
      />

      <FormField
        label="Interest Rate (%)"
        icon="trending-up-outline"
        placeholder="0.00"
        value={formData.interestRate}
        onChangeText={(text) => updateField("interestRate", text)}
        keyboardType="numeric"
        error={errors.interestRate}
      />

      <FormField
        label="Minimum Payment"
        icon="calendar-outline"
        placeholder="0.00"
        value={formData.minimumPayment}
        onChangeText={(text) => updateField("minimumPayment", text)}
        keyboardType="numeric"
        error={errors.minimumPayment}
      />

      {/* Due Date */}
      <CustomDatePicker
        label="Due Date"
        value={formData.dueDate || undefined}
        onDateChange={(date) => setFormData((prev) => ({ ...prev, dueDate: date }))}
      />

      <FormField
        label="Creditor"
        icon="business-outline"
        placeholder="Bank or Company Name"
        value={formData.creditor}
        onChangeText={(text) => updateField("creditor", text)}
      />

      <FormField
        label="Description"
        icon="document-text-outline"
        placeholder="Additional notes..."
        value={formData.description}
        onChangeText={(text) => updateField("description", text)}
        multiline
      />
    </UnifiedForm>
  );
};

// Styles are now handled by UnifiedForm and FormField components

export default DebtForm;
