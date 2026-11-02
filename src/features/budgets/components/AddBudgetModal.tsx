import { useAddBudgetModal } from "../hooks/useAddBudgetModal";
import React from "react";
import { View, Text, StyleSheet, Keyboard } from "react-native";

import { Modal, Button, Input } from "../../../shared/ui";
import { UI, VALIDATION } from "../../../shared/constants";

interface AddBudgetModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddBudgetModal: React.FC<AddBudgetModalProps> = ({ visible, onClose, onSuccess }) => {
  const { budgetLoading, formData, errors, nameRef, amountRef, resetDayRef, handleSubmit, updateFormData, confirmExit } = useAddBudgetModal({ visible, onClose, onSuccess });

  return (
    <Modal visible={visible} onClose={() => confirmExit(onClose)} title="Create Budget" scrollable={true} keyboardAvoiding={true}>
      <View style={styles.container}>
        <View style={styles.formCard}>
          {/* Budget Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Budget Name</Text>
            <Input
              ref={nameRef}
              value={formData.name}
              onChangeText={(value) => updateFormData("name", value)}
              placeholder="e.g., Groceries, Entertainment, Gas"
              error={errors.name}
              maxLength={VALIDATION.BUDGET.MAX_NAME_LENGTH}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => amountRef.current?.focus()}
            />
          </View>

          {/* Budget Amount */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Monthly Amount</Text>
            <Input
              ref={amountRef}
              value={formData.amount}
              onChangeText={(value) => updateFormData("amount", value)}
              placeholder="0.00"
              keyboardType="decimal-pad"
              error={errors.amount}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => resetDayRef.current?.focus()}
            />
          </View>

          {/* Reset Day */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Reset Day of Month</Text>
            <Text style={styles.helpText}>Budget will reset on this day each month (1-28)</Text>
            <Input
              ref={resetDayRef}
              value={formData.resetDay.toString()}
              onChangeText={(value) => updateFormData("resetDay", parseInt(value) || 1)}
              placeholder="1"
              keyboardType="number-pad"
              error={errors.resetDay}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button title="Cancel" variant="secondary" onPress={() => confirmExit(onClose)} style={{ flex: 1 }} icon="close" iconPosition="left" />
            <View style={{ width: UI.SPACING.MD }} />
            <Button title="Create Budget" onPress={handleSubmit} loading={budgetLoading} style={{ flex: 2 }} icon="wallet" iconPosition="left" />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  formCard: {
    flex: 1,
    backgroundColor: "transparent",
  },
  fieldGroup: {
    marginBottom: UI.SPACING.LG,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  helpText: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    marginBottom: UI.SPACING.SM,
    fontStyle: "italic",
  },
  actionButtons: {
    flexDirection: "row",
    marginTop: UI.SPACING.LG,
    paddingTop: UI.SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
  },
});
