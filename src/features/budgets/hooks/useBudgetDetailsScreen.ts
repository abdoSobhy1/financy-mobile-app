import { Alert } from "react-native";
import { deleteBudget } from "../store/budgetsSlice";
import { percentage, getDateRangeForBillingPeriod } from "../../../shared/utils";
import { useMemo } from "react";

import { useDispatch, useSelector } from "react-redux";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootState, AppDispatch } from "../../../app/store";
import { startOfWeek, endOfWeek } from "date-fns";
import { BudgetStackParamList } from "../../../shared/types";

export function useBudgetDetailsScreen() {

  const route = useRoute<RouteProp<BudgetStackParamList, "BudgetDetails">>();
  const navigation = useNavigation<StackNavigationProp<BudgetStackParamList, "BudgetDetails">>();
  const dispatch = useDispatch<AppDispatch>();

  const { budgetId } = route.params;
  const budget = useSelector((state: RootState) => state.budgets.items[budgetId]);
  const transactions = useSelector((state: RootState) => state.transactions.items);
  const categoriesMap = useSelector((state: RootState) => state.categories.items);
  const settingsData = useSelector((state: RootState) => state.settings.data);

  const periodRange = useMemo(() => {
    if (budget?.period === "weekly") {
      return {
        start: startOfWeek(new Date(), { weekStartsOn: 1 }),
        end: endOfWeek(new Date(), { weekStartsOn: 1 }),
      };
    }
    const startDay = settingsData?.billingPeriodStartDay ?? 1;
    return getDateRangeForBillingPeriod(startDay);
  }, [budget?.period, settingsData?.billingPeriodStartDay]);

  const budgetTransactions = useMemo(() => {
    if (!budget) return [];
    const startMs = periodRange.start.getTime();
    const endMs = periodRange.end.getTime();
    return Object.values(transactions)
      .filter((tx) => {
        if (tx.deleted || tx.type !== "expense") return false;
        const txMs = new Date(tx.date).getTime();
        if (txMs < startMs || txMs > endMs) return false;
        if (tx.budgetId === budgetId) return true;
        if (budget.categoryId && tx.categoryId === budget.categoryId) return true;
        return false;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, budget, budgetId, periodRange]);
  const spent = budgetTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const remaining = (budget?.amount ?? 0) - spent;
  const progressPercentage = percentage(spent, budget?.amount ?? 0);
  const isOver = spent > (budget?.amount ?? 0);
  const daysLeft = Math.max(1, Math.ceil((periodRange.end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const safeDaily = Math.max(0, remaining / daysLeft);
  const category = budget?.categoryId ? categoriesMap[budget.categoryId] : null;
  const handleDelete = () => {
    if (!budget) return;
    Alert.alert(
      "Delete Budget",
      `Are you sure you want to delete "${budget.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await dispatch(deleteBudget(budget.id));
            navigation.goBack();
          },
        },
      ]
    );
  };
  return { navigation, budgetId, budget, categoriesMap, periodRange, budgetTransactions, spent, remaining, progressPercentage, isOver, daysLeft, safeDaily, category, handleDelete };
}

export type BudgetDetailsScreenController = ReturnType<typeof useBudgetDetailsScreen>;
