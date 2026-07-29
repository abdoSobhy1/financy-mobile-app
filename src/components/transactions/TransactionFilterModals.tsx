import React, { useCallback, useRef, useMemo, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../constants";
import { CustomDatePicker } from "../ui/CustomDatePicker";
import { LinearGradient } from "expo-linear-gradient";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";

// ── Shared Filter Pill ───────────────────────────────────────────────
const FilterPill = ({
  label,
  isActive,
  onPress,
  icon,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  icon?: string;
}) => (
  <TouchableOpacity
    style={[styles.filterPill, isActive && styles.filterPillActive]}
    onPress={onPress}>
    {icon && (
      <Ionicons
        name={icon as any}
        size={16}
        color={isActive ? "#fff" : UI.COLORS.TEXT_MUTED}
        style={{ marginRight: 6 }}
      />
    )}
    <Text
      style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

type FilterPeriod = "all" | "month" | "year" | "custom";
type FilterType = "all" | "income" | "expense";

// ── Filter Modal ────────────────────────────────────────────────────
interface TransactionFilterModalProps {
  visible: boolean;
  filterType: FilterType;
  filterPeriod: FilterPeriod;
  onFilterTypeChange: (type: FilterType) => void;
  onFilterPeriodChange: (period: FilterPeriod) => void;
  onOpenCustomDate: () => void;
  onClose: () => void;
}

export const TransactionFilterModal: React.FC<TransactionFilterModalProps> = ({
  visible,
  filterType,
  filterPeriod,
  onFilterTypeChange,
  onFilterPeriodChange,
  onOpenCustomDate,
  onClose,
}) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["80%"], []);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

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
      <BottomSheetView style={styles.sheetContent}>
        {/* Header */}
        <View style={styles.sheetHeader}>
          <View style={styles.sheetHeaderLeft}>
            <View style={styles.sheetHeaderIcon}>
              <Ionicons
                name="funnel-outline"
                size={16}
                color={UI.COLORS.PRIMARY}
              />
            </View>
            <Text style={styles.sheetTitle}>Filters</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn}>
            <Ionicons name="close" size={20} color={UI.COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>

        {/* Type */}
        <Text style={styles.sectionLabel}>Type</Text>
        <View style={styles.pillRow}>
          <FilterPill
            label="All"
            isActive={filterType === "all"}
            onPress={() => onFilterTypeChange("all")}
            icon="layers"
          />
          <FilterPill
            label="Income"
            isActive={filterType === "income"}
            onPress={() => onFilterTypeChange("income")}
            icon="trending-up"
          />
          <FilterPill
            label="Expense"
            isActive={filterType === "expense"}
            onPress={() => onFilterTypeChange("expense")}
            icon="trending-down"
          />
        </View>

        {/* Period */}
        <Text style={styles.sectionLabel}>Period</Text>
        <View style={styles.pillRow}>
          <FilterPill
            label="All Time"
            isActive={filterPeriod === "all"}
            onPress={() => onFilterPeriodChange("all")}
            icon="infinite"
          />
          <FilterPill
            label="Month"
            isActive={filterPeriod === "month"}
            onPress={() => onFilterPeriodChange("month")}
            icon="calendar"
          />
          <FilterPill
            label="Year"
            isActive={filterPeriod === "year"}
            onPress={() => onFilterPeriodChange("year")}
            icon="today"
          />
          <FilterPill
            label="Custom"
            isActive={filterPeriod === "custom"}
            onPress={() => {
              onFilterPeriodChange("custom");
              onOpenCustomDate();
            }}
            icon="options"
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

// ── Custom Date Range Modal ─────────────────────────────────────────
interface CustomDateRangeModalProps {
  visible: boolean;
  startDate?: Date;
  endDate?: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  onApply: () => void;
  onClose: () => void;
}

export const CustomDateRangeModal: React.FC<CustomDateRangeModalProps> = ({
  visible,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApply,
  onClose,
}) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["42%"], []);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

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
      <BottomSheetView style={styles.sheetContent}>
        {/* Header */}
        <View style={styles.sheetHeader}>
          <View style={styles.sheetHeaderLeft}>
            <View style={styles.sheetHeaderIcon}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={UI.COLORS.PRIMARY}
              />
            </View>
            <Text style={styles.sheetTitle}>Custom Range</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn}>
            <Ionicons name="close" size={20} color={UI.COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>

        <View style={styles.dateRow}>
          <View style={styles.dateCol}>
            <Text style={styles.dateLabel}>Start</Text>
            <CustomDatePicker
              value={startDate}
              onDateChange={onStartDateChange}
              label="Start"
              showLabel={false}
            />
          </View>
          <View style={styles.dateCol}>
            <Text style={styles.dateLabel}>End</Text>
            <CustomDatePicker
              value={endDate}
              onDateChange={onEndDateChange}
              label="End"
              showLabel={false}
              minimumDate={startDate}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.applyBtn} onPress={onApply}>
          <LinearGradient
            colors={[UI.COLORS.PRIMARY_LIGHT, UI.COLORS.PRIMARY]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.applyGradient}>
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.applyBtnText}>Apply</Text>
          </LinearGradient>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

// ── Styles ──────────────────────────────────────────────────────────
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
  sheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sheetHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sheetHeaderIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: UI.COLORS.PRIMARY + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  sheetCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: UI.COLORS.TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  filterPillActive: {
    backgroundColor: UI.COLORS.PRIMARY,
    borderColor: UI.COLORS.PRIMARY_LIGHT,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: UI.COLORS.TEXT_SECONDARY,
  },
  filterPillTextActive: {
    color: "#fff",
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  dateCol: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: UI.COLORS.TEXT_MUTED,
    marginBottom: 6,
  },
  applyBtn: {
    marginTop: 20,
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
  applyBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
