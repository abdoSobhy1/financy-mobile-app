import { getStyles } from "../screens/SettingsScreen.styles";
import { useMemo } from "react";
import type { useSettingsScreen } from "../hooks/useSettingsScreen";

import { View, Text, ScrollView, TouchableOpacity, Modal } from "react-native";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";

import { Ionicons } from "@expo/vector-icons";

import { CURRENCY_METADATA } from "../../../shared/utils";

interface CurrencyPickerModalProps {
  showCurrencyPicker: ReturnType<typeof useSettingsScreen>["showCurrencyPicker"];
  setShowCurrencyPicker: ReturnType<typeof useSettingsScreen>["setShowCurrencyPicker"];
  handleSelectCurrency: ReturnType<typeof useSettingsScreen>["handleSelectCurrency"];

}
export function CurrencyPickerModal({ showCurrencyPicker, setShowCurrencyPicker, handleSelectCurrency }: CurrencyPickerModalProps) {
  const { colors, currencyCode } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (<Modal visible={showCurrencyPicker} transparent animationType="fade" onRequestClose={() => setShowCurrencyPicker(false)}>
    <View style={styles.modalOverlay}>
      <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
        <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Select Currency</Text>
        <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant }]}>
          Choose your primary display currency across all screens.
        </Text>
        <ScrollView style={{ maxHeight: 320 }}>
          {Object.entries(CURRENCY_METADATA).map(([code, meta]) => {
            const isSelected = currencyCode === code;
            return (
              <TouchableOpacity
                key={code}
                style={[
                  styles.dayOption,
                  isSelected && styles.dayOptionActive,
                ]}
                onPress={() => handleSelectCurrency(code)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: isSelected ? colors.primary : colors.surfaceVariant,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: isSelected ? colors.onPrimary : colors.onSurface,
                        fontWeight: "700",
                        fontSize: 13,
                      }}
                    >
                      {meta.symbol}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>
                      {code}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.onSurfaceVariant }}>
                      {code === "EGP"
                        ? "Egyptian Pound"
                        : code === "USD"
                          ? "US Dollar"
                          : code === "EUR"
                            ? "Euro"
                            : code === "GBP"
                              ? "British Pound"
                              : code === "SAR"
                                ? "Saudi Riyal"
                                : "UAE Dirham"}
                    </Text>
                  </View>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCurrencyPicker(false)}>
            <Text style={styles.modalCancelText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>);
}
