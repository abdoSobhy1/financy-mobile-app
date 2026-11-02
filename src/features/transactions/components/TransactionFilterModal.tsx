import { TransactionDatePresets } from "./TransactionDatePresets";
import { TransactionTypeFilter } from "./TransactionTypeFilter";
import { TransactionWalletFilter } from "./TransactionWalletFilter";
import { TransactionBudgetFilter } from "./TransactionBudgetFilter";
import { TransactionCategoryFilter } from "./TransactionCategoryFilter";
import { styles } from "./TransactionFilterModals.styles";
import { useTransactionFilterModal } from "../hooks/useTransactionFilterModal";
import React from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { ToastOverlay } from "../../../shared/ui";
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

// ─── Filter Modal ──────────────────────────────────────────────────────────────

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

const { height: SCREEN_H } = Dimensions.get("window");

export const TransactionFilterModal: React.FC<TransactionFilterModalProps> = ({
  visible,
  filterType,
  filterPeriod,
  selectedCategoryIds = new Set(),
  selectedBudgetIds = new Set(),
  selectedWalletIds = new Set(),
  wallets = [],
  onFilterTypeChange,
  onFilterPeriodChange,
  onCategoryToggle,
  onBudgetToggle,
  onWalletToggle,
  onOpenCustomDate,
  onReset,
  onApply,
  onClose,
}) => {
  const { allCategoriesList, allBudgetsList, DATE_OPTIONS } = useTransactionFilterModal({ visible, filterType, filterPeriod, selectedCategoryIds, selectedBudgetIds, selectedWalletIds, wallets, onFilterTypeChange, onFilterPeriodChange, onCategoryToggle, onBudgetToggle, onWalletToggle, onOpenCustomDate, onReset, onApply, onClose });
  const { colors } = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.outlineVariant,
            },
          ]}>
          {/* Drag handle */}
          <View style={[styles.handle, { backgroundColor: colors.outline }]} />

          {/* Header */}
          <View
            style={[
              styles.header,
              { borderBottomColor: colors.outlineVariant },
            ]}>
            <Text style={[styles.headerTitle, { color: colors.onBackground }]}>
              Filter Transactions
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}>
              <Ionicons
                name="close"
                size={22}
                color={colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}>
            {/* DATE RANGE */}
            <Text
              style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>
              DATE RANGE
            </Text>
            <TransactionDatePresets DATE_OPTIONS={DATE_OPTIONS} filterPeriod={filterPeriod} colors={colors} onFilterPeriodChange={onFilterPeriodChange} />
            <TouchableOpacity
              style={[
                styles.customDateBtn,
                {
                  backgroundColor: filterPeriod === "custom" ? colors.primaryContainer : colors.surfaceVariant,
                  borderColor: filterPeriod === "custom" ? colors.primary : "transparent",
                },
              ]}
              onPress={() => {
                onFilterPeriodChange("custom");
                if (onOpenCustomDate) onOpenCustomDate();
              }}
              activeOpacity={0.8}>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={filterPeriod === "custom" ? colors.onPrimaryContainer : colors.onSurfaceVariant}
              />
              <Text
                style={{
                  color: filterPeriod === "custom" ? colors.onPrimaryContainer : colors.onSurfaceVariant,
                  fontWeight: "600",
                  fontSize: 14,
                }}>
                Custom Range
              </Text>
            </TouchableOpacity>

            {/* TRANSACTION TYPE */}
            <Text
              style={[styles.sectionLabel, { color: colors.onSurfaceVariant, marginTop: 28 }]}>
              TRANSACTION TYPE
            </Text>
            <TransactionTypeFilter filterType={filterType} colors={colors} onFilterTypeChange={onFilterTypeChange} />

            {/* WALLETS & ACCOUNTS */}
            {<TransactionWalletFilter onWalletToggle={onWalletToggle} wallets={wallets} colors={colors} selectedWalletIds={selectedWalletIds} />}

            {/* BUDGETS */}
            {<TransactionBudgetFilter onBudgetToggle={onBudgetToggle} allBudgetsList={allBudgetsList} colors={colors} selectedBudgetIds={selectedBudgetIds} />}

            {/* CATEGORIES */}
            {<TransactionCategoryFilter onCategoryToggle={onCategoryToggle} allCategoriesList={allCategoriesList} colors={colors} selectedCategoryIds={selectedCategoryIds} />}
          </ScrollView>

          {/* Footer Buttons */}
          <View
            style={[styles.footer, { borderTopColor: colors.outlineVariant }]}>
            <TouchableOpacity
              style={[
                styles.footerBtn,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.outlineVariant,
                  borderWidth: 1,
                },
              ]}
              onPress={onReset}
              activeOpacity={0.7}>
              <Text style={[styles.footerBtnText, { color: colors.onSurface }]}>
                Reset
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.footerBtn,
                { backgroundColor: colors.primaryContainer },
              ]}
              onPress={() => {
                if (onApply) onApply();
                else onClose();
              }}
              activeOpacity={0.8}>
              <Text
                style={[
                  styles.footerBtnText,
                  { color: colors.onPrimaryContainer },
                ]}>
                Apply Filters
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <ToastOverlay visible={visible} priority={1} />
    </Modal>
  );
};
