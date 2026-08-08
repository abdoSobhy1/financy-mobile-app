import React, { useCallback, useRef, useMemo, useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CustomDatePicker } from "../ui/CustomDatePicker";
import { LinearGradient } from "expo-linear-gradient";
import {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { useAppTheme } from "../ui/ThemeProvider";

export type FilterPeriod = "all" | "month" | "year" | "custom" | "Today" | "This Month" | "Last Month" | "Year" | "All Time";
export type FilterType = "all" | "income" | "expense" | "All" | "Income" | "Expense";

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
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["85%"], []);

  const { items: categoriesMap } = useSelector(
    (state: RootState) => state.categories,
  );
  const allCategoriesList = useMemo(
    () => Object.values(categoriesMap || {}).filter((c) => c && !c.deleted),
    [categoriesMap],
  );

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
      backgroundStyle={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
      }}
      handleIndicatorStyle={{ backgroundColor: colors.outline }}>
      <BottomSheetView style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.outlineVariant,
          }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: colors.onBackground,
            }}>
            Filter Transactions
          </Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={24} color={colors.onBackground} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}>
          {/* DATE RANGE SECTION */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: colors.onSurfaceVariant,
              letterSpacing: 0.8,
              marginBottom: 12,
            }}>
            DATE RANGE
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 24,
            }}>
            {(
              [
                { label: "Today", value: "Today" },
                { label: "This Month", value: "This Month" },
                { label: "Last Month", value: "Last Month" },
                { label: "Year", value: "Year" },
                { label: "All Time", value: "All Time" },
                { label: "Custom", value: "custom" },
              ] as const
            ).map((item) => {
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
                    {
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                      borderRadius: 20,
                      backgroundColor: colors.surfaceVariant,
                      borderWidth: 1,
                      borderColor: colors.outlineVariant,
                    },
                    isActive && {
                      backgroundColor: colors.primaryContainer,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => {
                    onFilterPeriodChange(item.value as any);
                    if (item.value === "custom" && onOpenCustomDate) {
                      onOpenCustomDate();
                    }
                  }}
                  activeOpacity={0.8}>
                  <Text
                    style={[
                      {
                        fontSize: 14,
                        fontWeight: "600",
                        color: colors.onSurfaceVariant,
                      },
                      isActive && { color: colors.onPrimaryContainer, fontWeight: "700" },
                    ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* TRANSACTION TYPE SECTION */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: colors.onSurfaceVariant,
              letterSpacing: 0.8,
              marginBottom: 12,
            }}>
            TRANSACTION TYPE
          </Text>
          <View
            style={{
              flexDirection: "row",
              backgroundColor: colors.surfaceVariant,
              borderRadius: 24,
              padding: 4,
              marginBottom: 24,
            }}>
            {(["All", "Income", "Expense"] as const).map((t) => {
              const isActive =
                filterType === t || filterType.toLowerCase() === t.toLowerCase();
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    {
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 38,
                      borderRadius: 20,
                    },
                    isActive && { backgroundColor: colors.primaryContainer },
                  ]}
                  onPress={() => onFilterTypeChange(t as any)}
                  activeOpacity={0.8}>
                  {isActive && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={colors.onPrimaryContainer}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text
                    style={[
                      {
                        fontSize: 14,
                        fontWeight: "600",
                        color: colors.onSurfaceVariant,
                      },
                      isActive && {
                        color: colors.onPrimaryContainer,
                        fontWeight: "700",
                      },
                    ]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* BUDGET CATEGORIES SECTION */}
          {onCategoryToggle && (
            <>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: colors.onSurfaceVariant,
                  letterSpacing: 0.8,
                  marginBottom: 12,
                }}>
                BUDGET CATEGORIES
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  gap: 12,
                }}>
                {allCategoriesList.map((cat) => {
                  const isSelected = selectedCategoryIds.has(cat.id);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        {
                          width: "48%",
                          backgroundColor: colors.surfaceVariant,
                          borderRadius: 20,
                          padding: 16,
                          borderWidth: 1,
                          borderColor: colors.outlineVariant,
                        },
                        isSelected && {
                          backgroundColor: colors.primaryContainer,
                          borderColor: colors.primaryContainer,
                        },
                      ]}
                      onPress={() => onCategoryToggle(cat.id)}
                      activeOpacity={0.8}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 10,
                        }}>
                        <Ionicons
                          name={(((cat as any)?.icon as any) || "receipt-outline") as any}
                          size={22}
                          color={isSelected ? colors.onPrimaryContainer : cat.color || colors.primary}
                        />
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color={colors.onPrimaryContainer}
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          {
                            fontSize: 14,
                            fontWeight: "600",
                            color: colors.onSurface,
                          },
                          isSelected && {
                            color: colors.onPrimaryContainer,
                            fontWeight: "700",
                          },
                        ]}
                        numberOfLines={1}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </BottomSheetScrollView>

        {/* Modal Bottom Buttons */}
        {(onReset || onApply) && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: 24,
              paddingVertical: 18,
              borderTopWidth: 1,
              borderTopColor: colors.outlineVariant,
            }}>
            <TouchableOpacity
              style={{
                flex: 1,
                height: 52,
                borderRadius: 26,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: colors.outlineVariant,
                backgroundColor: colors.surfaceVariant,
              }}
              onPress={() => {
                if (onReset) onReset();
              }}
              activeOpacity={0.7}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.onSurface,
                }}>
                Reset
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                height: 52,
                borderRadius: 26,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primaryContainer,
              }}
              onPress={() => {
                if (onApply) onApply();
                else onClose();
              }}
              activeOpacity={0.8}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: colors.onPrimaryContainer,
                }}>
                Apply Filters
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
};

// ── Custom Date Range Modal ─────────────────────────────────────────
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
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["60%"], []);

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
      backgroundStyle={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
      }}
      handleIndicatorStyle={{ backgroundColor: colors.outline }}>
      <BottomSheetView style={{ flex: 1, padding: 24 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.primaryContainer,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 16,
              }}>
              <Ionicons name="calendar-outline" size={20} color={colors.onPrimaryContainer} />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: colors.onBackground,
              }}>
              Custom Range
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.surfaceVariant,
              alignItems: "center",
              justifyContent: "center",
            }}>
            <Ionicons name="close" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: "row", gap: 16, marginBottom: 32 }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.onSurfaceVariant,
                marginBottom: 8,
                letterSpacing: 0.5,
              }}>
              Start
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
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.onSurfaceVariant,
                marginBottom: 8,
                letterSpacing: 0.5,
              }}>
              End
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
          style={{
            height: 56,
            borderRadius: 28,
            overflow: "hidden",
            marginTop: "auto",
          }}
          onPress={onApply}
          activeOpacity={0.8}>
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
            <Ionicons name="checkmark" size={20} color={colors.onPrimaryContainer} />
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
      </BottomSheetView>
    </BottomSheetModal>
  );
};
