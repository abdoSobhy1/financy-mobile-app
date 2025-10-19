import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../store";
import { markBillAsPaid, markBillAsUnpaid } from "../../store/slices/billsSlice";
import { Card, CustomDatePicker, useToast } from "../ui";
import { UI } from "../../constants";
import { formatCurrency } from "../../utils";
import { EnhancedBill, getBillStatus, getRecurrenceDescription } from "../../types/bills";
import { format, isToday, isTomorrow, isYesterday, isValid } from "date-fns";

interface EnhancedBillCardProps {
  bill: EnhancedBill;
  onEdit: (bill: EnhancedBill) => void;
  onDelete: (bill: EnhancedBill) => void;
  onViewHistory?: (bill: EnhancedBill) => void;
  showActions?: boolean;
}

export const EnhancedBillCard: React.FC<EnhancedBillCardProps> = ({ bill, onEdit, onDelete, onViewHistory, showActions = true }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { showSuccess, showError } = useToast();
  const [showPaymentDate, setShowPaymentDate] = useState(false);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());

  const billStatus = getBillStatus(bill);
  const dueDate = bill.dueDate ? new Date(bill.dueDate) : null;

  const getStatusColor = () => {
    switch (billStatus) {
      case "paid":
        return UI.COLORS.SUCCESS;
      case "overdue":
        return UI.COLORS.ERROR;
      case "due":
        return UI.COLORS.WARNING;
      case "upcoming":
        return UI.COLORS.PRIMARY;
      case "skipped":
        return UI.COLORS.TEXT_MUTED;
      default:
        return UI.COLORS.TEXT_SECONDARY;
    }
  };

  const getStatusIcon = () => {
    switch (billStatus) {
      case "paid":
        return "checkmark-circle";
      case "overdue":
        return "alert-circle";
      case "due":
        return "time";
      case "upcoming":
        return "calendar";
      case "skipped":
        return "remove-circle";
      default:
        return "ellipse";
    }
  };

  const getDateDescription = () => {
    if (!dueDate || !isValid(dueDate)) return "No due date";
    try {
      if (isToday(dueDate)) return "Due today";
      if (isTomorrow(dueDate)) return "Due tomorrow";
      if (isYesterday(dueDate)) return "Was due yesterday";

      const daysDiff = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      if (daysDiff < 0) {
        return `${Math.abs(daysDiff)} days overdue`;
      }
      if (daysDiff <= 7) {
        return `Due in ${daysDiff} days`;
      }

      return `Due ${format(dueDate, "MMM dd")}`;
    } catch (e) {
      // Defensive fallback: if something unexpected happens, don't crash the whole list
      console.warn("EnhancedBillCard: failed to compute date description", e);
      return "No due date";
    }
  };

  const handleTogglePaid = async () => {
    if (bill.paid) {
      // Mark as unpaid
      try {
        await dispatch(markBillAsUnpaid(bill.id)).unwrap();
        showSuccess(`${bill.name} marked as unpaid`);
      } catch (error) {
        console.error("Failed to mark bill as unpaid:", error);
        showError(`Failed to update bill status: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    } else {
      // Mark as paid directly
      try {
        await dispatch(markBillAsPaid(bill.id)).unwrap();
        showSuccess(`${bill.name} marked as paid`);
      } catch (error) {
        console.error("Failed to mark bill as paid:", error);
        showError(`Failed to mark bill as paid: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      await dispatch(markBillAsPaid(bill.id)).unwrap();
      showSuccess(`${bill.name} marked as paid`);
      setShowPaymentDate(false);
    } catch (error) {
      console.error("Failed to mark bill as paid:", error);
      showError(`Failed to mark bill as paid: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleSkipOccurrence = () => {
    Alert.alert("Skip Bill", `Skip the next occurrence of "${bill.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Skip",
        onPress: () => {
          showSuccess(`${bill.name} next occurrence skipped`);
        },
      },
    ]);
  };

  const recurrenceText =
    bill.recurring && bill.recurrenceFrequency ? getRecurrenceDescription(bill.recurrenceFrequency, bill.customRecurrencePattern?.interval) : null;

  return (
    <>
      <Card style={StyleSheet.flatten([styles.card, { borderLeftColor: getStatusColor(), borderLeftWidth: 4 }])}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.billName}>{bill.name}</Text>
              <Ionicons name={getStatusIcon() as any} size={20} color={getStatusColor()} style={styles.statusIcon} />
            </View>
            {recurrenceText && (
              <Text style={styles.recurrenceText}>
                <Ionicons name="repeat" size={12} color={UI.COLORS.TEXT_MUTED} /> {recurrenceText}
              </Text>
            )}
          </View>
          <View style={styles.amountContainer}>
            <Text style={styles.amount}>{formatCurrency(bill.amount)}</Text>
            <Text style={[styles.status, { color: getStatusColor() }]}>{billStatus.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={UI.COLORS.TEXT_SECONDARY} />
            <Text style={styles.detailText}>{getDateDescription()}</Text>
          </View>

          {bill.lastPaidDate && isValid(new Date(bill.lastPaidDate)) && (
            <View style={styles.detailRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color={UI.COLORS.SUCCESS} />
              <Text style={styles.detailText}>Last paid: {format(new Date(bill.lastPaidDate), "MMM dd, yyyy")}</Text>
            </View>
          )}

          {bill.nextDueDate && bill.recurring && isValid(new Date(bill.nextDueDate)) && (
            <View style={styles.detailRow}>
              <Ionicons name="arrow-forward-circle-outline" size={16} color={UI.COLORS.PRIMARY} />
              <Text style={styles.detailText}>Next: {format(new Date(bill.nextDueDate), "MMM dd, yyyy")}</Text>
            </View>
          )}

          {bill.notes && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text-outline" size={16} color={UI.COLORS.TEXT_SECONDARY} />
              <Text style={styles.detailText} numberOfLines={2}>
                {bill.notes}
              </Text>
            </View>
          )}
        </View>

        {showActions && (
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionButton, styles.payButton]} onPress={handleTogglePaid}>
              <Ionicons name={bill.paid ? "close-circle" : "checkmark-circle"} size={18} color="white" />
              <Text style={styles.actionButtonText}>{bill.paid ? "Mark Unpaid" : "Mark Paid"}</Text>
            </TouchableOpacity>

            {bill.recurring && !bill.paid && (
              <TouchableOpacity style={[styles.actionButton, styles.skipButton]} onPress={handleSkipOccurrence}>
                <Ionicons name="play-skip-forward" size={18} color={UI.COLORS.TEXT_PRIMARY} />
                <Text style={[styles.actionButtonText, styles.skipButtonText]}>Skip</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => onEdit(bill)}>
              <Ionicons name="create" size={18} color={UI.COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>

            {onViewHistory && (
              <TouchableOpacity style={[styles.actionButton, styles.historyButton]} onPress={() => onViewHistory(bill)}>
                <Ionicons name="time" size={18} color={UI.COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </Card>

      {/* Payment Date Picker Modal */}
      {showPaymentDate && (
        <View style={styles.paymentDateModal}>
          <Card style={styles.paymentDateCard}>
            <Text style={styles.paymentDateTitle}>Mark as Paid</Text>
            <Text style={styles.paymentDateSubtitle}>When was this bill paid?</Text>

            <CustomDatePicker
              value={paymentDate}
              onDateChange={setPaymentDate}
              label="Payment Date"
              style={styles.paymentDatePicker}
              maximumDate={new Date()}
            />

            <View style={styles.paymentDateActions}>
              <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={() => setShowPaymentDate(false)}>
                <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionButton, styles.confirmButton]} onPress={handleMarkAsPaid}>
                <Ionicons name="checkmark" size={18} color="white" />
                <Text style={styles.actionButtonText}>Confirm Payment</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: UI.SPACING.MD,
    padding: UI.SPACING.LG,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: UI.SPACING.MD,
  },
  titleContainer: {
    flex: 1,
    marginRight: UI.SPACING.MD,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: UI.SPACING.XS,
  },
  billName: {
    fontSize: 18,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  statusIcon: {
    marginLeft: UI.SPACING.SM,
  },
  recurrenceText: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
    fontStyle: "italic",
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 20,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  status: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  details: {
    marginBottom: UI.SPACING.MD,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: UI.SPACING.SM,
  },
  detailText: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    marginLeft: UI.SPACING.SM,
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: UI.SPACING.SM,
    flexWrap: "wrap",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: UI.SPACING.MD,
    paddingVertical: UI.SPACING.SM,
    borderRadius: UI.CARD_RADIUS,
    gap: UI.SPACING.XS,
  },
  payButton: {
    backgroundColor: UI.COLORS.SUCCESS,
    flex: 1,
    minWidth: 120,
  },
  skipButton: {
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  editButton: {
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    paddingHorizontal: UI.SPACING.MD,
  },
  historyButton: {
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    paddingHorizontal: UI.SPACING.MD,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "white",
  },
  skipButtonText: {
    color: UI.COLORS.TEXT_PRIMARY,
  },
  paymentDateModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  paymentDateCard: {
    margin: UI.SPACING.LG,
    padding: UI.SPACING.LG,
    minWidth: 300,
  },
  paymentDateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center",
    marginBottom: UI.SPACING.SM,
  },
  paymentDateSubtitle: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    textAlign: "center",
    marginBottom: UI.SPACING.LG,
  },
  paymentDatePicker: {
    marginBottom: UI.SPACING.LG,
  },
  paymentDateActions: {
    flexDirection: "row",
    gap: UI.SPACING.MD,
  },
  cancelButton: {
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    flex: 1,
  },
  confirmButton: {
    backgroundColor: UI.COLORS.SUCCESS,
    flex: 1,
  },
  cancelButtonText: {
    color: UI.COLORS.TEXT_SECONDARY,
  },
});
