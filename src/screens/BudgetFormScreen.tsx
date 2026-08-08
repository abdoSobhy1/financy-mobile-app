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
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { AppDispatch, RootState } from "../store";
import { addBudget, updateBudget } from "../store/slices/budgetsSlice";
import { fetchCategories } from "../store/slices/categoriesSlice";
import { BudgetStackParamList } from "../types";

type NavigationProp = StackNavigationProp<BudgetStackParamList, "BudgetForm">;
type RouteParam = RouteProp<BudgetStackParamList, "BudgetForm">;

const BudgetFormScreen: React.FC = () => {
  const route = useRoute<RouteParam>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { colors, typography, spacing, radius } = useAppTheme();

  const { budgetId } = (route.params as { budgetId?: string }) || {};
  const budget = useSelector((state: RootState) =>
    budgetId && state.budgets ? state.budgets.items[budgetId] : null
  );
  const { items: categories } = useSelector((state: RootState) => state.categories);

  const [amountStr, setAmountStr] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [period, setPeriod] = useState<"weekly" | "monthly">("monthly");
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  useEffect(() => {
    dispatch(fetchCategories());
    if (budget) {
      setAmountStr(budget.amount.toString());
      setName(budget.name);
      setCategoryId(budget.categoryId || "");
    }
  }, [budget, dispatch]);

  const activeCategories = Object.values(categories).filter(
    (c) => c && c.type === "expense" && !c.deleted
  );

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
    if (!categoryId) {
      alert("Please select a category");
      return;
    }

    const budgetData = {
      name: name.trim(),
      amount: amount.toString(),
      resetDay: 1, // Monthly default
      categoryId,
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
          <View style={{ width: 40 }} /> {/* Placeholder for balance */}
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
          
          {/* Amount Input */}
          <View style={styles.amountContainer}>
            <Text style={[styles.currencySymbol, { color: colors.onSurfaceVariant }]}>$</Text>
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
          <View style={[styles.inputCard, { backgroundColor: colors.surfaceVariant, borderRadius: radius.lg }]}>
            <TextInput
              style={[typography.bodyMedium, { color: colors.onBackground, padding: spacing.md, textAlign: "center" }]}
              placeholder="Budget Name (e.g. Groceries)"
              placeholderTextColor={colors.onSurfaceVariant}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Category Section */}
          <Text style={[styles.sectionTitle, typography.label, { color: colors.onSurfaceVariant }]}>
            CATEGORY
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, marginBottom: spacing.xl }}>
            {activeCategories.map((cat) => {
              const isSelected = cat.id === categoryId;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setCategoryId(cat.id)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderColor: isSelected ? colors.primary : "transparent",
                    },
                  ]}
                >
                  <Ionicons name={((cat as any).icon) || "pricetag"} size={20} color={colors.onBackground} style={{ marginRight: 8 }} />
                  <Text style={[typography.bodyMedium, { color: colors.onBackground, fontWeight: isSelected ? "700" : "500" }]}>
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
                  borderColor: period === "weekly" ? colors.primary : "transparent",
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
                  borderColor: period === "monthly" ? colors.primary : "transparent",
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
          <View style={[styles.alertsCard, { backgroundColor: colors.surfaceVariant }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyLarge, { color: colors.onBackground, fontWeight: "500", marginBottom: 4 }]}>
                Overspending Alerts
              </Text>
              <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>Notify when 80% reached</Text>
            </View>
            <Switch
              value={alertsEnabled}
              onValueChange={setAlertsEnabled}
              trackColor={{ false: colors.outlineVariant, true: colors.primary }}
              thumbColor={colors.onPrimary}
            />
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primaryContainer }]}
            onPress={handleSave}
          >
            <Text style={[typography.bodyLarge, { color: colors.onPrimaryContainer, fontWeight: "700" }]}>
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
    borderColor: "rgba(255,255,255,0.05)",
  },
  sectionTitle: {
    letterSpacing: 1,
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
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
