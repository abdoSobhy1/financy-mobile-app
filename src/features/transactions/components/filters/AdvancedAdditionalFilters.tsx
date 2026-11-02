import { styles } from "./AdvancedFiltersModal.styles";
import type { AdvancedFilters } from "../../model/advancedFilters";

import { View, Text, Switch } from "react-native";

import { UI } from "../../../../shared/constants";
import type { Dispatch, SetStateAction } from "react";

interface AdvancedAdditionalFiltersProps {
  activeSection: string;
  filters: AdvancedFilters;
  setFilters: Dispatch<SetStateAction<AdvancedFilters>>;
}
export function AdvancedAdditionalFilters({ activeSection, filters, setFilters }: AdvancedAdditionalFiltersProps) {
  return (<>{activeSection === "other" && (
    <View style={styles.sectionContent}>
      <View style={styles.switchCard}>
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>Exclude Zero Amounts</Text>
            <Text style={styles.switchSubtext}>
              Hide transactions with $0.00
            </Text>
          </View>
          <Switch
            value={filters.excludeZeroAmounts}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                excludeZeroAmounts: value,
              }))
            }
            trackColor={{
              false: "rgba(255,255,255,0.08)",
              true: UI.COLORS.PRIMARY + "40",
            }}
            thumbColor={
              filters.excludeZeroAmounts
                ? UI.COLORS.PRIMARY
                : UI.COLORS.TEXT_MUTED
            }
          />
        </View>
        <View style={styles.switchDivider} />
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>
              Recent Transactions Only
            </Text>
            <Text style={styles.switchSubtext}>
              Show only last 90 days
            </Text>
          </View>
          <Switch
            value={filters.onlyRecentTransactions}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                onlyRecentTransactions: value,
              }))
            }
            trackColor={{
              false: "rgba(255,255,255,0.08)",
              true: UI.COLORS.PRIMARY + "40",
            }}
            thumbColor={
              filters.onlyRecentTransactions
                ? UI.COLORS.PRIMARY
                : UI.COLORS.TEXT_MUTED
            }
          />
        </View>
      </View>
    </View>
  )}</>);
}
