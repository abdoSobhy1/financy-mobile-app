import { useBudgetForm } from "../hooks/useBudgetForm";
import React from "react";
import { Keyboard } from "react-native";

import { Budget } from "../../../shared/types";
import { UnifiedForm } from "../../../shared/forms/UnifiedForm";
import { FormField } from "../../../shared/forms/FormField";

interface BudgetFormProps {
  budget?: Budget | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const BudgetForm: React.FC<BudgetFormProps> = ({
  budget,
  onSuccess,
  onCancel,
}) => {
  const { loading, isEditing, formData, errors, nameRef, amountRef, resetDayRef, handleSubmit, handleCancel, updateField, isFormValid } = useBudgetForm({ budget, onSuccess, onCancel });

  return (
    <UnifiedForm
      title={isEditing ? "Edit Budget" : "Add Budget"}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitLabel={isEditing ? "Update Budget" : "Add Budget"}
      loading={loading}
      isValid={isFormValid}>
      <FormField
        ref={nameRef}
        label="Budget Name"
        icon="wallet-outline"
        required
        placeholder="Monthly Groceries, Entertainment, etc."
        value={formData.name}
        onChangeText={(text) => updateField("name", text)}
        error={errors.name}
        autoFocus={!isEditing}
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => amountRef.current?.focus()}
      />

      <FormField
        ref={amountRef}
        label="Amount"
        icon="cash-outline"
        required
        placeholder="0.00"
        value={formData.amount}
        onChangeText={(text) => updateField("amount", text)}
        keyboardType="numeric"
        error={errors.amount}
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => resetDayRef.current?.focus()}
      />

      {/* Reset Day Input */}
      <FormField
        ref={resetDayRef}
        label="Reset Day"
        value={formData.resetDay}
        onChangeText={(value) => updateField("resetDay", value)}
        placeholder="Enter day (1-31)"
        keyboardType="numeric"
        icon="calendar"
        required={true}
        error={errors.resetDay}
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
      />
    </UnifiedForm>
  );
};

export default BudgetForm;
