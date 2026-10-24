import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { useToast } from "../components/ui";
import { AppDispatch } from "../store";
import { makeDebtPayment } from "../store/slices/debtsSlice";
import { formatCurrency } from "../utils";
import { DebtStackParamList } from "../types";

type AddPaymentScreenNavigationProp = StackNavigationProp<
  DebtStackParamList,
  "AddPayment"
>;
type AddPaymentScreenRouteProp = RouteProp<DebtStackParamList, "AddPayment">;

const AddPaymentScreen: React.FC = () => {
  const { colors, typography, spacing, radius, currencySymbol } = useAppTheme();
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<AddPaymentScreenNavigationProp>();
  const route = useRoute<AddPaymentScreenRouteProp>();
  const { showSuccess, showError } = useToast();

  const { debtId, debtName, currentBalance, minimumPayment, interestRate } =
    route.params;

  const [paymentData, setPaymentData] = useState({
    amount: "",
    principal: "",
    interest: "",
    note: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Auto-calculate principal/interest split
  useEffect(() => {
    if (paymentData.amount && !paymentData.principal && !paymentData.interest) {
      const amount = Number(paymentData.amount);
      if (interestRate && amount > 0) {
        const monthlyRate = interestRate / 100 / 12;
        const interestPayment = currentBalance * monthlyRate;
        const principalPayment = Math.max(0, amount - interestPayment);
        setPaymentData((prev) => ({
          ...prev,
          principal: principalPayment.toFixed(2),
          interest: Math.min(interestPayment, amount).toFixed(2),
        }));
      } else {
        setPaymentData((prev) => ({
          ...prev,
          principal: amount.toFixed(2),
          interest: "0.00",
        }));
      }
    }
  }, [paymentData.amount, interestRate, currentBalance]);

  const validatePayment = () => {
    const newErrors: Record<string, string> = {};
    if (!paymentData.amount.trim())
      newErrors.amount = "Payment amount is required";
    else if (
      isNaN(Number(paymentData.amount)) ||
      Number(paymentData.amount) <= 0
    )
      newErrors.amount = "Please enter a valid payment amount";
    else if (Number(paymentData.amount) > currentBalance)
      newErrors.amount = `Cannot exceed balance (${formatCurrency(currentBalance)})`;

    const totalSplit =
      Number(paymentData.principal || 0) + Number(paymentData.interest || 0);
    if (Math.abs(totalSplit - Number(paymentData.amount)) > 0.01)
      newErrors.split = "Principal + Interest must equal payment amount";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validatePayment()) return;
    setLoading(true);
    try {
      await dispatch(
        makeDebtPayment({
          debtId,
          paymentData: {
            amount: Number(paymentData.amount),
            date: new Date().toISOString(),
            paymentDate: new Date().toISOString(),
            principal: Number(paymentData.principal || paymentData.amount),
            interest: Number(paymentData.interest || 0),
            note: paymentData.note.trim() || undefined,
          },
        }),
      ).unwrap();
      showSuccess("Payment recorded successfully!");
      navigation.goBack();
    } catch (error) {
      showError("Failed to record payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAmount = (percentage: number) => {
    const amount = (currentBalance * percentage).toFixed(2);
    setPaymentData((prev) => ({
      ...prev,
      amount,
      principal: "",
      interest: "",
    }));
  };

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
          style={{ fontSize: 56, fontWeight: "700", textAlign: "center", minWidth: 150, color: paymentData.amount ? colors.onBackground : colors.onSurfaceVariant }}
          placeholder="0.00"
          placeholderTextColor={colors.onSurfaceVariant}
          keyboardType="decimal-pad"
          value={paymentData.amount}
          onChangeText={(text) =>
            setPaymentData((prev) => ({
              ...prev,
              amount: text,
              principal: "",
              interest: "",
            }))
          }
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
                style={[styles.splitInput, { color: colors.onSurface }]}
                placeholder="0.00"
                placeholderTextColor="rgba(128,128,128,0.5)"
                value={paymentData.principal}
                onChangeText={(text) =>
                  setPaymentData((prev) => ({ ...prev, principal: text }))
                }
                keyboardType="decimal-pad"
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
                style={[styles.splitInput, { color: colors.onSurface }]}
                placeholder="0.00"
                placeholderTextColor="rgba(128,128,128,0.5)"
                value={paymentData.interest}
                onChangeText={(text) =>
                  setPaymentData((prev) => ({ ...prev, interest: text }))
                }
                keyboardType="decimal-pad"
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
            style={[typography.bodyMedium, { color: colors.onBackground, padding: spacing.md, textAlign: "center", minHeight: 80 }]}
            placeholder="Payment note or reference..."
            placeholderTextColor={colors.onSurfaceVariant}
          value={paymentData.note}
          onChangeText={(text) =>
            setPaymentData((prev) => ({ ...prev, note: text }))
          }
          multiline
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

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },

  // ── Nav ────────────────────────────────────────────
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(108,92,231,0.1)",
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  savePill: {
    backgroundColor: "#000000",
    borderColor: "#000000",
  },
  navCenter: { flex: 1, alignItems: "center" },
  navTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000000",
  },
  navSubtitle: {
    fontSize: 12,
    color: "#000000",
    marginTop: 2,
  },

  // ── Scroll ─────────────────────────────────────────
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },

  // ── Debt Info Hero ─────────────────────────────────
  debtInfoCard: {
    borderRadius: 20,
    padding: 22,
    overflow: "hidden",
    position: "relative",
    marginBottom: 20,
  },
  decorCircle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  circle1: { width: 150, height: 150, top: -45, right: -30 },
  circle2: { width: 90, height: 90, bottom: -20, left: -15 },
  heroLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FF6B6B",
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 16,
  },
  heroStat: {},
  heroStatLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  heroStatValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },

  // ── Sections ───────────────────────────────────────
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000000",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  // ── Quick chips ────────────────────────────────────
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickChip: {
    backgroundColor: "rgba(108,92,231,0.08)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.15)",
    minWidth: 72,
  },
  quickChipAccent: {
    backgroundColor: "rgba(46,213,115,0.06)",
    borderColor: "rgba(46,213,115,0.2)",
  },
  quickChipLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 2,
  },
  quickChipValue: {
    fontSize: 11,
    color: "#000000",
  },

  // ── Input cards ────────────────────────────────────
  inputCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20,20,50,0.65)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.15)",
    paddingHorizontal: 14,
  },
  inputCardError: {
    borderColor: "rgba(255,107,107,0.5)",
  },
  inputIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(108,92,231,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
    paddingVertical: 16,
  },

  // ── Split (principal/interest) ─────────────────────
  splitRow: {
    flexDirection: "row",
    gap: 10,
  },
  splitCard: {
    flex: 1,
    backgroundColor: "rgba(20,20,50,0.65)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.15)",
    padding: 14,
  },
  splitHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  splitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  splitLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000000",
  },
  splitInputWrap: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  splitInput: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
    paddingVertical: 12,
  },

  // ── Error / Tip ────────────────────────────────────
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "500",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 2,
  },
  tipText: {
    fontSize: 12,
    color: "#000000",
    fontStyle: "italic",
    flex: 1,
    lineHeight: 16,
  },

  // ── Bottom bar ─────────────────────────────────────
  bottomBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(108,92,231,0.1)",
    backgroundColor: "rgba(15,15,45,0.8)",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000000",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 14,
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});

export default AddPaymentScreen;
