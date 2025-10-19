import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { Screen, useToast } from "../components/ui";
import { AppDispatch } from "../store";
import { makeDebtPayment } from "../store/slices/debtsSlice";
import { formatCurrency } from "../utils";
import { DebtStackParamList } from "../navigation/DebtStackNavigator";
import { UI } from "../constants";

type AddPaymentScreenNavigationProp = StackNavigationProp<DebtStackParamList, "AddPayment">;
type AddPaymentScreenRouteProp = RouteProp<DebtStackParamList, "AddPayment">;

const AddPaymentScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<AddPaymentScreenNavigationProp>();
  const route = useRoute<AddPaymentScreenRouteProp>();
  const { showSuccess, showError } = useToast();

  const { debtId, debtName, currentBalance, minimumPayment, interestRate } = route.params;

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
        // Simple monthly interest calculation
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

    if (!paymentData.amount.trim()) newErrors.amount = "Payment amount is required";
    else if (isNaN(Number(paymentData.amount)) || Number(paymentData.amount) <= 0) {
      newErrors.amount = "Please enter a valid payment amount";
    } else if (Number(paymentData.amount) > currentBalance) {
      newErrors.amount = `Payment cannot exceed remaining balance (${formatCurrency(currentBalance)})`;
    }

    const totalSplit = Number(paymentData.principal || 0) + Number(paymentData.interest || 0);
    if (Math.abs(totalSplit - Number(paymentData.amount)) > 0.01) {
      newErrors.split = "Principal + Interest must equal payment amount";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validatePayment()) return;

    setLoading(true);
    try {
      const paymentFormData = {
        amount: Number(paymentData.amount),
        date: new Date().toISOString(), // Add required date field
        paymentDate: new Date().toISOString(), // Optional, same as date in this case
        principal: Number(paymentData.principal || paymentData.amount),
        interest: Number(paymentData.interest || 0),
        note: paymentData.note.trim() || undefined,
      };

      await dispatch(makeDebtPayment({ debtId, paymentData: paymentFormData })).unwrap();

      showSuccess("Payment recorded successfully!");
      navigation.goBack();
    } catch (error) {
      showError("Failed to record payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
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
    <Screen>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Debt Info Card */}
        <View style={styles.debtInfo}>
          <Text style={styles.debtName}>{debtName}</Text>
          <Text style={styles.debtBalance}>Current Balance: {formatCurrency(currentBalance)}</Text>
          {minimumPayment && <Text style={styles.minimumPayment}>Minimum Payment: {formatCurrency(minimumPayment)}</Text>}
          {interestRate && <Text style={styles.interestRateText}>Interest Rate: {interestRate}% APR</Text>}
        </View>

        {/* Quick Amount Buttons */}
        <View style={styles.quickAmounts}>
          <Text style={styles.sectionTitle}>Quick Amounts</Text>
          <View style={styles.quickButtonsRow}>
            {minimumPayment && (
              <TouchableOpacity
                style={styles.quickButton}
                onPress={() =>
                  setPaymentData((prev) => ({
                    ...prev,
                    amount: minimumPayment.toFixed(2),
                    principal: "",
                    interest: "",
                  }))
                }>
                <Text style={styles.quickButtonText}>Minimum</Text>
                <Text style={styles.quickButtonAmount}>{formatCurrency(minimumPayment)}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.quickButton} onPress={() => handleQuickAmount(0.25)}>
              <Text style={styles.quickButtonText}>25%</Text>
              <Text style={styles.quickButtonAmount}>{formatCurrency(currentBalance * 0.25)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickButton} onPress={() => handleQuickAmount(0.5)}>
              <Text style={styles.quickButtonText}>50%</Text>
              <Text style={styles.quickButtonAmount}>{formatCurrency(currentBalance * 0.5)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickButton} onPress={() => handleQuickAmount(1.0)}>
              <Text style={styles.quickButtonText}>Pay Off</Text>
              <Text style={styles.quickButtonAmount}>{formatCurrency(currentBalance)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.form}>
          {/* Payment Amount */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Payment Amount *</Text>
            <View style={[styles.inputContainer, errors.amount && styles.inputError]}>
              <Ionicons name="cash" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#64748B"
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
            {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
          </View>

          {/* Principal & Interest Split */}
          <View style={styles.splitSection}>
            <Text style={styles.sectionTitle}>Payment Breakdown</Text>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Principal</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="trending-down" size={20} color={UI.COLORS.PRIMARY} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor="#64748B"
                    value={paymentData.principal}
                    onChangeText={(text) => setPaymentData((prev) => ({ ...prev, principal: text }))}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Interest</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="trending-up" size={20} color="#EF4444" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor="#64748B"
                    value={paymentData.interest}
                    onChangeText={(text) => setPaymentData((prev) => ({ ...prev, interest: text }))}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>

            {errors.split && <Text style={styles.errorText}>{errors.split}</Text>}

            <Text style={styles.splitHelper}>Tip: Principal reduces your debt balance, interest is the cost of borrowing</Text>
          </View>

          {/* Payment Note */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Note (Optional)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="document-text" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Payment note or reference..."
                placeholderTextColor="#64748B"
                value={paymentData.note}
                onChangeText={(text) => setPaymentData((prev) => ({ ...prev, note: text }))}
                multiline
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSubmit} style={[styles.submitButton, loading && styles.submitButtonDisabled]} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Record Payment</Text>}
        </TouchableOpacity>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  debtInfo: {
    backgroundColor: "#1E293B",
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.1)",
  },
  debtName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  debtBalance: {
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "600",
    marginBottom: 4,
  },
  minimumPayment: {
    fontSize: 14,
    color: "#F59E0B",
    marginBottom: 4,
  },
  interestRateText: {
    fontSize: 14,
    color: "#94A3B8",
  },
  quickAmounts: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 12,
  },
  quickButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickButton: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    minWidth: 80,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  quickButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: UI.COLORS.PRIMARY,
    marginBottom: 4,
  },
  quickButtonAmount: {
    fontSize: 10,
    color: "#94A3B8",
  },
  form: {
    paddingHorizontal: 20,
  },
  splitSection: {
    marginBottom: 20,
  },
  splitHelper: {
    fontSize: 12,
    color: "#64748B",
    fontStyle: "italic",
    marginTop: 8,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#F8FAFC",
    paddingVertical: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    backgroundColor: "#1E293B",
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.1)",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#94A3B8",
  },
  submitButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: UI.COLORS.PRIMARY,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default AddPaymentScreen;
