import { AdvancedDateFilter } from "./AdvancedDateFilter";
import { AdvancedTypeFilter } from "./AdvancedTypeFilter";
import { AdvancedBudgetFilter } from "./AdvancedBudgetFilter";
import { AdvancedAmountFilter } from "./AdvancedAmountFilter";
import { AdvancedAdditionalFilters } from "./AdvancedAdditionalFilters";
import { styles } from "./AdvancedFiltersModal.styles";
import type { AdvancedFilters } from "../../model/advancedFilters";
import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../../../shared/constants";

import { QuickDatePreset } from "./QuickDatePresets";

import { useBillingPeriodPresets } from "../../../budgets/hooks/useBillingPeriodPresets";

import { LinearGradient } from "expo-linear-gradient";
import { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetModal } from "@gorhom/bottom-sheet";

interface AdvancedFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: AdvancedFilters) => void;
  currentFilters: AdvancedFilters;
}

export const AdvancedFiltersModal: React.FC<AdvancedFiltersModalProps> = ({
  visible,
  onClose,
  onApply,
  currentFilters,
}) => {
  const [filters, setFilters] = useState<AdvancedFilters>(currentFilters);
  const [activeSection, setActiveSection] = useState<string>("date");
  const billingPeriodPresets = useBillingPeriodPresets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["70%", "92%"], []);

  useEffect(() => {
    if (visible) {
      setFilters(currentFilters);
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleApply = useCallback(() => {
    onApply(filters);
    onClose();
  }, [filters, onApply, onClose]);

  const handleReset = useCallback(() => {
    // Find the billing period preset to restore as default
    const billingPeriod = billingPeriodPresets.find(
      (p) => p.id === "thisMonth",
    );
    setFilters({
      transactionTypes: ["income", "expense", "debt"],
      categoryIds: [],
      noBudget: false,
      excludeZeroAmounts: false,
      onlyRecentTransactions: false,
      dateRange: billingPeriod
        ? { start: billingPeriod.startDate, end: billingPeriod.endDate }
        : undefined,
    });
  }, [billingPeriodPresets]);

  const handleQuickDateSelect = useCallback((preset: QuickDatePreset) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: { start: preset.startDate, end: preset.endDate },
    }));
  }, []);

  const handleTransactionTypeToggle = useCallback((type: string) => {
    setFilters((prev) => ({
      ...prev,
      transactionTypes: prev.transactionTypes.includes(type)
        ? prev.transactionTypes.filter((t) => t !== type)
        : [...prev.transactionTypes, type],
    }));
  }, []);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) onClose();
    },
    [onClose],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.7}
      />
    ),
    [],
  );

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.dateRange) count++;
    if (filters.transactionTypes.length < 3) count++;
    if (filters.budgetId) count++;
    if (filters.noBudget) count++;
    if (filters.categoryIds.length > 0) count++;
    if (
      filters.amountRange?.min !== undefined ||
      filters.amountRange?.max !== undefined
    )
      count++;
    if (filters.excludeZeroAmounts) count++;
    if (filters.onlyRecentTransactions) count++;
    return count;
  };

  const sections = [
    { id: "date", label: "Date", icon: "calendar-outline" },
    { id: "type", label: "Type", icon: "swap-horizontal-outline" },
    { id: "budget", label: "Budget", icon: "wallet-outline" },
    { id: "amount", label: "Amount", icon: "cash-outline" },
    { id: "other", label: "Other", icon: "options-outline" },
  ];

  const activeCount = getActiveFilterCount();

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={handleSheetChange}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.sheetHandle}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Ionicons name="filter" size={18} color={UI.COLORS.PRIMARY} />
            </View>
            <Text style={styles.headerTitle}>Advanced Filters</Text>
            {activeCount > 0 && (
              <View style={styles.filterCountBadge}>
                <Text style={styles.filterCountText}>{activeCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={UI.COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>

        {/* Section Tabs */}
        <View style={styles.sectionSelector}>
          {sections.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <TouchableOpacity
                key={section.id}
                style={[styles.sectionTab, isActive && styles.sectionTabActive]}
                onPress={() => setActiveSection(section.id)}>
                <Ionicons
                  name={section.icon as any}
                  size={16}
                  color={isActive ? UI.COLORS.PRIMARY : UI.COLORS.TEXT_MUTED}
                />
                <Text
                  style={[
                    styles.sectionTabText,
                    isActive && styles.sectionTabTextActive,
                  ]}>
                  {section.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Content */}
        <BottomSheetScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}>
          {<AdvancedDateFilter activeSection={activeSection} handleQuickDateSelect={handleQuickDateSelect} billingPeriodPresets={billingPeriodPresets} filters={filters} setFilters={setFilters} />}

          {<AdvancedTypeFilter activeSection={activeSection} filters={filters} handleTransactionTypeToggle={handleTransactionTypeToggle} />}

          {<AdvancedBudgetFilter activeSection={activeSection} filters={filters} setFilters={setFilters} />}

          {<AdvancedAmountFilter activeSection={activeSection} filters={filters} setFilters={setFilters} />}

          {<AdvancedAdditionalFilters activeSection={activeSection} filters={filters} setFilters={setFilters} />}
        </BottomSheetScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Ionicons
              name="refresh-outline"
              size={18}
              color={UI.COLORS.TEXT_SECONDARY}
            />
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <LinearGradient
              colors={[UI.COLORS.PRIMARY_LIGHT, UI.COLORS.PRIMARY]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.applyGradient}>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheetModal>
  );
};
