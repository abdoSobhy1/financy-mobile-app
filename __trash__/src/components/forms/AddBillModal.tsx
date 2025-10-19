import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../store";
import { addBill } from "../../store/slices/billsSlice";
import { fetchCategories } from "../../store/slices/categoriesSlice";
import { fetchBudgets } from "../../store/slices/budgetsSlice";
import { Modal, Card, Button, Input, CustomDatePicker, useToast, BudgetSelector } from "../ui";
import { UI, VALIDATION } from "../../constants";
import { BillFormData } from "../../types";

interface AddBillModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddBillModal: React.FC<AddBillModalProps> = ({ visible, onClose, onSuccess }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: categories, loading: categoriesLoading } = useSelector((state: RootState) => state.categories);
  const { items: budgets, loading: budgetsLoading } = useSelector((state: RootState) => state.budgets);
  const { loading: billLoading } = useSelector((state: RootState) => state.bills);
  const { showSuccess, showError } = useToast();

  // Form state
  const [formData, setFormData] = useState<BillFormData>({
    name: "",
    amount: "",
    dueDate: new Date().toISOString(),
    budgetId: undefined,
    recurring: false,
    recurringType: undefined,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof BillFormData, string>>>({});

  // Filter categories to show only expense categories
  const expenseCategories = Object.values(categories).filter((category) => category.type === "expense");

  useEffect(() => {
    if (visible) {
      // Load categories and budgets when modal opens
      dispatch(fetchCategories());
      dispatch(fetchBudgets());
      // Reset form
      setFormData({
        name: "",
        amount: "",
        dueDate: new Date().toISOString(),

        budgetId: undefined,
        recurring: false,
        recurringType: undefined,
      });
      setErrors({});
    }
  }, [visible, dispatch]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof BillFormData, string>> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Bill name is required";
    } else if (formData.name.length > VALIDATION.BILL.MAX_NAME_LENGTH) {
      newErrors.name = `Bill name must be less than ${VALIDATION.BILL.MAX_NAME_LENGTH} characters`;
    }

    // Amount validation
    if (!formData.amount) {
      newErrors.amount = "Amount is required";
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount)) {
        newErrors.amount = "Amount must be a valid number";
      } else if (amount < VALIDATION.BILL.MIN_AMOUNT) {
        newErrors.amount = `Amount must be at least $${VALIDATION.BILL.MIN_AMOUNT}`;
      } else if (amount > VALIDATION.BILL.MAX_AMOUNT) {
        newErrors.amount = `Amount must not exceed $${VALIDATION.BILL.MAX_AMOUNT}`;
      }
    }

    // Category validation

    // Recurring validation
    if (formData.recurring && !formData.recurringType) {
      newErrors.recurringType = "Recurring type is required when bill is recurring";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const billData: BillFormData = {
        name: formData.name.trim(),
        amount: formData.amount,
        dueDate: formData.dueDate,

        budgetId: formData.budgetId,
        recurring: formData.recurring,
        recurringType: formData.recurring ? formData.recurringType : undefined,
      };

      await dispatch(addBill(billData)).unwrap();

      showSuccess("Bill created successfully");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to add bill:", error);
      showError("Failed to create bill. Please try again.");
    }
  };

  const updateFormData = (field: keyof BillFormData, value: string | boolean | undefined) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      // Clear recurringType when recurring is disabled
      if (field === "recurring" && !value) {
        newData.recurringType = undefined;
      }
      return newData;
    });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const formatDateForInput = (dateString: string): string => {
    return new Date(dateString).toISOString().split("T")[0];
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Add Bill" scrollable={true} keyboardAvoiding={true}>
      <View style={styles.container}>
        <View style={styles.formCard}>
          {/* Bill Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Bill Name</Text>
            <Input
              value={formData.name}
              onChangeText={(value) => updateFormData("name", value)}
              placeholder="e.g., Electricity, Rent, Internet"
              error={errors.name}
              maxLength={VALIDATION.BILL.MAX_NAME_LENGTH}
            />
          </View>

          {/* Amount */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Amount</Text>
            <Input
              value={formData.amount}
              onChangeText={(value) => updateFormData("amount", value)}
              placeholder="0.00"
              keyboardType="decimal-pad"
              error={errors.amount}
            />
          </View>

          {/* Due Date */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Due Date</Text>
            <Input
              value={formatDateForInput(formData.dueDate)}
              onChangeText={(value) => updateFormData("dueDate", new Date(value + "T00:00:00").toISOString())}
              placeholder="YYYY-MM-DD"
              error={errors.dueDate}
            />
          </View>

          {/* Budget Selection (Optional) */}
          <View style={styles.fieldGroup}>
            <BudgetSelector
              budgets={Object.values(budgets).filter((budget) => budget != null)}
              selectedBudgetId={formData.budgetId}
              onBudgetSelect={(budgetId) => updateFormData("budgetId", budgetId)}
              label="Budget (Optional)"
              rememberLastUsed={false} // Don't remember for bill forms since they're specific
            />
          </View>

          {/* Recurring Settings */}
          <View style={styles.fieldGroup}>
            <View style={styles.recurringRow}>
              <Text style={styles.label}>Recurring Bill</Text>
              <Switch
                value={formData.recurring}
                onValueChange={(value) => updateFormData("recurring", value)}
                trackColor={{ false: UI.COLORS.BORDER, true: UI.COLORS.PRIMARY }}
                thumbColor={formData.recurring ? UI.COLORS.PRIMARY_LIGHT : UI.COLORS.TEXT_MUTED}
              />
            </View>

            {formData.recurring && (
              <View style={styles.recurringTypeContainer}>
                <Text style={styles.label}>Recurring Type</Text>
                <View style={styles.recurringButtons}>
                  {["weekly", "monthly", "yearly"].map((type) => (
                    <Button
                      key={type}
                      title={type.charAt(0).toUpperCase() + type.slice(1)}
                      variant={formData.recurringType === type ? "primary" : "secondary"}
                      onPress={() => updateFormData("recurringType", type as "weekly" | "monthly" | "yearly")}
                      style={styles.recurringButton}
                    />
                  ))}
                </View>
                {errors.recurringType && <Text style={styles.errorText}>{errors.recurringType}</Text>}
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button title="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1 }} icon="close" iconPosition="left" />
            <View style={{ width: UI.SPACING.MD }} />
            <Button title="Create Bill" onPress={handleSubmit} loading={billLoading} style={{ flex: 2 }} icon="receipt" iconPosition="left" />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  formCard: {
    flex: 1,
    backgroundColor: "transparent",
  },
  fieldGroup: {
    marginBottom: UI.SPACING.LG,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  helpText: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    marginBottom: UI.SPACING.SM,
    fontStyle: "italic",
  },
  categoryButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: UI.SPACING.XS,
  },
  categoryButton: {
    minWidth: 100,
  },
  budgetContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: UI.SPACING.XS,
  },
  budgetButton: {
    minWidth: 100,
    marginBottom: UI.SPACING.XS,
  },
  recurringRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: UI.SPACING.SM,
  },
  recurringTypeContainer: {
    marginTop: UI.SPACING.SM,
  },
  recurringButtons: {
    flexDirection: "row",
    gap: UI.SPACING.XS,
  },
  recurringButton: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    marginTop: UI.SPACING.LG,
    paddingTop: UI.SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
  },
  errorText: {
    fontSize: 14,
    color: UI.COLORS.ERROR,
    marginTop: UI.SPACING.XS,
  },
  loadingText: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    fontStyle: "italic",
  },
  noCategoriesText: {
    fontSize: 14,
    color: UI.COLORS.TEXT_MUTED,
    fontStyle: "italic",
    textAlign: "center",
    padding: UI.SPACING.MD,
  },
});
