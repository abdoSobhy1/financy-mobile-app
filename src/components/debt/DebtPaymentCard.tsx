import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import { useToast } from "../ui";
import { formatCurrency, formatDate } from "../../utils";
import { DebtPayment } from "../../types";
import { AppDispatch } from "../../store";
import { UI } from "../../constants";

interface DebtPaymentCardProps {
  payment: DebtPayment;
  onEdit?: (payment: DebtPayment) => void;
  onDelete?: (paymentId: string) => void;
}

const DebtPaymentCard: React.FC<DebtPaymentCardProps> = ({
  payment,
  onEdit,
  onDelete,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { showSuccess, showError } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      "Delete Payment",
      "Are you sure you want to delete this payment? This action cannot be undone.",
      [
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
      ],
    );
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(payment);
    }
  };

  const interestRatio =
    payment.amount > 0 ? (payment.interest || 0) / payment.amount : 0;

  return (
    <View style={styles.card}>
      {/* Main row — always visible */}
      <TouchableOpacity
        style={styles.mainRow}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}>
        {/* Left: icon circle + info */}
        <View style={styles.leftGroup}>
          <LinearGradient
            colors={["#6C5CE7", "#A29BFE"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.paymentIcon}>
            <Ionicons name="card" size={14} color="#fff" />
          </LinearGradient>

          <View style={styles.paymentInfo}>
            <Text style={styles.paymentAmount}>
              {formatCurrency(payment.amount)}
            </Text>
            <Text style={styles.paymentDate}>
              {formatDate(payment.paymentDate)}
            </Text>
          </View>
        </View>

        {/* Right: principal badge + chevron */}
        <View style={styles.rightGroup}>
          {payment.principal > 0 && (
            <View style={styles.principalBadge}>
              <Text style={styles.principalBadgeText}>
                {formatCurrency(payment.principal)}
              </Text>
            </View>
          )}
          <View style={styles.chevronCircle}>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={14}
              color={UI.COLORS.TEXT_MUTED}
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Breakdown bars */}
          <View style={styles.breakdownSection}>
            <Text style={styles.breakdownTitle}>Payment Breakdown</Text>

            {/* Principal */}
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLabelRow}>
                <View
                  style={[styles.breakdownDot, { backgroundColor: "#2ED573" }]}
                />
                <Text style={styles.breakdownLabel}>Principal</Text>
                <Text style={[styles.breakdownValue, { color: "#2ED573" }]}>
                  {formatCurrency(payment.principal)}
                </Text>
              </View>
              <View style={styles.breakdownBarTrack}>
                <View
                  style={[
                    styles.breakdownBarFill,
                    {
                      width: `${Math.max(100 - interestRatio * 100, 2)}%`,
                      backgroundColor: "#2ED573",
                    },
                  ]}
                />
              </View>
            </View>

            {/* Interest */}
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLabelRow}>
                <View
                  style={[styles.breakdownDot, { backgroundColor: "#F59E0B" }]}
                />
                <Text style={styles.breakdownLabel}>Interest</Text>
                <Text style={[styles.breakdownValue, { color: "#F59E0B" }]}>
                  {formatCurrency(payment.interest)}
                </Text>
              </View>
              <View style={styles.breakdownBarTrack}>
                <View
                  style={[
                    styles.breakdownBarFill,
                    {
                      width: `${Math.max(interestRatio * 100, 2)}%`,
                      backgroundColor: "#F59E0B",
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Note */}
          {payment.note && (
            <View style={styles.noteBox}>
              <View style={styles.noteIconBox}>
                <Ionicons
                  name="document-text"
                  size={12}
                  color={UI.COLORS.PRIMARY_LIGHT}
                />
              </View>
              <Text style={styles.noteText}>{payment.note}</Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleEdit}>
              <Ionicons
                name="pencil"
                size={14}
                color={UI.COLORS.PRIMARY_LIGHT}
              />
              <Text
                style={[styles.actionText, { color: UI.COLORS.PRIMARY_LIGHT }]}>
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={handleDelete}>
              <Ionicons name="trash" size={14} color="#FF6B6B" />
              <Text style={[styles.actionText, { color: "#FF6B6B" }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(20,20,50,0.65)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.15)",
    padding: 16,
    marginBottom: 12,
  },

  // ── Main row ───────────────────────────────────────
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: 17,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
    letterSpacing: 0.2,
  },
  paymentDate: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  principalBadge: {
    backgroundColor: "rgba(46,213,115,0.1)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(46,213,115,0.15)",
  },
  principalBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2ED573",
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(108,92,231,0.1)",
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Expanded ───────────────────────────────────────
  expandedContent: {
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(108,92,231,0.1)",
  },

  // ── Breakdown ──────────────────────────────────────
  breakdownSection: {
    marginBottom: 14,
  },
  breakdownTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: UI.COLORS.TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  breakdownItem: {
    marginBottom: 10,
  },
  breakdownLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    fontSize: 13,
    color: UI.COLORS.TEXT_SECONDARY,
    fontWeight: "500",
    flex: 1,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  breakdownBarTrack: {
    height: 5,
    backgroundColor: "rgba(108,92,231,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  breakdownBarFill: {
    height: "100%",
    borderRadius: 3,
  },

  // ── Note ───────────────────────────────────────────
  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 14,
    padding: 12,
    backgroundColor: "rgba(108,92,231,0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.1)",
  },
  noteIconBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: "rgba(108,92,231,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  noteText: {
    fontSize: 13,
    color: UI.COLORS.TEXT_PRIMARY,
    lineHeight: 19,
    flex: 1,
  },

  // ── Actions ────────────────────────────────────────
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(108,92,231,0.08)",
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.15)",
    gap: 6,
  },
  deleteBtn: {
    backgroundColor: "rgba(255,107,107,0.06)",
    borderColor: "rgba(255,107,107,0.15)",
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
  },
});

export default DebtPaymentCard;
