import React from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../theme";
import { VALIDATION } from "../../../constants";
import { TransactionFormData } from "../../../types";
import { normalizeNumerals } from "../../../utils/mathUtils";

interface TransactionFormFieldsProps {
  formData: TransactionFormData;
  errors: Record<string, string>;
  onFieldChange: (field: keyof TransactionFormData, value: any) => void;
  descriptionRef?: React.RefObject<TextInput | null> | null;
  amountRef?: React.RefObject<TextInput | null> | null;
}

export const TransactionFormFields: React.FC<TransactionFormFieldsProps> = ({
  formData,
  errors,
  onFieldChange,
  descriptionRef,
  amountRef,
}) => {
  const { colors, typography, spacing, radius } = useAppTheme();

  return (
    <>
      {/* ── Amount (Hero Field) ───────────────────────────── */}
      <View style={[styles.section, { marginBottom: spacing.s20 }]}>
        <Text
          style={[
            styles.label,
            typography.labelMedium,
            { color: colors.primary },
          ]}>
          Amount
        </Text>
        <View
          style={[
            styles.amountCard,
            {
              backgroundColor: colors.surface,
              borderRadius: radius.large, // 20px prominent hero radius
              borderColor: errors.amount ? colors.error : colors.outline,
              borderWidth: errors.amount ? 1.5 : StyleSheet.hairlineWidth,
              paddingHorizontal: spacing.s16,
              paddingVertical: spacing.s8,
            },
          ]}>
          <Text
            style={[
              typography.headlineMedium,
              { color: colors.onSurfaceVariant, marginRight: spacing.s8 },
            ]}>
            $
          </Text>
          <TextInput
            ref={amountRef}
            style={[
              typography.displayLarge,
              {
                flex: 1,
                color: colors.onSurface,
                paddingVertical: spacing.s8,
              },
            ]}
            placeholder="0.00"
            placeholderTextColor={colors.onSurfaceVariant}
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
        {errors.amount && (
          <Text
            style={[
              styles.errorText,
              typography.caption,
              { color: colors.error, marginTop: spacing.s4 },
            ]}>
            {errors.amount}
          </Text>
        )}
      </View>

      {/* ── Description ───────────────────────────────────── */}
      <View style={[styles.section, { marginBottom: spacing.s20 }]}>
        <Text
          style={[
            styles.label,
            typography.labelMedium,
            { color: colors.primary },
          ]}>
          Description
        </Text>
        <View
          style={[
            styles.inputCard,
            {
              backgroundColor: colors.surface,
              borderRadius: radius.medium, // 16px radius
              borderColor: errors.description
                ? colors.error
                : colors.outline,
              borderWidth: errors.description
                ? 1.5
                : StyleSheet.hairlineWidth,
              paddingHorizontal: spacing.s16,
              paddingVertical: spacing.s4,
            },
          ]}>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: colors.primaryContainer,
                borderRadius: radius.small,
              },
            ]}>
            <Ionicons
              name="document-text-outline"
              size={18}
              color={colors.primary}
            />
          </View>
          <TextInput
            ref={descriptionRef}
            style={[
              styles.input,
              typography.bodyLarge,
              {
                color: colors.onSurface,
                paddingVertical: spacing.s12,
              },
            ]}
            placeholder="What was this for?"
            placeholderTextColor={colors.onSurfaceVariant}
            value={formData.description}
            onChangeText={(text) => onFieldChange("description", text)}
            maxLength={VALIDATION.TRANSACTION.MAX_DESCRIPTION_LENGTH}
            returnKeyType="next"
          />
        </View>
        {errors.description && (
          <Text
            style={[
              styles.errorText,
              typography.caption,
              { color: colors.error, marginTop: spacing.s4 },
            ]}>
            {errors.description}
          </Text>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  section: {
    width: "100%",
  },
  label: {
    marginBottom: 6,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  amountCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  inputCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  input: {
    flex: 1,
  },
  errorText: {
    marginLeft: 4,
  },
});

