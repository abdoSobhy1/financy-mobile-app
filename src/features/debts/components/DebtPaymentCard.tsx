import { useDebtPaymentCard } from "../hooks/useDebtPaymentCard";
import { styles } from "./DebtPaymentCard.styles";

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { Card, Badge } from "../../../shared/ui";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { formatCurrency, formatDate } from "../../../shared/utils";
import { DebtPayment } from "../../../shared/types";

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
  const { isExpanded, setIsExpanded, handleDelete, handleEdit, interestRatio } = useDebtPaymentCard({ payment, onEdit, onDelete });
  const { colors, spacing } = useAppTheme();

  return (
    <Card variant="outlined" style={{ marginBottom: spacing.md }}>
      {/* Main row — always visible */}
      <TouchableOpacity
        style={styles.mainRow}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}>
        {/* Left: icon circle + info */}
        <View style={styles.leftGroup}>
          <View
            style={[styles.paymentIcon, { backgroundColor: colors.primaryContainer }]}>
            <Ionicons name="card" size={14} color={colors.primary} />
          </View>

          <View style={styles.paymentInfo}>
            <Text style={[styles.paymentAmount, { color: colors.onSurface }]}>
              {formatCurrency(payment.amount)}
            </Text>
            <Text style={[styles.paymentDate, { color: colors.onSurfaceVariant }]}>
              {formatDate(payment.paymentDate)}
            </Text>
          </View>
        </View>

        {/* Right: principal badge + chevron */}
        <View style={styles.rightGroup}>
          {payment.principal > 0 && (
            <Badge label={formatCurrency(payment.principal)} role="success" />
          )}
          <View style={styles.chevronCircle}>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={14}
              color={colors.onSurfaceVariant}
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Breakdown bars */}
          <View style={[styles.breakdownSection, { borderTopColor: colors.surfaceVariant }]}>
            <Text style={[styles.breakdownTitle, { color: colors.onSurface }]}>Payment Breakdown</Text>

            {/* Principal */}
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLabelRow}>
                <View
                  style={[styles.breakdownDot, { backgroundColor: colors.tertiary }]}
                />
                <Text style={[styles.breakdownLabel, { color: colors.onSurfaceVariant }]}>Principal</Text>
                <Text style={[styles.breakdownValue, { color: colors.tertiary }]}>
                  {formatCurrency(payment.principal)}
                </Text>
              </View>
              <View style={[styles.breakdownBarTrack, { backgroundColor: colors.surfaceVariant }]}>
                <View
                  style={[
                    styles.breakdownBarFill,
                    {
                      width: `${Math.max(100 - interestRatio * 100, 2)}%`,
                      backgroundColor: colors.tertiary,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Interest */}
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLabelRow}>
                <View
                  style={[styles.breakdownDot, { backgroundColor: colors.tertiary }]}
                />
                <Text style={[styles.breakdownLabel, { color: colors.onSurfaceVariant }]}>Interest</Text>
                <Text style={[styles.breakdownValue, { color: colors.tertiary }]}>
                  {formatCurrency(payment.interest)}
                </Text>
              </View>
              <View style={[styles.breakdownBarTrack, { backgroundColor: colors.surfaceVariant }]}>
                <View
                  style={[
                    styles.breakdownBarFill,
                    {
                      width: `${Math.max(interestRatio * 100, 2)}%`,
                      backgroundColor: colors.tertiary,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Note */}
          {payment.note && (
            <View style={[styles.noteBox, { backgroundColor: colors.surfaceVariant, borderColor: colors.outlineVariant }]}>
              <View style={[styles.noteIconBox, { backgroundColor: colors.surface }]}>
                <Ionicons
                  name="document-text"
                  size={12}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.noteText, { color: colors.onSurfaceVariant }]}>{payment.note}</Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]} onPress={handleEdit}>
              <Ionicons
                name="pencil"
                size={14}
                color={colors.primary}
              />
              <Text
                style={[styles.actionText, { color: colors.primary }]}>
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.errorContainer }]}
              onPress={handleDelete}>
              <Ionicons name="trash" size={14} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Card>
  );
};

export default DebtPaymentCard;
