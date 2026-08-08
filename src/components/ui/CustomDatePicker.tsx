/**
 * CustomDatePicker — floating centered overlay (not a bottom sheet).
 *
 * Flow:
 *  • Default view: single-month calendar with </> nav arrows
 *  • Tap the "August 2024" header → switches to Quick Jump (wheel picker)
 *  • Quick Jump has a back arrow to return to the calendar
 *  • Spinning the month wheel to a stop jumps the calendar there and switches back
 *  • Tapping a day selects it and closes the picker
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  format,
  startOfMonth,
  startOfWeek,
  addDays,
  isSameDay,
  isSameMonth,
  isToday,
  isValid,
  addMonths,
  subMonths,
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
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

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

// ─── Calendar view ─────────────────────────────────────────────────────────────

interface CalendarViewProps {
  viewMonth: Date;
  selected: Date | undefined;
  onSelectDay: (d: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onTitlePress: () => void;
  colors: any;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  viewMonth,
  selected,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  onTitlePress,
  colors,
}) => {
  const weeks = buildCalendarWeeks(viewMonth);

  return (
    <>
      <View style={calStyles.headerRow}>
        <TouchableOpacity onPress={onTitlePress} activeOpacity={0.7}>
          <Text style={[calStyles.monthTitle, { color: colors.onBackground }]}>
            {format(viewMonth, "MMMM yyyy")}
          </Text>
        </TouchableOpacity>
        <View style={calStyles.navRow}>
          <TouchableOpacity
            onPress={onPrevMonth}
            style={calStyles.navBtn}
            activeOpacity={0.6}>
            <Ionicons
              name="chevron-back"
              size={18}
              color={colors.onSurfaceVariant}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onNextMonth}
            style={calStyles.navBtn}
            activeOpacity={0.6}>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={calStyles.weekRow}>
        {DAYS.map((d, i) => (
          <Text
            key={i}
            style={[calStyles.dayHeader, { color: colors.onSurfaceVariant }]}>
            {d}
          </Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={calStyles.weekRow}>
          {week.map((day, di) => {
            const inMonth = isSameMonth(day, viewMonth);
            const isSel =
              selected && isValid(selected) && isSameDay(day, selected);
            const todayDay = isToday(day);

            return (
              <TouchableOpacity
                key={di}
                style={calStyles.dayCell}
                onPress={() => inMonth && onSelectDay(day)}
                activeOpacity={0.7}
                disabled={!inMonth}>
                {isSel ? (
                  <View
                    style={[
                      calStyles.circle,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                ) : todayDay ? (
                  <View
                    style={[
                      calStyles.circle,
                      { borderWidth: 1.5, borderColor: colors.primary },
                    ]}
                  />
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
                            ? colors.primary
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
    </>
  );
};

const calStyles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  monthTitle: { fontSize: 21, fontWeight: "700" },
  navRow: { flexDirection: "row", gap: 4 },
  navBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  dayHeader: {
    width: 36,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    paddingVertical: 4,
  },
  dayCell: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginVertical: 3,
  },
  circle: { position: "absolute", width: 34, height: 34, borderRadius: 17 },
  dayText: { fontSize: 15, zIndex: 1 },
});

// ─── Wheel column (infinite/scroll picker) ─────────────────────────────────────

const WHEEL_ITEM_H = 42;
const WHEEL_VISIBLE = 5; // must be odd
const WHEEL_HEIGHT = WHEEL_ITEM_H * WHEEL_VISIBLE;
const WHEEL_PAD = WHEEL_ITEM_H * Math.floor(WHEEL_VISIBLE / 2);

interface WheelColumnProps {
  values: (string | number)[];
  /** index into `values` that should be centered initially / when it changes externally */
  selectedIndex: number;
  onSettle: (index: number) => void;
  loop?: boolean;
  colors: any;
}

