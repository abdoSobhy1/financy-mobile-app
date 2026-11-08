import { getStyles } from "../screens/SettingsScreen.styles";
import { useMemo } from "react";
import type { useSettingsScreen } from "../hooks/useSettingsScreen";

import { View, Text, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";

import { Ionicons } from "@expo/vector-icons";

interface BillingDayModalProps {
  showBillingDayPicker: ReturnType<typeof useSettingsScreen>["showBillingDayPicker"];
  setShowBillingDayPicker: ReturnType<typeof useSettingsScreen>["setShowBillingDayPicker"];
  isBillingDayValid: ReturnType<typeof useSettingsScreen>["isBillingDayValid"];
  billingDayInput: ReturnType<typeof useSettingsScreen>["billingDayInput"];
  setBillingDayInput: ReturnType<typeof useSettingsScreen>["setBillingDayInput"];
  parsedBillingDay: ReturnType<typeof useSettingsScreen>["parsedBillingDay"];
  getBillingDayError: ReturnType<typeof useSettingsScreen>["getBillingDayError"];
  saveBillingDay: ReturnType<typeof useSettingsScreen>["saveBillingDay"];

}
export function BillingDayModal({ showBillingDayPicker, setShowBillingDayPicker, isBillingDayValid, billingDayInput, setBillingDayInput, parsedBillingDay, getBillingDayError, saveBillingDay }: BillingDayModalProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (<Modal visible={showBillingDayPicker} transparent animationType="fade" onRequestClose={() => setShowBillingDayPicker(false)}>
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.modalOverlay}
    >
      <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
        <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Billing Cycle Start</Text>
        <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant }]}>
          Enter the day of the month your billing cycle starts (1 to 30 inclusive).
        </Text>

        <View style={{ marginBottom: 14 }}>
          <Text style={[styles.inputLabel, { color: colors.onSurfaceVariant, marginBottom: 8 }]}>
            Start Day of Month (1–30)
          </Text>
          <TextInput
            style={[
              styles.billingNumberInput,
              {
                backgroundColor: colors.surfaceVariant,
                color: colors.onSurface,
                borderColor: !isBillingDayValid && billingDayInput.length > 0 ? colors.error : colors.outlineVariant,
              },
            ]}
            value={billingDayInput}
            onChangeText={(text) => setBillingDayInput(text.replace(/[^0-9]/g, ""))}
            placeholder="e.g. 1"
            placeholderTextColor={colors.onSurfaceVariant}
            keyboardType="number-pad"
            maxLength={2}
            autoFocus
          />

          {/* Quick Presets */}
          <View style={styles.quickPresetRow}>
            <Text style={[styles.quickPresetLabel, { color: colors.onSurfaceVariant }]}>Common:</Text>
            {[1, 5, 15, 25, 28, 30].map((presetDay) => (
              <TouchableOpacity
                key={presetDay}
                style={[
                  styles.quickPresetChip,
                  {
                    backgroundColor:
                      parsedBillingDay === presetDay
                        ? colors.primary
                        : colors.surfaceVariant,
                  },
                ]}
                onPress={() => setBillingDayInput(String(presetDay))}
              >
                <Text
                  style={[
                    styles.quickPresetChipText,
                    {
                      color:
                        parsedBillingDay === presetDay
                          ? colors.onPrimary
                          : colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {presetDay}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Validation Feedback & February Handling Note */}
        {!isBillingDayValid && billingDayInput.length > 0 && (
          <View style={[styles.billingNoticeCard, { backgroundColor: colors.errorContainer, borderColor: colors.error }]}>
            <Ionicons name="alert-circle" size={18} color={colors.onErrorContainer} />
            <Text style={[styles.billingNoticeText, { color: colors.onErrorContainer, marginLeft: 8, flex: 1 }]}>
              {getBillingDayError()}
            </Text>
          </View>
        )}

        {isBillingDayValid && parsedBillingDay >= 29 && (
          <View style={[styles.billingNoticeCard, { backgroundColor: colors.secondaryContainer, borderColor: colors.secondary }]}>
            <Ionicons name="information-circle" size={18} color={colors.onSecondaryContainer} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.billingNoticeTitle, { color: colors.onSecondaryContainer }]}>
                February Handling
              </Text>
              <Text style={[styles.billingNoticeText, { color: colors.onSecondaryContainer }]}>
                February has 28 days (29 in leap years). For February, your cycle automatically starts on the final day of the month (Feb 28/29).
              </Text>
            </View>
          </View>
        )}

        {isBillingDayValid && parsedBillingDay === 1 && (
          <View style={[styles.billingNoticeCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.outlineVariant }]}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.billingNoticeText, { color: colors.onSurface }]}>
                Cycle aligns with standard calendar months (1st to the last day of each month).
              </Text>
            </View>
          </View>
        )}

        {isBillingDayValid && parsedBillingDay > 1 && parsedBillingDay < 29 && (
          <View style={[styles.billingNoticeCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.outlineVariant }]}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.billingNoticeText, { color: colors.onSurface }]}>
                Cycle runs from Day {parsedBillingDay} of each month to Day {parsedBillingDay - 1} of the next month.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowBillingDayPicker(false)}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modalSaveBtn,
              {
                backgroundColor: isBillingDayValid ? colors.primary : colors.surfaceVariant,
                opacity: isBillingDayValid ? 1 : 0.6,
              },
            ]}
            disabled={!isBillingDayValid}
            onPress={saveBillingDay}
          >
            <Text style={[styles.modalSaveText, { color: isBillingDayValid ? colors.onPrimary : colors.onSurfaceVariant }]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>);
}
