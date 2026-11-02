import { styles } from "./AdvancedFiltersModal.styles";
import type { AdvancedFilters } from "../../model/advancedFilters";

import { View, Text } from "react-native";

import { UI } from "../../../../shared/constants";

import { FilterButton } from "../../../../shared/ui/FilterButton";

interface AdvancedTypeFilterProps {
  activeSection: string;
  filters: AdvancedFilters;
  handleTransactionTypeToggle: (type: string) => void;
}
export function AdvancedTypeFilter({ activeSection, filters, handleTransactionTypeToggle }: AdvancedTypeFilterProps) {
  return (<>{activeSection === "type" && (
    <View style={styles.sectionContent}>
      <Text style={styles.subSectionTitle}>Transaction Types</Text>
      <View style={styles.filterGroup}>
        {[
          {
            id: "income",
            label: "Income",
            icon: "trending-up",
            color: UI.COLORS.SUCCESS,
          },
          {
            id: "expense",
            label: "Expense",
            icon: "trending-down",
            color: UI.COLORS.ERROR,
          },
          {
            id: "debt",
            label: "Debt",
            icon: "card",
            color: UI.COLORS.WARNING,
          },
        ].map((type) => (
          <FilterButton
            key={type.id}
            label={type.label}
            isActive={filters.transactionTypes.includes(type.id)}
            onPress={() => handleTransactionTypeToggle(type.id)}
            icon={type.icon}
            color={type.color}
          />
        ))}
      </View>
    </View>
  )}</>);
}
