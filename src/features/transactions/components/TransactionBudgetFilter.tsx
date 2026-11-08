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
interface TransactionBudgetFilterProps {
  onBudgetToggle: ((id: string) => void) | undefined;
  allBudgetsList: ReturnType<typeof useTransactionFilterModal>["allBudgetsList"];
  colors: ReturnType<typeof useAppTheme>["colors"];
  selectedBudgetIds: Set<string>;
}
export function TransactionBudgetFilter({ onBudgetToggle, allBudgetsList, colors, selectedBudgetIds }: TransactionBudgetFilterProps) {
  return (<>{onBudgetToggle && allBudgetsList.length > 0 && (
    <>
      <Text
        style={[
          styles.sectionLabel,
          { color: colors.onSurfaceVariant, marginTop: 28 },
        ]}>
        BUDGETS
      </Text>
      <View style={styles.cardGrid}>
        <TouchableOpacity
          key="unbudgeted"
          style={[
            styles.card,
            {
              backgroundColor: selectedBudgetIds.has("unbudgeted")
                ? colors.primaryContainer
                : colors.surfaceVariant,
              borderColor: selectedBudgetIds.has("unbudgeted")
                ? colors.primary
                : "transparent",
              borderWidth: 1,
            },
          ]}
          onPress={() => onBudgetToggle("unbudgeted")}
          activeOpacity={0.8}>
          <Ionicons
            name="wallet-outline"
            size={24}
            color={
              selectedBudgetIds.has("unbudgeted")
                ? colors.onPrimaryContainer
                : colors.primary
            }
          />
          <Text
            style={[
              styles.cardText,
              {
                color: selectedBudgetIds.has("unbudgeted")
                  ? colors.onPrimaryContainer
                  : colors.onSurface,
                fontWeight: selectedBudgetIds.has("unbudgeted") ? "700" : "600",
              },
            ]}
            numberOfLines={2}>
            Unbudgeted
          </Text>
        </TouchableOpacity>
        {allBudgetsList.map((b) => {
          const isSelected = selectedBudgetIds.has(b.id);
          return (
            <TouchableOpacity
              key={b.id}
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
              onPress={() => onBudgetToggle(b.id)}
              activeOpacity={0.8}>
              <Ionicons
                name="wallet"
                size={24}
                color={
                  isSelected
                    ? colors.onPrimaryContainer
                    : colors.primary
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
                {b.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  )}</>);
}
