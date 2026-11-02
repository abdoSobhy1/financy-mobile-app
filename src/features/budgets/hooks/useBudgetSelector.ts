import { useEffect } from "react";

import { getLastUsedBudgetId, setLastUsedBudgetId } from "../../settings/utils/userPreferences";
interface Budget {
  id: string;
  name: string;
  amount: number;
  categoryId?: string;
}
interface BudgetSelectorProps {
  budgets: Budget[];
  selectedBudgetId?: string;
  onBudgetSelect: (budgetId: string | undefined) => void;
  label?: string;
  error?: string;
  rememberLastUsed?: boolean;
}
export function useBudgetSelector({
  budgets,
  selectedBudgetId,
  onBudgetSelect,
  label = "Budget",
  error,
  rememberLastUsed = false,
}: BudgetSelectorProps) {

  useEffect(() => {
    if (rememberLastUsed && !selectedBudgetId && budgets.length > 0) {
      loadLastUsedBudget();
    }
  }, [rememberLastUsed, selectedBudgetId, budgets.length]);

  const loadLastUsedBudget = async () => {
    try {
      const lastUsedId = await getLastUsedBudgetId();
      if (lastUsedId && budgets.some((budget) => budget.id === lastUsedId)) {
        onBudgetSelect(lastUsedId);
      }
    } catch (error) {
      console.warn("Failed to load last used budget:", error);
    }
  };

  const handleBudgetSelect = async (budgetId: string) => {
    if (selectedBudgetId === budgetId) {
      onBudgetSelect(undefined);
      if (rememberLastUsed) await setLastUsedBudgetId(null);
    } else {
      onBudgetSelect(budgetId);
      if (rememberLastUsed) await setLastUsedBudgetId(budgetId);
    }
  };
  return { handleBudgetSelect };
}
