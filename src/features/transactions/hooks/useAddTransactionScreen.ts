import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ScrollView, TextInput, Platform, Keyboard } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useDispatch, useSelector } from "react-redux";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { RootState, AppDispatch } from "../../../app/store";
import { addTransaction, updateTransaction } from "../store/transactionsSlice";
import { fetchCategories, addCategory } from "../../categories/store/categoriesSlice";
import { fetchBudgets } from "../../budgets/store/budgetsSlice";
import { TransactionFormData, TransactionStackParamList, TransactionType, WalletAccount } from "../../../shared/types";

import { useToast } from "../../../shared/ui";

import { walletService } from "../../wallets/services/walletService";
import { isWalletRelatedTransaction } from "./useTransactionActions";
import { evaluateMath, useCalculatorKeypad } from "./useCalculatorKeypad";
import { useUnsavedChanges } from "../../../shared/hooks";

type NavigationProp = StackNavigationProp<
  TransactionStackParamList,
  "AddTransaction"
>;

type RouteParam = RouteProp<TransactionStackParamList, "AddTransaction">;

const LAST_CATEGORY_KEY = "lastUsedCategoryId";
const LAST_BUDGET_KEY = "lastUsedBudgetId";
const LAST_ACCOUNT_KEY = "lastUsedAccountId";

