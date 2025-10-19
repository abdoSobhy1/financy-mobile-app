import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import { Card, useToast } from "../ui";
import { formatCurrency, formatDate } from "../../utils";
import { DebtPayment } from "../../types";
import { AppDispatch } from "../../store";
import { UI } from "../../constants";

interface DebtPaymentCardProps {
  payment: DebtPayment;
  onEdit?: (payment: DebtPayment) => void;
  onDelete?: (paymentId: string) => void;
}

const DebtPaymentCard: React.FC<DebtPaymentCardProps> = ({ payment, onEdit, onDelete }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { showSuccess, showError } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDelete = () => {
    Alert.alert("Delete Payment", "Are you sure you want to delete this payment? This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (onDelete) {
            onDelete(payment.id);
            showSuccess("Payment deleted successfully");
          }
        },
      },
    ]);
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(payment);
    }
  };

  return (
    <Card style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.7}>
        <View style={styles.headerContent}>
          <View style={styles.paymentInfo}>
            <Text style={styles.amount}>{formatCurrency(payment.amount)}</Text>
            <Text style={styles.date}>{formatDate(payment.paymentDate)}</Text>
          </View>

          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={UI.COLORS.TEXT_SECONDARY} />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.breakdown}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Principal:</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(payment.principal)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Interest:</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(payment.interest)}</Text>
            </View>
          </View>

          {payment.note && (
            <View style={styles.noteContainer}>
              <Text style={styles.noteLabel}>Note:</Text>
              <Text style={styles.noteText}>{payment.note}</Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={handleEdit}>
              <Ionicons name="pencil" size={16} color={UI.COLORS.PRIMARY} />
              <Text style={[styles.actionText, styles.editText]}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}>
              <Ionicons name="trash" size={16} color={UI.COLORS.ERROR} />
              <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: UI.SPACING.SM,
  },

  header: {
    paddingVertical: UI.SPACING.SM,
  },

  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  paymentInfo: {
    flex: 1,
  },

  amount: {
    fontSize: 18,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },

  date: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
  },

  expandedContent: {
    paddingTop: UI.SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
  },

  breakdown: {
    marginBottom: UI.SPACING.MD,
  },

  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },

  breakdownLabel: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
  },

  breakdownValue: {
    fontSize: 14,
    fontWeight: "500",
    color: UI.COLORS.TEXT_PRIMARY,
  },

  noteContainer: {
    marginBottom: UI.SPACING.MD,
    padding: UI.SPACING.SM,
    backgroundColor: UI.COLORS.BACKGROUND,
    borderRadius: UI.CARD_RADIUS,
  },

  noteLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: UI.COLORS.TEXT_SECONDARY,
    marginBottom: 4,
  },

  noteText: {
    fontSize: 14,
    color: UI.COLORS.TEXT_PRIMARY,
    lineHeight: 20,
  },

  actions: {
    flexDirection: "row",
    gap: UI.SPACING.SM,
  },

  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: UI.SPACING.SM,
    borderRadius: UI.CARD_RADIUS,
    gap: 6,
  },

  editButton: {
    backgroundColor: `${UI.COLORS.PRIMARY}15`,
  },

  deleteButton: {
    backgroundColor: `${UI.COLORS.ERROR}15`,
  },

  actionText: {
    fontSize: 14,
    fontWeight: "500",
  },

  editText: {
    color: UI.COLORS.PRIMARY,
  },

  deleteText: {
    color: UI.COLORS.ERROR,
  },
});

export default DebtPaymentCard;
