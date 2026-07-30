import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Text,
  InteractionManager,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootState, AppDispatch } from "../store";
import {
  addTransaction,
  updateTransaction,
} from "../store/slices/transactionsSlice";
import { fetchCategories, addCategory } from "../store/slices/categoriesSlice";
import { fetchBudgets } from "../store/slices/budgetsSlice";
import { UI, VALIDATION } from "../constants";
import { generateId } from "../utils";
import { evaluateMathExpression, normalizeNumerals } from "../utils/mathUtils";
import {
  TransactionFormData,
  TransactionType,
  TransactionStackParamList,
  Category,
  CategoryFormData,
} from "../types";
import {
  CustomDatePicker,
  CategorySelector,
  BudgetSelector,
} from "../components/ui";
import {
  TransactionHeader,
  TransactionTypeToggle,
  TransactionFormFields,
} from "../components/forms/transaction";

type AddTransactionScreenNavigationProp = StackNavigationProp<
  TransactionStackParamList,
  "AddTransaction"
>;
type AddTransactionScreenRouteProp = RouteProp<
  TransactionStackParamList,
  "AddTransaction"
>;

const AddTransactionScreen: React.FC = () => {
  const navigation = useNavigation<AddTransactionScreenNavigationProp>();
  const route = useRoute<AddTransactionScreenRouteProp>();
  const editTransaction = route.params?.editTransaction;
  const dispatch = useDispatch<AppDispatch>();
  const { items: categories } = useSelector(
    (state: RootState) => state.categories,
  );
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

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        dispatch(fetchCategories());
        dispatch(fetchBudgets());

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
      });

      if (!editTransaction) {
        // Delay focus slightly to ensure layout is ready
        const timer = setTimeout(() => {
          descriptionRef.current?.focus();
        }, 300);
        return () => {
          task.cancel();
          clearTimeout(timer);
        };
      }

      return () => task.cancel();
    }, [dispatch, editTransaction]),
  );

  // ── Validation ──────────────────────────────────────────────────────
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (
      formData.description.trim().length <
      VALIDATION.TRANSACTION.MIN_DESCRIPTION_LENGTH
    ) {
      newErrors.description = `At least ${VALIDATION.TRANSACTION.MIN_DESCRIPTION_LENGTH} characters`;
    }

    if (!formData.amount.trim()) {
      newErrors.amount = "Amount is required";
    } else {
      const evaluated = evaluateMathExpression(formData.amount);
      if (evaluated === null || +evaluated <= 0) {
        newErrors.amount = "Enter a valid positive amount";
      }
    }

    if (!formData.type) {
      newErrors.type = "Select a transaction type";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // ── Submit ──────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    try {
      const normalizedAmount = normalizeNumerals(formData.amount);
      const evaluatedAmount = evaluateMathExpression(normalizedAmount);

      if (evaluatedAmount === null) {
        setErrors({ amount: "Invalid math expression" });
        return;
      }

      const transactionData = {
        ...formData,
        amount: evaluatedAmount.toString(),
      };

      if (editTransaction) {
        await dispatch(
          updateTransaction({
            id: editTransaction.id,
            updates: transactionData,
          }),
        ).unwrap();
      } else {
        await dispatch(addTransaction(transactionData)).unwrap();
      }

      navigation.goBack();
    } catch (error) {
      setErrors({
        submit:
          error instanceof Error ? error.message : "Failed to save transaction",
      });
    }
  }, [validateForm, formData, editTransaction, dispatch, navigation]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const updateFormField = useCallback(
    <K extends keyof TransactionFormData>(
      field: K,
      value: TransactionFormData[K],
    ) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        if (prev[field]) {
          return { ...prev, [field]: "" };
        }
        return prev;
      });
    },
    [],
  );

  const handleCategoryAdd = useCallback(
    (newCategory: CategoryFormData) => {
      const categoryData: Category = {
        ...newCategory,
        id: generateId(),
        entryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
      };
      dispatch(addCategory(categoryData));
      updateFormField("categoryId", categoryData.id);
    },
    [dispatch, updateFormField],
  );

  const filteredBudgets = useMemo(
    () => Object.values(budgets).filter((budget) => budget),
    [budgets],
  );
  const filteredCategories = useMemo(
    () => Object.values(categories).filter((cat) => cat != null),
    [categories],
  );

  return (
    <LinearGradient
      colors={[UI.COLORS.BACKGROUND, "#0F0F2D", UI.COLORS.BACKGROUND]}
      locations={[0, 0.4, 1]}
      style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TransactionHeader
            isEditing={!!editTransaction}
            loading={loading}
            onCancel={handleCancel}
            onSave={handleSubmit}
          />

          <ScrollView
            style={styles.form}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formContent}>
            <TransactionTypeToggle
              selectedType={formData.type}
              onTypeChange={(type) => updateFormField("type", type)}
            />

            <TransactionFormFields
              formData={formData}
              errors={errors}
              onFieldChange={updateFormField}
              descriptionRef={descriptionRef}
            />

            {/* Category */}
            <View style={styles.section}>
              <CategorySelector
                categories={filteredCategories}
                selectedCategoryId={formData.categoryId}
                onCategorySelect={(categoryId) =>
                  updateFormField("categoryId", categoryId || "")
                }
                onCategoryAdd={handleCategoryAdd}
                type={formData.type}
                label="Category"
                error={errors.categoryId}
                rememberLastUsed={!editTransaction}
              />
            </View>

            {/* Budget — only for expense/debt */}
            {filteredBudgets.length > 0 && formData.type !== "income" && (
              <View style={styles.section}>
                <BudgetSelector
                  budgets={filteredBudgets}
                  selectedBudgetId={formData.budgetId}
                  onBudgetSelect={(budgetId) =>
                    updateFormField("budgetId", budgetId)
                  }
                  label="Budget (Optional)"
                  rememberLastUsed={!editTransaction}
                />
              </View>
            )}

            {/* Date */}
            <View style={styles.section}>
              <Text style={styles.label}>Date</Text>
              <CustomDatePicker
                value={formData.date}
                onDateChange={(date) => updateFormField("date", date)}
                label="Transaction Date"
                showLabel={false}
                style={[styles.dateCard, errors.date && styles.dateCardError]}
              />
              {errors.date && (
                <Text style={styles.errorText}>{errors.date}</Text>
              )}
            </View>

            {/* Submit error */}
            {errors.submit && (
              <View style={styles.errorAlert}>
                <Text style={styles.errorAlertText}>{errors.submit}</Text>
              </View>
            )}

            <View style={styles.bottomPadding} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  form: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: UI.COLORS.PRIMARY_LIGHT,
    marginBottom: 8,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20,20,50,0.65)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#6c5ce726",
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  dateCardError: {
    borderColor: "rgba(255,107,107,0.6)",
  },
  errorText: {
    fontSize: 12,
    color: UI.COLORS.ERROR,
    marginTop: 6,
    marginLeft: 4,
  },
  errorAlert: {
    backgroundColor: "rgba(255,107,107,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.25)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  errorAlertText: {
    fontSize: 13,
    color: UI.COLORS.ERROR,
    fontWeight: "500",
  },
  bottomPadding: {
    height: 100,
  },
});

export default AddTransactionScreen;
