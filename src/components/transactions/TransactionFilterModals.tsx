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
  | "All"
  | "Income"
  | "Expense";

// ─── Filter Modal ──────────────────────────────────────────────────────────────

interface TransactionFilterModalProps {
  visible: boolean;
  filterType: FilterType;
  filterPeriod: FilterPeriod;
  selectedCategoryIds?: Set<string>;
  onFilterTypeChange: (type: FilterType) => void;
  onFilterPeriodChange: (period: FilterPeriod) => void;
  onCategoryToggle?: (id: string) => void;
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
  onFilterTypeChange,
  onFilterPeriodChange,
  onCategoryToggle,
  onOpenCustomDate,
  onReset,
  onApply,
  onClose,
}) => {
  const { colors } = useAppTheme();

  const { items: categoriesMap } = useSelector(
    (state: RootState) => state.categories,
  );
  const allCategoriesList = useMemo(
    () => Object.values(categoriesMap || {}).filter((c) => c && !c.deleted),
    [categoriesMap],
  );

  const DATE_OPTIONS = [
    { label: "Today", value: "Today" },
    { label: "This Month", value: "This Month" },
    { label: "Last Month", value: "Last Month" },
    { label: "Year", value: "Year" },
    { label: "All Time", value: "All Time" },
    { label: "Custom", value: "custom" },
  ] as const;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
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
                  (item.value === "Year" && filterPeriod === "year") ||
                  (item.value === "custom" && filterPeriod === "custom");

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
                          : colors.outlineVariant,
                      },
                    ]}
                    onPress={() => {
                      onFilterPeriodChange(item.value as FilterPeriod);
                      if (item.value === "custom" && onOpenCustomDate)
                        onOpenCustomDate();
                    }}
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

            {/* TRANSACTION TYPE */}
            <Text
              style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>
              TRANSACTION TYPE
            </Text>
            <View
              style={[
                styles.segmentRow,
                { backgroundColor: colors.surfaceVariant },
              ]}>
              {(["All", "Income", "Expense"] as const).map((t) => {
                const isActive =
                  filterType === t ||
                  filterType.toLowerCase() === t.toLowerCase();
                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.segment,
                      isActive && { backgroundColor: colors.primaryContainer },
                    ]}
                    onPress={() => onFilterTypeChange(t as FilterType)}
                    activeOpacity={0.8}>
                    {isActive && (
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={colors.onPrimaryContainer}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <Text
                      style={[
                        styles.segmentText,
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

            {/* CATEGORIES */}
            {onCategoryToggle && (
              <>
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.onSurfaceVariant },
                  ]}>
                  CATEGORIES
                </Text>
                <View style={styles.categoryGrid}>
                  {allCategoriesList.map((cat) => {
                    const isSelected = selectedCategoryIds.has(cat.id);
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: isSelected
                              ? colors.primaryContainer
                              : colors.surfaceVariant,
                            borderColor: isSelected
                              ? colors.primary
                              : colors.outlineVariant,
                          },
                        ]}
                        onPress={() => onCategoryToggle(cat.id)}
                        activeOpacity={0.8}>
                        <View style={styles.categoryChipInner}>
                          <Ionicons
                            name={
                              ((cat as any)?.icon || "receipt-outline") as any
                            }
                            size={18}
                            color={
                              isSelected
                                ? colors.onPrimaryContainer
                                : cat.color || colors.primary
                            }
                          />
                          <Text
                            style={[
                              styles.categoryChipText,
                              {
                                color: isSelected
                                  ? colors.onPrimaryContainer
                                  : colors.onSurface,
                                fontWeight: isSelected ? "700" : "600",
                              },
                            ]}
                            numberOfLines={1}>
                            {cat.name}
                          </Text>
                        </View>
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={colors.onPrimaryContainer}
                          />
                        )}
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

          <View style={{ padding: 24 }}>
            <View style={{ flexDirection: "row", gap: 16, marginBottom: 28 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.onSurfaceVariant, marginBottom: 8 },
                  ]}>
                  START
                </Text>
                <CustomDatePicker
                  value={startDate}
                  onDateChange={onStartDateChange}
                  label="Start"
                  showLabel={false}
                  maximumDate={endDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.onSurfaceVariant, marginBottom: 8 },
                  ]}>
                  END
                </Text>
                <CustomDatePicker
                  value={endDate}
                  onDateChange={onEndDateChange}
                  label="End"
                  showLabel={false}
                  minimumDate={startDate}
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
          </View>
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
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  categoryChipInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  categoryChipText: {
    fontSize: 13,
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