/** Owns screen state and actions; rendering stays in AddTransactionScreen. */
export function useAddTransactionScreen() {

  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParam>();
  const params = route.params as any;
  const editTransaction = params?.editTransaction;
  const prefilledData = params?.prefilledData;
  const initialCategoryId = params?.categoryId;
  const openCreateCategory = params?.openCreateCategory;

  const dispatch = useDispatch<AppDispatch>();
  const { showError, showSuccess } = useToast();

  const { items: categories } = useSelector(
    (state: RootState) => state.categories,
  );
  const { items: budgets } = useSelector((state: RootState) => state.budgets);

  const [type, setType] = useState<TransactionType>("expense");
  const [categoryId, setCategoryId] = useState<string>("");
  const [budgetId, setBudgetId] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("default_cash");
  const [wallets, setWallets] = useState<WalletAccount[]>(() =>
    walletService.getCachedWallets()
  );
  const [manualBudgetSelected, setManualBudgetSelected] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [formErrors, setFormErrors] = useState<{ amount?: string; category?: string; }>({});

  const shouldInitialFocusAmount = !openCreateCategory;
  const {
    KEYPAD_HEIGHT,
    amountStr,
    setAmountStr,
    showKeypad,
    setShowKeypad,
    isKeypadMounted,
    setIsKeypadMounted,
    keypadTranslateY,
    keypadOpacity,
    amountFocused,
    setAmountFocused,
    cursorOpacity,
    showKeypadRef,
    hasMathOperator,
    evaluatedAmount,
    amountDisplay,
    handleKeypadPress,
    handleKeypadBackspace,
    handleKeypadClear,
    handleEvaluateExpression,
  } = useCalculatorKeypad({
    initialFocus: shouldInitialFocusAmount,
    onClearAmountError: () => {
      if (formErrors.amount) {
        setFormErrors((prev) => ({ ...prev, amount: undefined }));
      }
    },
  });

  const scrollViewRef = useRef<ScrollView>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const noteInputRef = useRef<TextInput>(null);

  const [optionsCardY, setOptionsCardY] = useState(0);
  const [noteY, setNoteY] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const scrollToDescription = useCallback(() => {
    setTimeout(() => {
      if (optionsCardY > 0) {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, optionsCardY - 30),
          animated: true,
        });
      } else {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    }, 100);
  }, [optionsCardY]);

  const scrollToNote = useCallback(() => {
    setTimeout(() => {
      if (noteY > 0) {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, noteY - 30),
          animated: true,
        });
      } else {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    }, 100);
  }, [noteY]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
      if (descriptionInputRef.current?.isFocused()) {
        scrollToDescription();
      } else if (noteInputRef.current?.isFocused()) {
        scrollToNote();
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToDescription, scrollToNote]);

  const hasChanges = useMemo(() => {
    if (editTransaction) {
      const origAmount = editTransaction.amount?.toString() || "";
      const origType = editTransaction.type || "expense";
      const origCat = editTransaction.categoryId || "";
      const origBudget = editTransaction.budgetId || "";
      const origAccount = editTransaction.accountId || "default_cash";
      const origDesc = editTransaction.description || "";
      const origNote = editTransaction.note || "";

      return (
        amountStr !== origAmount ||
        type !== origType ||
        categoryId !== origCat ||
        budgetId !== origBudget ||
        accountId !== origAccount ||
        description !== origDesc ||
        note !== origNote
      );
    } else {
      const hasAmount = amountStr.trim() !== "" && amountStr !== "0";
      const hasDesc = description.trim() !== "";
      const hasNote = note.trim() !== "";
      const changedType = type !== (prefilledData?.type || "expense");
      const changedCategory =
        categoryId !== (prefilledData?.categoryId || initialCategoryId || "");
      const changedBudget = budgetId !== (prefilledData?.budgetId || "");

      return (
        hasAmount ||
        hasDesc ||
        hasNote ||
        changedType ||
        changedCategory ||
        changedBudget
      );
    }
  }, [
    editTransaction,
    amountStr,
    type,
    categoryId,
    budgetId,
    accountId,
    description,
    note,
    prefilledData,
    initialCategoryId,
  ]);

  const { markAsSaved, resetSaved } = useUnsavedChanges({
    hasChanges,
    isEditing: !!editTransaction,
    onInterceptBack: () => {
      if (showKeypadRef.current) {
        setShowKeypad(false);
        return true;
      }
      return false;
    },
  });

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchBudgets());
    walletService.getWallets().then(setWallets).catch(() => { });

    if (openCreateCategory) {
      setShowCreateCategoryModal(true);
    }

    if (editTransaction) {
      if (isWalletRelatedTransaction(editTransaction)) {
        showError("Wallet-related transactions cannot be edited directly");
        navigation.goBack();
        return;
      }
      setAmountStr(editTransaction.amount.toString());
      setType(editTransaction.type);
      setCategoryId(editTransaction.categoryId || "");
      setBudgetId(editTransaction.budgetId || "");
      setAccountId(editTransaction.accountId || "default_cash");
      setDescription(editTransaction.description || "");
      setNote(editTransaction.note || "");
      setDate(new Date(editTransaction.date));
      if (shouldInitialFocusAmount) {
        setShowKeypad(true);
        setAmountFocused(true);
      }
    } else if (prefilledData) {
      if (prefilledData.amount) setAmountStr(prefilledData.amount.toString());
      if (prefilledData.type) setType(prefilledData.type);
      if (prefilledData.categoryId) setCategoryId(prefilledData.categoryId);
      if (prefilledData.budgetId) setBudgetId(prefilledData.budgetId);
      if (prefilledData.description) setDescription(prefilledData.description);
      if (prefilledData.note) setNote(prefilledData.note);
      if (prefilledData.date) setDate(new Date(prefilledData.date));
      AsyncStorage.getItem(LAST_ACCOUNT_KEY)
        .then((id) => {
          if (id) setAccountId(id);
        })
        .catch(() => { });
    } else if (initialCategoryId) {
      setCategoryId(initialCategoryId);
      Promise.all([
        AsyncStorage.getItem(LAST_BUDGET_KEY),
        AsyncStorage.getItem(LAST_ACCOUNT_KEY),
      ])
        .then(([id, accId]) => {
          if (id) setBudgetId(id);
          if (accId) setAccountId(accId);
        })
        .catch(() => { });
    } else {
      Promise.all([
        AsyncStorage.getItem(LAST_CATEGORY_KEY),
        AsyncStorage.getItem(LAST_BUDGET_KEY),
        AsyncStorage.getItem(LAST_ACCOUNT_KEY),
      ])
        .then(([lastCat, lastBudget, lastAcc]) => {
          if (lastCat) setCategoryId(lastCat);
          if (lastBudget) setBudgetId(lastBudget);
          if (lastAcc) setAccountId(lastAcc);
        })
        .catch(() => { });
    }
  }, [editTransaction, prefilledData, initialCategoryId, dispatch]);

  const handleCategorySelect = (id: string) => {
    if (showKeypad) setShowKeypad(false);
    setCategoryId(id);
    if (formErrors.category) {
      setFormErrors((prev) => ({ ...prev, category: undefined }));
    }
  };

  const handleQuickCreateCategory = async (data: {
    name: string;
    type: "income" | "expense";
    color?: string;
    icon?: string;
  }) => {
    try {
      const created = await dispatch(
        addCategory({
          name: data.name,
          type: data.type || type,
          color: data.color || "teal",
          icon: data.icon || "pricetag",
        })
      ).unwrap();
      if (data.type && data.type !== type) {
        setType(data.type);
      }
      setCategoryId(created.id);
      setShowCreateCategoryModal(false);
      showSuccess(`Created "${created.name}"`);
    } catch (e) {
      showError("Could not create category");
    }
  };

  const handleSave = async () => {
    const finalAmount = evaluateMath(amountStr);
    const newErrors: { amount?: string; category?: string; } = {};

    if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) {
      newErrors.amount = "Please enter a valid amount greater than 0";
      showError("Please enter a valid amount");
    }
    if (!categoryId) {
      newErrors.category = "Please select or create a category";
      showError("Please select or create a category");
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }
    setFormErrors({});

    const finalDescription =
      description.trim() ? description : categories[categoryId]?.name || "";

    const transactionData: TransactionFormData = {
      amount: finalAmount.toString(),
      type,
      categoryId,
      budgetId: budgetId || undefined,
      accountId: accountId || "default_cash",
      description: finalDescription,
      note,
      date,
    };

    try {
      if (editTransaction) {
        await dispatch(
          updateTransaction({
            id: editTransaction.id,
            updates: transactionData,
          }),
        ).unwrap();
      } else {
        await dispatch(addTransaction(transactionData)).unwrap();

        await Promise.all([
          AsyncStorage.setItem(LAST_CATEGORY_KEY, categoryId),
          AsyncStorage.setItem(LAST_ACCOUNT_KEY, accountId || "default_cash"),
          budgetId
            ? AsyncStorage.setItem(LAST_BUDGET_KEY, budgetId)
            : AsyncStorage.removeItem(LAST_BUDGET_KEY),
        ]).catch(() => { });
      }
      markAsSaved();
      navigation.goBack();
    } catch (error) {
      resetSaved();
      console.error(error);
      showError("Failed to save transaction");
    }
  };

  // Sort categories by usage count (entryCount) descending
  const activeCategories = Object.values(categories)
    .filter((c) => c && c.type === type && !c.deleted)
    .sort((a, b) => (b.entryCount || 0) - (a.entryCount || 0));

  const displayWallets = wallets.length > 0 ? wallets : walletService.getCachedWallets();
  return {
    navigation,
    editTransaction,
    budgets,
    amountStr,
    type,
    setType,
    categoryId,
    budgetId,
    setBudgetId,
    accountId,
    setAccountId,
    wallets,
    displayWallets,
    setManualBudgetSelected,
    showMore,
    setShowMore,
    description,
    setDescription,
    note,
    setNote,
    date,
    setDate,
    showDatePicker,
    setShowDatePicker,
    KEYPAD_HEIGHT,
    showKeypad,
    setShowKeypad,
    isKeypadMounted,
    setIsKeypadMounted,
    keypadTranslateY,
    keypadOpacity,
    amountFocused,
    setAmountFocused,
    cursorOpacity,
    showCreateCategoryModal,
    setShowCreateCategoryModal,
    formErrors,
    scrollViewRef,
    descriptionInputRef,
    noteInputRef,
    setOptionsCardY,
    setNoteY,
    keyboardHeight,
    isKeyboardVisible,
    scrollToDescription,
    scrollToNote,
    handleCategorySelect,
    hasMathOperator,
    evaluatedAmount,
    handleKeypadPress,
    handleKeypadBackspace,
    handleKeypadClear,
    handleEvaluateExpression,
    handleQuickCreateCategory,
    handleSave,
    activeCategories,
    amountDisplay
  };
}

export type AddTransactionScreenController = ReturnType<typeof useAddTransactionScreen>;