const WheelColumn: React.FC<WheelColumnProps> = ({
  values,
  selectedIndex,
  onSettle,
  loop = false,
  colors,
}) => {
  // For loop mode, triple the data so we can silently recenter near the edges.
  const data = loop ? [...values, ...values, ...values] : values;
  const baseOffset = loop ? values.length : 0;

  const listRef = useRef<FlatList<any>>(null);
  const scrollY = useRef(
    new Animated.Value((selectedIndex + baseOffset) * WHEEL_ITEM_H),
  ).current;
  const didInit = useRef(false);

  useEffect(() => {
    // Only snap programmatically on first mount / when the picker reopens with a new value.
    const target = (selectedIndex + baseOffset) * WHEEL_ITEM_H;
    listRef.current?.scrollToOffset({
      offset: target,
      animated: didInit.current,
    });
    didInit.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, values.length]);

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      let index = Math.round(offsetY / WHEEL_ITEM_H);
      index = Math.max(0, Math.min(data.length - 1, index));

      if (loop) {
        const realIndex =
          ((index % values.length) + values.length) % values.length;
        // If we've drifted into the first or last copy, silently jump back to the middle copy.
        if (index < values.length || index >= values.length * 2) {
          const recentered = realIndex + values.length;
          requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({
              offset: recentered * WHEEL_ITEM_H,
              animated: false,
            });
          });
        }
        onSettle(realIndex);
      } else {
        onSettle(index);
      }
    },
    [data.length, loop, onSettle, values.length],
  );

  const handlePressItem = (index: number) => {
    listRef.current?.scrollToOffset({
      offset: index * WHEEL_ITEM_H,
      animated: true,
    });
  };

  return (
    <View style={{ height: WHEEL_HEIGHT, overflow: "hidden" }}>
      {/* Center highlight pill */}
      <View
        pointerEvents="none"
        style={[
          wheelStyles.highlight,
          {
            top: WHEEL_PAD,
            height: WHEEL_ITEM_H,
            backgroundColor: colors.primaryContainer,
          },
        ]}
      />
      <Animated.FlatList
        ref={listRef}
        data={data}
        keyExtractor={(_, i) => String(i)}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_H}
        decelerationRate="fast"
        bounces={false}
        contentContainerStyle={{ paddingVertical: WHEEL_PAD }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumEnd}
        getItemLayout={(_, index) => ({
          length: WHEEL_ITEM_H,
          offset: WHEEL_ITEM_H * index,
          index,
        })}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 2) * WHEEL_ITEM_H,
            (index - 1) * WHEEL_ITEM_H,
            index * WHEEL_ITEM_H,
            (index + 1) * WHEEL_ITEM_H,
            (index + 2) * WHEEL_ITEM_H,
          ];
          const opacity = scrollY.interpolate({
            inputRange,
            outputRange: [0.15, 0.45, 1, 0.45, 0.15],
            extrapolate: "clamp",
          });
          const scale = scrollY.interpolate({
            inputRange,
            outputRange: [0.75, 0.88, 1, 0.88, 0.75],
            extrapolate: "clamp",
          });
          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handlePressItem(index)}
              style={{
                height: WHEEL_ITEM_H,
                alignItems: "center",
                justifyContent: "center",
              }}>
              <Animated.Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: colors.onBackground,
                  opacity,
                  transform: [{ scale }],
                }}>
                {item}
              </Animated.Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const wheelStyles = StyleSheet.create({
  highlight: {
    position: "absolute",
    left: 0,
    right: 0,
    borderRadius: 14,
    zIndex: -1,
  },
});

// ─── Quick Jump view ───────────────────────────────────────────────────────────

const YEAR_SPAN = 100; // years before/after "now" — wide enough to feel infinite

interface QuickJumpProps {
  viewMonth: Date;
  onJump: (d: Date) => void;
  onBack: () => void;
  colors: any;
}

