import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../store";
import { addTransaction } from "../../store/slices/transactionsSlice";
import { fetchCategories } from "../../store/slices/categoriesSlice";
import { fetchBudgets } from "../../store/slices/budgetsSlice";
import { Modal, Card, Button, Input, useToast, CategorySelector, BudgetSelector } from "../ui";
import { UI, TRANSACTION_TYPES, VALIDATION } from "../../constants";
import { generateId, formatDateForStorage, formatCurrency } from "../../utils";
import { TransactionFormData, TransactionType } from "../../types";

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ visible, onClose, onSuccess }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: categories, loading: categoriesLoading } = useSelector((state: RootState) => state.categories);
  const { items: budgets, loading: budgetsLoading } = useSelector((state: RootState) => state.budgets);
  const { loading: transactionLoading } = useSelector((state: RootState) => state.transactions);
  const { showSuccess, showError } = useToast();

  // Form state
  const [formData, setFormData] = useState<TransactionFormData>({
    description: "",
    amount: "",
    type: "expense",
    categoryId: "",
    budgetId: undefined,
    date: new Date(),
    note: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof TransactionFormData, string>>>({});

  useEffect(() => {
    if (visible) {
      // Load categories and budgets when modal opens
      dispatch(fetchCategories());
      dispatch(fetchBudgets());
      // Reset form
      setFormData({
        description: "",
        amount: "",
        type: "expense",
        categoryId: "",
        budgetId: undefined,
        date: new Date(),
        note: "",
      });
      setErrors({});
    }
  }, [visible, dispatch]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof TransactionFormData, string>> = {};

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.length > VALIDATION.TRANSACTION.MAX_DESCRIPTION_LENGTH) {
      newErrors.description = `Description must be less than ${VALIDATION.TRANSACTION.MAX_DESCRIPTION_LENGTH} characters`;
    }

    // Amount validation
    if (!formData.amount) {
      newErrors.amount = "Amount is required";
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount)) {
        newErrors.amount = "Amount must be a valid number";
      } else if (amount < VALIDATION.TRANSACTION.MIN_AMOUNT) {
        newErrors.amount = `Amount must be at least $${VALIDATION.TRANSACTION.MIN_AMOUNT}`;
      } else if (amount > VALIDATION.TRANSACTION.MAX_AMOUNT) {
        newErrors.amount = `Amount must not exceed $${VALIDATION.TRANSACTION.MAX_AMOUNT}`;
      }
    }

    // Category validation
    if (!formData.categoryId) {
      newErrors.categoryId = "Category is required";
    }

    // Type validation
    if (!Object.values(TRANSACTION_TYPES).includes(formData.type as TransactionType)) {
      newErrors.type = "Invalid transaction type";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const transactionData: TransactionFormData = {
        description: formData.description.trim(),
        amount: formData.amount,
        type: formData.type as TransactionType,
        categoryId: formData.categoryId,
        budgetId: formData.budgetId,
        date: formData.date,
        note: formData.note?.trim() || undefined,
      };

      await dispatch(addTransaction(transactionData)).unwrap();

      showSuccess("Transaction added successfully");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to add transaction:", error);
      showError("Failed to add transaction. Please try again.");
    }
  };

  const updateFormData = (field: keyof TransactionFormData, value: string | undefined) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      // Clear budgetId when changing from expense to other type
      if (field === "type" && value !== "expense") {
        newData.budgetId = undefined;
      }
      return newData;
    });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const expenseCategories = Object.values(categories).filter((cat) => cat.type === "expense");
  const incomeCategories = Object.values(categories).filter((cat) => cat.type === "income");
  const availableCategories = formData.type === "income" ? incomeCategories : expenseCategories;

  return (
    <Modal visible={visible} onClose={onClose} title="Add Transaction" scrollable={true} keyboardAvoiding={true}>
      <View style={styles.container}>
        <View style={styles.formCard}>
          {/* Transaction Type */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeButtons}>
              {Object.entries(TRANSACTION_TYPES).map(([key, value]) => {
                const getTypeIcon = () => {
                  switch (value) {
                    case "income":
                      return "trending-up";
                    case "expense":
                      return "trending-down";
                    case "debt":
                      return "card";
                    default:
                      return "wallet";
                  }
                };

                return (
                  <Button
                    key={key}
                    title={key}
                    variant={formData.type === value ? "primary" : "secondary"}
                    onPress={() => updateFormData("type", value)}
                    style={styles.typeButton}
                    icon={getTypeIcon()}
                    iconPosition="left"
                  />
                );
              })}
            </View>
            {errors.type && <Text style={styles.errorText}>{errors.type}</Text>}
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Description</Text>
            <Input
              value={formData.description}
              onChangeText={(value) => updateFormData("description", value)}
              placeholder="Enter transaction description"
              error={errors.description}
              maxLength={VALIDATION.TRANSACTION.MAX_DESCRIPTION_LENGTH}
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

          {/* Category */}
          <View style={styles.fieldGroup}>
            <CategorySelector
              categories={availableCategories}
              selectedCategoryId={formData.categoryId}
              onCategorySelect={(categoryId) => updateFormData("categoryId", categoryId)}
              type={formData.type}
              label="Category"
              error={errors.categoryId}
              showAddButton={false}
              rememberLastUsed={true} // Remember for modal forms too
            />
          </View>

          {/* Budget Selection (Only for Expenses) */}
          {formData.type === "expense" && Object.keys(budgets).length > 0 && (
            <View style={styles.fieldGroup}>
              <BudgetSelector
                budgets={Object.values(budgets)}
                selectedBudgetId={formData.budgetId}
                onBudgetSelect={(budgetId) => updateFormData("budgetId", budgetId)}
                label="Budget (Optional)"
                rememberLastUsed={true} // Remember for modal forms too
              />
            </View>
          )}

          {/* Note (Optional) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Note (Optional)</Text>
            <Input
              value={formData.note || ""}
              onChangeText={(value) => updateFormData("note", value)}
              placeholder="Add a note..."
              multiline
              maxLength={VALIDATION.TRANSACTION.MAX_NOTE_LENGTH}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button title="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1 }} icon="close" iconPosition="left" />
            <View style={{ width: UI.SPACING.MD }} />
            <Button title="Add Transaction" onPress={handleSubmit} loading={transactionLoading} style={{ flex: 2 }} icon="add" iconPosition="left" />
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center",
    marginBottom: UI.SPACING.LG,
  },
  fieldGroup: {
    marginBottom: UI.SPACING.MD,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  typeButtons: {
    flexDirection: "row",
    gap: UI.SPACING.XS,
  },
  typeButton: {
    flex: 1,
    marginHorizontal: UI.SPACING.XS / 2,
  },
  categoryButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: UI.SPACING.XS,
  },
  categoryButton: {
    minWidth: 100,
  },
  actionButtons: {
    flexDirection: "row",
    marginTop: UI.SPACING.LG,
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
  helpText: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    marginBottom: UI.SPACING.SM,
    fontStyle: "italic",
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
});
