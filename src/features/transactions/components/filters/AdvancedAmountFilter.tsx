import { styles } from "./AdvancedFiltersModal.styles";
import type { AdvancedFilters } from "../../model/advancedFilters";

import { View, Text, TextInput } from "react-native";

import { UI } from "../../../../shared/constants";
import type { Dispatch, SetStateAction } from "react";

interface AdvancedAmountFilterProps {
  activeSection: string;
  filters: AdvancedFilters;
  setFilters: Dispatch<SetStateAction<AdvancedFilters>>;
}
export function AdvancedAmountFilter({ activeSection, filters, setFilters }: AdvancedAmountFilterProps) {
  return (<>{activeSection === "amount" && (
    <View style={styles.sectionContent}>
      <Text style={styles.subSectionTitle}>Amount Range</Text>
      <View style={styles.amountRangeContainer}>
        <View style={styles.amountInputWrapper}>
          <Text style={styles.amountLabel}>Min</Text>
          <TextInput
            style={styles.amountInput}
            value={filters.amountRange?.min?.toString() ?? ""}
            onChangeText={(v) => {
              const num = parseFloat(v);
              setFilters((prev) => ({
                ...prev,
                amountRange: {
                  ...prev.amountRange,
                  min: isNaN(num) ? undefined : num,
                },
              }));
            }}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={UI.COLORS.TEXT_MUTED}
          />
        </View>
        <View style={styles.amountDash}>
          <Text style={{ color: UI.COLORS.TEXT_MUTED, fontSize: 18 }}>
            —
          </Text>
        </View>
        <View style={styles.amountInputWrapper}>
          <Text style={styles.amountLabel}>Max</Text>
          <TextInput
            style={styles.amountInput}
            value={filters.amountRange?.max?.toString() ?? ""}
            onChangeText={(v) => {
              const num = parseFloat(v);
              setFilters((prev) => ({
                ...prev,
                amountRange: {
                  ...prev.amountRange,
                  max: isNaN(num) ? undefined : num,
                },
              }));
            }}
            keyboardType="numeric"
            placeholder="∞"
            placeholderTextColor={UI.COLORS.TEXT_MUTED}
          />
        </View>
      </View>
      {filters.amountRange?.min !== undefined &&
        filters.amountRange?.max !== undefined &&
        filters.amountRange.min > filters.amountRange.max && (
          <Text style={styles.amountError}>
            Min must be less than Max
          </Text>
        )}
    </View>
  )}</>);
}