const QuickJump: React.FC<QuickJumpProps> = ({
  viewMonth,
  onJump,
  onBack,
  colors,
}) => {
  const nowYear = getYear(new Date());
  const years = useRef(
    Array.from(
      { length: YEAR_SPAN * 2 + 1 },
      (_, i) => nowYear - YEAR_SPAN + i,
    ),
  ).current;

  const initialYearIndex = years.indexOf(getYear(viewMonth));
  const initialMonthIndex = getMonth(viewMonth);

  const yearRef = useRef(getYear(viewMonth));
  const monthRef = useRef(getMonth(viewMonth));

  const commit = () => {
    let d = setYear(viewMonth, yearRef.current);
    d = setMonth(d, monthRef.current);
    onJump(d);
  };

  return (
    <View>
      <View style={qjStyles.headerRow}>
        <TouchableOpacity
          onPress={onBack}
          style={qjStyles.backBtn}
          activeOpacity={0.7}>
          <Ionicons
            name="chevron-back"
            size={20}
            color={colors.onSurfaceVariant}
          />
        </TouchableOpacity>
        <Text style={[qjStyles.title, { color: colors.onBackground }]}>
          Quick Jump
        </Text>
      </View>
      <View style={qjStyles.columns}>
        <View style={qjStyles.col}>
          <WheelColumn
            values={years}
            selectedIndex={initialYearIndex}
            colors={colors}
            onSettle={(idx) => {
              yearRef.current = years[idx];
              commit();
            }}
          />
        </View>
        <View style={qjStyles.col}>
          <WheelColumn
            values={MONTHS_SHORT}
            selectedIndex={initialMonthIndex}
            loop
            colors={colors}
            onSettle={(idx) => {
              monthRef.current = idx;
              commit();
            }}
          />
        </View>
      </View>
    </View>
  );
};

const qjStyles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    gap: 8,
  },
  backBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "700" },
  columns: { flexDirection: "row", gap: 8 },
  col: { flex: 1 },
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
}) => {
  const { colors, typography } = useAppTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [pickerView, setPickerView] = useState<"calendar" | "quickJump">(
    "calendar",
  );
  const [viewMonth, setViewMonth] = useState<Date>(
    value && isValid(value) ? startOfMonth(value) : startOfMonth(new Date()),
  );

  useEffect(() => {
    if (value && isValid(value)) {
      setViewMonth(startOfMonth(DateUtils.toDate(value) ?? new Date()));
    }
  }, [value]);

  const handleOpen = () => {
    if (disabled) return;
    setViewMonth(startOfMonth(value && isValid(value) ? value : new Date()));
    setPickerView("calendar");
    setShowPicker(true);
  };

  const handleSelectDay = (day: Date) => {
    onDateChange(day);
    setShowPicker(false);
  };

  const handleJump = (d: Date) => {
    setViewMonth(startOfMonth(d));
    setPickerView("calendar");
  };

  const formatDisplay = () => {
    if (!DateUtils.isValid(value)) return placeholder;
    try {
      return DateUtils.formatDisplay(value);
    } catch {
      return placeholder;
    }
  };

  return (
    <>
      <View style={{ marginBottom: 18 }}>
        {showLabel && (
          <Text
            style={[
              typography.label,
              {
                color: colors.primary,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                marginBottom: 8,
              },
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
          onPress={handleOpen}
          disabled={disabled}
          activeOpacity={0.75}>
          <View
            style={[
              triggerStyles.iconBox,
              { backgroundColor: colors.primaryContainer + "55" },
            ]}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={colors.primary}
            />
          </View>
          <Text
            style={[
              triggerStyles.inputText,
              { color: value ? colors.onBackground : colors.onSurfaceVariant },
            ]}>
            {formatDisplay()}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.onSurfaceVariant}
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity
          style={modalStyles.overlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[
              modalStyles.card,
              {
                backgroundColor: colors.background,
                borderColor: colors.outlineVariant,
              },
            ]}>
            {pickerView === "calendar" ? (
              <CalendarView
                viewMonth={viewMonth}
                selected={value}
                onSelectDay={handleSelectDay}
                onPrevMonth={() => setViewMonth((m) => subMonths(m, 1))}
                onNextMonth={() => setViewMonth((m) => addMonths(m, 1))}
                onTitlePress={() => setPickerView("quickJump")}
                colors={colors}
              />
            ) : (
              <QuickJump
                viewMonth={viewMonth}
                onJump={handleJump}
                onBack={() => setPickerView("calendar")}
                colors={colors}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

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
  inputText: { flex: 1, fontSize: 16, paddingVertical: 16 },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
  },
});
