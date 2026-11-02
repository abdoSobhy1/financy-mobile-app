import { useEffect, useState } from "react";

import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootState, AppDispatch } from "../../../app/store";
import { fetchBudgets } from "../store/budgetsSlice";
import { fetchTransactions } from "../../transactions/store/transactionsSlice";
import { fetchCategories } from "../../categories/store/categoriesSlice";
import { getCurrentBillingPeriod } from "../utils/billingPeriod";
import { getDateRangeForBillingPeriod, percentage } from "../../../shared/utils";
import { startOfWeek, endOfWeek } from "date-fns";
import { BudgetStackParamList } from "../../../shared/types";
type BudgetListNavigationProp = StackNavigationProp<
  BudgetStackParamList,
  "BudgetList"
>;
export function useBudgetListScreen() {

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<BudgetListNavigationProp>();

  const [refreshing, setRefreshing] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [budgetProgressMap, setBudgetProgressMap] = useState<
    Record<string, { spent: number; remaining: number; percentageUsed: number; }>
  >({});

  const { items: budgets, ids, loading: budgetsLoading } = useSelector((state: RootState) => state.budgets);
  const { items: transactions } = useSelector((state: RootState) => state.transactions);
  const { items: categoriesMap } = useSelector((state: RootState) => state.categories);
  const settingsData = useSelector((state: RootState) => state.settings.data);

  useEffect(() => {
    loadData();
  }, [dispatch, Object.keys(budgets).length, Object.keys(transactions).length]);

  const loadData = async () => {
    try {
      await dispatch(fetchBudgets()).unwrap();
      await dispatch(fetchTransactions()).unwrap();
      await dispatch(fetchCategories()).unwrap();

      setProgressLoaded(false);
      let start: Date;
      let end: Date;

      if (settingsData && typeof settingsData.billingPeriodStartDay === "number") {
        const range = getDateRangeForBillingPeriod(settingsData.billingPeriodStartDay);
        start = range.start;
        end = range.end;
      } else {
        const range = await getCurrentBillingPeriod();
        start = range.start;
        end = range.end;
      }

      const queriesModule = await import("../../../infrastructure/database/repositories");
      const fetchedBudgets = await dispatch(fetchBudgets()).unwrap();

      const promises = (fetchedBudgets || []).map(async (b: any) => {
        try {
          const isWeekly = b.period === "weekly";
          const bStart = isWeekly ? startOfWeek(new Date(), { weekStartsOn: 1 }) : start;
          const bEnd = isWeekly ? endOfWeek(new Date(), { weekStartsOn: 1 }) : end;
          const progress = await queriesModule.db.budgets.getBudgetProgressForPeriod(
            b.id,
            bStart.toISOString(),
            bEnd.toISOString(),
          );
          return { id: b.id, progress };
        } catch (err) {
          return { id: b.id, progress: null };
        }
      });

      const results = await Promise.all(promises);
      const map: Record<string, { spent: number; remaining: number; percentageUsed: number; }> = {};
      results.forEach((r: any) => {
        if (r.progress) {
          map[r.id] = {
            spent: r.progress.spent,
            remaining: r.progress.remaining,
            percentageUsed: r.progress.percentageUsed,
          };
        }
      });
      setBudgetProgressMap(map);
      setProgressLoaded(true);
    } catch (error) {
      console.error("Failed to load budget data", error);
      setProgressLoaded(true);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalBudget = ids.reduce((sum, id) => sum + (budgets[id]?.amount || 0), 0);
  const totalSpent = progressLoaded
    ? ids.reduce((sum, id) => {
      const p = budgetProgressMap[id];
      return sum + (p ? p.spent : 0);
    }, 0)
    : 0;

  const totalRemaining = totalBudget - totalSpent;
  const totalProgressPercentage = totalBudget > 0 ? percentage(totalSpent, totalBudget) : 0;
  const isTotalOver = totalSpent > totalBudget;
  return { navigation, refreshing, progressLoaded, budgetProgressMap, budgets, ids, budgetsLoading, categoriesMap, handleRefresh, totalBudget, totalSpent, totalRemaining, totalProgressPercentage, isTotalOver };
}
