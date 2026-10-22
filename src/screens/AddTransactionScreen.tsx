import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
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
  RecurringFrequency,
  TransactionFormData,
  TransactionStackParamList,
  TransactionType,
  WalletAccount,
} from "../types";
import { useAppTheme } from "../components/ui/ThemeProvider";
import {
  Input,
  CustomDatePicker,
  CustomKeypad,
  CategoryCreationModal,
  useToast,
} from "../components/ui";
import { ParsedTransactionReview } from "../components/input";
import { formatCurrency } from "../utils";
import { walletService } from "../services/walletService";
import { recurringService } from "../services/recurringService";

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
  const [wallets, setWallets] = useState<WalletAccount[]>([]);
  const [receiptUri, setReceiptUri] = useState<string>("");
  const [receiptName, setReceiptName] = useState<string>("");
  const [makeRecurring, setMakeRecurring] = useState<boolean>(false);
  const [recurringFrequency, setRecurringFrequency] =
    useState<RecurringFrequency>("monthly");
  const [manualBudgetSelected, setManualBudgetSelected] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showKeypad, setShowKeypad] = useState<boolean>(!editTransaction);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);

  const [voiceResults, setVoiceResults] = useState<any[]>([]);
  const [showVoiceReview, setShowVoiceReview] = useState(false);

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchBudgets());
    walletService.getWallets().then(setWallets).catch(() => {});

    if (editTransaction) {
      setAmountStr(editTransaction.amount.toString());
      setType(editTransaction.type);
      setCategoryId(editTransaction.categoryId || "");
      setBudgetId(editTransaction.budgetId || "");
      setAccountId(editTransaction.accountId || "default_cash");
      if (editTransaction.receiptUri) {
        setReceiptUri(editTransaction.receiptUri);
        setReceiptName(
          editTransaction.receiptUri.split("/").pop() || "Attached Receipt",
        );
      }
      setDescription(editTransaction.description || "");
      setNote(editTransaction.note || "");
      setDate(new Date(editTransaction.date));
      setShowKeypad(false);
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
    setCategoryId(id);
  };

  const hasMathOperator = /[+\-*/×÷]/.test(amountStr.slice(1));
  const evaluatedAmount = evaluateMath(amountStr);

  const handleKeypadPress = (key: string) => {
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
      setCategoryId(created.id);
      setShowCreateCategoryModal(false);
      showSuccess(`Created "${created.name}"`);
    } catch (e) {
      showError("Could not create category");
    }
  };

  const handleAttachReceipt = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf", "text/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setReceiptUri(asset.uri);
      setReceiptName(asset.name || "Receipt Attachment");

      // Smart Receipt Scanner: attempt to extract total/amount & merchant from text or filename
      let scannedText = asset.name || "";
      if (
        asset.mimeType?.startsWith("text/") ||
        asset.name?.toLowerCase().endsWith(".txt")
      ) {
        try {
          const content = await FileSystem.readAsStringAsync(asset.uri);
          if (content) scannedText += "\n" + content;
        } catch {}
      }

      const amountMatch = scannedText.match(
        /(?:total|amount|egp|usd|\$|ج\.م)?\s*(\d{1,6}(?:\.\d{1,2})?)/i,
      );
      if (amountMatch && amountMatch[1] && !amountStr) {
        const parsedVal = parseFloat(amountMatch[1]);
        if (parsedVal > 0 && parsedVal < 1000000) {
          setAmountStr(parsedVal.toString());
        }
      }

      if (!description && asset.name) {
        const cleanTitle = asset.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[_-]+/g, " ")
          .trim();
        if (cleanTitle) {
          setDescription(cleanTitle);
        }
      }

      showSuccess("Receipt attached");
    } catch (error) {
      console.warn("Receipt picker failed:", error);
      showError("Could not attach receipt");
    }
  };

  const handleSave = async () => {
    const finalAmount = evaluateMath(amountStr);
    if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) {
      showError("Please enter a valid amount");
      return;
    }
    if (!categoryId) {
      showError("Please select or create a category");
      return;
    }

    const finalDescription =
      description.trim() ? description : categories[categoryId]?.name || "";

    const transactionData: TransactionFormData = {
      amount: finalAmount.toString(),
      type,
      categoryId,
      budgetId: budgetId || undefined,
      accountId: accountId || "default_cash",
      receiptUri: receiptUri || undefined,
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

        if (makeRecurring) {
          const nextDue = new Date(date);
          if (recurringFrequency === "daily") nextDue.setDate(nextDue.getDate() + 1);
          else if (recurringFrequency === "weekly") nextDue.setDate(nextDue.getDate() + 7);
          else if (recurringFrequency === "monthly") nextDue.setMonth(nextDue.getMonth() + 1);
          else if (recurringFrequency === "yearly") nextDue.setFullYear(nextDue.getFullYear() + 1);

          await recurringService.addRecurring({
            title: finalDescription || "Recurring Transaction",
            amount: finalAmount,
            type,
            categoryId,
            budgetId: budgetId || undefined,
            accountId: accountId || "default_cash",
            frequency: recurringFrequency,
            nextDueDate: nextDue.toISOString(),
            autoLog: true,
          });
        }

        await Promise.all([
          AsyncStorage.setItem(LAST_CATEGORY_KEY, categoryId),
          AsyncStorage.setItem(LAST_ACCOUNT_KEY, accountId || "default_cash"),
          budgetId
            ? AsyncStorage.setItem(LAST_BUDGET_KEY, budgetId)
            : AsyncStorage.removeItem(LAST_BUDGET_KEY),
        ]).catch(() => {});
      }
      navigation.goBack();
    } catch (error) {
      console.error(error);
      showError("Failed to save transaction");
    }
  };

  const handleAcceptVoiceResults = async (accepted: any[]) => {
    try {
      for (const t of accepted) {
        await dispatch(addTransaction(t)).unwrap();
      }
      setShowVoiceReview(false);
      setVoiceResults([]);
      navigation.goBack();
    } catch (error) {
      console.error(error);
      showError("Failed to save voice transactions");
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
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: colors.surfaceVariant },
            ]}
            onPress={() => navigation.goBack()}>
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
            onPress={handleSave}>
            <Ionicons
              name="checkmark"
              size={24}
              color={colors.onPrimaryContainer}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: spacing.xxl,
          }}
          keyboardShouldPersistTaps="handled">
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
                  onPress={() => setType(t as TransactionType)}>
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
            activeOpacity={0.9}
            style={styles.amountSection}
            onPress={() => {
              Keyboard.dismiss();
              setShowKeypad(true);
            }}>
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.onSurfaceVariant, marginBottom: 6 },
              ]}>
              Amount
            </Text>
            <View style={styles.amountRow}>
              <View style={styles.amountTextContainer}>
                <Text
                  style={[
                    styles.currencySymbol,
                    { color: colors.onSurfaceVariant },
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
              </View>
              {!editTransaction && (
                <View style={styles.voiceBtnContainer}>
                  <TouchableOpacity
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: colors.primaryContainer,
                    }}
                    onPress={() => navigation.navigate("VoiceInput")}>
                    <Ionicons
                      name="mic"
                      size={24}
                      color={colors.onPrimaryContainer}
                    />
                  </TouchableOpacity>
                </View>
              )}
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
                  ? "Use calculator pad below (+, -, ×, ÷)"
                  : "Tap amount to open calculator pad"}
              </Text>
            )}
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
              onPress={() => setShowCreateCategoryModal(true)}
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
                contentContainerStyle={{
                  gap: spacing.sm,
                  marginBottom: spacing.lg,
                }}>
                <TouchableOpacity
                  onPress={() => {
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

          {/* Account / Wallet Selector */}
          {wallets.length > 0 && (
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
                contentContainerStyle={{
                  gap: spacing.sm,
                  marginBottom: spacing.lg,
                }}>
                {wallets.map((w) => {
                  const isSelected = w.id === accountId;
                  return (
                    <TouchableOpacity
                      key={w.id}
                      onPress={() => setAccountId(w.id)}
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
                        name={(w.icon || "wallet-outline") as any}
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
                        {w.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* Options Grouped Card */}
          <View
            style={[
              styles.optionsCard,
              {
                backgroundColor: colors.surfaceVariant,
                borderColor: colors.outlineVariant,
                borderWidth: 1,
              },
            ]}>
            {/* Date */}
            <TouchableOpacity
              style={[
                styles.optionRow,
                {
                  borderBottomColor: colors.outlineVariant,
                  borderBottomWidth: 1,
                },
              ]}
              onPress={() => setShowDatePicker(true)}>
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
                  style={[
                    typography.bodyMedium,
                    { color: colors.onBackground, padding: 0 },
                  ]}
                  placeholder="Add a description..."
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={description}
                  onFocus={() => setShowKeypad(false)}
                  onChangeText={setDescription}
                />
              </View>
            </View>

            {/* Receipt Attachment / Smart Scanner */}
            <TouchableOpacity
              style={[
                styles.optionRow,
                { borderBottomColor: "transparent", borderBottomWidth: 0 },
              ]}
              onPress={handleAttachReceipt}>
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: colors.surface },
                ]}>
                <Ionicons
                  name={receiptUri ? "document-attach" : "camera-outline"}
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.optionContent}>
                <Text
                  style={[
                    typography.bodyMedium,
                    {
                      color: receiptUri
                        ? colors.primary
                        : colors.onSurfaceVariant,
                      fontWeight: receiptUri ? "700" : "500",
                    },
                  ]}
                  numberOfLines={1}>
                  {receiptUri
                    ? receiptName || "Receipt Attached"
                    : "Attach or Scan Receipt (Image / PDF / Text)"}
                </Text>
              </View>
              {receiptUri ? (
                <TouchableOpacity
                  onPress={() => {
                    setReceiptUri("");
                    setReceiptName("");
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={colors.error}
                  />
                </TouchableOpacity>
              ) : (
                <Ionicons
                  name="attach-outline"
                  size={20}
                  color={colors.onSurfaceVariant}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Receipt Image Thumbnail Preview if image attached */}
          {receiptUri &&
            /\.(jpg|jpeg|png|webp|gif)$/i.test(receiptName || receiptUri) && (
              <View
                style={{
                  marginBottom: spacing.lg,
                  borderRadius: 16,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: colors.outlineVariant,
                }}>
                <Image
                  source={{ uri: receiptUri }}
                  style={{ width: "100%", height: 140 }}
                  resizeMode="cover"
                />
              </View>
            )}

          {/* More Options */}
          <TouchableOpacity
            style={styles.moreOptionsBtn}
            onPress={() => setShowMore(!showMore)}>
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
            <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
              {!editTransaction && (
                <View
                  style={{
                    backgroundColor: colors.surfaceVariant,
                    borderRadius: 20,
                    padding: spacing.md,
                  }}>
                  <TouchableOpacity
                    onPress={() => setMakeRecurring(!makeRecurring)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}>
                      <Ionicons
                        name="repeat-outline"
                        size={20}
                        color={colors.primary}
                      />
                      <View>
                        <Text
                          style={[
                            typography.bodyMedium,
                            { color: colors.onBackground, fontWeight: "700" },
                          ]}>
                          Repeat Recurring Transaction
                        </Text>
                        <Text
                          style={[
                            typography.bodySmall,
                            { color: colors.onSurfaceVariant },
                          ]}>
                          Auto-log this {type} on schedule
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name={makeRecurring ? "checkbox" : "square-outline"}
                      size={22}
                      color={
                        makeRecurring
                          ? colors.primary
                          : colors.onSurfaceVariant
                      }
                    />
                  </TouchableOpacity>

                  {makeRecurring && (
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 8,
                        marginTop: spacing.md,
                      }}>
                      {(
                        ["daily", "weekly", "monthly", "yearly"] as RecurringFrequency[]
                      ).map((freq) => {
                        const active = recurringFrequency === freq;
                        return (
                          <TouchableOpacity
                            key={freq}
                            onPress={() => setRecurringFrequency(freq)}
                            style={{
                              flex: 1,
                              paddingVertical: 8,
                              borderRadius: 12,
                              alignItems: "center",
                              backgroundColor: active
                                ? colors.primary
                                : colors.surface,
                            }}>
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "700",
                                textTransform: "capitalize",
                                color: active ? "#FFFFFF" : colors.onBackground,
                              }}>
                              {freq}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              <Input
                label="Note"
                placeholder="Additional details..."
                value={note}
                onFocus={() => setShowKeypad(false)}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                inputStyle={{ height: 80 }}
              />
            </View>
          )}
        </ScrollView>

        {showKeypad && (
          <CustomKeypad
            onPress={handleKeypadPress}
            onBackspace={handleKeypadBackspace}
            onClear={handleKeypadClear}
            onEvaluate={handleEvaluateExpression}
            onSubmit={handleSave}
            hasOperator={hasMathOperator}
          />
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
          initialData={{ name: "", type }}
        />
      </KeyboardAvoidingView>

      {/* Voice Review Modal */}
      {voiceResults.length > 0 && (
        <ParsedTransactionReview
          parsed={voiceResults}
          visible={showVoiceReview}
          onAccept={handleAcceptVoiceResults}
          onDismiss={() => {
            setShowVoiceReview(false);
            setVoiceResults([]);
          }}
        />
      )}
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
