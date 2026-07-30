import React from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI, VALIDATION } from "../../../constants";
import { TransactionFormData } from "../../../types";
import { normalizeNumerals } from "../../../utils/mathUtils";

interface TransactionFormFieldsProps {
  formData: TransactionFormData;
  errors: Record<string, string>;
  onFieldChange: (field: keyof TransactionFormData, value: any) => void;
  descriptionRef?: React.RefObject<TextInput> | null;
}

export const TransactionFormFields: React.FC<TransactionFormFieldsProps> = ({
  formData,
  errors,
  onFieldChange,
  descriptionRef,
}) => (
  <>
    {/* ── Description ─────────────────────────────────────── */}
    <View style={styles.section}>
      <Text style={styles.label}>Description</Text>
      <View
        style={[styles.inputCard, errors.description && styles.inputCardError]}>
        <View style={styles.iconBox}>
          <Ionicons
            name="document-text-outline"
            size={18}
            color={UI.COLORS.PRIMARY_LIGHT}
          />
        </View>
        <TextInput
          ref={descriptionRef}
          style={styles.input}
          placeholder="What was this for?"
          placeholderTextColor={UI.COLORS.TEXT_MUTED}
          value={formData.description}
          onChangeText={(text) => onFieldChange("description", text)}
          maxLength={VALIDATION.TRANSACTION.MAX_DESCRIPTION_LENGTH}
          returnKeyType="next"
        />
      </View>
      {errors.description && (
        <Text style={styles.errorText}>{errors.description}</Text>
      )}
    </View>

    {/* ── Amount ──────────────────────────────────────────── */}
    <View style={styles.section}>
      <Text style={styles.label}>Amount</Text>
      <View style={[styles.inputCard, errors.amount && styles.inputCardError]}>
        <View style={styles.iconBox}>
          <Ionicons
            name="cash-outline"
            size={18}
            color={UI.COLORS.PRIMARY_LIGHT}
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="0.00 (supports math: 100+50)"
          placeholderTextColor={UI.COLORS.TEXT_MUTED}
          value={formData.amount}
          onChangeText={(text) => onFieldChange("amount", text)}
          onBlur={() => {
            const normalized = normalizeNumerals(formData.amount);
            if (normalized !== formData.amount) {
              onFieldChange("amount", normalized);
            }
          }}
          keyboardType="default"
          returnKeyType="next"
        />
      </View>
      {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
    </View>

    {/* ── Notes ───────────────────────────────────────────── */}
    <View style={styles.section}>
      <Text style={styles.label}>Notes</Text>
      <View style={styles.inputCard}>
        <View
          style={[styles.iconBox, { alignSelf: "flex-start", marginTop: 14 }]}>
          <Ionicons
            name="pencil-outline"
            size={18}
            color={UI.COLORS.PRIMARY_LIGHT}
          />
        </View>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Additional notes…"
          placeholderTextColor={UI.COLORS.TEXT_MUTED}
          value={formData.note}
          onChangeText={(text) => onFieldChange("note", text)}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
    </View>
  </>
);

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: UI.COLORS.PRIMARY_LIGHT,
    marginBottom: 8,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  inputCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20,20,50,0.65)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#6c5ce726",
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  inputCardError: {
    borderColor: "rgba(255,107,107,0.6)",
    shadowColor: UI.COLORS.ERROR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(108,92,231,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    paddingVertical: 14,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 14,
    paddingBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: UI.COLORS.ERROR,
    marginTop: 6,
    marginLeft: 4,
  },
});
