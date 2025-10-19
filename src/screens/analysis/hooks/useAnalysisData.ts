import { useMemo } from "react";
import { useSelector } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../../store";
import { format, parseISO, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Transaction, Category, Budget, Bill, Debt } from "../../../types";

// Stable selectors that only use memoization when actually transforming data
const selectTransactionsArray = createSelector([(state: RootState) => state.transactions.items], (items) => Object.values(items));

const selectCategoriesArray = createSelector([(state: RootState) => state.categories.items], (items) => Object.values(items));

const selectBudgetsArray = createSelector([(state: RootState) => state.budgets.items], (items) => Object.values(items));

const selectBillsArray = createSelector([(state: RootState) => state.bills.items], (items) => Object.values(items));

const selectDebtsArray = createSelector([(state: RootState) => state.debts.items], (items) => Object.values(items));

const selectDebtPaymentsArray = createSelector([(state: RootState) => state.debts.payments], (payments) => Object.values(payments));

const selectLoadingState = createSelector(
  [
    (state: RootState) => state.transactions.loading,
    (state: RootState) => state.categories.loading,
    (state: RootState) => state.budgets.loading,
    (state: RootState) => state.debts.loading,
  ],
  (transactionsLoading, categoriesLoading, budgetsLoading, debtsLoading) => transactionsLoading || categoriesLoading || budgetsLoading || debtsLoading
);

export interface AnalyticsData {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    transactionCount: number;
  };
  categoryBreakdown: {
    category: Category;
    amount: number;
    count: number;
    percentage: number;
  }[];
  monthlyTrends: {
    month: string;
    income: number;
    expenses: number;
    balance: number;
  }[];
  budgetUsage: {
    budget: Budget;
    used: number;
    percentage: number;
    status: "under" | "over" | "exact";
  }[];
  debtOverview: {
    totalDebt: number;
    totalPaid: number;
    remainingDebt: number;
    debts: {
      debt: Debt;
      totalPaid: number;
      remainingAmount: number;
    }[];
  };
  topCategories: {
    income: { category: Category; amount: number }[];
    expense: { category: Category; amount: number }[];
  };
}

export interface UseAnalysisDataOptions {
  startDate?: Date;
  endDate?: Date;
  categoryIds?: string[];
  transactionType?: "income" | "expense" | "both";
}

