import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, startOfWeek, addDays, isSameDay, isSameMonth, isToday, isValid } from "date-fns";
import { UI } from "../../constants";
import { DateUtils } from "../../utils/dateUtils";

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
  const [showPicker, setShowPicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value && isValid(value) ? value : new Date());
  const [selectedTime, setSelectedTime] = useState(value && isValid(value) ? value : new Date());

  // Update internal state when value prop changes
  useEffect(() => {
    console.log("CustomDatePicker: useEffect triggered", {
      value,
      valueType: typeof value,
      isValid: DateUtils.isValid(value),
      label,
      effectTriggerReason: "value or label changed",
    });

    if (DateUtils.isValid(value)) {
      const validDate = DateUtils.toDate(value);
      console.log("CustomDatePicker: Setting valid date - NOT calling onDateChange", {
        originalValue: value,
        convertedDate: validDate,
        label,
        willCallOnDateChange: false,
      });
      setCurrentMonth(validDate);
      setSelectedTime(validDate);
    } else if (value) {
      // If we receive an invalid date, log a warning and use current date
      console.warn("CustomDatePicker: Received invalid date value - CALLING onDateChange with TODAY!", {
        value,
        valueType: typeof value,
        label,
        stackTrace: new Error().stack?.split("\n").slice(1, 4),
      });
      const fallbackDate = new Date();
      setCurrentMonth(fallbackDate);
      setSelectedTime(fallbackDate);
      // Optionally notify parent component about the invalid date
      console.log("CustomDatePicker: About to call onDateChange with fallback date (TODAY)", {
        fallbackDate,
        label,
      });
      onDateChange(fallbackDate);
    }
  }, [value, label]);

  const handleDateSelect = (date: Date) => {
    console.log("CustomDatePicker: handleDateSelect called", {
      date,
      mode,
      label,
      isValidDate: DateUtils.isValid(date),
    });

    if (mode === "datetime") {
      // Preserve time from selectedTime but use new date
      const newDateTime = new Date(date);
      if (isValid(selectedTime)) {
        newDateTime.setHours(selectedTime.getHours());
        newDateTime.setMinutes(selectedTime.getMinutes());
      } else {
        newDateTime.setHours(0);
        newDateTime.setMinutes(0);
      }
      console.log("CustomDatePicker: Calling onDateChange with datetime", {
        newDateTime,
        label,
      });
      onDateChange(newDateTime);
    } else {
      console.log("CustomDatePicker: Calling onDateChange with date", {
        date,
        label,
      });
      onDateChange(date);
    }
    setShowPicker(false);
  };

  const handleTimeChange = (hours: number, minutes: number) => {
    const baseDate = value && isValid(value) ? value : new Date();
    const newDateTime = new Date(baseDate);
    newDateTime.setHours(hours);
    newDateTime.setMinutes(minutes);
    setSelectedTime(newDateTime);
  };

  const isDateDisabled = (date: Date) => {
    if (minimumDate && date < minimumDate) return true;
    if (maximumDate && date > maximumDate) return true;
    return false;
  };

  const renderCalendarGrid = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = addDays(startDate, 41); // 6 weeks

    const days: Date[] = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return (
      <View style={styles.calendarGrid}>
        {/* Header row with day names */}
        <View style={styles.weekRow}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
            <View key={dayName} style={styles.dayHeader}>
              <Text style={styles.dayHeaderText}>{dayName}</Text>
            </View>
          ))}
        </View>

        {/* Calendar days */}
        {Array.from({ length: Math.ceil(days.length / 7) }, (_, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {days.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day) => {
              const isSelected = value && isValid(value) && isSameDay(day, value);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isCurrentDay = isToday(day);
              const disabled = isDateDisabled(day);

              return (
                <TouchableOpacity
                  key={day.toISOString()}
                  style={[
                    styles.dayButton,
                    isSelected && styles.selectedDay,
                    !isCurrentMonth && styles.otherMonthDay,
                    isCurrentDay && styles.todayDay,
                    disabled && styles.disabledDay,
                  ]}
                  onPress={() => !disabled && handleDateSelect(day)}
                  disabled={disabled}>
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.selectedDayText,
                      !isCurrentMonth && styles.otherMonthDayText,
                      isCurrentDay && styles.todayDayText,
                      disabled && styles.disabledDayText,
                    ]}>
                    {day.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const renderTimePicker = () => {
    if (mode !== "datetime") return null;

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    return (
      <View style={styles.timePickerContainer}>
        <Text style={styles.timePickerTitle}>Select Time</Text>
        <View style={styles.timePicker}>
          <View style={styles.timeColumn}>
            <Text style={styles.timeColumnHeader}>Hour</Text>
            <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
              {hours.map((hour) => (
                <TouchableOpacity
                  key={hour}
                  style={[styles.timeOption, isValid(selectedTime) && selectedTime.getHours() === hour && styles.selectedTimeOption]}
                  onPress={() => handleTimeChange(hour, isValid(selectedTime) ? selectedTime.getMinutes() : 0)}>
                  <Text style={[styles.timeOptionText, isValid(selectedTime) && selectedTime.getHours() === hour && styles.selectedTimeOptionText]}>
                    {hour.toString().padStart(2, "0")}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Text style={styles.timeSeparator}>:</Text>

          <View style={styles.timeColumn}>
            <Text style={styles.timeColumnHeader}>Minute</Text>
            <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
              {minutes
                .filter((m) => m % 5 === 0)
                .map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    style={[styles.timeOption, isValid(selectedTime) && selectedTime.getMinutes() === minute && styles.selectedTimeOption]}
                    onPress={() => handleTimeChange(isValid(selectedTime) ? selectedTime.getHours() : 0, minute)}>
                    <Text
                      style={[styles.timeOptionText, isValid(selectedTime) && selectedTime.getMinutes() === minute && styles.selectedTimeOptionText]}>
                      {minute.toString().padStart(2, "0")}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </View>
    );
  };

  const formatDisplayDate = (date: Date | undefined) => {
    if (!DateUtils.isValid(date)) return placeholder;

    try {
      if (mode === "datetime") {
        return DateUtils.formatDisplay(date, "MMM DD, YYYY HH:mm");
      }
      return DateUtils.formatDisplay(date);
    } catch (error) {
      console.warn("CustomDatePicker: Invalid date formatting", error);
      return placeholder;
    }
  };

  return (
    <>
      {showLabel && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.dateInput, style, disabled && styles.disabledInput]}
        onPress={() => !disabled && setShowPicker(true)}
        disabled={disabled}>
        <Text style={[styles.dateInputText, !value && styles.placeholderText, disabled && styles.disabledText]}>{formatDisplayDate(value)}</Text>
        <Ionicons name="calendar-outline" size={20} color={disabled ? UI.COLORS.TEXT_MUTED : UI.COLORS.TEXT_SECONDARY} />
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={UI.COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            {/* Month Navigation */}
            <View style={styles.monthNavigation}>
              <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} style={styles.monthArrow}>
                <Ionicons name="chevron-back" size={24} color={UI.COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>

              <Text style={styles.monthTitle}>{format(currentMonth, "MMMM yyyy")}</Text>

              <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} style={styles.monthArrow}>
                <Ionicons name="chevron-forward" size={24} color={UI.COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            {/* Calendar Grid */}
            {renderCalendarGrid()}

            {/* Time Picker */}
            {renderTimePicker()}

            {/* Footer Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.todayButton} onPress={() => handleDateSelect(new Date())}>
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmButton} onPress={() => setShowPicker(false)}>
                <Text style={styles.confirmButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.SM,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    borderRadius: UI.CARD_RADIUS,
    backgroundColor: UI.COLORS.SURFACE,
    paddingHorizontal: UI.SPACING.MD,
    paddingVertical: UI.SPACING.MD,
    minHeight: 48,
  },
  disabledInput: {
    backgroundColor: UI.COLORS.BACKGROUND,
    opacity: 0.6,
  },
  dateInputText: {
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  placeholderText: {
    color: UI.COLORS.TEXT_MUTED,
  },
  disabledText: {
    color: UI.COLORS.TEXT_MUTED,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: UI.COLORS.CARD,
    borderRadius: UI.CARD_RADIUS * 2,
    margin: UI.SPACING.LG,
    maxWidth: 350,
    width: "90%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: UI.SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  closeButton: {
    padding: UI.SPACING.XS,
  },
  monthNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: UI.SPACING.LG,
    paddingVertical: UI.SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
  },
  monthArrow: {
    padding: UI.SPACING.SM,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  calendarGrid: {
    padding: UI.SPACING.MD,
  },
  weekRow: {
    flexDirection: "row",
  },
  dayHeader: {
    flex: 1,
    alignItems: "center",
    paddingVertical: UI.SPACING.SM,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: UI.COLORS.TEXT_SECONDARY,
  },
  dayButton: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    margin: 1,
    borderRadius: UI.CARD_RADIUS,
  },
  selectedDay: {
    backgroundColor: UI.COLORS.PRIMARY,
  },
  todayDay: {
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.PRIMARY,
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  disabledDay: {
    opacity: 0.2,
  },
  dayText: {
    fontSize: 14,
    color: UI.COLORS.TEXT_PRIMARY,
  },
  selectedDayText: {
    color: UI.COLORS.BACKGROUND,
    fontWeight: "600",
  },
  todayDayText: {
    fontWeight: "600",
    color: UI.COLORS.PRIMARY,
  },
  otherMonthDayText: {
    color: UI.COLORS.TEXT_MUTED,
  },
  disabledDayText: {
    color: UI.COLORS.TEXT_MUTED,
  },
  timePickerContainer: {
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
    padding: UI.SPACING.MD,
  },
  timePickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.MD,
    textAlign: "center",
  },
  timePicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  timeColumn: {
    alignItems: "center",
  },
  timeColumnHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: UI.COLORS.TEXT_SECONDARY,
    marginBottom: UI.SPACING.SM,
  },
  timeScrollView: {
    height: 120,
    width: 60,
  },
  timeOption: {
    paddingVertical: UI.SPACING.SM,
    paddingHorizontal: UI.SPACING.MD,
    borderRadius: UI.CARD_RADIUS,
    marginVertical: 1,
  },
  selectedTimeOption: {
    backgroundColor: UI.COLORS.PRIMARY,
  },
  timeOptionText: {
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center",
  },
  selectedTimeOptionText: {
    color: UI.COLORS.BACKGROUND,
    fontWeight: "600",
  },
  timeSeparator: {
    fontSize: 20,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginHorizontal: UI.SPACING.MD,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: UI.SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
  },
  todayButton: {
    paddingHorizontal: UI.SPACING.LG,
    paddingVertical: UI.SPACING.MD,
    borderRadius: UI.CARD_RADIUS,
    backgroundColor: UI.COLORS.SURFACE,
  },
  todayButtonText: {
    fontSize: 16,
    color: UI.COLORS.TEXT_SECONDARY,
    fontWeight: "500",
  },
  confirmButton: {
    paddingHorizontal: UI.SPACING.LG,
    paddingVertical: UI.SPACING.MD,
    borderRadius: UI.CARD_RADIUS,
    backgroundColor: UI.COLORS.PRIMARY,
  },
  confirmButtonText: {
    fontSize: 16,
    color: UI.COLORS.BACKGROUND,
    fontWeight: "600",
  },
});
