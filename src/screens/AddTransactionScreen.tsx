import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootState, AppDispatch } from "../store";
import { addTransaction, updateTransaction } from "../store/slices/transactionsSlice";
import { fetchCategories, addCategory } from "../store/slices/categoriesSlice";
import { fetchBudgets } from "../store/slices/budgetsSlice";
import { UI, TRANSACTION_TYPES, VALIDATION } from "../constants";
import { generateId, formatDateForStorage } from "../utils";
import { evaluateMathExpression } from "../utils/mathUtils";
import { TransactionFormData, TransactionType, TransactionStackParamList } from "../types";
import { CustomDatePicker, CategorySelector, BudgetSelector } from "../components/ui";

type AddTransactionScreenNavigationProp = StackNavigationProp<TransactionStackParamList, "AddTransaction">;
type AddTransactionScreenRouteProp = RouteProp<TransactionStackParamList, "AddTransaction">;

const AddTransactionScreen: React.FC = () => {
  const navigation = useNavigation<AddTransactionScreenNavigationProp>();
  const route = useRoute<AddTransactionScreenRouteProp>();
  const editTransaction = route.params?.editTransaction;
  const dispatch = useDispatch<AppDispatch>();
  const { items: categories } = useSelector((state: RootState) => state.categories);
  const { items: budgets } = useSelector((state: RootState) => state.budgets);
  const { loading } = useSelector((state: RootState) => state.transactions);

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
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Refs for auto-focus
  const descriptionRef = useRef<TextInput>(null);

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchBudgets());

    // If editing, populate form with transaction data
    if (editTransaction) {
      setFormData({
        description: editTransaction.description,
        amount: editTransaction.amount.toString(),
        type: editTransaction.type,
        categoryId: editTransaction.categoryId,
        budgetId: editTransaction.budgetId,
        date: new Date(editTransaction.date),
        note: editTransaction.note || "",
      });
    }

    // Auto-focus on description field only for new transactions
    if (!editTransaction) {
      const timer = setTimeout(() => {
        descriptionRef.current?.focus();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [dispatch, editTransaction]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.length > VALIDATION.TRANSACTION.MAX_DESCRIPTION_LENGTH) {
      newErrors.description = `Description must be ${VALIDATION.TRANSACTION.MAX_DESCRIPTION_LENGTH} characters or less`;
    }

    if (!formData.amount.trim()) {
      newErrors.amount = "Amount is required";
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = "Please enter a valid amount greater than 0";
      } else if (amount > VALIDATION.TRANSACTION.MAX_AMOUNT) {
        newErrors.amount = `Amount cannot exceed ${VALIDATION.TRANSACTION.MAX_AMOUNT}`;
      }
    }

    if (!formData.categoryId) {
      newErrors.categoryId = "Category is required";
    }

    if (!formData.date || isNaN(formData.date.getTime())) {
      newErrors.date = "Valid date is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Evaluate math expression in amount field
    const evaluatedAmount = evaluateMathExpression(formData.amount);

    try {
      if (editTransaction) {
        // Update existing transaction
        const updates = {
          description: formData.description.trim(),
          amount: evaluatedAmount,
          type: formData.type,
          categoryId: formData.categoryId,
          budgetId: formData.budgetId || undefined,
          date: formData.date,
          note: formData.note?.trim() || undefined,
        };

        await dispatch(updateTransaction({ id: editTransaction.id, updates })).unwrap();
      } else {
        // Add new transaction
        const transactionData = {
          id: generateId(),
          description: formData.description.trim(),
          amount: evaluatedAmount,
          type: formData.type,
          categoryId: formData.categoryId,
          budgetId: formData.budgetId || undefined,
          date: formData.date,
          note: formData.note?.trim() || undefined,
        };

        await dispatch(addTransaction(transactionData)).unwrap();
      }

      navigation.goBack();
    } catch (error) {
      setErrors({ submit: editTransaction ? "Failed to update transaction. Please try again." : "Failed to add transaction. Please try again." });
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const updateFormData = (field: keyof TransactionFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const filteredBudgets = Object.values(budgets).filter((budget) => budget);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Ionicons name="close" size={24} color={UI.COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>
          <Text style={styles.title}>{editTransaction ? "Edit Transaction" : "Add Transaction"}</Text>
          <TouchableOpacity onPress={handleSubmit} style={[styles.saveButton, loading && styles.saveButtonDisabled]} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color={UI.COLORS.TEXT_PRIMARY} /> : <Text style={styles.saveButtonText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* Transaction Type Toggle */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transaction Type</Text>
            <View style={styles.typeToggle}>
              {(["income", "expense"] as TransactionType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeButton, formData.type === type && styles.typeButtonActive]}
                  onPress={() => updateFormData("type", type)}>
                  <Ionicons
                    name={type === "income" ? "trending-up" : "trending-down"}
                    size={20}
                    color={formData.type === type ? UI.COLORS.TEXT_PRIMARY : UI.COLORS.TEXT_SECONDARY}
                  />
                  <Text style={[styles.typeButtonText, formData.type === type && styles.typeButtonTextActive]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Description *</Text>
            <View style={[styles.inputContainer, errors.description && styles.inputError]}>
              <Ionicons name="document-text-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                ref={descriptionRef}
                style={styles.input}
                placeholder="Enter transaction description"
                placeholderTextColor={UI.COLORS.TEXT_MUTED}
                value={formData.description}
                onChangeText={(text) => updateFormData("description", text)}
                maxLength={VALIDATION.TRANSACTION.MAX_DESCRIPTION_LENGTH}
                returnKeyType="next"
              />
            </View>
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          {/* Amount */}
          <View style={styles.section}>
            <Text style={styles.label}>Amount *</Text>
            <View style={[styles.inputContainer, errors.amount && styles.inputError]}>
              <Ionicons name="cash-outline" size={20} color={UI.COLORS.TEXT_SECONDARY} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="0.00 (supports math: 100+50)"
                placeholderTextColor={UI.COLORS.TEXT_MUTED}
                value={formData.amount}
                onChangeText={(text) => updateFormData("amount", text)}
                keyboardType="default"
                returnKeyType="next"
              />
            </View>
            {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
          </View>

          {/* Category */}
          <View style={styles.section}>
            <CategorySelector
              categories={Object.values(categories).filter((cat) => cat != null)}
              selectedCategoryId={formData.categoryId}
              onCategorySelect={(categoryId) => updateFormData("categoryId", categoryId)}
              onCategoryAdd={(newCategory) => {
                const categoryData = {
                  ...newCategory,
                  id: generateId(),
                };
                dispatch(addCategory(categoryData));
                updateFormData("categoryId", categoryData.id);
              }}
              type={formData.type}
              label="Category"
              error={errors.categoryId}
              rememberLastUsed={!editTransaction} // Only remember for new transactions, not edits
            />
          </View>

          {/* Budget (if applicable) */}
          {filteredBudgets.length > 0 && (
            <View style={styles.section}>
              <BudgetSelector
                budgets={filteredBudgets}
                selectedBudgetId={formData.budgetId}
                onBudgetSelect={(budgetId) => updateFormData("budgetId", budgetId)}
                label="Budget (Optional)"
                rememberLastUsed={!editTransaction} // Only remember for new transactions, not edits
              />
            </View>
          )}

          {/* Date */}
          <View style={styles.section}>
            <Text style={styles.label}>Date *</Text>
            <CustomDatePicker
              value={formData.date}
              onDateChange={(date) => updateFormData("date", date)}
              label="Transaction Date"
              showLabel={false}
              style={[styles.inputContainer, errors.date && styles.inputError]}
            />
            {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="document-text-outline" size={20} color={UI.COLORS.TEXT_SECONDARY} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional notes or details..."
                placeholderTextColor={UI.COLORS.TEXT_MUTED}
                value={formData.note}
                onChangeText={(text) => updateFormData("note", text)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {errors.submit && (
            <View style={styles.section}>
              <Text style={styles.errorText}>{errors.submit}</Text>
            </View>
          )}

          {/* Bottom padding for keyboard */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.COLORS.BACKGROUND,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
  },
  cancelButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  saveButton: {
    backgroundColor: UI.COLORS.PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  form: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputError: {
    borderColor: UI.COLORS.ERROR,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
    paddingBottom: 12,
  },
  typeToggle: {
    flexDirection: "row",
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: 12,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  typeButtonActive: {
    backgroundColor: UI.COLORS.PRIMARY,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_SECONDARY,
    marginLeft: 8,
  },
  typeButtonTextActive: {
    color: UI.COLORS.TEXT_PRIMARY,
  },
  categoryScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  categoryContainer: {
    flexDirection: "row",
    paddingRight: 16,
  },
  categoryChip: {
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  categoryChipActive: {
    backgroundColor: UI.COLORS.PRIMARY,
    borderColor: UI.COLORS.PRIMARY,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: UI.COLORS.TEXT_SECONDARY,
  },
  categoryChipTextActive: {
    color: UI.COLORS.TEXT_PRIMARY,
  },
  errorText: {
    fontSize: 12,
    color: UI.COLORS.ERROR,
    marginTop: 4,
  },
  bottomPadding: {
    height: 100,
  },
  // Date Picker Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: UI.SPACING.MD,
  },
  datePickerModal: {
    backgroundColor: UI.COLORS.CARD,
    borderRadius: UI.SPACING.MD,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: UI.SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  closeModalButton: {
    padding: UI.SPACING.SM,
  },
  dateOptions: {
    maxHeight: 300,
  },
  dateOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: UI.SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
  },
  dateOptionSelected: {
    backgroundColor: UI.COLORS.PRIMARY + "20",
  },
  dateOptionText: {
    fontSize: 16,
    fontWeight: "500",
    color: UI.COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  dateOptionTextSelected: {
    color: UI.COLORS.PRIMARY,
  },
  dateOptionSubtext: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    marginLeft: UI.SPACING.SM,
  },
});

export default AddTransactionScreen;
