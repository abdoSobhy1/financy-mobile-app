import { styles } from "./AdvancedFiltersModal.styles";
import type { AdvancedFilters } from "../../model/advancedFilters";

import { View, Text } from "react-native";

import { CustomDatePicker } from "../../../../shared/ui/CustomDatePicker";
import type { Dispatch, SetStateAction } from "react";
import { QuickDatePresets, QuickDatePreset } from "./QuickDatePresets";

interface AdvancedDateFilterProps {
  activeSection: string;
  handleQuickDateSelect: (preset: QuickDatePreset) => void;
  billingPeriodPresets: QuickDatePreset[];
  filters: AdvancedFilters;
  setFilters: Dispatch<SetStateAction<AdvancedFilters>>;
}
export function AdvancedDateFilter({ activeSection, handleQuickDateSelect, billingPeriodPresets, filters, setFilters }: AdvancedDateFilterProps) {
  return (<>{activeSection === "date" && (
    <View style={styles.sectionContent}>
      <QuickDatePresets
        onPresetSelect={handleQuickDateSelect}
        presets={billingPeriodPresets}
      />
      <View style={styles.customDateContainer}>
        <Text style={styles.subSectionTitle}>Custom Date Range</Text>
        <View style={styles.dateInputsContainer}>
          <View style={styles.dateInputWrapper}>
            <CustomDatePicker
              value={filters.dateRange?.start}
              onDateChange={(date) =>
                setFilters((prev) => ({
                  ...prev,
                  dateRange: {
                    ...prev.dateRange,
                    start: date,
                    end: prev.dateRange?.end || date,
                  },
                }))
              }
              label="Start Date"
              showLabel={false}
              style={styles.dateInput}
            />
          </View>
          <View style={styles.dateInputWrapper}>
            <CustomDatePicker
              value={filters.dateRange?.end}
              onDateChange={(date) =>
                setFilters((prev) => ({
                  ...prev,
                  dateRange: {
                    start: prev.dateRange?.start || date,
                    end: date,
                  },
                }))
              }
              label="End Date"
              showLabel={false}
              style={styles.dateInput}
              minimumDate={filters.dateRange?.start}
            />
          </View>
        </View>
      </View>
    </View>
  )}</>);
}
