import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  BackHandler,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Share,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { RootState, AppDispatch } from "../store";
import {
  addTransaction,
  updateTransaction,
} from "../store/slices/transactionsSlice";
import { fetchCategories, addCategory } from "../store/slices/categoriesSlice";
import { fetchBudgets } from "../store/slices/budgetsSlice";
import {
  TransactionFormData,
  TransactionStackParamList,
  TransactionType,
  WalletAccount,
  ParsedTransaction,
} from "../types";
import { useAppTheme } from "../components/ui/ThemeProvider";
import {
  Input,
  CustomDatePicker,
  CustomKeypad,
  CategoryCreationModal,
  useToast,
} from "../components/ui";
import { formatCurrency } from "../utils";
import { walletService } from "../services/walletService";
import { isWalletRelatedTransaction } from "../hooks/useTransactionActions";
import { useUnsavedChanges } from "../hooks";

type NavigationProp = StackNavigationProp<
  TransactionStackParamList,
  "AddTransaction"
>;
type RouteParam = RouteProp<TransactionStackParamList, "AddTransaction">;

const LAST_CATEGORY_KEY = "lastUsedCategoryId";
const LAST_BUDGET_KEY = "lastUsedBudgetId";
const LAST_ACCOUNT_KEY = "lastUsedAccountId";

/** Convert Arabic-Indic digits (٠-٩) to Western ASCII digits */
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

