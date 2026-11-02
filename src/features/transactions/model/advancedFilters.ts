export interface AdvancedFilters {
  dateRange?: { start: Date; end: Date };
  transactionTypes: string[];
  budgetId?: string;
  noBudget?: boolean;
  categoryIds: string[];
  amountRange?: { min?: number; max?: number };
  searchText?: string;
  excludeZeroAmounts: boolean;
  onlyRecentTransactions: boolean;
}
