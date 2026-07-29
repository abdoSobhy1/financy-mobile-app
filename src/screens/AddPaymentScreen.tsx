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
import { DebtStackParamList } from "../navigation/DebtStackNavigator";
import { UI } from "../constants";

type AddPaymentScreenNavigationProp = StackNavigationProp<
  DebtStackParamList,
  "AddPayment"
>;
type AddPaymentScreenRouteProp = RouteProp<DebtStackParamList, "AddPayment">;

const AddPaymentScreen: React.FC = () => {
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
    <LinearGradient
      colors={[UI.COLORS.BACKGROUND, "#0F0F2D", UI.COLORS.BACKGROUND]}
      locations={[0, 0.3, 1]}
      style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />

        {/* ── Nav bar ───────────────────────────────── */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={18} color={UI.COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <View style={styles.navCenter}>
            <Text style={styles.navTitle}>Record Payment</Text>
            <Text style={styles.navSubtitle} numberOfLines={1}>
              {debtName}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.navBtn, styles.savePill]}
            onPress={handleSubmit}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/* ── Debt Info Hero ─────────────────────── */}
            <LinearGradient
              colors={["#1B1464", "#6C5CE7", "#A29BFE"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.debtInfoCard}>
              <View style={[styles.decorCircle, styles.circle1]} />
              <View style={[styles.decorCircle, styles.circle2]} />

              <Text style={styles.heroLabel}>Current Balance</Text>
              <Text style={styles.heroValue}>
                {formatCurrency(currentBalance)}
              </Text>
              <View style={styles.heroStatsRow}>
                {!!minimumPayment && (
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatLabel}>Min. Payment</Text>
                    <Text style={styles.heroStatValue}>
                      {formatCurrency(minimumPayment)}
                    </Text>
                  </View>
                )}
                {!!interestRate && (
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatLabel}>Interest Rate</Text>
                    <Text style={[styles.heroStatValue, { color: "#F59E0B" }]}>
                      {interestRate}% APR
                    </Text>
                  </View>
                )}
              </View>
            </LinearGradient>

            {/* ── Quick Amounts ──────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Quick Amounts</Text>
              <View style={styles.quickRow}>
                {!!minimumPayment && (
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() =>
                      setPaymentData((prev) => ({
                        ...prev,
                        amount: minimumPayment!.toFixed(2),
                        principal: "",
                        interest: "",
                      }))
                    }>
                    <Text style={styles.quickChipLabel}>Minimum</Text>
                    <Text style={styles.quickChipValue}>
                      {formatCurrency(minimumPayment)}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.quickChip}
                  onPress={() => handleQuickAmount(0.25)}>
                  <Text style={styles.quickChipLabel}>25%</Text>
                  <Text style={styles.quickChipValue}>
                    {formatCurrency(currentBalance * 0.25)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickChip}
                  onPress={() => handleQuickAmount(0.5)}>
                  <Text style={styles.quickChipLabel}>50%</Text>
                  <Text style={styles.quickChipValue}>
                    {formatCurrency(currentBalance * 0.5)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickChip, styles.quickChipAccent]}
                  onPress={() => handleQuickAmount(1.0)}>
                  <Text style={[styles.quickChipLabel, { color: "#2ED573" }]}>
                    Pay Off
                  </Text>
                  <Text style={styles.quickChipValue}>
                    {formatCurrency(currentBalance)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Payment Amount ─────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Payment Amount</Text>
              <View
                style={[
                  styles.inputCard,
                  errors.amount && styles.inputCardError,
                ]}>
                <View style={styles.inputIconBox}>
                  <Ionicons
                    name="cash"
                    size={16}
                    color={UI.COLORS.PRIMARY_LIGHT}
                  />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={paymentData.amount}
                  onChangeText={(text) =>
                    setPaymentData((prev) => ({
                      ...prev,
                      amount: text,
                      principal: "",
                      interest: "",
                    }))
                  }
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>
              {errors.amount && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color="#FF6B6B" />
                  <Text style={styles.errorText}>{errors.amount}</Text>
                </View>
              )}
            </View>

            {/* ── Breakdown ──────────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Payment Breakdown</Text>
              <View style={styles.splitRow}>
                <View style={styles.splitCard}>
                  <View style={styles.splitHeader}>
                    <View
                      style={[styles.splitDot, { backgroundColor: "#2ED573" }]}
                    />
                    <Text style={styles.splitLabel}>Principal</Text>
                  </View>
                  <View style={styles.splitInputWrap}>
                    <TextInput
                      style={styles.splitInput}
                      placeholder="0.00"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      value={paymentData.principal}
                      onChangeText={(text) =>
                        setPaymentData((prev) => ({ ...prev, principal: text }))
                      }
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View style={styles.splitCard}>
                  <View style={styles.splitHeader}>
                    <View
                      style={[styles.splitDot, { backgroundColor: "#F59E0B" }]}
                    />
                    <Text style={styles.splitLabel}>Interest</Text>
                  </View>
                  <View style={styles.splitInputWrap}>
                    <TextInput
                      style={styles.splitInput}
                      placeholder="0.00"
                      placeholderTextColor="rgba(255,255,255,0.25)"
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
                  <Ionicons name="alert-circle" size={14} color="#FF6B6B" />
                  <Text style={styles.errorText}>{errors.split}</Text>
                </View>
              )}
              <View style={styles.tipRow}>
                <Ionicons name="bulb" size={13} color="#F59E0B" />
                <Text style={styles.tipText}>
                  Principal reduces your balance, interest is the cost of
                  borrowing
                </Text>
              </View>
            </View>

            {/* ── Note ───────────────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Note (Optional)</Text>
              <View style={styles.inputCard}>
                <View style={styles.inputIconBox}>
                  <Ionicons
                    name="document-text"
                    size={16}
                    color={UI.COLORS.PRIMARY_LIGHT}
                  />
                </View>
                <TextInput
                  style={[styles.input, { minHeight: 48 }]}
                  placeholder="Payment note or reference..."
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={paymentData.note}
                  onChangeText={(text) =>
                    setPaymentData((prev) => ({ ...prev, note: text }))
                  }
                  multiline
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── Bottom action bar ───────────────────── */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSubmit}
            disabled={loading}>
            <LinearGradient
              colors={
                loading
                  ? ["rgba(108,92,231,0.4)", "rgba(108,92,231,0.4)"]
                  : [UI.COLORS.PRIMARY, UI.COLORS.PRIMARY_DARK]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitBtn}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Record Payment</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
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
    backgroundColor: UI.COLORS.PRIMARY,
    borderColor: UI.COLORS.PRIMARY,
  },
  navCenter: { flex: 1, alignItems: "center" },
  navTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  navSubtitle: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
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
    color: UI.COLORS.PRIMARY_LIGHT,
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
    color: UI.COLORS.PRIMARY_LIGHT,
    marginBottom: 2,
  },
  quickChipValue: {
    fontSize: 11,
    color: UI.COLORS.TEXT_MUTED,
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
    color: UI.COLORS.TEXT_PRIMARY,
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
    color: UI.COLORS.TEXT_SECONDARY,
  },
  splitInputWrap: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  splitInput: {
    fontSize: 16,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
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
    color: UI.COLORS.TEXT_MUTED,
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
    color: UI.COLORS.TEXT_MUTED,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 14,
    gap: 8,
    shadowColor: UI.COLORS.PRIMARY,
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
