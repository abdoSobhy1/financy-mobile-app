import { useEffect, useMemo, useRef, useState } from "react";
import { TextInput } from "react-native";

import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useDispatch, useSelector } from "react-redux";

import { AppDispatch, RootState } from "../../../app/store";
import { useUnsavedChanges } from "../../../shared/hooks";
import { AlertService } from "../../../shared/services/AlertService";
import { BudgetStackParamList } from "../../../shared/types";
import { useToast } from "../../../shared/ui";
import { addBudget, deleteBudget, updateBudget } from "../store/budgetsSlice";

type NavigationProp = StackNavigationProp<BudgetStackParamList, "BudgetForm">;

type RouteParam = RouteProp<BudgetStackParamList, "BudgetForm">;

/** Owns screen state and actions; rendering stays in BudgetFormScreen. */
export function useBudgetFormScreen() {

  const route = useRoute<RouteParam>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { showSuccess, showError } = useToast();

  const { budgetId } = (route.params as { budgetId?: string; }) || {};
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
    const newErrors: { amount?: string; name?: string; } = {};
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
  return {
    navigation,
    budget,
    amountStr,
    setAmountStr,
    name,
    setName,
    alertsEnabled,
    setAlertsEnabled,
    formErrors,
    setFormErrors,
    loading,
    amountInputRef,
    nameInputRef,
    handleSave,
    handleDelete
  };
}
