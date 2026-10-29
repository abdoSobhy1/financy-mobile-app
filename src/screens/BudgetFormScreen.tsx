import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { Switch, useToast } from "../components/ui";
import { AppDispatch, RootState } from "../store";
import {
  addBudget,
  updateBudget,
  deleteBudget,
} from "../store/slices/budgetsSlice";
import { BudgetStackParamList } from "../types";
import { AlertService } from "../services/AlertService";
import { useUnsavedChanges } from "../hooks";

type NavigationProp = StackNavigationProp<BudgetStackParamList, "BudgetForm">;
type RouteParam = RouteProp<BudgetStackParamList, "BudgetForm">;

const BudgetFormScreen: React.FC = () => {
  const route = useRoute<RouteParam>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const {
    colors,
    typography,
    spacing,
    currencySymbol,
  } = useAppTheme();
  const { showSuccess, showError } = useToast();

  const { budgetId } = (route.params as { budgetId?: string }) || {};
  const budget = useSelector((state: RootState) =>
    budgetId && state.budgets ? state.budgets.items[budgetId] : null,
  );

  const [amountStr, setAmountStr] = useState("");
  const [name, setName] = useState("");
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [formErrors, setFormErrors] = useState<{
    amount?: string;
    name?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const amountInputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (budget) {
      setAmountStr(budget.amount.toString());
      setName(budget.name);
      setAlertsEnabled(budget.alertsEnabled ?? true);
    }
  }, [budget]);

  const hasChanges = useMemo(() => {
    if (budget) {
      const origAmount = budget.amount?.toString() || "";
      const origName = budget.name || "";
      const origAlerts = budget.alertsEnabled ?? true;

      return (
        amountStr !== origAmount ||
        name !== origName ||
        alertsEnabled !== origAlerts
      );
    } else {
      return (
        amountStr.trim() !== "" ||
        name.trim() !== "" ||
        !alertsEnabled
      );
    }
  }, [budget, amountStr, name, alertsEnabled]);

  const { markAsSaved, resetSaved } = useUnsavedChanges({
    hasChanges,
    isEditing: !!budget,
  });

  const validate = (): boolean => {
    const newErrors: { amount?: string; name?: string } = {};
    const num = Number(amountStr.replace(/,/g, ""));
    if (!amountStr.trim() || isNaN(num) || num <= 0) {
      newErrors.amount = "Please enter a valid amount greater than 0";
    }
    if (!name.trim()) {
      newErrors.name = "Please enter a budget name";
    }

    setFormErrors(newErrors);
    if (newErrors.amount) {
      showError(newErrors.amount);
      return false;
    }
    if (newErrors.name) {
      showError(newErrors.name);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const num = Number(amountStr.replace(/,/g, ""));
    const budgetData = {
      name: name.trim(),
      amount: num.toString(),
      categoryId: undefined,
      period: "monthly" as const,
      resetDay: 1,
      alertsEnabled,
    };

    try {
      setLoading(true);
      if (budget) {
        await dispatch(
          updateBudget({ id: budget.id, updates: budgetData }),
        ).unwrap();
        showSuccess("Budget updated successfully!");
      } else {
        await dispatch(addBudget(budgetData)).unwrap();
        showSuccess("Budget created successfully!");
      }
      markAsSaved();
      navigation.goBack();
    } catch (error) {
      resetSaved();
      console.error(error);
      showError("Failed to save budget");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!budget) return;
    AlertService.alert(
      "Delete Budget",
      `Are you sure you want to delete "${budget.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await dispatch(deleteBudget(budget.id)).unwrap();
              showSuccess("Budget deleted successfully!");
              markAsSaved();
              navigation.goBack();
            } catch (e) {
              resetSaved();
              showError("Failed to delete budget");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Custom Top Bar matching AddTransactionScreen */}
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
            {budget ? "Edit Budget" : "New Budget"}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            {budget && (
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  { backgroundColor: "rgba(239, 68, 68, 0.12)" },
                ]}
                onPress={handleDelete}
                disabled={loading}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: colors.primaryContainer },
              ]}
              onPress={handleSave}
              disabled={loading}>
              <Ionicons
                name="checkmark"
                size={24}
                color={colors.onPrimaryContainer}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: spacing.xxl,
          }}
          keyboardShouldPersistTaps="handled">
          {/* Amount Section — Tactile Display */}
          <View style={styles.amountSection}>
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.onSurfaceVariant, marginBottom: 6 },
              ]}>
              Budget Limit
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
                <TextInput
                  ref={amountInputRef}
                  style={[
                    styles.amountValue,
                    {
                      color: amountStr
                        ? colors.onBackground
                        : colors.onSurfaceVariant,
                    },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={colors.onSurfaceVariant}
                  keyboardType="decimal-pad"
                  value={amountStr}
                  onChangeText={(val) => {
                    setAmountStr(val);
                    if (formErrors.amount) {
                      setFormErrors((prev) => ({ ...prev, amount: undefined }));
                    }
                  }}
                  autoFocus={!budget}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => nameInputRef.current?.focus()}
                />
              </View>
            </View>
            {formErrors.amount ? (
              <Text style={styles.errorText}>{formErrors.amount}</Text>
            ) : null}
          </View>

          {/* Options Grouped Card matching AddTransactionScreen */}
          <View
            style={[
              styles.optionsCard,
              {
                backgroundColor: colors.surfaceVariant,
                borderColor: colors.outlineVariant,
                borderWidth: 1,
              },
            ]}>
            {/* Budget Name */}
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
                  ref={nameInputRef}
                  style={[
                    typography.bodyMedium,
                    { color: colors.onBackground, padding: 0 },
                  ]}
                  placeholder="Budget Name (e.g. Monthly Budget)"
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (formErrors.name) {
                      setFormErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>
            </View>

            {/* Overspending Alerts */}
            <View
              style={[
                styles.optionRow,
                {
                  borderBottomColor: "transparent",
                  borderBottomWidth: 0,
                },
              ]}>
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: colors.surface },
                ]}>
                <Ionicons
                  name="notifications-outline"
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
                  Overspending Alerts
                </Text>
                <Text
                  style={[
                    typography.bodySmall,
                    { color: colors.onSurfaceVariant, marginTop: 2 },
                  ]}>
                  Notify when 80% reached
                </Text>
              </View>
              <Switch
                value={alertsEnabled}
                onValueChange={setAlertsEnabled}
              />
            </View>
          </View>
          {formErrors.name ? (
            <Text
              style={[
                styles.errorText,
                {
                  marginTop: -16,
                  marginBottom: spacing.lg,
                  marginLeft: 8,
                  textAlign: "left",
                },
              ]}>
              {formErrors.name}
            </Text>
          ) : null}

          {/* Action Button at bottom */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: colors.primaryContainer,
                opacity: loading ? 0.7 : 1,
              },
            ]}
            onPress={handleSave}
            disabled={loading}>
            <Text
              style={[
                typography.bodyLarge,
                { color: colors.onPrimaryContainer, fontWeight: "700" },
              ]}>
              {loading
                ? "Saving..."
                : budget
                ? "Update Budget"
                : "Create Budget"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
  amountSection: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 28,
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
    textAlign: "center",
    minWidth: 150,
    padding: 0,
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
  submitButton: {
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 8,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },
});

export default BudgetFormScreen;
