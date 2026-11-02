import { useMemo } from "react";

import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";

interface BudgetBasedCategoryFilterProps {
  selectedBudgetId?: string;
  selectedCategoryIds: string[];
  noBudget?: boolean;
  onBudgetSelect: (budgetId: string | undefined) => void;
  onCategorySelect: (categoryId: string) => void;
  onCategoryDeselect: (categoryId: string) => void;
  onNoBudgetToggle?: (value: boolean) => void;
  showAllCategories?: boolean;
}
export function useBudgetBasedCategoryFilter({
  selectedBudgetId,
  selectedCategoryIds,
  noBudget = false,
  onBudgetSelect,
  onCategorySelect,
  onCategoryDeselect,
  onNoBudgetToggle,
  showAllCategories = false,
}: BudgetBasedCategoryFilterProps) {

  const { items: budgets } = useSelector((state: RootState) => state.budgets);
  const { items: categories } = useSelector(
    (state: RootState) => state.categories,
  );
  const { items: transactions } = useSelector(
    (state: RootState) => state.transactions,
  );

  // Convert budgets and categories from Record to Array for easier processing
  const budgetList = useMemo(() => {
    return Object.values(budgets).filter((budget) => budget && budget.id);
  }, [budgets]);

  const categoryList = useMemo(() => {
    return Object.values(categories).filter(
      (category) => category && category.id,
    );
  }, [categories]);

  const transactionList = useMemo(() => {
    return Object.values(transactions).filter(
      (transaction) => transaction && transaction.id,
    );
  }, [transactions]);

  // Get categories for selected budget based on transactions
  const availableCategories = useMemo(() => {
    if (!selectedBudgetId || showAllCategories) {
      return categoryList;
    }

    // Find categories used in transactions for this budget
    const budgetTransactions = transactionList.filter(
      (t) => t.budgetId === selectedBudgetId,
    );
    const categoryIds = new Set(budgetTransactions.map((t) => t.categoryId));

    return categoryList.filter((category) => categoryIds.has(category.id));
  }, [selectedBudgetId, categoryList, transactionList, showAllCategories]);

  const handleCategoryToggle = (categoryId: string) => {
    if (selectedCategoryIds.includes(categoryId)) {
      onCategoryDeselect(categoryId);
    } else {
      onCategorySelect(categoryId);
    }
  };

  const getCategoryCount = (budgetId: string) => {
    // Count categories used in transactions for this budget
    const budgetTransactions = transactionList.filter(
      (t) => t.budgetId === budgetId,
    );
    const categoryIds = new Set(budgetTransactions.map((t) => t.categoryId));
    return categoryIds.size;
  };
  return { budgets, budgetList, categoryList, availableCategories, handleCategoryToggle, getCategoryCount };
}
