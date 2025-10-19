import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Switch, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../store";
import { Input, Button, Card, CustomDatePicker, useToast, BudgetSelector } from "../ui";
import { UI } from "../../constants";
import { EnhancedBill, RecurrenceFrequency, BillTemplate, calculateNextDueDate } from "../../types/bills";
import { BillFormData } from "../../types";
import { addBill, updateBill } from "../../store/slices/billsSlice";
import { addDays, addWeeks, addMonths, addYears, format, isValid } from "date-fns";
import { evaluateMathExpression } from "../../utils/mathUtils";

interface BillFormModalProps {
  visible: boolean;
  onClose: () => void;
  bill?: EnhancedBill | null;
  template?: BillTemplate;
}

interface LocalBillFormData {
  name: string;
  amount: string;
  dueDate: Date;
  recurring: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
  customRecurrencePattern?: {
    interval: number;
    endDate?: Date;
    maxOccurrences?: number;
  };
  autoPayEnabled: boolean;
  reminderEnabled: boolean;
  reminderDays: number;
  notes: string;
  categoryId?: string;
  budgetId?: string;
}

const RECURRENCE_OPTIONS: Array<{
  value: RecurrenceFrequency;
  label: string;
  description: string;
}> = [
  { value: "weekly", label: "Weekly", description: "Every week" },
  { value: "biweekly", label: "Bi-weekly", description: "Every 2 weeks" },
  { value: "monthly", label: "Monthly", description: "Every month" },
  { value: "quarterly", label: "Quarterly", description: "Every 3 months" },
  { value: "semiannually", label: "Semi-annually", description: "Every 6 months" },
  { value: "annually", label: "Yearly", description: "Every year" },
];

