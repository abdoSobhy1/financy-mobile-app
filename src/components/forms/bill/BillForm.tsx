import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { DateUtils } from "../../../utils/dateUtils";
import { useToast, CategorySelector, BudgetSelector } from "../../ui";
import { AppDispatch, RootState } from "../../../store";
import { addBill, updateBill, deleteBill } from "../../../store/slices/billsSlice";
import { fetchBudgets } from "../../../store/slices/budgetsSlice";
import { EnhancedBill, RecurrenceFrequency } from "../../../types/bills";
import { UI } from "../../../constants";
import { UnifiedForm } from "../UnifiedForm";
import { FormField } from "../FormField";

interface BillFormProps {
  bill?: EnhancedBill | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  name: string;
  budgetId: string;
  categoryId?: string;
  recurring?: boolean;
}

export const BillForm: React.FC<BillFormProps> = ({ bill, onSuccess, onCancel }) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const { showSuccess, showError } = useToast();

  const { items: budgets } = useSelector((state: RootState) => state.budgets);
  const { items: categories } = useSelector((state: RootState) => state.categories);
  const { loading } = useSelector((state: RootState) => state.bills);

  const isEditing = !!bill;

  const [formData, setFormData] = useState<FormData>({
    name: "",
    budgetId: "",
    recurring: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load budgets on mount
  useEffect(() => {
    dispatch(fetchBudgets());
  }, [dispatch]);

  // Initialize form data when editing
  useEffect(() => {
    console.log("BillForm: useEffect for bill initialization triggered", {
      hasBill: !!bill,
      billId: bill?.id,
      isEditing,
      billObjectId: bill ? JSON.stringify(bill).substring(0, 50) + "..." : "none",
    });

    if (bill) {
      setFormData(() => ({
        name: bill.name || "",
        budgetId: bill.budgetId || "",
        recurring: bill.recurring || false,
        categoryId: bill.categoryId || undefined,
      }));
    }
  }, [bill]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Bill name is required";

    // Only require name now; budget/category are optional

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      // Map RecurrenceFrequency to BillFormData.recurringType
      // Construct minimal bill data: name, budgetId, categoryId. Provide safe defaults for amount and dueDate for DB compatibility.
      const billData = {
        name: formData.name.trim(),
        amount: "0",
        dueDate: DateUtils.toISOString(new Date()),
        budgetId: formData.budgetId || undefined,
        categoryId: formData.categoryId || undefined,
        recurring: formData.recurring || false,
      } as any;

      console.log("BillForm: Submitting bill data:", billData);
      console.log("BillForm: Full form data at submission:", formData);

      if (isEditing) {
        const updatedBill = await dispatch(updateBill({ id: bill!.id, updates: billData })).unwrap();
        console.log("BillForm: Bill updated successfully, returned bill:", {
          updatedBill,
          dueDate: updatedBill?.dueDate,
          recurring: updatedBill?.recurring,
          recurringType: updatedBill?.recurringType,
        });
        showSuccess("Bill updated successfully!");
      } else {
        const newBill = await dispatch(addBill(billData)).unwrap();
        console.log("BillForm: Bill created successfully, returned bill:", {
          newBill,
          dueDate: newBill?.dueDate,
          recurring: newBill?.recurring,
          recurringType: newBill?.recurringType,
        });
        showSuccess("Bill added successfully!");
      }

      if (onSuccess) {
        onSuccess();
      } else {
        // Only navigate if no onSuccess callback is provided
        setTimeout(() => navigation.goBack(), 1000);
      }
    } catch (error) {
      console.error("Bill operation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      const action = isEditing ? "update" : "add";
      showError(`Failed to ${action} bill: ${errorMessage}. Please try again.`);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    navigation.goBack();
  };

  const handleDelete = () => {
    if (!bill) return;

    Alert.alert("Delete Bill", `Are you sure you want to delete "${bill.name}"? This action cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await dispatch(deleteBill(bill.id)).unwrap();
            showSuccess("Bill deleted successfully!");

            // Navigate immediately when onSuccess is provided, otherwise use goBack with delay
            if (onSuccess) {
              onSuccess();
            } else {
              setTimeout(() => navigation.goBack(), 1000);
            }
          } catch (error) {
            console.error("Bill deletion error:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            showError(`Failed to delete bill: ${errorMessage}. Please try again.`);
          }
        },
      },
    ]);
  };

  const updateField = (field: keyof FormData, value: any) => {
    console.log(`BillForm updateField called`, { field, value });
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Compute form validity reactively
  const isFormValid = useMemo(() => {
    const hasErrors = Object.keys(errors).length > 0;
    const hasRequiredFields = !!formData.name.trim();
    return !hasErrors && hasRequiredFields;
  }, [errors, formData.name]);

  // Memoize the date change callback to prevent unwanted re-renders
  // Bill form no longer exposes due date editing in simplified UI

  // Get budget options for dropdown
  const budgetOptions = [
    { label: "No Budget", value: "" },
    ...Object.values(budgets).map((budget) => ({
      label: budget.name,
      value: budget.id,
    })),
  ];

  return (
    <UnifiedForm
      title={isEditing ? "Edit Bill" : "Add Bill"}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onDelete={isEditing ? handleDelete : undefined}
      showDeleteButton={isEditing}
      submitLabel={isEditing ? "Update Bill" : "Add Bill"}
      loading={loading}
      isValid={isFormValid}>
      <FormField
        label="Bill Name"
        icon="receipt-outline"
        required
        placeholder="Electric Bill, Rent, etc."
        value={formData.name}
        onChangeText={(text) => updateField("name", text)}
        error={errors.name}
        autoFocus={!isEditing}
      />

      {/* Budget Selection */}
      <BudgetSelector
        budgets={Object.values(budgets).filter((budget) => budget != null)}
        selectedBudgetId={formData.budgetId || undefined}
        onBudgetSelect={(budgetId) => updateField("budgetId", budgetId || "")}
        label="Budget"
        rememberLastUsed={false}
      />

      {/* Category selection for where the bill maps to */}
      <CategorySelector
        categories={Object.values(categories)}
        selectedCategoryId={formData.categoryId}
        onCategorySelect={(catId) => updateField("categoryId", catId)}
        type="expense"
        label="Category"
        showAddButton={true}
      />
    </UnifiedForm>
  );
};

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  selectContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  errorContainer: {
    borderColor: "#EF4444",
  },
  selectOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    backgroundColor: UI.COLORS.SURFACE,
  },
  selectedOption: {
    backgroundColor: UI.COLORS.PRIMARY,
    borderColor: UI.COLORS.PRIMARY,
  },
  selectOptionText: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
  },
  selectedOptionText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    marginTop: 4,
    marginLeft: 16,
  },
});

export default BillForm;
