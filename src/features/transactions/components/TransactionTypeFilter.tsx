import { styles } from "./TransactionFilterModals.styles";

import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme, type AppTheme } from "../../../shared/theme/ThemeProvider";

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
interface TransactionTypeFilterProps {
  filterType: FilterType;
  colors: AppTheme["colors"];
  onFilterTypeChange: (type: FilterType) => void;
}
export function TransactionTypeFilter({ filterType, colors, onFilterTypeChange }: TransactionTypeFilterProps) {
  return (<View style={styles.chipRow}>
    {(["All", "Income", "Expense", "Transfer"] as const).map((t) => {
      const isActive =
        filterType === t ||
        filterType.toLowerCase() === t.toLowerCase();
      return (
        <TouchableOpacity
          key={t}
          style={[
            styles.chip,
            {
              backgroundColor: isActive
                ? colors.primaryContainer
                : colors.surfaceVariant,
              borderColor: isActive
                ? colors.primary
                : "transparent",
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            },
          ]}
          onPress={() => onFilterTypeChange(t as FilterType)}
          activeOpacity={0.8}>
          {isActive && (
            <Ionicons
              name="checkmark"
              size={14}
              color={colors.onPrimaryContainer}
            />
          )}
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
            {t}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>);
}
