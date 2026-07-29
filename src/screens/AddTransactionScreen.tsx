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
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
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
import { fetchWallets } from "../store/slices/walletsSlice";
import { UI, VALIDATION } from "../constants";
import { generateId, findMatchingBudgetForCategory } from "../utils";
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
  WalletSelector,
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
  const categoryIdParam = route.params?.categoryId;
  const autoFocusAmount = route.params?.autoFocusAmount;
  const dispatch = useDispatch<AppDispatch>();
  const { items: categories } = useSelector(
    (state: RootState) => state.categories,
  );
  const { items: budgets } = useSelector((state: RootState) => state.budgets);
  const { items: wallets } = useSelector((state: RootState) => state.wallets);
  const { loading } = useSelector((state: RootState) => state.transactions);

  // Form state
  const [formData, setFormData] = useState<TransactionFormData>({
    description: "",
    amount: "",
    type: "expense",
    categoryId: categoryIdParam || "",
    budgetId: undefined,
    date: new Date(),
    note: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [userManuallyOverrodeBudget, setUserManuallyOverrodeBudget] =
    useState(false);

  // Refs for auto-focus
  const descriptionRef = useRef<TextInput>(null);
  const amountRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        dispatch(fetchCategories());
        dispatch(fetchBudgets());
        dispatch(fetchWallets());

        if (editTransaction) {
          setFormData({
            description: editTransaction.description,
            amount: editTransaction.amount.toString(),
            type: editTransaction.type,
            categoryId: editTransaction.categoryId || "",
            budgetId: editTransaction.budgetId,
            date: new Date(editTransaction.date),
            note: editTransaction.note || "",
            walletId: editTransaction.walletId,
            fromWalletId: editTransaction.fromWalletId,
            toWalletId: editTransaction.toWalletId,
          });
        } else if (categoryIdParam) {
          const selectedCat = categories[categoryIdParam];
          const categoryName = selectedCat?.name;
          const matchingBudget = findMatchingBudgetForCategory(
            budgets,
            categoryIdParam,
          );
          setFormData((prev) => ({
            ...prev,
            type: "expense",
            categoryId: categoryIdParam,
            description: prev.description || categoryName || "",
            budgetId:
              prev.budgetId || (matchingBudget ? matchingBudget.id : undefined),
          }));
        }
      });

      if (!editTransaction) {
        // Delay focus slightly to ensure layout is ready
        const timer = setTimeout(() => {
          if (autoFocusAmount) {
            amountRef.current?.focus();
          } else {
            descriptionRef.current?.focus();
          }
        }, 300);
        return () => {
          task.cancel();
          clearTimeout(timer);
        };
      }

      return () => task.cancel();
    }, [
      dispatch,
      editTransaction,
      categoryIdParam,
      autoFocusAmount,
      categories,
      budgets,
    ]),
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

    if (formData.type === "transfer") {
      if (!formData.fromWalletId) {
        newErrors.fromWalletId = "Select From Wallet";
      }
      if (!formData.toWalletId) {
        newErrors.toWalletId = "Select To Wallet";
      }
      if (
        formData.fromWalletId &&
        formData.toWalletId &&
        formData.fromWalletId === formData.toWalletId
      ) {
        newErrors.toWalletId = "Source and destination must be different";
      }
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

  const filteredBudgets = useMemo(
    () => Object.values(budgets).filter((budget) => budget),
    [budgets],
  );
  const filteredCategories = useMemo(
    () => Object.values(categories).filter((cat) => cat != null),
    [categories],
  );
  const filteredWallets = useMemo(
    () => Object.values(wallets).filter((wallet) => wallet != null),
    [wallets],
  );

  const handleCategoryChange = useCallback(
    (newCategoryId: string, overrideName?: string) => {
      if (!newCategoryId) {
        updateFormField("categoryId", "");
        return;
      }

      const selectedCat = categories[newCategoryId];
      const categoryName = overrideName || selectedCat?.name;
      const matchingBudget = !userManuallyOverrodeBudget
        ? findMatchingBudgetForCategory(filteredBudgets, newCategoryId)
        : undefined;

      setFormData((prev) => {
        const next = { ...prev, categoryId: newCategoryId };

        // 1) Auto-fill description if description is currently empty
        if (categoryName && !prev.description.trim()) {
          next.description = categoryName;
        }

        // 2) Budget auto-match if user hasn't manually overridden budget in this session
        if (!userManuallyOverrodeBudget) {
          next.budgetId = matchingBudget ? matchingBudget.id : undefined;
        }

        return next;
      });

      setErrors((prev) => {
        const nextErrors = { ...prev };
        if (nextErrors.categoryId) delete nextErrors.categoryId;
        if (categoryName && nextErrors.description)
          delete nextErrors.description;
        return nextErrors;
      });
    },
    [categories, userManuallyOverrodeBudget, filteredBudgets, updateFormField],
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
      handleCategoryChange(categoryData.id, categoryData.name);
    },
    [dispatch, handleCategoryChange],
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
              onTypeChange={(type) => {
                updateFormField("type", type);
                if (type === "transfer") {
                  if (!formData.description.trim()) {
                    updateFormField("description", "Transfer");
                  }
                  if (!formData.fromWalletId && filteredWallets[0]) {
                    updateFormField("fromWalletId", filteredWallets[0].id);
                  }
                  if (
                    !formData.toWalletId &&
                    (filteredWallets[1] || filteredWallets[0])
                  ) {
                    updateFormField(
                      "toWalletId",
                      filteredWallets[1]?.id || filteredWallets[0]?.id
                    );
                  }
                }
              }}
            />

            <TransactionFormFields
              formData={formData}
              errors={errors}
              onFieldChange={updateFormField}
              descriptionRef={descriptionRef}
              amountRef={amountRef}
            />

            {formData.type === "transfer" ? (
              <>
                <View style={styles.section}>
                  <WalletSelector
                    wallets={filteredWallets}
                    selectedWalletId={formData.fromWalletId}
                    onWalletSelect={(walletId) =>
                      updateFormField("fromWalletId", walletId)
                    }
                    label="From Wallet"
                    showNoneOption={false}
                    error={errors.fromWalletId}
                  />
                </View>
                <View style={styles.section}>
                  <WalletSelector
                    wallets={filteredWallets}
                    selectedWalletId={formData.toWalletId}
                    onWalletSelect={(walletId) =>
                      updateFormField("toWalletId", walletId)
                    }
                    label="To Wallet"
                    showNoneOption={false}
                    error={errors.toWalletId}
                  />
                </View>
              </>
            ) : (
              <>
                {/* Category */}
                <View style={styles.section}>
                  <CategorySelector
                    categories={filteredCategories}
                    selectedCategoryId={formData.categoryId}
                    onCategorySelect={(categoryId) =>
                      handleCategoryChange(categoryId || "")
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
                      onBudgetSelect={(budgetId) => {
                        setUserManuallyOverrodeBudget(true);
                        updateFormField("budgetId", budgetId);
                      }}
                      label="Budget (Optional)"
                      rememberLastUsed={!editTransaction}
                    />
                  </View>
                )}

                {/* Wallet (Optional) */}
                {filteredWallets.length > 0 && (
                  <View style={styles.section}>
                    <WalletSelector
                      wallets={filteredWallets}
                      selectedWalletId={formData.walletId}
                      onWalletSelect={(walletId) =>
                        updateFormField("walletId", walletId)
                      }
                      label="Wallet (Optional)"
                      showNoneOption={true}
                    />
                  </View>
                )}
              </>
            )}

            {/* More options disclosure (Notes & Date override) */}
            <TouchableOpacity
              style={styles.moreOptionsToggle}
              onPress={() => setShowMoreOptions((prev) => !prev)}
              activeOpacity={0.7}>
              <Text style={styles.moreOptionsText}>
                {showMoreOptions ? "Fewer options" : "More options"}
              </Text>
              <Ionicons
                name={showMoreOptions ? "chevron-up" : "chevron-down"}
                size={16}
                color={UI.COLORS.PRIMARY_LIGHT}
              />
            </TouchableOpacity>

            {showMoreOptions && (
              <View style={styles.moreOptionsSection}>
                {/* ── Date ──────────────────────────────────────────── */}
                <View style={styles.section}>
                  <Text style={styles.label}>Date</Text>
                  <CustomDatePicker
                    value={formData.date}
                    onDateChange={(date) => updateFormField("date", date)}
                    label="Transaction Date"
                    showLabel={false}
                    style={[
                      styles.dateCard,
                      errors.date && styles.dateCardError,
                    ]}
                  />
                  {errors.date && (
                    <Text style={styles.errorText}>{errors.date}</Text>
                  )}
                </View>

                {/* ── Notes ─────────────────────────────────────────── */}
                <View style={styles.section}>
                  <Text style={styles.label}>Notes</Text>
                  <View style={styles.inputCard}>
                    <View
                      style={[
                        styles.iconBox,
                        { alignSelf: "flex-start", marginTop: 14 },
                      ]}>
                      <Ionicons
                        name="pencil-outline"
                        size={18}
                        color={UI.COLORS.PRIMARY_LIGHT}
                      />
                    </View>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Additional notes…"
                      placeholderTextColor={UI.COLORS.TEXT_MUTED}
                      value={formData.note}
                      onChangeText={(text) => updateFormField("note", text)}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              </View>
            )}

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
  moreOptionsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginBottom: 16,
  },
  moreOptionsText: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.PRIMARY_LIGHT,
    marginRight: 6,
  },
  moreOptionsSection: {
    marginBottom: 8,
  },
  inputCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20,20,50,0.65)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#6c5ce726",
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(108,92,231,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    paddingVertical: 14,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 14,
    paddingBottom: 14,
  },
  bottomPadding: {
    height: 100,
  },
});

export default AddTransactionScreen;
