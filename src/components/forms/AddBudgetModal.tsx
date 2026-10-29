import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../store";
import { addBudget } from "../../store/slices/budgetsSlice";
import { Modal, Card, Button, Input, useToast } from "../ui";
import { UI, VALIDATION } from "../../constants";
import { generateId } from "../../utils";
import { BudgetFormData } from "../../types";

interface AddBudgetModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddBudgetModal: React.FC<AddBudgetModalProps> = ({ visible, onClose, onSuccess }) => {
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

  return (
    <Modal visible={visible} onClose={onClose} title="Create Budget" scrollable={true} keyboardAvoiding={true}>
      <View style={styles.container}>
        <View style={styles.formCard}>
          {/* Budget Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Budget Name</Text>
            <Input
              ref={nameRef}
              value={formData.name}
              onChangeText={(value) => updateFormData("name", value)}
              placeholder="e.g., Groceries, Entertainment, Gas"
              error={errors.name}
              maxLength={VALIDATION.BUDGET.MAX_NAME_LENGTH}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => amountRef.current?.focus()}
            />
          </View>

          {/* Budget Amount */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Monthly Amount</Text>
            <Input
              ref={amountRef}
              value={formData.amount}
              onChangeText={(value) => updateFormData("amount", value)}
              placeholder="0.00"
              keyboardType="decimal-pad"
              error={errors.amount}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => resetDayRef.current?.focus()}
            />
          </View>

          {/* Reset Day */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Reset Day of Month</Text>
            <Text style={styles.helpText}>Budget will reset on this day each month (1-28)</Text>
            <Input
              ref={resetDayRef}
              value={formData.resetDay.toString()}
              onChangeText={(value) => updateFormData("resetDay", parseInt(value) || 1)}
              placeholder="1"
              keyboardType="number-pad"
              error={errors.resetDay}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button title="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1 }} icon="close" iconPosition="left" />
            <View style={{ width: UI.SPACING.MD }} />
            <Button title="Create Budget" onPress={handleSubmit} loading={budgetLoading} style={{ flex: 2 }} icon="wallet" iconPosition="left" />
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
  actionButtons: {
    flexDirection: "row",
    marginTop: UI.SPACING.LG,
    paddingTop: UI.SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
  },
});
