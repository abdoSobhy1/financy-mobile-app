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
interface TransactionWalletFilterProps {
  onWalletToggle: ((id: string) => void) | undefined;
  wallets: WalletAccount[];
  colors: AppTheme["colors"];
  selectedWalletIds: Set<string>;
}
export function TransactionWalletFilter({ onWalletToggle, wallets, colors, selectedWalletIds }: TransactionWalletFilterProps) {
  return (<>{onWalletToggle && wallets.length > 0 && (
    <>
      <Text
        style={[
          styles.sectionLabel,
          { color: colors.onSurfaceVariant, marginTop: 28 },
        ]}>
        WALLETS & ACCOUNTS
      </Text>
      <View style={styles.cardGrid}>
        {wallets.map((w) => {
          const isSelected = selectedWalletIds.has(w.id);
          return (
            <TouchableOpacity
              key={w.id}
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
              onPress={() => onWalletToggle(w.id)}
              activeOpacity={0.8}>
              <Ionicons
                name={(w.icon || "wallet-outline") as any}
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
                {w.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  )}</>);
}
