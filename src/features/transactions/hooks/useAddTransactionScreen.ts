import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ScrollView, TextInput, Platform, Keyboard, Animated, Easing } from "react-native";
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
import { useUnsavedChanges } from "../../../shared/hooks";

type NavigationProp = StackNavigationProp<
  TransactionStackParamList,
  "AddTransaction"
>;

type RouteParam = RouteProp<TransactionStackParamList, "AddTransaction">;

const LAST_CATEGORY_KEY = "lastUsedCategoryId";

const LAST_BUDGET_KEY = "lastUsedBudgetId";

const LAST_ACCOUNT_KEY = "lastUsedAccountId";

const arabicToWestern = (str: string): string =>
  str.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));

const evaluateMath = (expr: string): number => {
  try {
    // Normalize Arabic digits first
    const normalized = arabicToWestern(expr);
    // Replace × and ÷ in case someone pastes them
    const sanitized = normalized
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/[^-()\d/*+.]/g, "");
    if (!sanitized) return 0;
    // eslint-disable-next-line no-new-func
    const result = Number(new Function("return " + sanitized)());
    return isNaN(result) ? 0 : result;
  } catch (e) {
    return 0;
  }
};

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

  const [amountStr, setAmountStr] = useState("");
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
  const KEYPAD_HEIGHT = 350;
  const shouldInitialFocusAmount = !openCreateCategory;
  const [showKeypad, setShowKeypad] = useState<boolean>(shouldInitialFocusAmount);
  const [isKeypadMounted, setIsKeypadMounted] = useState<boolean>(shouldInitialFocusAmount);
  const keypadTranslateY = useRef(
    new Animated.Value(shouldInitialFocusAmount ? 0 : KEYPAD_HEIGHT)
  ).current;
  const keypadOpacity = useRef(
    new Animated.Value(shouldInitialFocusAmount ? 1 : 0)
  ).current;
  const [amountFocused, setAmountFocused] = useState<boolean>(shouldInitialFocusAmount);

  // Blinking cursor for focused amount input
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (showKeypad) {
      const blinkAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(cursorOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      blinkAnimation.start();
      return () => blinkAnimation.stop();
    } else {
      cursorOpacity.setValue(0);
    }
  }, [showKeypad]);

  useEffect(() => {
    setAmountFocused(showKeypad);
    if (showKeypad) {
      setIsKeypadMounted(true);
      Animated.parallel([
        Animated.spring(keypadTranslateY, {
          toValue: 0,
          damping: 22,
          stiffness: 220,
          mass: 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(keypadOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(keypadTranslateY, {
          toValue: KEYPAD_HEIGHT,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(keypadOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setIsKeypadMounted(false);
        }
      });
    }
  }, [showKeypad]);

  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [formErrors, setFormErrors] = useState<{ amount?: string; category?: string; }>({});

  const scrollViewRef = useRef<ScrollView>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const noteInputRef = useRef<TextInput>(null);
  const showKeypadRef = useRef(showKeypad);

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

  useEffect(() => {
    showKeypadRef.current = showKeypad;
  }, [showKeypad]);

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

  const hasMathOperator = /[+\-*/×÷]/.test(amountStr.slice(1));
  const evaluatedAmount = evaluateMath(amountStr);

  const handleKeypadPress = (key: string) => {
    if (key === "=") {
      handleEvaluateExpression();
      return;
    }
    if (formErrors.amount) {
      setFormErrors((prev) => ({ ...prev, amount: undefined }));
    }
    setAmountStr((prev) => {
      const isOp = ["+", "-", "*", "/"].includes(key);
      if (isOp) {
        if (!prev) return "";
        const lastChar = prev.slice(-1);
        if (["+", "-", "*", "/", "."].includes(lastChar)) {
          return prev.slice(0, -1) + key;
        }
      }
      if (key === ".") {
        const parts = prev.split(/[+\-*/]/);
        const currentPart = parts[parts.length - 1] || "";
        if (currentPart.includes(".")) return prev;
        if (!currentPart) return prev + "0.";
      }
      return prev + key;
    });
  };

  const handleKeypadBackspace = () => {
    setAmountStr((prev) => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setAmountStr("");
  };

  const handleEvaluateExpression = () => {
    if (!amountStr) return;
    const result = evaluateMath(amountStr);
    if (result > 0) {
      setAmountStr(parseFloat(result.toFixed(2)).toString());
    }
  };

  const handleAmountBlur = () => {
    setAmountFocused(false);
    handleEvaluateExpression();
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
    .sort((a, b) => ((b as any).entryCount || 0) - ((a as any).entryCount || 0));

  const amountDisplay = amountStr
    ? amountStr.replace(/\*/g, "×").replace(/\//g, "÷")
    : "0.00";
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
