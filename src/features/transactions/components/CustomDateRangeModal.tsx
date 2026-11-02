import { Dimensions, View, Text, TouchableOpacity, Modal, ScrollView } from "react-native";
import { styles } from "./TransactionFilterModals.styles";

import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { CustomDatePicker } from "../../../shared/ui/CustomDatePicker";
import { LinearGradient } from "expo-linear-gradient";
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
interface CustomDateRangeModalProps {
  visible: boolean;
  startDate: Date;
  endDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  onClose: () => void;
  onApply: () => void;
}
const { height: SCREEN_H } = Dimensions.get("window");
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
      <ToastOverlay visible={visible} priority={1} />
    </Modal>
  );
};
