import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../constants";
import { CustomDatePicker } from "../ui/CustomDatePicker";
import { QuickDatePresets, QuickDatePreset } from "./QuickDatePresets";
import { BudgetBasedCategoryFilter } from "./BudgetBasedCategoryFilter";
import { useBillingPeriodPresets } from "../../hooks/useBillingPeriodPresets";
import { FilterButton } from "./FilterButton";
import { LinearGradient } from "expo-linear-gradient";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";

export interface AdvancedFilters {
  dateRange?: { start: Date; end: Date };
  transactionTypes: string[];
  budgetId?: string;
  noBudget?: boolean;
  categoryIds: string[];
  amountRange?: { min?: number; max?: number };
  searchText?: string;
  excludeZeroAmounts: boolean;
  onlyRecentTransactions: boolean;
}

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
          {activeSection === "date" && (
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
          )}

          {activeSection === "type" && (
            <View style={styles.sectionContent}>
              <Text style={styles.subSectionTitle}>Transaction Types</Text>
              <View style={styles.filterGroup}>
                {[
                  {
                    id: "income",
                    label: "Income",
                    icon: "trending-up",
                    color: UI.COLORS.SUCCESS,
                  },
                  {
                    id: "expense",
                    label: "Expense",
                    icon: "trending-down",
                    color: UI.COLORS.ERROR,
                  },
                  {
                    id: "debt",
                    label: "Debt",
                    icon: "card",
                    color: UI.COLORS.WARNING,
                  },
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
          )}

          {activeSection === "budget" && (
            <View style={styles.sectionContent}>
              <BudgetBasedCategoryFilter
                selectedBudgetId={filters.budgetId}
                selectedCategoryIds={filters.categoryIds}
                noBudget={filters.noBudget}
                onBudgetSelect={(budgetId) =>
                  setFilters((prev) => ({
                    ...prev,
                    budgetId,
                    categoryIds: [],
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
                    categoryIds: prev.categoryIds.filter(
                      (id) => id !== categoryId,
                    ),
                  }))
                }
                onNoBudgetToggle={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    noBudget: value,
                    budgetId: value ? undefined : prev.budgetId,
                  }))
                }
              />
            </View>
          )}

          {activeSection === "amount" && (
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
          )}

          {activeSection === "other" && (
            <View style={styles.sectionContent}>
              <View style={styles.switchCard}>
                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={styles.switchLabel}>Exclude Zero Amounts</Text>
                    <Text style={styles.switchSubtext}>
                      Hide transactions with $0.00
                    </Text>
                  </View>
                  <Switch
                    value={filters.excludeZeroAmounts}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        excludeZeroAmounts: value,
                      }))
                    }
                    trackColor={{
                      false: "rgba(255,255,255,0.08)",
                      true: UI.COLORS.PRIMARY + "40",
                    }}
                    thumbColor={
                      filters.excludeZeroAmounts
                        ? UI.COLORS.PRIMARY
                        : UI.COLORS.TEXT_MUTED
                    }
                  />
                </View>
                <View style={styles.switchDivider} />
                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={styles.switchLabel}>
                      Recent Transactions Only
                    </Text>
                    <Text style={styles.switchSubtext}>
                      Show only last 90 days
                    </Text>
                  </View>
                  <Switch
                    value={filters.onlyRecentTransactions}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        onlyRecentTransactions: value,
                      }))
                    }
                    trackColor={{
                      false: "rgba(255,255,255,0.08)",
                      true: UI.COLORS.PRIMARY + "40",
                    }}
                    thumbColor={
                      filters.onlyRecentTransactions
                        ? UI.COLORS.PRIMARY
                        : UI.COLORS.TEXT_MUTED
                    }
                  />
                </View>
              </View>
            </View>
          )}
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

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#12122E",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.15)",
  },
  sheetHandle: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 40,
  },
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: UI.COLORS.PRIMARY + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  filterCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: UI.COLORS.PRIMARY,
    borderRadius: 10,
    minWidth: 22,
    alignItems: "center",
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Section tabs
  sectionSelector: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  sectionTab: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    gap: 4,
  },
  sectionTabActive: {
    backgroundColor: UI.COLORS.PRIMARY + "18",
    borderWidth: 1,
    borderColor: UI.COLORS.PRIMARY + "30",
  },
  sectionTabText: {
    fontSize: 11,
    fontWeight: "500",
    color: UI.COLORS.TEXT_MUTED,
  },
  sectionTabTextActive: {
    color: UI.COLORS.PRIMARY,
    fontWeight: "600",
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  sectionContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  filterGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  customDateContainer: {
    marginTop: 20,
  },
  dateInputsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  dateInputWrapper: {
    flex: 1,
  },
  dateInput: {
    marginBottom: 0,
  },

  // Switch options
  switchCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 14,
  },
  switchInfo: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  switchSubtext: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
    marginTop: 2,
  },

  // Amount range
  amountRangeContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  amountInputWrapper: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: UI.COLORS.TEXT_MUTED,
    marginBottom: 6,
  },
  amountInput: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center",
  },
  amountDash: {
    paddingBottom: 12,
  },
  amountError: {
    fontSize: 12,
    color: UI.COLORS.ERROR,
    marginTop: 8,
  },

  // Footer
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  resetButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    gap: 6,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: UI.COLORS.TEXT_SECONDARY,
  },
  applyButton: {
    flex: 2,
    borderRadius: 14,
    overflow: "hidden",
  },
  applyGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
