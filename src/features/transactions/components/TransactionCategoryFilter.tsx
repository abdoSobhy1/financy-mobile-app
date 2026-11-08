import { styles } from "./TransactionFilterModals.styles";
import type { useTransactionFilterModal } from "../hooks/useTransactionFilterModal";

import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
interface TransactionCategoryFilterProps {
  onCategoryToggle: ((id: string) => void) | undefined;
  allCategoriesList: ReturnType<typeof useTransactionFilterModal>["allCategoriesList"];
  colors: ReturnType<typeof useAppTheme>["colors"];
  selectedCategoryIds: Set<string>;
}
export function TransactionCategoryFilter({ onCategoryToggle, allCategoriesList, colors, selectedCategoryIds }: TransactionCategoryFilterProps) {
  return (<>{onCategoryToggle && allCategoriesList.length > 0 && (
    <>
      <Text
        style={[
          styles.sectionLabel,
          { color: colors.onSurfaceVariant, marginTop: 28 },
        ]}>
        CATEGORIES
      </Text>
      <View style={styles.cardGrid}>
        {allCategoriesList.map((cat) => {
          const isSelected = selectedCategoryIds.has(cat.id);
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.card,
                {
                  backgroundColor: isSelected
                    ? colors.primaryContainer
                    : colors.surfaceVariant,
                  borderColor: isSelected
                    ? colors.primary
                    : "transparent",
                  borderWidth: 1,
                },
              ]}
              onPress={() => onCategoryToggle(cat.id)}
              activeOpacity={0.8}>
              <Ionicons
                name={
                  ((cat as any)?.icon || "pricetag") as any
                }
                size={24}
                color={
                  isSelected
                    ? colors.onPrimaryContainer
                    : cat.color || colors.primary
                }
              />
              <Text
                style={[
                  styles.cardText,
                  {
                    color: isSelected
                      ? colors.onPrimaryContainer
                      : colors.onSurface,
                    fontWeight: isSelected ? "700" : "600",
                  },
                ]}
                numberOfLines={2}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  )}</>);
}