export const useAnalysisData = (
  options: UseAnalysisDataOptions = {}
): {
  data: AnalyticsData;
  isLoading: boolean;
  isEmpty: boolean;
} => {
  const transactions = useSelector(selectTransactionsArray);
  const categories = useSelector(selectCategoriesArray);
  const budgets = useSelector(selectBudgetsArray);
  const bills = useSelector(selectBillsArray);
  const debts = useSelector(selectDebtsArray);
  const debtPayments = useSelector(selectDebtPaymentsArray);

  const isLoading = useSelector(selectLoadingState);

  const data = useMemo(() => {
    const { startDate = subMonths(new Date(), 12), endDate = new Date(), categoryIds, transactionType = "both" } = options;

    // Filter transactions based on options
    const filteredTransactions = transactions.filter((transaction) => {
      const transactionDate = parseISO(transaction.date);

      // Date filter
      if (transactionDate < startDate || transactionDate > endDate) {
        return false;
      }

      // Category filter
      if (categoryIds && categoryIds.length > 0 && transaction.categoryId) {
        if (!categoryIds.includes(transaction.categoryId)) {
          return false;
        }
      }

      // Transaction type filter
      if (transactionType !== "both" && transaction.type !== transactionType) {
        return false;
      }

      return true;
    });

    // Create category lookup map
    const categoryMap = new Map(categories.map((cat) => [cat.id, cat]));

    // Calculate summary
    const summary = filteredTransactions.reduce(
      (acc, transaction) => {
        if (transaction.type === "income") {
          acc.totalIncome += transaction.amount;
        } else {
          acc.totalExpenses += transaction.amount;
        }
        acc.transactionCount++;
        return acc;
      },
      { totalIncome: 0, totalExpenses: 0, balance: 0, transactionCount: 0 }
    );
    summary.balance = summary.totalIncome - summary.totalExpenses;

    // Calculate category breakdown
    const categoryBreakdown = new Map<string, { amount: number; count: number }>();

    filteredTransactions.forEach((transaction) => {
      if (transaction.categoryId) {
        const existing = categoryBreakdown.get(transaction.categoryId) || { amount: 0, count: 0 };
        categoryBreakdown.set(transaction.categoryId, {
          amount: existing.amount + transaction.amount,
          count: existing.count + 1,
        });
      }
    });

    const categoryBreakdownArray = Array.from(categoryBreakdown.entries())
      .map(([categoryId, data]) => {
        const category = categoryMap.get(categoryId);
        if (!category) return null;

        const totalForType = category.type === "income" ? summary.totalIncome : summary.totalExpenses;
        return {
          category,
          amount: data.amount,
          count: data.count,
          percentage: totalForType > 0 ? (data.amount / totalForType) * 100 : 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.amount - a!.amount) as NonNullable<(typeof categoryBreakdownArray)[0]>[];

    // Calculate monthly trends (last 6 months)
    const monthlyTrends: {
      month: string;
      income: number;
      expenses: number;
      balance: number;
    }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      const monthEnd = endOfMonth(monthStart);

      const monthTransactions = filteredTransactions.filter((transaction) => {
        const date = parseISO(transaction.date);
        return date >= monthStart && date <= monthEnd;
      });

      const monthData = monthTransactions.reduce(
        (acc, transaction) => {
          if (transaction.type === "income") {
            acc.income += transaction.amount;
          } else {
            acc.expenses += transaction.amount;
          }
          return acc;
        },
        { income: 0, expenses: 0 }
      );

      monthlyTrends.push({
        month: format(monthStart, "MMM yyyy"),
        income: monthData.income,
        expenses: monthData.expenses,
        balance: monthData.income - monthData.expenses,
      });
    }

    // Calculate budget usage
    const budgetUsage = budgets
      .map((budget) => {
        const budgetTransactions = filteredTransactions.filter((transaction) => transaction.budgetId === budget.id);

        const used = budgetTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
        const percentage = budget.amount > 0 ? (used / budget.amount) * 100 : 0;

        let status: "under" | "over" | "exact" = "under";
        if (percentage > 100) status = "over";
        else if (percentage === 100) status = "exact";

        return {
          budget,
          used,
          percentage,
          status,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    // Calculate debt overview
    const debtOverview = {
      totalDebt: debts.reduce((sum, debt) => sum + (debt.totalAmount || 0), 0),
      totalPaid: 0,
      remainingDebt: 0,
      debts: debts.map((debt) => {
        const payments = debtPayments.filter((payment) => payment.debtId === debt.id);
        const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
        const remainingAmount = Math.max(0, (debt.totalAmount || 0) - totalPaid);

        return {
          debt,
          totalPaid,
          remainingAmount,
        };
      }),
    };

    debtOverview.totalPaid = debtOverview.debts.reduce((sum, item) => sum + item.totalPaid, 0);
    debtOverview.remainingDebt = debtOverview.debts.reduce((sum, item) => sum + item.remainingAmount, 0);

    // Calculate top categories
    const topCategories = {
      income: categoryBreakdownArray
        .filter((item) => item.category.type === "income")
        .slice(0, 5)
        .map((item) => ({ category: item.category, amount: item.amount })),
      expense: categoryBreakdownArray
        .filter((item) => item.category.type === "expense")
        .slice(0, 5)
        .map((item) => ({ category: item.category, amount: item.amount })),
    };

    return {
      summary,
      categoryBreakdown: categoryBreakdownArray,
      monthlyTrends,
      budgetUsage,
      debtOverview,
      topCategories,
    };
  }, [
    transactions,
    categories,
    budgets,
    bills,
    debts,
    debtPayments,
    options.startDate?.getTime(),
    options.endDate?.getTime(),
    options.categoryIds?.join(","),
    options.transactionType,
  ]);

  const isEmpty = data.summary.transactionCount === 0;

  return {
    data,
    isLoading,
    isEmpty,
  };
};
