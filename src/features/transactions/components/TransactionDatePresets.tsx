import { styles } from "./TransactionFilterModals.styles";
import type { useTransactionFilterModal } from "../hooks/useTransactionFilterModal";

import { View, Text, TouchableOpacity } from "react-native";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";

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
interface TransactionDatePresetsProps {
  DATE_OPTIONS: ReturnType<typeof useTransactionFilterModal>["DATE_OPTIONS"];
  filterPeriod: FilterPeriod;
  colors: ReturnType<typeof useAppTheme>["colors"];
  onFilterPeriodChange: (period: FilterPeriod) => void;
}
export function TransactionDatePresets({ DATE_OPTIONS, filterPeriod, colors, onFilterPeriodChange }: TransactionDatePresetsProps) {
  return (<View style={styles.chipRow}>
    {DATE_OPTIONS.map((item) => {
      const isActive =
        filterPeriod === item.value ||
        (item.value === "All Time" && filterPeriod === "all") ||
        (item.value === "This Month" && filterPeriod === "month") ||
        (item.value === "Year" && filterPeriod === "year");

      return (
        <TouchableOpacity
          key={item.value}
          style={[
            styles.chip,
            {
              backgroundColor: isActive
                ? colors.primaryContainer
                : colors.surfaceVariant,
              borderColor: isActive
                ? colors.primary
                : "transparent",
            },
          ]}
          onPress={() => onFilterPeriodChange(item.value as FilterPeriod)}
          activeOpacity={0.8}>
          <Text
            style={[
              styles.chipText,
              {
                color: isActive
                  ? colors.onPrimaryContainer
                  : colors.onSurfaceVariant,
                fontWeight: isActive ? "700" : "600",
              },
            ]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>);
}
