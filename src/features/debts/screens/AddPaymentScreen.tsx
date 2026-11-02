import { styles } from "./AddPaymentScreen.styles";
import { useAddPaymentScreen } from "../hooks/useAddPaymentScreen";
import React from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";

import { Ionicons } from "@expo/vector-icons";

import { formatCurrency } from "../../../shared/utils";

const AddPaymentScreen: React.FC = () => {
  const {
    navigation,
    debtName,
    currentBalance,
    minimumPayment,
    interestRate,
    paymentData,
    setPaymentData,
    errors,
    setErrors,
    loading,
    amountRef,
    principalRef,
    interestRef,
    noteRef,
    handleSubmit,
    handleQuickAmount
  } = useAddPaymentScreen();
  const { colors, typography, spacing, radius, currencySymbol } = useAppTheme();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top Bar */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 }}>
        <TouchableOpacity style={{ width: 60, height: 40, justifyContent: "center" }} onPress={() => navigation.goBack()}>
          <Text style={[typography.bodyLarge, { color: colors.onSurfaceVariant }]}>Cancel</Text>
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={[typography.h3, { color: colors.onBackground }]}>Record Payment</Text>
          <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: 2 }]}>{debtName}</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── Debt Info Hero ─────────────────────── */}
        <View
          style={[styles.debtInfoCard, { backgroundColor: colors.primaryContainer }]}>
          <View style={[styles.decorCircle, styles.circle1]} />
          <View style={[styles.decorCircle, styles.circle2]} />

          <Text style={[styles.heroLabel, { color: colors.onPrimaryContainer, opacity: 0.8 }]}>Current Balance</Text>
          <Text style={[styles.heroValue, { color: colors.error }]}>
            {formatCurrency(currentBalance)}
          </Text>
          <View style={styles.heroStatsRow}>
            {!!minimumPayment && (
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatLabel, { color: colors.onPrimaryContainer, opacity: 0.7 }]}>Min. Payment</Text>
                <Text style={[styles.heroStatValue, { color: colors.onPrimaryContainer }]}>
                  {formatCurrency(minimumPayment)}
                </Text>
              </View>
            )}
            {!!interestRate && (
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatLabel, { color: colors.onPrimaryContainer, opacity: 0.7 }]}>Interest Rate</Text>
                <Text style={[styles.heroStatValue, { color: colors.tertiary }]}>
                  {interestRate}% APR
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Quick Amounts ──────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>Quick Amounts</Text>
          <View style={styles.quickRow}>
            {!!minimumPayment && (
              <TouchableOpacity
                style={[styles.quickChip, { backgroundColor: colors.surfaceVariant, borderColor: colors.outlineVariant }]}
                onPress={() =>
                  setPaymentData((prev) => ({
                    ...prev,
                    amount: minimumPayment!.toFixed(2),
                    principal: "",
                    interest: "",
                  }))
                }>
                <Text style={[styles.quickChipLabel, { color: colors.onSurfaceVariant }]}>Minimum</Text>
                <Text style={[styles.quickChipValue, { color: colors.onSurfaceVariant, opacity: 0.7 }]}>
                  {formatCurrency(minimumPayment)}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.quickChip, { backgroundColor: colors.surfaceVariant, borderColor: colors.outlineVariant }]}
              onPress={() => handleQuickAmount(0.25)}>
              <Text style={[styles.quickChipLabel, { color: colors.onSurfaceVariant }]}>25%</Text>
              <Text style={[styles.quickChipValue, { color: colors.onSurfaceVariant, opacity: 0.7 }]}>
                {formatCurrency(currentBalance * 0.25)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickChip, { backgroundColor: colors.surfaceVariant, borderColor: colors.outlineVariant }]}
              onPress={() => handleQuickAmount(0.5)}>
              <Text style={[styles.quickChipLabel, { color: colors.onSurfaceVariant }]}>50%</Text>
              <Text style={[styles.quickChipValue, { color: colors.onSurfaceVariant, opacity: 0.7 }]}>
                {formatCurrency(currentBalance * 0.5)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickChip, { backgroundColor: colors.tertiaryContainer, borderColor: colors.tertiary }]}
              onPress={() => handleQuickAmount(1.0)}>
              <Text style={[styles.quickChipLabel, { color: colors.onTertiaryContainer }]}>
                Pay Off
              </Text>
              <Text style={[styles.quickChipValue, { color: colors.onTertiaryContainer }]}>
                {formatCurrency(currentBalance)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Giant Amount Input */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginVertical: 32 }}>
          <Text style={{ fontSize: 32, fontWeight: "600", marginRight: 8, color: colors.onSurfaceVariant }}>{currencySymbol}</Text>
          <TextInput
            ref={amountRef}
            style={{ fontSize: 56, fontWeight: "700", textAlign: "center", minWidth: 150, color: paymentData.amount ? colors.onBackground : colors.onSurfaceVariant }}
            placeholder="0.00"
            placeholderTextColor={colors.onSurfaceVariant}
            keyboardType="decimal-pad"
            value={paymentData.amount}
            onChangeText={(text) => {
              if (errors.amount) setErrors((prev) => ({ ...prev, amount: "" }));
              setPaymentData((prev) => ({
                ...prev,
                amount: text,
                principal: "",
                interest: "",
              }));
            }}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => principalRef.current?.focus()}
          />
        </View>
        {errors.amount && (
          <Text style={{ color: colors.error, textAlign: "center", marginTop: -20, marginBottom: 20 }}>{errors.amount}</Text>
        )}

        {/* ── Breakdown ──────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>Payment Breakdown</Text>
          <View style={styles.splitRow}>
            <View style={[styles.splitCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.outlineVariant }]}>
              <View style={styles.splitHeader}>
                <View
                  style={[styles.splitDot, { backgroundColor: colors.tertiary }]}
                />
                <Text style={[styles.splitLabel, { color: colors.onSurfaceVariant }]}>Principal</Text>
              </View>
              <View style={[styles.splitInputWrap, { backgroundColor: colors.surface }]}>
                <TextInput
                  ref={principalRef}
                  style={[styles.splitInput, { color: colors.onSurface }]}
                  placeholder="0.00"
                  placeholderTextColor="rgba(128,128,128,0.5)"
                  value={paymentData.principal}
                  onChangeText={(text) => {
                    if (errors.split) setErrors((prev) => ({ ...prev, split: "" }));
                    setPaymentData((prev) => ({ ...prev, principal: text }));
                  }}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => interestRef.current?.focus()}
                />
              </View>
            </View>

            <View style={[styles.splitCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.outlineVariant }]}>
              <View style={styles.splitHeader}>
                <View
                  style={[styles.splitDot, { backgroundColor: colors.tertiary }]}
                />
                <Text style={[styles.splitLabel, { color: colors.onSurfaceVariant }]}>Interest</Text>
              </View>
              <View style={[styles.splitInputWrap, { backgroundColor: colors.surface }]}>
                <TextInput
                  ref={interestRef}
                  style={[styles.splitInput, { color: colors.onSurface }]}
                  placeholder="0.00"
                  placeholderTextColor="rgba(128,128,128,0.5)"
                  value={paymentData.interest}
                  onChangeText={(text) => {
                    if (errors.split) setErrors((prev) => ({ ...prev, split: "" }));
                    setPaymentData((prev) => ({ ...prev, interest: text }));
                  }}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => noteRef.current?.focus()}
                />
              </View>
            </View>
          </View>
          {errors.split && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.split}</Text>
            </View>
          )}
          <View style={styles.tipRow}>
            <Ionicons name="bulb" size={13} color={colors.tertiary} />
            <Text style={[styles.tipText, { color: colors.onSurfaceVariant }]}>
              Principal reduces your balance, interest is the cost of borrowing
            </Text>
          </View>
        </View>

        {/* ── Note ───────────────────────────────── */}
        <View style={{ marginBottom: spacing.xl }}>
          <Text style={[typography.label, { color: colors.onSurfaceVariant, marginBottom: spacing.xs, marginLeft: spacing.sm }]}>Notes (Optional)</Text>
          <View style={{ borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", backgroundColor: colors.surfaceVariant, borderRadius: radius.lg }}>
            <TextInput
              ref={noteRef}
              style={[typography.bodyMedium, { color: colors.onBackground, padding: spacing.md, textAlign: "center", minHeight: 80 }]}
              placeholder="Payment note or reference..."
              placeholderTextColor={colors.onSurfaceVariant}
              value={paymentData.note}
              onChangeText={(text) =>
                setPaymentData((prev) => ({ ...prev, note: text }))
              }
              multiline
              returnKeyType="done"
            />
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={{ padding: 20, paddingTop: 10, paddingBottom: Platform.OS === "ios" ? 34 : 24, backgroundColor: colors.background, borderTopWidth: 1, borderColor: colors.outlineVariant }}>
        <TouchableOpacity
          style={{ backgroundColor: colors.primaryContainer, paddingVertical: 16, borderRadius: radius.pill, alignItems: "center", opacity: loading ? 0.7 : 1 }}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={[typography.bodyLarge, { color: colors.onPrimaryContainer, fontWeight: "700" }]}>
            {loading ? "Recording..." : "Record Payment"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default AddPaymentScreen;
