import React, { useState, useCallback } from "react";
import { View, Text, Modal, StyleSheet, ScrollView, TouchableOpacity, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../constants";
import { CustomDatePicker } from "../ui/CustomDatePicker";
import { QuickDatePresets, QuickDatePreset } from "./QuickDatePresets";
import { BudgetBasedCategoryFilter } from "./BudgetBasedCategoryFilter";
import { useBillingPeriodPresets } from "../../hooks/useBillingPeriodPresets";
import { FilterButton } from "./FilterButton";

export interface AdvancedFilters {
  // Date filters
  dateRange?: {
    start: Date;
    end: Date;
  };

  // Transaction type filters
  transactionTypes: string[]; // ['income', 'expense', 'debt']

  // Budget and category filters
  budgetId?: string;
  categoryIds: string[];

  // Amount filters
  amountRange?: {
    min?: number;
    max?: number;
  };

  // Text search
  searchText?: string;

  // Additional filters
  excludeZeroAmounts: boolean;
  onlyRecentTransactions: boolean; // Last 90 days
}

interface AdvancedFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: AdvancedFilters) => void;
  currentFilters: AdvancedFilters;
}

export const AdvancedFiltersModal: React.FC<AdvancedFiltersModalProps> = ({ visible, onClose, onApply, currentFilters }) => {
  const [filters, setFilters] = useState<AdvancedFilters>(currentFilters);
  const [activeSection, setActiveSection] = useState<string>("date");
  const billingPeriodPresets = useBillingPeriodPresets();

  const handleApply = useCallback(() => {
    onApply(filters);
    onClose();
  }, [filters, onApply, onClose]);

  const handleReset = useCallback(() => {
    const resetFilters: AdvancedFilters = {
      transactionTypes: ["income", "expense", "debt"],
      categoryIds: [],
      excludeZeroAmounts: false,
      onlyRecentTransactions: false,
    };
    setFilters(resetFilters);
  }, []);

  const handleQuickDateSelect = useCallback((preset: QuickDatePreset) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: {
        start: preset.startDate,
        end: preset.endDate,
      },
    }));
  }, []);

  const handleTransactionTypeToggle = useCallback((type: string) => {
    setFilters((prev) => ({
      ...prev,
      transactionTypes: prev.transactionTypes.includes(type) ? prev.transactionTypes.filter((t) => t !== type) : [...prev.transactionTypes, type],
    }));
  }, []);

  const sections = [
    { id: "date", label: "Date Range", icon: "calendar" },
    { id: "type", label: "Transaction Type", icon: "swap-horizontal" },
    { id: "budget", label: "Budget & Category", icon: "wallet" },
    { id: "amount", label: "Amount Range", icon: "cash" },
    { id: "other", label: "Other Options", icon: "options" },
  ];

  const renderSectionSelector = () => (
    <View style={styles.sectionSelector}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {sections.map((section) => (
          <TouchableOpacity
            key={section.id}
            style={[styles.sectionButton, activeSection === section.id && styles.activeSectionButton]}
            onPress={() => setActiveSection(section.id)}>
            <Ionicons name={section.icon as any} size={16} color={activeSection === section.id ? UI.COLORS.BACKGROUND : UI.COLORS.TEXT_SECONDARY} />
            <Text style={[styles.sectionButtonText, activeSection === section.id && styles.activeSectionButtonText]}>{section.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderDateSection = () => (
    <View style={styles.sectionContent}>
      <QuickDatePresets onPresetSelect={handleQuickDateSelect} presets={billingPeriodPresets} />

      <View style={styles.customDateContainer}>
        <Text style={styles.subSectionTitle}>Custom Date Range</Text>
        <View style={styles.dateInputsContainer}>
          <View style={styles.dateInputWrapper}>
            <CustomDatePicker
              value={filters.dateRange?.start}
              onDateChange={(date) =>
                setFilters((prev) => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, start: date, end: prev.dateRange?.end || date },
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
                  dateRange: { start: prev.dateRange?.start || date, end: date },
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
  );

  const renderTypeSection = () => (
    <View style={styles.sectionContent}>
      <Text style={styles.subSectionTitle}>Transaction Types</Text>
      <View style={styles.filterGroup}>
        {[
          { id: "income", label: "Income", icon: "trending-up", color: UI.COLORS.SUCCESS },
          { id: "expense", label: "Expense", icon: "trending-down", color: UI.COLORS.ERROR },
          { id: "debt", label: "Debt", icon: "card", color: UI.COLORS.WARNING },
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
  );

  const renderBudgetSection = () => (
    <View style={styles.sectionContent}>
      <BudgetBasedCategoryFilter
        selectedBudgetId={filters.budgetId}
        selectedCategoryIds={filters.categoryIds}
        onBudgetSelect={(budgetId) =>
          setFilters((prev) => ({
            ...prev,
            budgetId,
            categoryIds: [], // Reset categories when budget changes
          }))
        }
        onCategorySelect={(categoryId) =>
          setFilters((prev) => ({
            ...prev,
            categoryIds: [...prev.categoryIds, categoryId],
          }))
        }
        onCategoryDeselect={(categoryId) =>
          setFilters((prev) => ({
            ...prev,
            categoryIds: prev.categoryIds.filter((id) => id !== categoryId),
          }))
        }
      />
    </View>
  );

  const renderAmountSection = () => (
    <View style={styles.sectionContent}>
      <Text style={styles.subSectionTitle}>Amount Range</Text>
      <Text style={styles.comingSoonText}>Amount range filtering coming soon!</Text>
    </View>
  );

  const renderOtherSection = () => (
    <View style={styles.sectionContent}>
      <View style={styles.switchOption}>
        <View style={styles.switchLabel}>
          <Text style={styles.switchLabelText}>Exclude Zero Amounts</Text>
          <Text style={styles.switchLabelSubtext}>Hide transactions with $0.00</Text>
        </View>
        <Switch
          value={filters.excludeZeroAmounts}
          onValueChange={(value) => setFilters((prev) => ({ ...prev, excludeZeroAmounts: value }))}
          trackColor={{ false: UI.COLORS.BORDER, true: UI.COLORS.PRIMARY + "40" }}
          thumbColor={filters.excludeZeroAmounts ? UI.COLORS.PRIMARY : UI.COLORS.TEXT_MUTED}
        />
      </View>

      <View style={styles.switchOption}>
        <View style={styles.switchLabel}>
          <Text style={styles.switchLabelText}>Recent Transactions Only</Text>
          <Text style={styles.switchLabelSubtext}>Show only last 90 days</Text>
        </View>
        <Switch
          value={filters.onlyRecentTransactions}
          onValueChange={(value) => setFilters((prev) => ({ ...prev, onlyRecentTransactions: value }))}
          trackColor={{ false: UI.COLORS.BORDER, true: UI.COLORS.PRIMARY + "40" }}
          thumbColor={filters.onlyRecentTransactions ? UI.COLORS.PRIMARY : UI.COLORS.TEXT_MUTED}
        />
      </View>
    </View>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case "date":
        return renderDateSection();
      case "type":
        return renderTypeSection();
      case "budget":
        return renderBudgetSection();
      case "amount":
        return renderAmountSection();
      case "other":
        return renderOtherSection();
      default:
        return renderDateSection();
    }
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.dateRange) count++;
    if (filters.transactionTypes.length < 3) count++;
    if (filters.budgetId) count++;
    if (filters.categoryIds.length > 0) count++;
    if (filters.excludeZeroAmounts) count++;
    if (filters.onlyRecentTransactions) count++;
    return count;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Advanced Filters</Text>
            {getActiveFilterCount() > 0 && (
              <View style={styles.filterCountBadge}>
                <Text style={styles.filterCountText}>{getActiveFilterCount()}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={UI.COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>

        {/* Section Selector */}
        {renderSectionSelector()}

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderSectionContent()}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>Reset All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.COLORS.BACKGROUND,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: UI.SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  filterCountBadge: {
    marginLeft: UI.SPACING.SM,
    paddingHorizontal: UI.SPACING.SM,
    paddingVertical: 2,
    backgroundColor: UI.COLORS.PRIMARY,
    borderRadius: 12,
    minWidth: 24,
    alignItems: "center",
  },
  filterCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: UI.COLORS.BACKGROUND,
  },
  closeButton: {
    padding: UI.SPACING.SM,
  },
  sectionSelector: {
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
    paddingVertical: UI.SPACING.SM,
  },
  sectionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: UI.SPACING.MD,
    paddingVertical: UI.SPACING.SM,
    marginHorizontal: UI.SPACING.XS,
    borderRadius: UI.CARD_RADIUS,
    backgroundColor: UI.COLORS.SURFACE,
  },
  activeSectionButton: {
    backgroundColor: UI.COLORS.PRIMARY,
  },
  sectionButtonText: {
    fontSize: 14,
    marginLeft: UI.SPACING.XS,
    color: UI.COLORS.TEXT_SECONDARY,
    fontWeight: "500",
  },
  activeSectionButtonText: {
    color: UI.COLORS.BACKGROUND,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  sectionContent: {
    padding: UI.SPACING.LG,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.MD,
  },
  filterGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: UI.SPACING.SM,
  },
  customDateContainer: {
    marginTop: UI.SPACING.LG,
  },
  dateInputsContainer: {
    flexDirection: "row",
    gap: UI.SPACING.MD,
  },
  dateInputWrapper: {
    flex: 1,
  },
  dateInput: {
    marginBottom: 0,
  },
  switchOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: UI.SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER + "40",
  },
  switchLabel: {
    flex: 1,
  },
  switchLabelText: {
    fontSize: 16,
    fontWeight: "500",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  switchLabelSubtext: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  comingSoonText: {
    fontSize: 16,
    color: UI.COLORS.TEXT_MUTED,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: UI.SPACING.LG,
  },
  footer: {
    flexDirection: "row",
    padding: UI.SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
    gap: UI.SPACING.MD,
  },
  resetButton: {
    flex: 1,
    paddingVertical: UI.SPACING.MD,
    borderRadius: UI.CARD_RADIUS,
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_SECONDARY,
  },
  applyButton: {
    flex: 2,
    paddingVertical: UI.SPACING.MD,
    borderRadius: UI.CARD_RADIUS,
    backgroundColor: UI.COLORS.PRIMARY,
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.BACKGROUND,
  },
});
