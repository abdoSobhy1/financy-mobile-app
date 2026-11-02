import { useBudgetBasedCategoryFilter } from "../../hooks/useBudgetBasedCategoryFilter";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import { UI } from "../../../../shared/constants";
import { FilterButton } from "../../../../shared/ui/FilterButton";

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

export const BudgetBasedCategoryFilter: React.FC<
  BudgetBasedCategoryFilterProps
> = ({
  selectedBudgetId,
  selectedCategoryIds,
  noBudget = false,
  onBudgetSelect,
  onCategorySelect,
  onCategoryDeselect,
  onNoBudgetToggle,
  showAllCategories = false,
}) => {
    const { budgets, budgetList, categoryList, availableCategories, handleCategoryToggle, getCategoryCount } = useBudgetBasedCategoryFilter({ selectedBudgetId, selectedCategoryIds, noBudget, onBudgetSelect, onCategorySelect, onCategoryDeselect, onNoBudgetToggle, showAllCategories });

    return (
      <View style={styles.container}>
        {/* Budget Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Filter by Budget</Text>
          <View style={styles.filterGroup}>
            <FilterButton
              label="All Budgets"
              isActive={!selectedBudgetId && !noBudget}
              onPress={() => {
                onBudgetSelect(undefined);
                onNoBudgetToggle?.(false);
              }}
              count={categoryList.length}
            />
            <FilterButton
              label="No Budget"
              isActive={noBudget}
              onPress={() => {
                onBudgetSelect(undefined);
                onNoBudgetToggle?.(!noBudget);
              }}
              icon="remove-circle-outline"
              color={UI.COLORS.WARNING}
            />
            {budgetList.map((budget) => (
              <FilterButton
                key={budget.id}
                label={budget.name}
                isActive={selectedBudgetId === budget.id && !noBudget}
                onPress={() => {
                  onBudgetSelect(budget.id);
                  onNoBudgetToggle?.(false);
                }}
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
                {selectedBudgetId && (
                  <Text style={styles.budgetIndicator}>
                    {" "}
                    in {budgets[selectedBudgetId]?.name}
                  </Text>
                )}
              </Text>
              <Text style={styles.categoryCount}>
                {selectedCategoryIds.length} of {availableCategories.length}{" "}
                selected
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScrollContainer}>
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
            </ScrollView>
          </View>
        )}

        {/* Empty State */}
        {availableCategories.length === 0 && selectedBudgetId && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No categories found for selected budget
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Try selecting a different budget or add categories to this budget
            </Text>
          </View>
        )}

        {/* Selection Summary */}
        {selectedCategoryIds.length > 0 && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>
              Filtering by {selectedCategoryIds.length}{" "}
              {selectedCategoryIds.length === 1 ? "category" : "categories"}
              {selectedBudgetId && (
                <Text style={styles.budgetSummary}>
                  {" "}
                  from {budgets[selectedBudgetId]?.name}
                </Text>
              )}
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
    gap: 8,
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
