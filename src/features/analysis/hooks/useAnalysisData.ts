import { useMemo, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../../app/store";
import { format, parseISO, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Transaction, Category, Budget, Debt, DebtPayment } from "../../../shared/types";
import { addMoney, subtractMoney, sumMoney } from "../../../shared/utils";
import { walletService } from "../../wallets/services/walletService";

const EMPTY_RECORD: Record<string, never> = {};

// Stable selectors that only use memoization when actually transforming data
const selectTransactionsArray = createSelector(
  [(state: RootState) => state.transactions?.items || EMPTY_RECORD],
  (items): Transaction[] => Object.values(items || {})
);

const selectCategoriesArray = createSelector(
  [(state: RootState) => state.categories?.items || EMPTY_RECORD],
  (items): Category[] => Object.values(items || {})
);

const selectBudgetsArray = createSelector(
  [(state: RootState) => state.budgets?.items || EMPTY_RECORD],
  (items): Budget[] => Object.values(items || {})
);

const selectDebtsArray = createSelector(
  [(state: RootState) => state.debts?.items || EMPTY_RECORD],
  (items): Debt[] => Object.values(items || {})
);

const selectDebtPaymentsArray = createSelector(
  [(state: RootState) => state.debts?.payments || EMPTY_RECORD],
  (payments): DebtPayment[] => Object.values(payments || {})
);

const selectLoadingState = createSelector(
  [
    (state: RootState) => (state.transactions ? state.transactions.loading : false),
    (state: RootState) => (state.categories ? state.categories.loading : false),
    (state: RootState) => (state.budgets ? state.budgets.loading : false),
    (state: RootState) => (state.debts ? state.debts.loading : false),
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
  walletIds?: string[];
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
  const debts = useSelector(selectDebtsArray);
  const debtPayments = useSelector(selectDebtPaymentsArray);

  const isLoading = useSelector(selectLoadingState);
  const [secretWalletIds, setSecretWalletIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    walletService
      .getWallets()
      .then((wallets) => setSecretWalletIds(walletService.getSecretWalletIds(wallets)))
      .catch(() => {});
  }, []);

  const data = useMemo(() => {
    const {
      startDate = subMonths(new Date(), 12),
      endDate = new Date(),
      categoryIds,
      walletIds,
      transactionType = "both",
    } = options;

    // Filter transactions based on options
    const filteredTransactions = transactions.filter((transaction) => {
      // Exclude secret wallet transactions from analysis totals (unless they had a budget)
      if (walletService.isSecretTransactionExcluded(transaction, secretWalletIds)) {
        return false;
      }

      const transactionDate = parseISO(transaction.date);

      // Exclude transfers and balance adjustments from income/expense analysis
      if (
        transaction.type === "transfer" ||
        transaction.description === "Balance adjustment"
      ) {
        return false;
      }

      // Wallet filter
      if (walletIds && walletIds.length > 0) {
        const matches =
          (transaction.accountId && walletIds.includes(transaction.accountId)) ||
          (transaction.toAccountId && walletIds.includes(transaction.toAccountId));
        if (!matches) {
          return false;
        }
      }

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
    const totalIncome = sumMoney(
      filteredTransactions.filter((t) => t.type === "income"),
      (t) => t.amount,
    );
    const totalExpenses = sumMoney(
      filteredTransactions.filter((t) => t.type === "expense"),
      (t) => t.amount,
    );
    const summary = {
      totalIncome,
      totalExpenses,
      balance: subtractMoney(totalIncome, totalExpenses),
      transactionCount: filteredTransactions.length,
    };

    // Calculate category breakdown
    const categoryBreakdown = new Map<string, { amount: number; count: number }>();

    filteredTransactions.forEach((transaction) => {
      if (transaction.categoryId) {
        const existing = categoryBreakdown.get(transaction.categoryId) || { amount: 0, count: 0 };
        categoryBreakdown.set(transaction.categoryId, {
          amount: addMoney(existing.amount, transaction.amount),
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
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.amount - a.amount);

    // Filter for trends: ignore startDate/endDate, but keep other filters
    const trendTransactions = transactions.filter((transaction) => {
      if (walletService.isSecretTransactionExcluded(transaction, secretWalletIds)) return false;
      if (
        transaction.type === "transfer" ||
        transaction.description === "Balance adjustment"
      ) {
        return false;
      }
      if (categoryIds && categoryIds.length > 0 && transaction.categoryId) {
        if (!categoryIds.includes(transaction.categoryId)) return false;
      }
      if (walletIds && walletIds.length > 0) {
        const matches =
          (transaction.accountId && walletIds.includes(transaction.accountId)) ||
          (transaction.toAccountId && walletIds.includes(transaction.toAccountId));
        if (!matches) return false;
      }
      if (transactionType !== "both" && transaction.type !== transactionType) {
        return false;
      }
      return true;
    });

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

      const monthTransactions = trendTransactions.filter((transaction) => {
        const date = parseISO(transaction.date);
        return date >= monthStart && date <= monthEnd;
      });

      const monthIncome = sumMoney(
        monthTransactions.filter((t) => t.type === "income"),
        (t) => t.amount,
      );
      const monthExpenses = sumMoney(
        monthTransactions.filter((t) => t.type === "expense"),
        (t) => t.amount,
      );

      monthlyTrends.push({
        month: format(monthStart, "MMM yyyy"),
        income: monthIncome,
        expenses: monthExpenses,
        balance: subtractMoney(monthIncome, monthExpenses),
      });
    }

    // Calculate budget usage
    const budgetUsage = budgets
      .map((budget) => {
        const budgetTransactions = filteredTransactions.filter((transaction) => transaction.budgetId === budget.id);

        const used = sumMoney(budgetTransactions, (transaction) => transaction.amount);
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
    const debtItems = debts.map((debt) => {
      const payments = debtPayments.filter((payment) => payment.debtId === debt.id);
      const totalPaid = sumMoney(payments, (payment) => payment.amount);
      const remainingAmount = Math.max(0, subtractMoney(debt.totalAmount || 0, totalPaid));

      return {
        debt,
        totalPaid,
        remainingAmount,
      };
    });

    const debtOverview = {
      totalDebt: sumMoney(debts, (debt) => debt.totalAmount || 0),
      totalPaid: sumMoney(debtItems, (item) => item.totalPaid),
      remainingDebt: sumMoney(debtItems, (item) => item.remainingAmount),
      debts: debtItems,
    };

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
    debts,
    debtPayments,
    secretWalletIds,
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
