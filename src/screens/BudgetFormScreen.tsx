import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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
    radius,
    currencySymbol,
    resolveCategoryColor,
  } = useAppTheme();
  const { showSuccess, showError } = useToast();

  const { budgetId } = (route.params as { budgetId?: string }) || {};
  const budget = useSelector((state: RootState) =>
    budgetId && state.budgets ? state.budgets.items[budgetId] : null,
  );
  const categoriesMap = useSelector(
    (state: RootState) => state.categories.items,
  );
  const expenseCategories = Object.values(categoriesMap).filter(
    (c) => !c.deleted && c.type === "expense",
  );

  const [amountStr, setAmountStr] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [period, setPeriod] = useState<"weekly" | "monthly">("monthly");
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
      setCategoryId(budget.categoryId);
      setPeriod(budget.period || "monthly");
      setAlertsEnabled(budget.alertsEnabled ?? true);
    }
  }, [budget]);

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
      categoryId: categoryId || undefined,
      period,
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
      navigation.goBack();
    } catch (error) {
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
              navigation.goBack();
            } catch (e) {
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
          {/* Segmented Control matching AddTransactionScreen */}
          <View
            style={[
              styles.segmentContainer,
              {
                backgroundColor: colors.surfaceVariant,
                borderRadius: radius.pill,
                marginBottom: spacing.xl,
              },
            ]}>
            {(
              [
                { key: "monthly", label: "Monthly" },
                { key: "weekly", label: "Weekly" },
              ] as const
            ).map((p) => {
              const isActive = period === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[
                    styles.segmentButton,
                    {
                      borderRadius: radius.pill,
                      backgroundColor: isActive
                        ? colors.surface
                        : "transparent",
                    },
                  ]}
                  onPress={() => setPeriod(p.key)}>
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
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

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
            <Text
              style={[
                typography.bodySmall,
                { color: colors.onSurfaceVariant, marginTop: 4, opacity: 0.7 },
              ]}>
              {period === "weekly"
                ? "Resets every Monday"
                : "Resets on the 1st of every month"}
            </Text>
            {formErrors.amount ? (
              <Text style={styles.errorText}>{formErrors.amount}</Text>
            ) : null}
          </View>

          {/* Categories — Color-coded chips matching AddTransactionScreen */}
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
            {/* All / General chip */}
            <TouchableOpacity
              onPress={() => setCategoryId(undefined)}
              activeOpacity={0.75}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: !categoryId
                    ? colors.primaryContainer
                    : colors.surfaceVariant,
                  borderColor: !categoryId
                    ? colors.primaryContainer
                    : colors.outlineVariant,
                },
              ]}>
              <Ionicons
                name="apps-outline"
                size={18}
                color={
                  !categoryId
                    ? colors.onPrimaryContainer
                    : colors.onSurfaceVariant
                }
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  typography.bodyMedium,
                  {
                    color: !categoryId
                      ? colors.onPrimaryContainer
                      : colors.onBackground,
                    fontWeight: !categoryId ? "700" : "500",
                  },
                ]}>
                All / General
              </Text>
            </TouchableOpacity>

            {/* Expense categories */}
            {expenseCategories.map((cat) => {
              const isSelected = categoryId === cat.id;
              const catTheme = resolveCategoryColor((cat as any).color);
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => {
                    setCategoryId(cat.id);
                    if (!name.trim()) {
                      setName(cat.name);
                    }
                  }}
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
          </ScrollView>

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
                  placeholder="Budget Name (e.g. Groceries)"
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (formErrors.name) {
                      setFormErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
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
    textAlign: "center",
    minWidth: 150,
    padding: 0,
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
