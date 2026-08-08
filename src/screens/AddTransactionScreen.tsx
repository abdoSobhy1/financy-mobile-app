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
} from "react-native";
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
import { fetchCategories } from "../store/slices/categoriesSlice";
import { fetchBudgets } from "../store/slices/budgetsSlice";
import { findMatchingBudgetForCategory } from "../utils/budgetMatching";
import {
  TransactionFormData,
  TransactionStackParamList,
  TransactionType,
} from "../types";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { Input, CustomDatePicker } from "../components/ui";
import { IconChip } from "../components/ui/IconChip";
import { ParsedTransactionReview } from "../components/input";
import { CustomKeypad } from "../components/ui/CustomKeypad";

type NavigationProp = StackNavigationProp<
  TransactionStackParamList,
  "AddTransaction"
>;
type RouteParam = RouteProp<TransactionStackParamList, "AddTransaction">;

const evaluateMath = (expr: string): number => {
  try {
    const sanitized = expr.replace(/[^-()\d/*+.]/g, "");
    if (!sanitized) return 0;
    // eslint-disable-next-line no-new-func
    return Number(new Function("return " + sanitized)());
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
  const { colors, typography, spacing, radius } = useAppTheme();

  const { items: categories } = useSelector(
    (state: RootState) => state.categories,
  );
  const { items: budgets } = useSelector((state: RootState) => state.budgets);

  const [amountStr, setAmountStr] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [categoryId, setCategoryId] = useState<string>("");
  const [budgetId, setBudgetId] = useState<string>("");
  const [manualBudgetSelected, setManualBudgetSelected] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [voiceResults, setVoiceResults] = useState<any[]>([]);
  const [showVoiceReview, setShowVoiceReview] = useState(false);

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchBudgets());

    if (editTransaction) {
      setAmountStr(editTransaction.amount.toString());
      setType(editTransaction.type);
      setCategoryId(editTransaction.categoryId || "");
      setBudgetId(editTransaction.budgetId || "");
      setDescription(editTransaction.description || "");
      setNote(editTransaction.note || "");
      setDate(new Date(editTransaction.date));
    } else if (prefilledData) {
      if (prefilledData.amount) setAmountStr(prefilledData.amount.toString());
      if (prefilledData.type) setType(prefilledData.type);
      if (prefilledData.categoryId) setCategoryId(prefilledData.categoryId);
      if (prefilledData.description) setDescription(prefilledData.description);
      if (prefilledData.note) setNote(prefilledData.note);
      if (prefilledData.date) setDate(new Date(prefilledData.date));
    } else if (initialCategoryId) {
      setCategoryId(initialCategoryId);
    }
  }, [editTransaction, prefilledData, initialCategoryId, dispatch]);

  const handleCategorySelect = (id: string) => {
    setCategoryId(id);
    if (!manualBudgetSelected) {
      const matched = findMatchingBudgetForCategory(budgets, id);
      if (matched) {
        setBudgetId(matched.id);
      } else {
        setBudgetId("");
      }
    }
  };

  const handleBudgetSelect = (id: string) => {
    setBudgetId(id);
    setManualBudgetSelected(true);
  };

  const handleSave = async () => {
    const finalAmount = evaluateMath(amountStr);
    if (!finalAmount || isNaN(finalAmount)) {
      alert("Please enter a valid amount");
      return;
    }
    if (!categoryId) {
      alert("Please select a category");
      return;
    }

    const transactionData: TransactionFormData = {
      amount: finalAmount.toString(),
      type,
      categoryId,
      budgetId: budgetId || undefined,
      description,
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
      }
      navigation.goBack();
    } catch (error) {
      console.error(error);
      alert("Failed to save transaction");
    }
  };

  const handleKeypadPress = (key: string) => {
    setAmountStr((prev) => prev + key);
  };

  const handleBackspace = () => {
    setAmountStr((prev) => prev.slice(0, -1));
  };

  const handleVoiceResult = (results: any[]) => {
    setVoiceResults(results);
    setShowVoiceReview(true);
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
      alert("Failed to save voice transactions");
    }
  };

  const activeCategories = Object.values(categories).filter(
    (c) => c && c.type === type && !c.deleted,
  );
  const selectedBudget = budgetId ? budgets[budgetId] : null;

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
          }}>
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

          {/* Amount Section */}
          <View style={styles.amountSection}>
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.onSurfaceVariant, marginBottom: 8 },
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
                  $
                </Text>
                <Text
                  style={[
                    styles.amountValue,
                    { color: colors.onPrimaryContainer },
                  ]}>
                  {amountStr || "0.00"}
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
                    <Ionicons name="mic" size={24} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: spacing.md,
              marginBottom: spacing.xl,
            }}>
            {activeCategories.map((cat) => {
              const isSelected = cat.id === categoryId;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => handleCategorySelect(cat.id)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderColor: isSelected ? colors.primary : "transparent",
                    },
                  ]}>
                  <Ionicons
                    name={(cat as any).icon || "pricetag"}
                    size={20}
                    color={colors.onBackground}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      typography.bodyMedium,
                      {
                        color: colors.onBackground,
                        fontWeight: isSelected ? "700" : "500",
                      },
                    ]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Options Grouped Card */}
          <View
            style={[
              styles.optionsCard,
              { backgroundColor: colors.surfaceVariant },
            ]}>
            {/* Budget */}
            {Object.values(budgets).length > 0 && (
              <TouchableOpacity
                style={[
                  styles.optionRow,
                  {
                    borderBottomColor: colors.outlineVariant,
                    borderBottomWidth: 1,
                  },
                ]}
                onPress={() => {}}>
                <View
                  style={[
                    styles.optionIcon,
                    { backgroundColor: "rgba(128, 203, 196, 0.15)" },
                  ]}>
                  <Ionicons
                    name="pie-chart-outline"
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
                    {selectedBudget ? selectedBudget.name : "Select Budget"}
                  </Text>
                  {selectedBudget && (
                    <Text
                      style={[
                        typography.bodySmall,
                        { color: colors.onSurfaceVariant },
                      ]}>
                      Remaining: ${selectedBudget.amount}
                    </Text>
                  )}
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            )}

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
                  { backgroundColor: "rgba(255, 255, 255, 0.05)" },
                ]}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.onSurfaceVariant}
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
            </TouchableOpacity>

            {/* Description */}
            <View
              style={[
                styles.optionRow,
                { borderBottomColor: "transparent", borderBottomWidth: 0 },
              ]}>
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: "rgba(255, 255, 255, 0.05)" },
                ]}>
                <Ionicons
                  name="pencil-outline"
                  size={20}
                  color={colors.onSurfaceVariant}
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
                  onChangeText={setDescription}
                />
              </View>
            </View>
          </View>

          {/* More Options */}
          <TouchableOpacity
            style={styles.moreOptionsBtn}
            onPress={() => setShowMore(!showMore)}>
            <Text
              style={[
                typography.bodyMedium,
                {
                  color: colors.primaryContainer,
                  fontWeight: "700",
                  marginRight: 4,
                },
              ]}>
              More options
            </Text>
            <Ionicons
              name={showMore ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.primaryContainer}
            />
          </TouchableOpacity>

          {showMore && (
            <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
              <Input
                label="Note"
                placeholder="Additional details..."
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                inputStyle={{ height: 80 }}
              />
            </View>
          )}
        </ScrollView>

        {showDatePicker && (
          <CustomDatePicker
            value={date}
            onDateChange={(d) => {
              setDate(d);
              setShowDatePicker(false);
            }}
            label="Transaction Date"
          />
        )}

        {/* Custom Keypad pinned to bottom */}
        <CustomKeypad
          onPress={handleKeypadPress}
          onBackspace={handleBackspace}
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
    marginBottom: 32,
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
