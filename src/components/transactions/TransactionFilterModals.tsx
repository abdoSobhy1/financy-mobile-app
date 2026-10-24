import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CustomDatePicker } from "../ui/CustomDatePicker";
import { LinearGradient } from "expo-linear-gradient";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { useAppTheme } from "../ui/ThemeProvider";
import { WalletAccount } from "../../types";

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
  const { colors } = useAppTheme();

  const { items: categoriesMap } = useSelector(
    (state: RootState) => state.categories,
  );
  const { items: budgetsMap } = useSelector(
    (state: RootState) => state.budgets,
  );

  const allCategoriesList = useMemo(
    () => Object.values(categoriesMap || {}).filter((c) => c && !c.deleted),
    [categoriesMap],
  );

  const allBudgetsList = useMemo(
    () => Object.values(budgetsMap || {}).filter((b) => b && !b.deleted),
    [budgetsMap],
  );

  const DATE_OPTIONS = [
    { label: "Today", value: "Today" },
    { label: "This Month", value: "This Month" },
    { label: "Last Month", value: "Last Month" },
    { label: "Year", value: "Year" },
    { label: "All Time", value: "All Time" },
  ] as const;

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
            <View style={styles.chipRow}>
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
            </View>
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
            <View style={styles.chipRow}>
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
            </View>

            {/* WALLETS & ACCOUNTS */}
            {onWalletToggle && wallets.length > 0 && (
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
            )}

            {/* BUDGETS */}
            {onBudgetToggle && allBudgetsList.length > 0 && (
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
            )}

            {/* CATEGORIES */}
            {onCategoryToggle && allCategoriesList.length > 0 && (
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
            )}
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
    </Modal>
  );
};

// ─── Custom Date Range Modal ───────────────────────────────────────────────────

interface CustomDateRangeModalProps {
  visible: boolean;
  startDate: Date;
  endDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  onClose: () => void;
  onApply: () => void;
}

export const CustomDateRangeModal: React.FC<CustomDateRangeModalProps> = ({
  visible,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClose,
  onApply,
}) => {
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
              maxHeight: SCREEN_H * 0.6,
            },
          ]}>
          <View style={[styles.handle, { backgroundColor: colors.outline }]} />

          {/* Header */}
          <View
            style={[
              styles.header,
              { borderBottomColor: colors.outlineVariant },
            ]}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: colors.primaryContainer },
                ]}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={colors.onPrimaryContainer}
                />
              </View>
              <Text
                style={[styles.headerTitle, { color: colors.onBackground }]}>
                Custom Range
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: colors.surfaceVariant },
              ]}
              activeOpacity={0.7}>
              <Ionicons
                name="close"
                size={18}
                color={colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 24 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 24, marginBottom: 28 }}>
              <View>
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.onSurfaceVariant, marginBottom: 8 },
                  ]}>
                  START DATE
                </Text>
                <CustomDatePicker
                  value={startDate}
                  onDateChange={onStartDateChange}
                  label="Start"
                  showLabel={false}
                  maximumDate={endDate}
                  inline
                />
              </View>
              <View>
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.onSurfaceVariant, marginBottom: 8 },
                  ]}>
                  END DATE
                </Text>
                <CustomDatePicker
                  value={endDate}
                  onDateChange={onEndDateChange}
                  label="End"
                  showLabel={false}
                  minimumDate={startDate}
                  inline
                />
              </View>
            </View>

            <TouchableOpacity
              style={{ height: 54, borderRadius: 27, overflow: "hidden" }}
              onPress={onApply}
              activeOpacity={0.85}>
              <LinearGradient
                colors={[colors.primary, colors.primaryContainer]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}>
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={colors.onPrimaryContainer}
                />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: colors.onPrimaryContainer,
                  }}>
                  Apply
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    height: SCREEN_H * 0.88,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: "hidden",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  segmentRow: {
    flexDirection: "row",
    borderRadius: 24,
    padding: 4,
    marginBottom: 24,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 38,
    borderRadius: 20,
  },
  segmentText: {
    fontSize: 14,
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 16,
  },
  card: {
    width: "48%", // two columns
    height: 90,
    borderRadius: 16,
    padding: 14,
    justifyContent: "space-between",
  },
  cardText: {
    fontSize: 14,
  },
  customDateBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  footerBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  footerBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
