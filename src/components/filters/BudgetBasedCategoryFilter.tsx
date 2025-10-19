import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { Budget, Category, Transaction } from "../../types";
import { UI } from "../../constants";
import { FilterButton } from "./FilterButton";

interface BudgetBasedCategoryFilterProps {
  selectedBudgetId?: string;
  selectedCategoryIds: string[];
  onBudgetSelect: (budgetId: string | undefined) => void;
  onCategorySelect: (categoryId: string) => void;
  onCategoryDeselect: (categoryId: string) => void;
  showAllCategories?: boolean;
}

export const BudgetBasedCategoryFilter: React.FC<BudgetBasedCategoryFilterProps> = ({
  selectedBudgetId,
  selectedCategoryIds,
  onBudgetSelect,
  onCategorySelect,
  onCategoryDeselect,
  showAllCategories = false,
}) => {
  const { items: budgets } = useSelector((state: RootState) => state.budgets);
  const { items: categories } = useSelector((state: RootState) => state.categories);
  const { items: transactions } = useSelector((state: RootState) => state.transactions);

  // Convert budgets and categories from Record to Array for easier processing
  const budgetList = useMemo(() => {
    return Object.values(budgets).filter((budget) => budget && budget.id);
  }, [budgets]);

  const categoryList = useMemo(() => {
    return Object.values(categories).filter((category) => category && category.id);
  }, [categories]);

  const transactionList = useMemo(() => {
    return Object.values(transactions).filter((transaction) => transaction && transaction.id);
  }, [transactions]);

  // Get categories for selected budget based on transactions
  const availableCategories = useMemo(() => {
    if (!selectedBudgetId || showAllCategories) {
      return categoryList;
    }

    // Find categories used in transactions for this budget
    const budgetTransactions = transactionList.filter((t) => t.budgetId === selectedBudgetId);
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
    const budgetTransactions = transactionList.filter((t) => t.budgetId === budgetId);
    const categoryIds = new Set(budgetTransactions.map((t) => t.categoryId));
    return categoryIds.size;
  };

  return (
    <View style={styles.container}>
      {/* Budget Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Filter by Budget</Text>
        <View style={styles.filterGroup}>
          <FilterButton label="All Budgets" isActive={!selectedBudgetId} onPress={() => onBudgetSelect(undefined)} count={categoryList.length} />
          {budgetList.map((budget) => (
            <FilterButton
              key={budget.id}
              label={budget.name}
              isActive={selectedBudgetId === budget.id}
              onPress={() => onBudgetSelect(budget.id)}
              count={getCategoryCount(budget.id)}
              color={undefined}
            />
          ))}
        </View>
      </View>

      {/* Category Selection */}
      {availableCategories.length > 0 && (
        <View style={styles.section}>
          <View style={styles.categoryHeader}>
            <Text style={styles.sectionTitle}>
              Categories
              {selectedBudgetId && <Text style={styles.budgetIndicator}> in {budgets[selectedBudgetId]?.name}</Text>}
            </Text>
            <Text style={styles.categoryCount}>
              {selectedCategoryIds.length} of {availableCategories.length} selected
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScrollContainer}>
            <View style={styles.filterGroup}>
              {availableCategories.map((category) => (
                <FilterButton
                  key={category.id}
                  label={category.name}
                  isActive={selectedCategoryIds.includes(category.id)}
                  onPress={() => handleCategoryToggle(category.id)}
                  color={category.color}
                  icon={undefined}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Empty State */}
      {availableCategories.length === 0 && selectedBudgetId && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No categories found for selected budget</Text>
          <Text style={styles.emptyStateSubtext}>Try selecting a different budget or add categories to this budget</Text>
        </View>
      )}

      {/* Selection Summary */}
      {selectedCategoryIds.length > 0 && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            Filtering by {selectedCategoryIds.length} {selectedCategoryIds.length === 1 ? "category" : "categories"}
            {selectedBudgetId && <Text style={styles.budgetSummary}> from {budgets[selectedBudgetId]?.name}</Text>}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: UI.SPACING.LG,
  },
  section: {
    marginBottom: UI.SPACING.LG,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.MD,
  },
  filterGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: UI.SPACING.SM,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: UI.SPACING.MD,
  },
  budgetIndicator: {
    fontSize: 14,
    fontWeight: "400",
    color: UI.COLORS.TEXT_SECONDARY,
  },
  categoryCount: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
    fontWeight: "500",
  },
  categoryScrollContainer: {
    paddingHorizontal: 0,
  },
  emptyState: {
    padding: UI.SPACING.LG,
    alignItems: "center",
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: UI.CARD_RADIUS,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "500",
    color: UI.COLORS.TEXT_SECONDARY,
    textAlign: "center",
    marginBottom: UI.SPACING.SM,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: UI.COLORS.TEXT_MUTED,
    textAlign: "center",
  },
  summaryContainer: {
    padding: UI.SPACING.MD,
    backgroundColor: UI.COLORS.PRIMARY + "20",
    borderRadius: UI.CARD_RADIUS,
    borderWidth: 1,
    borderColor: UI.COLORS.PRIMARY + "40",
  },
  summaryText: {
    fontSize: 14,
    fontWeight: "500",
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center",
  },
  budgetSummary: {
    fontWeight: "600",
    color: UI.COLORS.PRIMARY,
  },
});
