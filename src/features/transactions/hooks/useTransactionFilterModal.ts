import { useMemo } from "react";

import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";

import { WalletAccount } from "../../../shared/types";
export type FilterPeriod =
  | "all"
  | "month"
  | "year"
  | "custom"
  | "Today"
  | "This Month"
  | "Last Month"
  | "Year"
  | "All Time";
export type FilterType =
  | "all"
  | "income"
  | "expense"
  | "transfer"
  | "All"
  | "Income"
  | "Expense"
  | "Transfer";
export interface TransactionFilterModalProps {
  visible: boolean;
  filterType: FilterType;
  filterPeriod: FilterPeriod;
  selectedCategoryIds?: Set<string>;
  selectedBudgetIds?: Set<string>;
  selectedWalletIds?: Set<string>;
  wallets?: WalletAccount[];
  onFilterTypeChange: (type: FilterType) => void;
  onFilterPeriodChange: (period: FilterPeriod) => void;
  onCategoryToggle?: (id: string) => void;
  onBudgetToggle?: (id: string) => void;
  onWalletToggle?: (id: string) => void;
  onOpenCustomDate?: () => void;
  onReset?: () => void;
  onApply?: () => void;
  onClose: () => void;
}
export function useTransactionFilterModal({
  visible,
  filterType,
  filterPeriod,
  selectedCategoryIds = new Set(),
  selectedBudgetIds = new Set(),
  selectedWalletIds = new Set(),
  wallets = [],
  onFilterTypeChange,
  onFilterPeriodChange,
  onCategoryToggle,
  onBudgetToggle,
  onWalletToggle,
  onOpenCustomDate,
  onReset,
  onApply,
  onClose,
}: TransactionFilterModalProps) {

  const { items: categoriesMap } = useSelector(
    (state: RootState) => state.categories,
  );
  const { items: budgetsMap } = useSelector(
    (state: RootState) => state.budgets,
  );

  const allCategoriesList = useMemo(
    () => Object.values(categoriesMap || {}).filter((c) => c && !c.deleted),
    [categoriesMap],
  );

  const allBudgetsList = useMemo(
    () => Object.values(budgetsMap || {}).filter((b) => b && !b.deleted),
    [budgetsMap],
  );

  const DATE_OPTIONS = [
    { label: "Today", value: "Today" },
    { label: "This Month", value: "This Month" },
    { label: "Last Month", value: "Last Month" },
    { label: "Year", value: "Year" },
    { label: "All Time", value: "All Time" },
  ] as const;
  return { allCategoriesList, allBudgetsList, DATE_OPTIONS };
}

export type TransactionFilterModalController = ReturnType<typeof useTransactionFilterModal>;
