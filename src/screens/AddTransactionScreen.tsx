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
import { Button, Input, Modal, CustomDatePicker } from "../components/ui";
import { IconChip } from "../components/ui/IconChip";
import { VoiceInputButton, ParsedTransactionReview } from "../components/input";

type NavigationProp = StackNavigationProp<TransactionStackParamList, "AddTransaction">;
type RouteParam = RouteProp<TransactionStackParamList, "AddTransaction">;

export const AddTransactionScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParam>();
  const params = route.params as any;
  const editTransaction = params?.editTransaction;
  const initialCategoryId = params?.categoryId;
  const autoFocusAmount = params?.autoFocusAmount;

  const dispatch = useDispatch<AppDispatch>();
  const { colors, typography, spacing, radius } = useAppTheme();

  const { items: categories } = useSelector((state: RootState) => state.categories);
  const { items: budgets } = useSelector((state: RootState) => state.budgets);
  const { loading } = useSelector((state: RootState) => state.transactions);

  const amountInputRef = useRef<TextInput>(null);

  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [categoryId, setCategoryId] = useState<string>("");
  const [budgetId, setBudgetId] = useState<string>("");
  const [manualBudgetSelected, setManualBudgetSelected] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState<Date>(new Date());

  const [voiceResults, setVoiceResults] = useState<any[]>([]);
  const [showVoiceReview, setShowVoiceReview] = useState(false);
  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchBudgets());

    if (editTransaction) {
      setAmount(editTransaction.amount.toString());
      setType(editTransaction.type);
      setCategoryId(editTransaction.categoryId || "");
      setBudgetId(editTransaction.budgetId || "");
      setDescription(editTransaction.description || "");
      setNote(editTransaction.note || "");
      setDate(new Date(editTransaction.date));
    } else if (initialCategoryId) {
      setCategoryId(initialCategoryId);
    }
  }, [editTransaction, initialCategoryId, dispatch]);

  useEffect(() => {
    if (autoFocusAmount && amountInputRef.current) {
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
    }
  }, [autoFocusAmount]);

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
    if (!amount || isNaN(Number(amount))) {
      alert("Please enter a valid amount");
      return;
    }
    if (!categoryId) {
      alert("Please select a category");
      return;
    }

    const transactionData: TransactionFormData = {
      amount: amount,
      type,
      categoryId,
      budgetId: budgetId || undefined,
      description,
      note,
      date,
    };

    try {
      if (editTransaction) {
        await dispatch(updateTransaction({ id: editTransaction.id, updates: transactionData })).unwrap();
      } else {
        await dispatch(addTransaction(transactionData)).unwrap();
      }
      navigation.goBack();
    } catch (error) {
      console.error(error);
      alert("Failed to save transaction");
    }
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

  const activeCategories = Object.values(categories).filter(c => c.type === type && !c.deleted);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>

          {/* Voice Input */}
          {!editTransaction && (
            <VoiceInputButton 
              variant="button" 
              title="Add with Voice"
              onResult={handleVoiceResult} 
              style={{ marginBottom: spacing.md }}
            />
          )}

          {/* Amount Input */}
          <View style={{ alignItems: "center", marginBottom: spacing.xl, marginTop: spacing.xs }}>
            <TextInput
              ref={amountInputRef}
              style={[
                typography.h1,
                {
                  fontSize: 64,
                  lineHeight: 72,
                  color: colors.onBackground,
                  textAlign: "center",
                  minWidth: 150,
                },
              ]}
              placeholder="0.00"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              autoFocus={autoFocusAmount}
            />
          </View>

          {/* Segmented Control */}
          <View style={{ flexDirection: "row", backgroundColor: colors.surfaceVariant, borderRadius: radius.pill, padding: spacing.xs, marginBottom: spacing.xl }}>
            {["expense", "income"].map((t) => {
              const isActive = type === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.sm,
                    alignItems: "center",
                    backgroundColor: isActive ? colors.surface : "transparent",
                    borderRadius: radius.pill,
                    ... (isActive ? {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 2,
                    } : {})
                  }}
                  onPress={() => setType(t as TransactionType)}>
                  <Text style={[typography.bodyMedium, { color: isActive ? colors.primary : colors.onSurfaceVariant, fontWeight: isActive ? "600" : "400", textTransform: "capitalize" }]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Category Selector */}
          <Text style={[typography.label, { color: colors.onBackground, marginBottom: spacing.md }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, marginBottom: spacing.xl }}>
            {activeCategories.map(cat => {
              const isSelected = cat.id === categoryId;
              return (
                <TouchableOpacity key={cat.id} onPress={() => handleCategorySelect(cat.id)} style={{ alignItems: "center", width: 70 }}>
                  <View style={[
                    { padding: spacing.xs, borderRadius: radius.pill, borderWidth: 2, borderColor: isSelected ? colors.primary : "transparent" }
                  ]}>
                    <IconChip iconName={((cat as any).icon) || "help"} colorName="bluegrey" size={56} />
                  </View>
                  <Text style={[typography.bodySmall, { color: colors.onBackground, marginTop: spacing.xs, textAlign: "center" }]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Budget Selector */}
          {Object.values(budgets).length > 0 && (
            <>
              <Text style={[typography.label, { color: colors.onBackground, marginBottom: spacing.md }]}>Budget</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, marginBottom: spacing.xl }}>
                {Object.values(budgets).map(b => {
                  const isSelected = b.id === budgetId;
                  return (
                    <TouchableOpacity key={b.id} onPress={() => handleBudgetSelect(b.id)} style={{ alignItems: "center", width: 70 }}>
                      <View style={[
                        { padding: spacing.xs, borderRadius: radius.pill, borderWidth: 2, borderColor: isSelected ? colors.primary : "transparent" }
                      ]}>
                        <IconChip iconName="pie-chart" colorName="teal" size={56} />
                      </View>
                      <Text style={[typography.bodySmall, { color: colors.onBackground, marginTop: spacing.xs, textAlign: "center" }]} numberOfLines={1}>
                        {b.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* More Options */}
          {!showMore && (
            <Button
              title="More Options"
              variant="secondary"
              onPress={() => setShowMore(true)}
              style={{ marginBottom: spacing.xl }}
            />
          )}

          {showMore && (
            <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
              <CustomDatePicker
                value={date}
                onDateChange={setDate}
                label="Transaction Date"
              />
              <Input
                label="Description"
                placeholder="What was this for?"
                value={description}
                onChangeText={setDescription}
              />
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

          {/* Action Buttons */}
          <View style={{ flexDirection: "row", gap: spacing.md, marginTop: "auto" }}>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => navigation.goBack()}
              style={{ flex: 1 }}
            />
            <Button
              title="Save"
              variant="primary"
              onPress={handleSave}
              loading={loading}
              style={{ flex: 1 }}
            />
          </View>
        </ScrollView>
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

export default AddTransactionScreen;