export const AddTransactionScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParam>();
  const params = route.params as any;
  const editTransaction = params?.editTransaction;
  const prefilledData = params?.prefilledData;
  const initialCategoryId = params?.categoryId;
  const openCreateCategory = params?.openCreateCategory;

  const dispatch = useDispatch<AppDispatch>();
  const {
    colors,
    typography,
    spacing,
    radius,
    currencySymbol,
    resolveCategoryColor,
  } = useAppTheme();
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
  const [formErrors, setFormErrors] = useState<{ amount?: string; category?: string }>({});

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
    walletService.getWallets().then(setWallets).catch(() => {});

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
        .catch(() => {});
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
        .catch(() => {});
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
        .catch(() => {});
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
    const newErrors: { amount?: string; category?: string } = {};

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
        ]).catch(() => {});
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

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Custom Top Bar */}
        <TouchableWithoutFeedback
          onPress={() => {
            if (showKeypad) setShowKeypad(false);
            Keyboard.dismiss();
          }}
          accessible={false}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: colors.surfaceVariant },
              ]}
              onPress={() => {
                if (showKeypad) setShowKeypad(false);
                navigation.goBack();
              }}>
              <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.onBackground }]}>
              {editTransaction ? "Edit Transaction" : "New Transaction"}
            </Text>
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: colors.primaryContainer },
              ]}
              onPress={() => {
                if (showKeypad) setShowKeypad(false);
                handleSave();
              }}>
              <Ionicons
                name="checkmark"
                size={24}
                color={colors.onPrimaryContainer}
              />
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: showKeypad
              ? KEYPAD_HEIGHT + spacing.md
              : isKeyboardVisible
              ? Math.max(keyboardHeight, 280) + spacing.xl
              : spacing.xxl,
          }}
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={() => {
            if (showKeypad) {
              setShowKeypad(false);
              setAmountFocused(false);
            }
          }}
          keyboardShouldPersistTaps="handled">
          <TouchableWithoutFeedback
            onPress={() => {
              if (showKeypad) {
                setShowKeypad(false);
                setAmountFocused(false);
              }
              Keyboard.dismiss();
            }}
            accessible={false}>
            <View>
              {/* Segmented Control */}
              <View
                style={[
                  styles.segmentContainer,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderRadius: radius.pill,
                    marginBottom: spacing.xl,
                  },
                ]}>
                {["income", "expense"].map((t) => {
                  const isActive = type === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.segmentButton,
                        {
                          borderRadius: radius.pill,
                          backgroundColor: isActive
                            ? colors.surface
                            : "transparent",
                        },
                      ]}
                      onPress={() => {
                        if (showKeypad) {
                          setShowKeypad(false);
                          setAmountFocused(false);
                        }
                        setType(t as TransactionType);
                      }}>
                      <Text
                        style={[
                          typography.bodyMedium,
                          {
                            color: isActive
                              ? colors.onBackground
                              : colors.onSurfaceVariant,
                            fontWeight: isActive ? "700" : "500",
                            textTransform: "capitalize",
                          },
                        ]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Amount Section — Tactile Calculator Display */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.amountSection}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowKeypad(true);
                  setAmountFocused(true);
                  scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                }}>
                <Text
                  style={[
                    typography.bodyMedium,
                    {
                      color: amountFocused ? colors.primary : colors.onSurfaceVariant,
                      marginBottom: 6,
                      fontWeight: amountFocused ? "700" : "500",
                    },
                  ]}>
                  Amount
                </Text>
                <View
                  style={[
                    styles.amountRow,
                    amountFocused && {
                      paddingHorizontal: spacing.md,
                      paddingVertical: 4,
                      borderRadius: radius.md,
                      backgroundColor: colors.surfaceVariant + "40",
                    },
                  ]}>
                  <View style={styles.amountTextContainer}>
                    <Text
                      style={[
                        styles.currencySymbol,
                        { color: amountFocused ? colors.primary : colors.onSurfaceVariant },
                      ]}>
                      {currencySymbol.trim()}
                    </Text>
                    <Text
                      style={[
                        styles.amountValue,
                        {
                          color: amountStr
                            ? type === "income"
                              ? colors.tertiary
                              : colors.onBackground
                            : colors.onSurfaceVariant,
                        },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit>
                      {amountDisplay}
                    </Text>
                    {showKeypad && (
                      <Animated.View
                        style={{
                          width: 3,
                          height: 38,
                          backgroundColor: colors.primary,
                          borderRadius: 1.5,
                          marginLeft: 4,
                          alignSelf: "center",
                          opacity: cursorOpacity,
                        }}
                      />
                    )}
                  </View>
                </View>

                {/* Live Math Preview Pill */}
                {hasMathOperator && evaluatedAmount > 0 ? (
                  <TouchableOpacity
                    onPress={handleEvaluateExpression}
                    style={{
                      marginTop: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: colors.secondaryContainer,
                    }}>
                    <Text
                      style={[
                        typography.label,
                        { color: colors.onSecondaryContainer },
                      ]}>
                      = {formatCurrency(evaluatedAmount)} (Tap to resolve)
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text
                    style={[
                      typography.bodySmall,
                      { color: colors.onSurfaceVariant, marginTop: 4, opacity: 0.7 },
                    ]}>
                    {showKeypad
                      ? "Tap outside to dismiss • or use Done below"
                      : "Tap amount to open calculator keypad"}
                  </Text>
                )}
                {formErrors.amount ? (
                  <Text
                    style={{
                      color: colors.error,
                      fontSize: 13,
                      fontWeight: "600",
                      marginTop: 6,
                      textAlign: "center",
                    }}>
                    {formErrors.amount}
                  </Text>
                ) : null}
              </TouchableOpacity>

          {/* Categories — Color-coded chips + Quick Create */}
          <Text
            style={[
              typography.label,
              {
                color: colors.onSurfaceVariant,
                marginBottom: spacing.sm,
                textTransform: "uppercase",
                letterSpacing: 0.8,
              },
            ]}>
            Category
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            style={{ flexGrow: 0 }}
            onScrollBeginDrag={() => {
              if (showKeypad) setShowKeypad(false);
            }}
            contentContainerStyle={{
              gap: spacing.sm,
              marginBottom: spacing.lg,
            }}>
            {activeCategories.map((cat) => {
              const isSelected = cat.id === categoryId;
              const catTheme = resolveCategoryColor((cat as any).color);
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => handleCategorySelect(cat.id)}
                  activeOpacity={0.75}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected
                        ? catTheme.bgColor
                        : colors.surfaceVariant,
                      borderColor: isSelected
                        ? catTheme.iconColor
                        : colors.outlineVariant,
                    },
                  ]}>
                  <Ionicons
                    name={((cat as any).icon || "pricetag") as any}
                    size={18}
                    color={catTheme.iconColor}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      typography.bodyMedium,
                      {
                        color: isSelected
                          ? catTheme.iconColor
                          : colors.onBackground,
                        fontWeight: isSelected ? "700" : "500",
                      },
                    ]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Quick "+ New" Category Chip */}
            <TouchableOpacity
              onPress={() => {
                if (showKeypad) setShowKeypad(false);
                setShowCreateCategoryModal(true);
              }}
              activeOpacity={0.75}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.primary,
                  borderStyle: "dashed",
                },
              ]}>
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={colors.primary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  typography.bodyMedium,
                  { color: colors.primary, fontWeight: "700" },
                ]}>
                New Category
              </Text>
            </TouchableOpacity>
          </ScrollView>
          {formErrors.category ? (
            <Text
              style={{
                color: colors.error,
                fontSize: 13,
                fontWeight: "600",
                marginBottom: spacing.md,
                marginLeft: 4,
              }}>
              {formErrors.category}
            </Text>
          ) : null}

          {/* Budgets (Visible by default for expenses) */}
          {Object.values(budgets).length > 0 && type !== "income" && (
            <>
              <Text
                style={[
                  typography.label,
                  {
                    color: colors.onSurfaceVariant,
                    marginBottom: spacing.sm,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                  },
                ]}>
                Budget
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                style={{ flexGrow: 0 }}
                onScrollBeginDrag={() => {
                  if (showKeypad) setShowKeypad(false);
                }}
                contentContainerStyle={{
                  gap: spacing.sm,
                  marginBottom: spacing.lg,
                }}>
                <TouchableOpacity
                  onPress={() => {
                    if (showKeypad) setShowKeypad(false);
                    setBudgetId("");
                    setManualBudgetSelected(true);
                  }}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: !budgetId
                        ? colors.primaryContainer
                        : colors.surfaceVariant,
                      borderColor: !budgetId
                        ? colors.primaryContainer
                        : colors.outlineVariant,
                    },
                  ]}>
                  <Ionicons
                    name="pie-chart-outline"
                    size={18}
                    color={
                      !budgetId
                        ? colors.onPrimaryContainer
                        : colors.onSurfaceVariant
                    }
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      typography.bodyMedium,
                      {
                        color: !budgetId
                          ? colors.onPrimaryContainer
                          : colors.onBackground,
                        fontWeight: !budgetId ? "700" : "500",
                      },
                    ]}>
                    None
                  </Text>
                </TouchableOpacity>
                {Object.values(budgets)
                  .filter((b) => !b.deleted)
                  .map((b) => {
                    const isSelected = b.id === budgetId;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        onPress={() => {
                          if (showKeypad) setShowKeypad(false);
                          setBudgetId(b.id);
                          setManualBudgetSelected(true);
                        }}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: isSelected
                              ? colors.primaryContainer
                              : colors.surfaceVariant,
                            borderColor: isSelected
                              ? colors.primaryContainer
                              : colors.outlineVariant,
                          },
                        ]}>
                        <Ionicons
                          name="pie-chart"
                          size={18}
                          color={
                            isSelected
                              ? colors.onPrimaryContainer
                              : colors.primary
                          }
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={[
                            typography.bodyMedium,
                            {
                              color: isSelected
                                ? colors.onPrimaryContainer
                                : colors.onBackground,
                              fontWeight: isSelected ? "700" : "500",
                            },
                          ]}>
                          {b.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            </>
          )}

          {/* Account / Wallet Selector - always rendered to prevent layout jump */}
          {(() => {
            const displayWallets =
              wallets.length > 0 ? wallets : walletService.getCachedWallets();
            return (
              <>
                <Text
                  style={[
                    typography.label,
                    {
                      color: colors.onSurfaceVariant,
                      marginBottom: spacing.sm,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                    },
                  ]}>
                  Account / Wallet
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  style={{ flexGrow: 0 }}
                  onScrollBeginDrag={() => {
                    if (showKeypad) setShowKeypad(false);
                  }}
                  contentContainerStyle={{
                    gap: spacing.sm,
                    marginBottom: spacing.lg,
                  }}>
                  {displayWallets.map((w) => {
                    const isSelected = w.id === accountId;
                    const isSecret = walletService.isSecretWallet(w);
                    return (
                      <TouchableOpacity
                        key={w.id}
                        onPress={() => {
                          if (showKeypad) setShowKeypad(false);
                          setAccountId(w.id);
                        }}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: isSelected
                              ? colors.primaryContainer
                              : colors.surfaceVariant,
                            borderColor: isSelected
                              ? isSecret
                                ? colors.error
                                : colors.primaryContainer
                              : isSecret
                              ? "rgba(239, 68, 68, 0.4)"
                              : colors.outlineVariant,
                            borderWidth: isSecret ? 1.5 : 1,
                          },
                        ]}>
                        <Ionicons
                          name={
                            (w.icon ||
                              (isSecret ? "lock-closed-outline" : "wallet-outline")) as any
                          }
                          size={18}
                          color={
                            isSelected
                              ? colors.onPrimaryContainer
                              : isSecret
                              ? colors.error
                              : colors.primary
                          }
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={[
                            typography.bodyMedium,
                            {
                              color: isSelected
                                ? colors.onPrimaryContainer
                                : colors.onBackground,
                              fontWeight: isSelected ? "700" : "500",
                            },
                          ]}>
                          {w.name} {isSecret ? "🔒" : ""}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {walletService.isSecretWallet(
                  displayWallets.find((w) => w.id === accountId),
                ) && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      backgroundColor: "rgba(239, 68, 68, 0.12)",
                      padding: spacing.sm,
                      borderRadius: 12,
                      marginBottom: spacing.md,
                      borderWidth: 1,
                      borderColor: "rgba(239, 68, 68, 0.25)",
                    }}>
                    <Ionicons name="lock-closed" size={16} color={colors.error} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: colors.error,
                        flex: 1,
                      }}>
                      Secret Wallet: Money added or spent here will not show up in totals unless assigned to a budget.
                    </Text>
                  </View>
                )}
              </>
            );
          })()}

          {/* Options Grouped Card */}
          <View
            onLayout={(e) => setOptionsCardY(e.nativeEvent.layout.y)}
            style={[
              styles.optionsCard,
              {
                backgroundColor: colors.surfaceVariant,
                borderColor: colors.outlineVariant,
                borderWidth: 1,
              },
            ]}>
            {/* Description */}
            <View
              style={[
                styles.optionRow,
                {
                  borderBottomColor: colors.outlineVariant,
                  borderBottomWidth: 1,
                },
              ]}>
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: colors.surface },
                ]}>
                <Ionicons
                  name="pencil-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.optionContent}>
                <TextInput
                  ref={descriptionInputRef}
                  style={[
                    typography.bodyMedium,
                    { color: colors.onBackground, padding: 0 },
                  ]}
                  placeholder="Add a description..."
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={description}
                  onFocus={() => {
                    setShowKeypad(false);
                    setIsKeypadMounted(false);
                    setAmountFocused(false);
                    scrollToDescription();
                  }}
                  onChangeText={setDescription}
                  returnKeyType={showMore ? "next" : "done"}
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    if (showMore) {
                      noteInputRef.current?.focus();
                    } else {
                      Keyboard.dismiss();
                    }
                  }}
                />
              </View>
            </View>

            {/* Date */}
            <TouchableOpacity
              style={[
                styles.optionRow,
                {
                  borderBottomColor: "transparent",
                  borderBottomWidth: 0,
                },
              ]}
              onPress={() => {
                if (showKeypad) {
                  setShowKeypad(false);
                  setAmountFocused(false);
                }
                setShowDatePicker(true);
              }}>
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: colors.surface },
                ]}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.optionContent}>
                <Text
                  style={[
                    typography.bodyMedium,
                    { color: colors.onBackground, fontWeight: "600" },
                  ]}>
                  {date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          </View>

          {/* More Options */}
          <TouchableOpacity
            style={styles.moreOptionsBtn}
            onPress={() => {
              if (showKeypad) {
                setShowKeypad(false);
                setAmountFocused(false);
              }
              setShowMore(!showMore);
            }}>
            <Text
              style={[
                typography.bodyMedium,
                {
                  color: colors.primary,
                  fontWeight: "700",
                  marginRight: 4,
                },
              ]}>
              More options
            </Text>
            <Ionicons
              name={showMore ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.primary}
            />
          </TouchableOpacity>

          {showMore && (
            <View
              onLayout={(e) => setNoteY(e.nativeEvent.layout.y)}
              style={{ gap: spacing.md, marginBottom: spacing.xl }}>
              <Input
                ref={noteInputRef}
                label="Note"
                placeholder="Additional details..."
                value={note}
                onFocus={() => {
                  setShowKeypad(false);
                  setIsKeypadMounted(false);
                  setAmountFocused(false);
                  scrollToNote();
                }}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                inputStyle={{ height: 80 }}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
            </View>
          )}
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>

        {isKeypadMounted && (
          <Animated.View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 100,
              transform: [{ translateY: keypadTranslateY }],
              opacity: keypadOpacity,
            }}>
            <CustomKeypad
              onPress={handleKeypadPress}
              onBackspace={handleKeypadBackspace}
              onClear={handleKeypadClear}
              onEvaluate={handleEvaluateExpression}
              onClose={() => setShowKeypad(false)}
              hasOperator={hasMathOperator}
            />
          </Animated.View>
        )}

        {showDatePicker && (
          <CustomDatePicker
            value={date}
            onDateChange={(d) => {
              setDate(d);
              setShowDatePicker(false);
            }}
            label="Transaction Date"
            hideTrigger
            open
            onClose={() => setShowDatePicker(false)}
          />
        )}

        <CategoryCreationModal
          visible={showCreateCategoryModal}
          onClose={() => setShowCreateCategoryModal(false)}
          onCreateCategory={handleQuickCreateCategory}
          initialData={{ name: "", type: type === "income" ? "income" : "expense" }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  segmentContainer: {
    flexDirection: "row",
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  amountSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  amountTextContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: "700",
    marginRight: 4,
  },
  amountValue: {
    fontSize: 48,
    fontWeight: "800",
  },
  voiceBtnContainer: {
    marginLeft: 16,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  optionsCard: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
    justifyContent: "center",
  },
  moreOptionsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
});

export default AddTransactionScreen;
