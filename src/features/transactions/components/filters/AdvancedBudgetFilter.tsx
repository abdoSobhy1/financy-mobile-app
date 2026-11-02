import { styles } from "./AdvancedFiltersModal.styles";
import type { AdvancedFilters } from "../../model/advancedFilters";

import { View } from "react-native";

import { BudgetBasedCategoryFilter } from "./BudgetBasedCategoryFilter";
import type { Dispatch, SetStateAction } from "react";

interface AdvancedBudgetFilterProps {
  activeSection: string;
  filters: AdvancedFilters;
  setFilters: Dispatch<SetStateAction<AdvancedFilters>>;
}
export function AdvancedBudgetFilter({ activeSection, filters, setFilters }: AdvancedBudgetFilterProps) {
  return (<>{activeSection === "budget" && (
    <View style={styles.sectionContent}>
      <BudgetBasedCategoryFilter
        selectedBudgetId={filters.budgetId}
        selectedCategoryIds={filters.categoryIds}
        noBudget={filters.noBudget}
        onBudgetSelect={(budgetId) =>
          setFilters((prev) => ({
            ...prev,
            budgetId,
            categoryIds: [],
          }))
        }
        onCategorySelect={(categoryId) =>
          setFilters((prev) => ({
            ...prev,
            categoryIds: [...prev.categoryIds, categoryId],
          }))
        }
        onCategoryDeselect={(categoryId) =>
          setFilters((prev) => ({
            ...prev,
            categoryIds: prev.categoryIds.filter(
              (id) => id !== categoryId,
            ),
          }))
        }
        onNoBudgetToggle={(value) =>
          setFilters((prev) => ({
            ...prev,
            noBudget: value,
            budgetId: value ? undefined : prev.budgetId,
          }))
        }
      />
    </View>
  )}</>);
}