export const BillFormModal: React.FC<BillFormModalProps> = ({ visible, onClose, bill, template }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { showSuccess, showError } = useToast();
  const isEditing = !!bill;

  // Get categories and budgets from Redux store
  const { items: categories } = useSelector((state: RootState) => state.categories);
  const { items: budgets } = useSelector((state: RootState) => state.budgets);

  const [formData, setFormData] = useState<LocalBillFormData>({
    name: "",
    amount: "",
    dueDate: new Date(),
    recurring: false,
    autoPayEnabled: false,
    reminderEnabled: true,
    reminderDays: 3,
    notes: "",
  });

  const [showCustomRecurrence, setShowCustomRecurrence] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Initialize form data when bill or template changes
  useEffect(() => {
    if (bill) {
      setFormData({
        name: bill.name,
        amount: bill.amount.toString(),
        dueDate: bill.dueDate && isValid(new Date(bill.dueDate)) ? new Date(bill.dueDate) : new Date(),
        recurring: bill.recurring || false,
        recurrenceFrequency: bill.recurrenceFrequency,
        customRecurrencePattern: bill.customRecurrencePattern,
        autoPayEnabled: bill.autoMarkAsPaid || false,
        reminderEnabled: bill.reminderDaysBefore !== undefined && bill.reminderDaysBefore > 0,
        reminderDays: bill.reminderDaysBefore || 3,
        notes: bill.notes || "",
        categoryId: bill.categoryId,
        budgetId: bill.budgetId,
      });
    } else if (template) {
      setFormData({
        name: template.name,
        amount: template.defaultAmount?.toString() || "",
        dueDate: new Date(),
        recurring: (template as any).recurring || false,
        recurrenceFrequency: (template as any).recurrenceFrequency,
        autoPayEnabled: (template as any).autoPayEnabled || false,
        reminderEnabled: (template as any).reminderEnabled !== false,
        reminderDays: (template as any).reminderDays || 3,
        notes: (template as any).notes || "",
        categoryId: (template as any).categoryId,
        budgetId: (template as any).budgetId,
      });
    } else {
      // Reset form for new bill
      setFormData({
        name: "",
        amount: "",
        dueDate: new Date(),
        recurring: false,
        autoPayEnabled: false,
        reminderEnabled: true,
        reminderDays: 3,
        notes: "",
      });
    }
    setErrors({});
  }, [bill, template, visible]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Bill name is required";
    }

    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = "Please enter a valid amount greater than 0";
    }

    if (formData.recurring && !formData.recurrenceFrequency) {
      newErrors.recurrenceFrequency = "Please select a recurrence frequency";
    }

    if (formData.customRecurrencePattern?.interval && formData.customRecurrencePattern.interval < 1) {
      newErrors.customInterval = "Interval must be at least 1";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Evaluate math expression in amount field
      const evaluatedAmount = evaluateMathExpression(formData.amount);

      // Convert to the format expected by the Redux actions
      const billData: BillFormData = {
        name: formData.name,
        amount: evaluatedAmount.toString(),
        dueDate: formData.dueDate.toISOString(), // Convert Date to string for Redux serialization
        budgetId: formData.budgetId,
        recurring: formData.recurring,
        recurringType:
          formData.recurrenceFrequency === "weekly"
            ? ("weekly" as const)
            : formData.recurrenceFrequency === "annually"
            ? ("yearly" as const)
            : ("monthly" as const),
      };

      if (isEditing) {
        await dispatch(updateBill({ id: bill!.id, updates: billData })).unwrap();
        showSuccess("Bill updated successfully");
      } else {
        await dispatch(addBill(billData)).unwrap();
        showSuccess("Bill added successfully");
      }

      onClose();
    } catch (error) {
      console.error("Bill save error:", error);
      showError(`Failed to ${isEditing ? "update" : "create"} bill`);
    } finally {
      setLoading(false);
    }
  };

  const getNextDueDates = (count: number = 3) => {
    if (!formData.recurring || !formData.recurrenceFrequency) return [];

    const dates: Date[] = [];
    let currentDate = new Date(formData.dueDate);

    for (let i = 0; i < count; i++) {
      switch (formData.recurrenceFrequency) {
        case "weekly":
          currentDate = addWeeks(currentDate, formData.customRecurrencePattern?.interval || 1);
          break;
        case "biweekly":
          currentDate = addWeeks(currentDate, 2);
          break;
        case "monthly":
          currentDate = addMonths(currentDate, formData.customRecurrencePattern?.interval || 1);
          break;
        case "quarterly":
          currentDate = addMonths(currentDate, 3);
          break;
        case "semiannually":
          currentDate = addMonths(currentDate, 6);
          break;
        case "annually":
          currentDate = addYears(currentDate, formData.customRecurrencePattern?.interval || 1);
          break;
      }
      dates.push(new Date(currentDate));
    }

    return dates;
  };

  const updateFormData = (field: keyof LocalBillFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={UI.COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? "Edit Bill" : "Add Bill"}</Text>
          <Button title={isEditing ? "Update" : "Save"} onPress={handleSave} loading={loading} style={styles.saveButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Basic Information */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Bill Details</Text>

            <View style={styles.input}>
              <Input
                label="Bill Name"
                value={formData.name}
                onChangeText={(value) => updateFormData("name", value)}
                placeholder="e.g. Electric Bill, Rent, Netflix"
                error={errors.name}
              />
            </View>

            <View style={styles.input}>
              <Input
                label="Amount"
                value={formData.amount}
                onChangeText={(value) => updateFormData("amount", value)}
                placeholder="0.00 (supports math: 100+50*2)"
                keyboardType="numeric"
                error={errors.amount}
              />
            </View>

            <CustomDatePicker
              label="Due Date"
              value={formData.dueDate}
              onDateChange={(date) => updateFormData("dueDate", date)}
              style={styles.input}
            />

            {/* Budget Selection (Optional) */}
            <View style={styles.input}>
              <BudgetSelector
                budgets={Object.values(budgets).filter((budget) => budget != null)}
                selectedBudgetId={formData.budgetId}
                onBudgetSelect={(budgetId) => updateFormData("budgetId", budgetId)}
                label="Budget (Optional)"
                rememberLastUsed={false} // Don't remember for bill forms since they're specific
              />
            </View>

            <View style={styles.input}>
              <Input
                label="Notes (Optional)"
                value={formData.notes}
                onChangeText={(value) => updateFormData("notes", value)}
                placeholder="Add any additional notes..."
                multiline
                numberOfLines={3}
              />
            </View>
          </Card>

          {/* Recurring Settings */}
          <Card style={styles.section}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.sectionTitle}>Recurring Bill</Text>
                <Text style={styles.switchSubtitle}>Automatically create future occurrences</Text>
              </View>
              <Switch
                value={formData.recurring}
                onValueChange={(value) => updateFormData("recurring", value)}
                trackColor={{ false: UI.COLORS.BORDER, true: UI.COLORS.PRIMARY }}
                thumbColor={formData.recurring ? "white" : UI.COLORS.TEXT_MUTED}
              />
            </View>

            {formData.recurring && (
              <>
                <Text style={styles.fieldLabel}>Recurrence Frequency</Text>
                <View style={styles.recurrenceOptions}>
                  {RECURRENCE_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.recurrenceOption, formData.recurrenceFrequency === option.value && styles.recurrenceOptionActive]}
                      onPress={() => {
                        updateFormData("recurrenceFrequency", option.value);
                        setShowCustomRecurrence(false); // Remove custom option for now
                      }}>
                      <View style={styles.recurrenceOptionContent}>
                        <Text
                          style={[styles.recurrenceOptionLabel, formData.recurrenceFrequency === option.value && styles.recurrenceOptionLabelActive]}>
                          {option.label}
                        </Text>
                        <Text
                          style={[
                            styles.recurrenceOptionDescription,
                            formData.recurrenceFrequency === option.value && styles.recurrenceOptionDescriptionActive,
                          ]}>
                          {option.description}
                        </Text>
                      </View>
                      {formData.recurrenceFrequency === option.value && <Ionicons name="checkmark" size={20} color="white" />}
                    </TouchableOpacity>
                  ))}
                </View>

                {showCustomRecurrence && (
                  <View style={styles.customRecurrence}>
                    <View style={styles.input}>
                      <Input
                        label="Repeat every (months)"
                        value={formData.customRecurrencePattern?.interval?.toString() || "1"}
                        onChangeText={(value) =>
                          updateFormData("customRecurrencePattern", {
                            ...formData.customRecurrencePattern,
                            interval: parseInt(value) || 1,
                          })
                        }
                        keyboardType="numeric"
                        error={errors.customInterval}
                      />
                    </View>
                  </View>
                )}

                {/* Next Due Dates Preview */}
                {formData.recurrenceFrequency && (
                  <View style={styles.nextDatesPreview}>
                    <Text style={styles.fieldLabel}>Next Due Dates:</Text>
                    {getNextDueDates().map((date, index) => (
                      <Text key={index} style={styles.nextDate}>
                        • {isValid(date) ? format(date, "MMM dd, yyyy") : "Invalid date"}
                      </Text>
                    ))}
                  </View>
                )}
              </>
            )}
          </Card>

          {/* Reminder Settings */}
          <Card style={styles.section}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.sectionTitle}>Reminders</Text>
                <Text style={styles.switchSubtitle}>Get notified before due date</Text>
              </View>
              <Switch
                value={formData.reminderEnabled}
                onValueChange={(value) => updateFormData("reminderEnabled", value)}
                trackColor={{ false: UI.COLORS.BORDER, true: UI.COLORS.PRIMARY }}
                thumbColor={formData.reminderEnabled ? "white" : UI.COLORS.TEXT_MUTED}
              />
            </View>

            {formData.reminderEnabled && (
              <View style={styles.input}>
                <Input
                  label="Remind me (days before due date)"
                  value={formData.reminderDays.toString()}
                  onChangeText={(value) => updateFormData("reminderDays", parseInt(value) || 1)}
                  keyboardType="numeric"
                />
              </View>
            )}
          </Card>

          {/* Auto-Pay Settings */}
          <Card style={styles.section}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.sectionTitle}>Auto-Pay</Text>
                <Text style={styles.switchSubtitle}>Automatically mark as paid (manual tracking only)</Text>
              </View>
              <Switch
                value={formData.autoPayEnabled}
                onValueChange={(value) => updateFormData("autoPayEnabled", value)}
                trackColor={{ false: UI.COLORS.BORDER, true: UI.COLORS.PRIMARY }}
                thumbColor={formData.autoPayEnabled ? "white" : UI.COLORS.TEXT_MUTED}
              />
            </View>
          </Card>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.COLORS.BACKGROUND,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: UI.SPACING.LG,
    paddingVertical: UI.SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: UI.COLORS.SURFACE,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  saveButton: {
    paddingHorizontal: UI.SPACING.LG,
    minWidth: 80,
  },
  content: {
    flex: 1,
    padding: UI.SPACING.LG,
  },
  section: {
    marginBottom: UI.SPACING.LG,
    padding: UI.SPACING.LG,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.MD,
  },
  input: {
    marginBottom: UI.SPACING.MD,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: UI.SPACING.MD,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: UI.SPACING.MD,
  },
  switchSubtitle: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    marginTop: UI.SPACING.XS,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.SM,
  },
  recurrenceOptions: {
    gap: UI.SPACING.SM,
    marginBottom: UI.SPACING.MD,
  },
  recurrenceOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: UI.SPACING.MD,
    borderRadius: UI.CARD_RADIUS,
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  recurrenceOptionActive: {
    backgroundColor: UI.COLORS.PRIMARY,
    borderColor: UI.COLORS.PRIMARY,
  },
  recurrenceOptionContent: {
    flex: 1,
  },
  recurrenceOptionLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  recurrenceOptionLabelActive: {
    color: "white",
  },
  recurrenceOptionDescription: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
  },
  recurrenceOptionDescriptionActive: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  customRecurrence: {
    marginTop: UI.SPACING.MD,
    padding: UI.SPACING.MD,
    backgroundColor: UI.COLORS.BACKGROUND,
    borderRadius: UI.CARD_RADIUS,
  },
  nextDatesPreview: {
    marginTop: UI.SPACING.MD,
    padding: UI.SPACING.MD,
    backgroundColor: UI.COLORS.BACKGROUND,
    borderRadius: UI.CARD_RADIUS,
  },
  nextDate: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    marginTop: UI.SPACING.XS,
  },
  pickerContainer: {
    marginTop: UI.SPACING.XS,
  },
  picker: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: UI.SPACING.MD,
    backgroundColor: UI.COLORS.INPUT_BACKGROUND,
    borderRadius: UI.CARD_RADIUS,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  placeholderPicker: {
    borderColor: UI.COLORS.BORDER,
  },
  pickerText: {
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
  },
  placeholderText: {
    color: UI.COLORS.TEXT_MUTED,
  },
  budgetScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  budgetContainer: {
    flexDirection: "row",
    paddingRight: 16,
  },
  budgetChip: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  budgetChipActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  budgetChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#94A3B8",
  },
  budgetChipTextActive: {
    color: "#FFFFFF",
  },
  budgetTypeText: {
    fontSize: 10,
    fontWeight: "400",
    color: "#64748B",
    marginTop: 2,
  },
  budgetTypeTextActive: {
    color: "#E5F9F2",
  },
});
