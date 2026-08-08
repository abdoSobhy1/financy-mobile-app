/**
 * CustomDatePicker  — redesigned to match the design mockup.
 *
 * Features:
 *  • Horizontal quick-filter chips: Today / This Week / This Month / Last 30d
 *  • Two-month scrollable calendar grid
 *  • Selected day: filled teal circle
 *  • Today (unselected): teal outline circle
 *  • Range-highlighted days (start of week → selected) subtle fill
 *  • Quick Jump section: scrollable year list + month grid
 *  • X close / Save header
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  FlatList,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
  isSameDay,
  isSameMonth,
  isToday,
  isValid,
  addMonths,
  subMonths,
  startOfWeek as _sow,
  endOfWeek,
  startOfDay,
  endOfDay,
  subDays,
  isWithinInterval,
  getYear,
  getMonth,
  setMonth,
  setYear,
} from "date-fns";
import { DateUtils } from "../../utils/dateUtils";
import { useAppTheme } from "./ThemeProvider";

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface CustomDatePickerProps {
  value?: Date;
  onDateChange: (date: Date) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: any;
  label?: string;
  showLabel?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  mode?: "date" | "datetime";
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function buildCalendarWeeks(month: Date): Date[][] {
  const start = startOfWeek(startOfMonth(month));
  const end = addDays(start, 41);
  const weeks: Date[][] = [];
  let day = start;
  while (day <= end) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const Chip: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
  colors: any;
}> = ({ label, active, onPress, colors }) => (
  <TouchableOpacity
    style={[
      chipStyles.chip,
      {
        backgroundColor: active ? colors.primaryContainer : colors.surfaceVariant,
        borderColor: active ? colors.primary : "transparent",
      },
    ]}
    onPress={onPress}
    activeOpacity={0.7}>
    <Text
      style={[
        chipStyles.chipText,
        { color: active ? colors.onPrimaryContainer : colors.onSurfaceVariant },
      ]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    marginRight: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
});

// ─── Main Calendar Modal Content ───────────────────────────────────────────────

interface CalendarMonthProps {
  month: Date;
  selected: Date | undefined;
  onSelect: (d: Date) => void;
  colors: any;
  typography: any;
}

const CalendarMonth: React.FC<CalendarMonthProps> = ({
  month,
  selected,
  onSelect,
  colors,
  typography,
}) => {
  const weeks = buildCalendarWeeks(month);
  const ACCENT = colors.primary;
  const ACCENT_BG = colors.primaryContainer + "55"; // semi-transparent

  return (
    <View style={calStyles.monthBlock}>
      <Text style={[calStyles.monthTitle, { color: colors.onBackground }]}>
        {format(month, "MMMM yyyy")}
      </Text>

      {/* Day-of-week header */}
      <View style={calStyles.weekRow}>
        {DAYS.map((d, i) => (
          <Text key={i} style={[calStyles.dayHeader, { color: colors.onSurfaceVariant }]}>
            {d}
          </Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={calStyles.weekRow}>
          {week.map((day, di) => {
            const inMonth = isSameMonth(day, month);
            const isSel = selected && isValid(selected) && isSameDay(day, selected);
            const todayDay = isToday(day);

            return (
              <TouchableOpacity
                key={di}
                style={[calStyles.dayCell]}
                onPress={() => inMonth && onSelect(day)}
                activeOpacity={0.7}
                disabled={!inMonth}>
                {/* Background circle */}
                {isSel ? (
                  <View style={[calStyles.circle, { backgroundColor: ACCENT }]} />
                ) : todayDay ? (
                  <View style={[calStyles.circle, { borderWidth: 1.5, borderColor: ACCENT }]} />
                ) : null}

                <Text
                  style={[
                    calStyles.dayText,
                    {
                      color: !inMonth
                        ? colors.onSurfaceVariant + "44"
                        : isSel
                        ? colors.onPrimary
                        : todayDay
                        ? ACCENT
                        : colors.onBackground,
                      fontWeight: isSel || todayDay ? "700" : "400",
                    },
                  ]}>
                  {format(day, "d")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const calStyles = StyleSheet.create({
  monthBlock: {
    marginBottom: 24,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    padding: 16,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 2,
  },
  dayHeader: {
    width: 36,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    paddingVertical: 4,
  },
  dayCell: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginVertical: 1,
  },
  circle: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  dayText: {
    fontSize: 14,
    zIndex: 1,
  },
});

// ─── Quick Jump ────────────────────────────────────────────────────────────────

interface QuickJumpProps {
  selectedDate: Date;
  onJump: (d: Date) => void;
  colors: any;
}

const QuickJump: React.FC<QuickJumpProps> = ({ selectedDate, onJump, colors }) => {
  const currentYear = getYear(selectedDate);
  const currentMonth = getMonth(selectedDate);
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 2 + i);
  const [jumpYear, setJumpYear] = useState(currentYear);

  const handleMonthSelect = (monthIdx: number) => {
    let newDate = setYear(selectedDate, jumpYear);
    newDate = setMonth(newDate, monthIdx);
    onJump(newDate);
  };

  return (
    <View style={[qjStyles.container, { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 20 }]}>
      <Text style={[qjStyles.title, { color: colors.onBackground }]}>Quick Jump</Text>
      <View style={qjStyles.columns}>
        {/* Year column */}
        <View style={qjStyles.col}>
          {years.map((y) => {
            const isActive = y === jumpYear;
            return (
              <TouchableOpacity
                key={y}
                style={[qjStyles.item, isActive && { backgroundColor: colors.primaryContainer, borderRadius: 14 }]}
                onPress={() => setJumpYear(y)}>
                <Text
                  style={[
                    qjStyles.itemText,
                    {
                      color: isActive ? colors.onPrimaryContainer : colors.onSurfaceVariant,
                      fontWeight: isActive ? "700" : "400",
                    },
                  ]}>
                  {y}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Month column */}
        <View style={qjStyles.col}>
          {MONTHS_SHORT.map((m, idx) => {
            const isActive = idx === currentMonth && jumpYear === currentYear;
            return (
              <TouchableOpacity
                key={m}
                style={[qjStyles.item, isActive && { backgroundColor: colors.primaryContainer, borderRadius: 14 }]}
                onPress={() => handleMonthSelect(idx)}>
                <Text
                  style={[
                    qjStyles.itemText,
                    {
                      color: isActive ? colors.onPrimaryContainer : colors.onSurfaceVariant,
                      fontWeight: isActive ? "700" : "400",
                    },
                  ]}>
                  {m}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const qjStyles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 14 },
  columns: { flexDirection: "row", gap: 8 },
  col: { flex: 1, gap: 2 },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  itemText: { fontSize: 15 },
});

// ─── Main Picker ───────────────────────────────────────────────────────────────

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onDateChange,
  placeholder = "Select date",
  disabled = false,
  style,
  label = "Date",
  showLabel = true,
  minimumDate,
  maximumDate,
  mode = "date",
}) => {
  const { colors, typography, spacing } = useAppTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(
    value && isValid(value) ? value : new Date(),
  );

  // Quick-filter chip state
  type QuickFilter = "today" | "week" | "month" | "last30" | "custom";
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("custom");

  useEffect(() => {
    if (value && isValid(value)) {
      setTempDate(DateUtils.toDate(value) ?? new Date());
    }
  }, [value]);

  const handleChip = (filter: QuickFilter) => {
    setQuickFilter(filter);
    const now = new Date();
    let d = now;
    if (filter === "today") d = now;
    else if (filter === "week") d = startOfWeek(now);
    else if (filter === "month") d = startOfMonth(now);
    else if (filter === "last30") d = subDays(now, 30);
    setTempDate(d);
  };

  const handleDaySelect = (day: Date) => {
    setQuickFilter("custom");
    setTempDate(day);
  };

  const handleSave = () => {
    onDateChange(tempDate);
    setShowPicker(false);
  };

  const handleJump = (d: Date) => {
    setTempDate(d);
  };

  const formatDisplay = () => {
    if (!DateUtils.isValid(value)) return placeholder;
    try {
      return DateUtils.formatDisplay(value);
    } catch {
      return placeholder;
    }
  };

  // Build two months to show
  const month1 = startOfMonth(tempDate);
  const month2 = addMonths(month1, 1);

  return (
    <>
      {/* Trigger button */}
      <View style={{ marginBottom: 18 }}>
        {showLabel && (
          <Text
            style={[
              typography.label,
              { color: colors.primary, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 },
            ]}>
            {label}
          </Text>
        )}
        <TouchableOpacity
          style={[
            triggerStyles.input,
            {
              backgroundColor: colors.surfaceVariant,
              borderColor: colors.outlineVariant,
            },
            disabled && { opacity: 0.5 },
            style,
          ]}
          onPress={() => {
            if (!disabled) {
              setTempDate(value && isValid(value) ? value : new Date());
              setShowPicker(true);
            }
          }}
          disabled={disabled}
          activeOpacity={0.75}>
          <View style={[triggerStyles.iconBox, { backgroundColor: colors.primaryContainer + "55" }]}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          </View>
          <Text
            style={[
              triggerStyles.inputText,
              { color: value ? colors.onBackground : colors.onSurfaceVariant },
            ]}>
            {formatDisplay()}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      {/* Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowPicker(false)}>
        <View style={[modalStyles.overlay, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
          <View
            style={[
              modalStyles.sheet,
              { backgroundColor: colors.background, borderColor: colors.outlineVariant },
            ]}>
            {/* Header */}
            <View style={[modalStyles.header, { borderBottomColor: colors.outlineVariant }]}>
              <TouchableOpacity onPress={() => setShowPicker(false)} style={modalStyles.headerBtn}>
                <Ionicons name="close" size={22} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
              <Text style={[modalStyles.headerTitle, { color: colors.onBackground }]}>Select Date</Text>
              <TouchableOpacity onPress={handleSave} style={modalStyles.headerBtn}>
                <Text style={[modalStyles.saveText, { color: colors.primary }]}>Save</Text>
              </TouchableOpacity>
            </View>

            {/* Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={modalStyles.chipsScroll}
              contentContainerStyle={modalStyles.chipsContent}>
              <Chip label="Today" active={quickFilter === "today"} onPress={() => handleChip("today")} colors={colors} />
              <Chip label="This Week" active={quickFilter === "week"} onPress={() => handleChip("week")} colors={colors} />
              <Chip label="This Month" active={quickFilter === "month"} onPress={() => handleChip("month")} colors={colors} />
              <Chip label="Last 30 Days" active={quickFilter === "last30"} onPress={() => handleChip("last30")} colors={colors} />
            </ScrollView>

            {/* Scrollable calendars + quick jump */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={modalStyles.scrollContent}
              showsVerticalScrollIndicator={false}>
              <CalendarMonth month={month1} selected={tempDate} onSelect={handleDaySelect} colors={colors} typography={typography} />
              <CalendarMonth month={month2} selected={tempDate} onSelect={handleDaySelect} colors={colors} typography={typography} />
              <QuickJump selectedDate={tempDate} onJump={handleJump} colors={colors} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const { height: SCREEN_H } = Dimensions.get("window");

const triggerStyles = StyleSheet.create({
  input: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    minHeight: 54,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 16,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: SCREEN_H * 0.92,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  saveText: {
    fontSize: 16,
    fontWeight: "700",
  },
  chipsScroll: {
    flexGrow: 0,
    paddingVertical: 12,
  },
  chipsContent: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
});
