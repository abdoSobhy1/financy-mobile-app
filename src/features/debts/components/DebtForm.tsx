import { DebtDirectionPicker } from "./DebtDirectionPicker";
import { DebtAmountField } from "./DebtAmountField";
import { DebtNotesField } from "./DebtNotesField";
import { DebtCreditorFields } from "./DebtCreditorFields";
import { DebtPaymentFields } from "./DebtPaymentFields";
import { styles } from "./DebtForm.styles";
import { useDebtForm } from "../hooks/useDebtForm";
import React from "react";
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { CustomDatePicker } from "../../../shared/ui";

import { Debt } from "../../../shared/types";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";

interface DebtFormProps {
  debt?: Debt | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const DebtForm: React.FC<DebtFormProps> = ({
  debt,
  onSuccess,
  onCancel,
}) => {
  const { navigation, isEditing, formData, setFormData, errors, loading, showDatePicker, setShowDatePicker, showMore, setShowMore, totalAmountRef, nameRef, creditorRef, minPaymentRef, interestRateRef, descriptionRef, handleSubmit, handleDelete, updateField } = useDebtForm({ debt, onSuccess, onCancel });
  const { colors, typography, spacing, radius, currencySymbol } = useAppTheme();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}>
      {/* Top Bar matching AddTransactionScreen */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[
            styles.iconButton,
            { backgroundColor: colors.surfaceVariant },
          ]}
          onPress={onCancel || (() => navigation.goBack())}>
          <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.onBackground }]}>
          {isEditing ? "Edit Debt" : "New Debt"}
        </Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {isEditing && (
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: "rgba(239, 68, 68, 0.12)" },
              ]}
              onPress={handleDelete}
              disabled={loading}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: colors.primaryContainer },
            ]}
            onPress={handleSubmit}
            disabled={loading}>
            <Ionicons
              name="checkmark"
              size={24}
              color={colors.onPrimaryContainer}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled">
        {/* Direction Segmented Control matching AddTransactionScreen */}
        <DebtDirectionPicker colors={colors} radius={radius} spacing={spacing} formData={formData} setFormData={setFormData} typography={typography} />

        {/* Amount Section — Tactile Display matching AddTransactionScreen */}
        <DebtAmountField typography={typography} colors={colors} formData={formData} currencySymbol={currencySymbol} totalAmountRef={totalAmountRef} updateField={updateField} isEditing={isEditing} nameRef={nameRef} errors={errors} />

        {/* Details Card matching AddTransactionScreen optionsCard */}
        <Text
          style={[
            typography.label,
            {
              color: colors.onSurfaceVariant,
              marginBottom: spacing.sm,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            },
          ]}>
          Details
        </Text>
        <DebtCreditorFields nameRef={nameRef} formData={formData} updateField={updateField} creditorRef={creditorRef} minPaymentRef={minPaymentRef} setShowDatePicker={setShowDatePicker} setFormData={setFormData} />
        {errors.name ? (
          <Text
            style={[
              styles.errorText,
              {
                marginTop: -16,
                marginBottom: spacing.lg,
                marginLeft: 8,
                textAlign: "left",
              },
            ]}>
            {errors.name}
          </Text>
        ) : null}

        {/* Financial Terms Card */}
        <Text
          style={[
            typography.label,
            {
              color: colors.onSurfaceVariant,
              marginBottom: spacing.sm,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            },
          ]}>
          Terms (Optional)
        </Text>
        <DebtPaymentFields minPaymentRef={minPaymentRef} formData={formData} updateField={updateField} interestRateRef={interestRateRef} showMore={showMore} descriptionRef={descriptionRef} />
        {errors.minimumPayment || errors.interestRate ? (
          <Text
            style={[
              styles.errorText,
              {
                marginTop: -16,
                marginBottom: spacing.lg,
                marginLeft: 8,
                textAlign: "left",
              },
            ]}>
            {errors.minimumPayment || errors.interestRate}
          </Text>
        ) : null}

        {/* More options toggle matching AddTransactionScreen */}
        <TouchableOpacity
          style={styles.moreOptionsBtn}
          onPress={() => setShowMore(!showMore)}>
          <Text
            style={[
              typography.bodyMedium,
              {
                color: colors.primary,
                fontWeight: "700",
                marginRight: 4,
              },
            ]}>
            {showMore ? "Fewer options" : "More options (Notes)"}
          </Text>
          <Ionicons
            name={showMore ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.primary}
          />
        </TouchableOpacity>

        {<DebtNotesField showMore={showMore} colors={colors} spacing={spacing} descriptionRef={descriptionRef} typography={typography} formData={formData} updateField={updateField} />}

        {/* Record Payment Action Button (Editing only) */}
        {isEditing && (
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: colors.tertiaryContainer,
                marginBottom: spacing.md,
                flexDirection: "row",
                gap: 8,
              },
            ]}
            onPress={() => {
              if (debt) {
                navigation.navigate("AddPayment", {
                  debtId: debt.id,
                  debtName: debt.name,
                  currentBalance: debt.currentBalance,
                  minimumPayment: debt.minimumPayment,
                  interestRate: debt.interestRate,
                });
              }
            }}
            disabled={loading}>
            <Ionicons
              name="card-outline"
              size={20}
              color={colors.onTertiaryContainer}
            />
            <Text
              style={[
                typography.bodyLarge,
                { color: colors.onTertiaryContainer, fontWeight: "700" },
              ]}>
              Record Payment
            </Text>
          </TouchableOpacity>
        )}

        {/* Primary Save Button at bottom of ScrollView */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: colors.primaryContainer,
              opacity: loading ? 0.7 : 1,
            },
          ]}
          onPress={handleSubmit}
          disabled={loading}>
          <Text
            style={[
              typography.bodyLarge,
              { color: colors.onPrimaryContainer, fontWeight: "700" },
            ]}>
            {loading
              ? "Saving..."
              : isEditing
                ? "Update Debt"
                : "Create Debt"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {showDatePicker && (
        <CustomDatePicker
          value={formData.dueDate || new Date()}
          onDateChange={(d) => {
            setFormData((prev) => ({ ...prev, dueDate: d }));
            setShowDatePicker(false);
          }}
          label="Due Date"
          hideTrigger
          open
          onClose={() => setShowDatePicker(false)}
        />
      )}
    </KeyboardAvoidingView>
  );
};

export default DebtForm;
