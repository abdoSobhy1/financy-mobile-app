import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, Switch, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { DateUtils } from "../../../utils/dateUtils";
import { useToast, CategorySelector, BudgetSelector, CustomDatePicker } from "../../ui";
import { AppDispatch, RootState } from "../../../store";
import { addBill, updateBill, deleteBill } from "../../../store/slices/billsSlice";
import { fetchBudgets } from "../../../store/slices/budgetsSlice";
import { EnhancedBill, RecurrenceFrequency } from "../../../types/bills";
import { UI } from "../../../constants";
import { generateId } from "../../../utils";
import { UnifiedForm } from "../UnifiedForm";
import { FormField } from "../FormField";

interface BillFormProps {
  bill?: EnhancedBill | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  name: string;
  amount: string;
  dueDate: Date;
  budgetId: string;
  recurring: boolean;
  recurrenceFrequency: RecurrenceFrequency | "";
  reminderDaysBefore: string;
  notes: string;
}

const RECURRENCE_OPTIONS: Array<{ value: RecurrenceFrequency; label: string }> = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semiannually", label: "Semi-annually" },
  { value: "annually", label: "Yearly" },
];

export const BillForm: React.FC<BillFormProps> = ({ bill, onSuccess, onCancel }) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const { showSuccess, showError } = useToast();

  const { items: budgets } = useSelector((state: RootState) => state.budgets);
  const { loading } = useSelector((state: RootState) => state.bills);

  const isEditing = !!bill;

  const [formData, setFormData] = useState<FormData>({
    name: "",
    amount: "",
    dueDate: new Date(),
    budgetId: "",
    recurring: false,
    recurrenceFrequency: "",
    reminderDaysBefore: "3",
    notes: "",
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
      // Use DateUtils for safe date parsing
      const safeDueDate = DateUtils.toDate(bill.dueDate);
      console.log("BillForm: Parsed due date from bill:", {
        originalDueDate: bill.dueDate,
        originalType: typeof bill.dueDate,
        parsedDate: safeDueDate,
        parsedType: typeof safeDueDate,
        isValidOriginal: DateUtils.isValid(bill.dueDate),
        isValidParsed: DateUtils.isValid(safeDueDate),
        isToday: safeDueDate.toDateString() === new Date().toDateString(),
      });

      // Map recurringType back to recurrenceFrequency for form display
      let recurrenceFrequency = "";
      if (bill.recurrenceFrequency) {
        recurrenceFrequency = bill.recurrenceFrequency;
      } else if (bill.recurringType) {
        // Map base Bill recurringType to RecurrenceFrequency
        switch (bill.recurringType) {
          case "weekly":
            recurrenceFrequency = "weekly";
            break;
          case "monthly":
            recurrenceFrequency = "monthly";
            break;
          case "yearly":
            recurrenceFrequency = "annually";
            break;
          default:
            recurrenceFrequency = "monthly";
        }
      }

      console.log("BillForm: About to setFormData with bill data:", {
        billId: bill.id,
        safeDueDate,
        currentFormDate: formData.dueDate,
      });

      setFormData((prevFormData) => {
        console.log("BillForm: setFormData called during editing initialization", {
          previousFormDate: prevFormData.dueDate,
          newFormDate: safeDueDate,
          areDatesEqual: prevFormData.dueDate?.getTime() === safeDueDate?.getTime(),
        });

        return {
          name: bill.name || "",
          amount: bill.amount?.toString() || "",
          dueDate: safeDueDate,
          budgetId: bill.budgetId || "",
          recurring: bill.recurring || false,
          recurrenceFrequency: recurrenceFrequency as RecurrenceFrequency | "",
          reminderDaysBefore: bill.reminderDaysBefore?.toString() || "3",
          notes: bill.notes || "",
        };
      });
    }
  }, [bill]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Bill name is required";

    if (!formData.amount.trim()) {
      newErrors.amount = "Amount is required";
    } else if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = "Please enter a valid amount";
    }

    if (formData.recurring && !formData.recurrenceFrequency) {
      newErrors.recurrenceFrequency = "Recurrence frequency is required for recurring bills";
    }

    if (formData.reminderDaysBefore && (isNaN(Number(formData.reminderDaysBefore)) || Number(formData.reminderDaysBefore) < 0)) {
      newErrors.reminderDaysBefore = "Please enter a valid number of days";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      // Map RecurrenceFrequency to BillFormData.recurringType
      const mapRecurrenceType = (freq: RecurrenceFrequency): "weekly" | "monthly" | "yearly" | undefined => {
        switch (freq) {
          case "weekly":
          case "biweekly":
            return "weekly";
          case "annually":
          case "semiannually":
            return "yearly";
          case "daily":
          case "monthly":
          case "bimonthly":
          case "quarterly":
          default:
            return "monthly";
        }
      };

      const billData = {
        name: formData.name.trim(),
        amount: formData.amount, // Keep as string to match interface
        dueDate: DateUtils.toISOString(formData.dueDate), // Use DateUtils for consistent serialization
        budgetId: formData.budgetId || undefined,
        recurring: formData.recurring,
        recurringType:
          formData.recurring && formData.recurrenceFrequency ? mapRecurrenceType(formData.recurrenceFrequency as RecurrenceFrequency) : undefined,
      };

      console.log("BillForm: Submitting bill data:", billData);
      console.log("BillForm: Form recurring state:", formData.recurring);
      console.log("BillForm: Form recurrence frequency:", formData.recurrenceFrequency);
      console.log("BillForm: Original form due date:", formData.dueDate);
      console.log("BillForm: Original form due date type:", typeof formData.dueDate);
      console.log("BillForm: Original form due date valid:", DateUtils.isValid(formData.dueDate));
      console.log("BillForm: Converted due date:", billData.dueDate);
      console.log("BillForm: Full form data at submission:", formData);

      if (isEditing) {
        const updatedBill = await dispatch(
          updateBill({
            id: bill!.id,
            updates: billData,
          })
        ).unwrap();
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
    if (field === "dueDate") {
      console.log("BillForm updateField: Date change detected", {
        field,
        value,
        valueType: typeof value,
        isValidDate: DateUtils.isValid(value),
        currentFormDate: formData.dueDate,
        isToday: value instanceof Date && value.toDateString() === new Date().toDateString(),
        stackTrace: new Error().stack?.split("\n").slice(1, 4),
      });
    }

    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      if (field === "dueDate") {
        console.log("BillForm setFormData: After date update", {
          previousDate: prev.dueDate,
          newDate: newData.dueDate,
          areDifferent: prev.dueDate?.getTime() !== newData.dueDate?.getTime(),
        });
      }
      return newData;
    });

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
    const hasRequiredFields = !!(formData.name.trim() && formData.amount.trim());

    // Additional validation for recurring bills
    const recurringValid = !formData.recurring || !!formData.recurrenceFrequency;

    return !hasErrors && hasRequiredFields && recurringValid;
  }, [errors, formData.name, formData.amount, formData.recurring, formData.recurrenceFrequency]);

  // Memoize the date change callback to prevent unwanted re-renders
  const handleDateChange = useCallback((date: Date) => {
    console.log("BillForm: handleDateChange called via memoized callback", {
      date,
      dateType: typeof date,
      isToday: date.toDateString() === new Date().toDateString(),
    });
    updateField("dueDate", date);
  }, []);

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

      <FormField
        label="Amount"
        icon="cash-outline"
        required
        placeholder="0.00"
        value={formData.amount}
        onChangeText={(text) => updateField("amount", text)}
        keyboardType="numeric"
        error={errors.amount}
      />

      {/* Due Date */}
      <CustomDatePicker label="Due Date" value={formData.dueDate} onDateChange={handleDateChange} />

      {/* Budget Selection */}
      <BudgetSelector
        budgets={Object.values(budgets).filter((budget) => budget != null)}
        selectedBudgetId={formData.budgetId || undefined}
        onBudgetSelect={(budgetId) => updateField("budgetId", budgetId || "")}
        label="Budget"
        rememberLastUsed={false} // Don't remember for bill forms since they're specific
      />

      {/* Recurring Toggle */}
      <View style={styles.fieldContainer}>
        <View style={styles.switchContainer}>
          <Text style={styles.label}>Recurring Bill</Text>
          <Switch
            value={formData.recurring}
            onValueChange={(value) => updateField("recurring", value)}
            trackColor={{ false: "#374151", true: UI.COLORS.PRIMARY }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Recurrence Frequency */}
      {formData.recurring && (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Frequency *</Text>
          <View style={[styles.selectContainer, errors.recurrenceFrequency && styles.errorContainer]}>
            {RECURRENCE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.selectOption, formData.recurrenceFrequency === option.value && styles.selectedOption]}
                onPress={() => updateField("recurrenceFrequency", option.value)}>
                <Text style={[styles.selectOptionText, formData.recurrenceFrequency === option.value && styles.selectedOptionText]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.recurrenceFrequency && <Text style={styles.errorText}>{errors.recurrenceFrequency}</Text>}
        </View>
      )}

      <FormField
        label="Reminder (days before)"
        icon="notifications-outline"
        placeholder="3"
        value={formData.reminderDaysBefore}
        onChangeText={(text) => updateField("reminderDaysBefore", text)}
        keyboardType="numeric"
        error={errors.reminderDaysBefore}
      />

      <FormField
        label="Notes"
        icon="document-text-outline"
        placeholder="Additional notes..."
        value={formData.notes}
        onChangeText={(text) => updateField("notes", text)}
        multiline
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
