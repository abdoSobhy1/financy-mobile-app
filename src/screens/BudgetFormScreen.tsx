import React, { useState, useEffect } from "react";
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
import { Switch } from "../components/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme, resolveCategoryColor } from "../components/ui/ThemeProvider";
import { AppDispatch, RootState } from "../store";
import { addBudget, updateBudget } from "../store/slices/budgetsSlice";
import { BudgetStackParamList } from "../types";

type NavigationProp = StackNavigationProp<BudgetStackParamList, "BudgetForm">;
type RouteParam = RouteProp<BudgetStackParamList, "BudgetForm">;

const BudgetFormScreen: React.FC = () => {
  const route = useRoute<RouteParam>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { colors, typography, spacing, radius, currencySymbol, isDark } = useAppTheme();

  const { budgetId } = (route.params as { budgetId?: string }) || {};
  const budget = useSelector((state: RootState) =>
    budgetId && state.budgets ? state.budgets.items[budgetId] : null
  );
  const categoriesMap = useSelector((state: RootState) => state.categories.items);
  const expenseCategories = Object.values(categoriesMap).filter(
    (c) => !c.deleted && c.type === "expense"
  );

  const [amountStr, setAmountStr] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [period, setPeriod] = useState<"weekly" | "monthly">("monthly");
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  useEffect(() => {
    if (budget) {
      setAmountStr(budget.amount.toString());
      setName(budget.name);
      setCategoryId(budget.categoryId);
      setPeriod(budget.period || "monthly");
      setAlertsEnabled(budget.alertsEnabled ?? true);
    }
  }, [budget]);

  const handleSave = async () => {
    const amount = Number(amountStr);
    if (!amount || isNaN(amount)) {
      alert("Please enter a valid amount");
      return;
    }
    if (!name.trim()) {
      alert("Please enter a budget name");
      return;
    }

    const budgetData = {
      name: name.trim(),
      amount: amount.toString(),
      categoryId,
      period,
      resetDay: 1, // Monthly default
      alertsEnabled,
    };

    try {
      if (budget) {
        await dispatch(updateBudget({ id: budget.id, updates: budgetData })).unwrap();
      } else {
        await dispatch(addBudget(budgetData)).unwrap();
      }
      navigation.goBack();
    } catch (error) {
      console.error(error);
      alert("Failed to save budget");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.onBackground} />
          </TouchableOpacity>
          <Text style={[typography.h2, { color: colors.onBackground }]}>
            {budget ? "Edit Budget" : "New Budget"}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
          
          {/* Amount Input */}
          <View style={styles.amountContainer}>
            <Text style={[styles.currencySymbol, { color: colors.onSurfaceVariant }]}>
              {currencySymbol}
            </Text>
            <TextInput
              style={[styles.amountInput, { color: amountStr ? colors.onBackground : colors.onSurfaceVariant }]}
              placeholder="0.00"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="decimal-pad"
              value={amountStr}
              onChangeText={setAmountStr}
              autoFocus={!budget}
            />
          </View>

          {/* Name Input */}
          <View
            style={[
              styles.inputCard,
              {
                backgroundColor: colors.surfaceVariant,
                borderColor: colors.outlineVariant,
                borderRadius: radius.lg,
                marginBottom: spacing.xl,
              },
            ]}
          >
            <TextInput
              style={[typography.bodyMedium, { color: colors.onBackground, padding: spacing.md, textAlign: "center" }]}
              placeholder="Budget Name (e.g. Groceries)"
              placeholderTextColor={colors.onSurfaceVariant}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Linked Category Section */}
          <Text style={[styles.sectionTitle, typography.label, { color: colors.onSurfaceVariant }]}>
            LINKED CATEGORY (OPTIONAL)
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, marginBottom: 32 }}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                {
                  backgroundColor: !categoryId ? colors.primary : colors.surfaceVariant,
                  borderColor: !categoryId ? colors.primary : colors.outlineVariant,
                },
              ]}
              onPress={() => setCategoryId(undefined)}
            >
              <Ionicons
                name="apps-outline"
                size={16}
                color={!categoryId ? colors.onPrimary : colors.onSurfaceVariant}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  typography.bodySmall,
                  {
                    color: !categoryId ? colors.onPrimary : colors.onBackground,
                    fontWeight: !categoryId ? "700" : "500",
                  },
                ]}
              >
                All / General
              </Text>
            </TouchableOpacity>

            {expenseCategories.map((cat) => {
              const selected = categoryId === cat.id;
              const resolved = resolveCategoryColor(cat.color, isDark);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: selected ? resolved.fg : colors.surfaceVariant,
                      borderColor: selected ? resolved.fg : colors.outlineVariant,
                    },
                  ]}
                  onPress={() => {
                    setCategoryId(cat.id);
                    if (!name.trim()) {
                      setName(cat.name);
                    }
                  }}
                >
                  <Ionicons
                    name={(cat.icon as any) || "pricetag-outline"}
                    size={16}
                    color={selected ? "#0C0E12" : resolved.fg}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      typography.bodySmall,
                      {
                        color: selected ? "#0C0E12" : colors.onBackground,
                        fontWeight: selected ? "700" : "500",
                      },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Time Period Section */}
          <Text style={[styles.sectionTitle, typography.label, { color: colors.onSurfaceVariant }]}>
            TIME PERIOD
          </Text>
          <View style={styles.periodRow}>
            <TouchableOpacity
              style={[
                styles.periodCard,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: period === "weekly" ? colors.primary : colors.outlineVariant,
                },
              ]}
              onPress={() => setPeriod("weekly")}
            >
              <Text style={[typography.bodyLarge, { color: colors.onBackground, fontWeight: "600", marginBottom: 4 }]}>
                Weekly
              </Text>
              <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>Reset every Mon</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.periodCard,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: period === "monthly" ? colors.primary : colors.outlineVariant,
                },
              ]}
              onPress={() => setPeriod("monthly")}
            >
              <Text style={[typography.bodyLarge, { color: colors.onBackground, fontWeight: "600", marginBottom: 4 }]}>
                Monthly
              </Text>
              <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>Reset 1st of month</Text>
            </TouchableOpacity>
          </View>

          {/* Alerts Toggle */}
          <View style={[styles.alertsCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.outlineVariant, borderWidth: 1 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyLarge, { color: colors.onBackground, fontWeight: "500", marginBottom: 4 }]}>
                Overspending Alerts
              </Text>
              <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>Notify when 80% reached</Text>
            </View>
            <Switch
              value={alertsEnabled}
              onValueChange={setAlertsEnabled}
            />
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <Text style={[typography.bodyLarge, { color: colors.onPrimary, fontWeight: "700" }]}>
              {budget ? "Update Budget" : "Create Budget"}
            </Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 32,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: "600",
    marginRight: 8,
  },
  amountInput: {
    fontSize: 56,
    fontWeight: "700",
    textAlign: "center",
    minWidth: 150,
  },
  inputCard: {
    marginBottom: 32,
    borderWidth: 1,
  },
  sectionTitle: {
    letterSpacing: 1,
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  periodRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  periodCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  alertsCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 32,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  saveButton: {
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
  },
});

export default BudgetFormScreen;
