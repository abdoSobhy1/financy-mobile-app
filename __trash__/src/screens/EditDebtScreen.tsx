import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Screen, useToast } from "../components/ui";
import { AppDispatch, RootState } from "../store";
import { updateDebtAsync, deleteDebt } from "../store/slices/debtsSlice";
import { VALIDATION, UI } from "../constants";
import { DebtStackParamList } from "../types";

type EditDebtScreenNavigationProp = StackNavigationProp<DebtStackParamList, "EditDebt">;
type EditDebtScreenRouteProp = RouteProp<DebtStackParamList, "EditDebt">;

const EditDebtScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<EditDebtScreenNavigationProp>();
  const route = useRoute<EditDebtScreenRouteProp>();
  const { showSuccess, showError } = useToast();

  const { debtId } = route.params;
  const { items, loading } = useSelector((state: RootState) => state.debts);
  const debt = items[debtId];

  const [formData, setFormData] = useState({
    name: "",
    totalAmount: "",
    interestRate: "",
    minimumPayment: "",
    creditor: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Refs for auto-focus
  const nameRef = useRef<TextInput>(null);

  useEffect(() => {
    if (debt) {
      setFormData({
        name: debt.name,
        totalAmount: debt.totalAmount.toString(),
        interestRate: debt.interestRate ? debt.interestRate.toString() : "",
        minimumPayment: debt.minimumPayment ? debt.minimumPayment.toString() : "",
        creditor: debt.creditor || "",
        description: debt.description || "",
      });
    }

    // Auto-focus on name field
    const timer = setTimeout(() => {
      nameRef.current?.focus();
    }, 300);

    return () => clearTimeout(timer);
  }, [debt]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Debt name is required";
    } else if (formData.name.length > VALIDATION.BUDGET.MAX_NAME_LENGTH) {
      newErrors.name = `Name must be ${VALIDATION.BUDGET.MAX_NAME_LENGTH} characters or less`;
    }

    if (!formData.totalAmount.trim()) {
      newErrors.totalAmount = "Total amount is required";
    } else {
      const amount = Number(formData.totalAmount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.totalAmount = "Total amount must be a positive number";
      } else if (amount > VALIDATION.TRANSACTION.MAX_AMOUNT) {
        newErrors.totalAmount = `Amount cannot exceed ${VALIDATION.TRANSACTION.MAX_AMOUNT}`;
      }
    }

    if (formData.interestRate) {
      const rate = Number(formData.interestRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        newErrors.interestRate = "Interest rate must be between 0 and 100";
      }
    }

    if (formData.minimumPayment) {
      const payment = Number(formData.minimumPayment);
      if (isNaN(payment) || payment <= 0) {
        newErrors.minimumPayment = "Minimum payment must be a valid positive number";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || loading) return;

    try {
      const updateData = {
        name: formData.name.trim(),
        totalAmount: Number(formData.totalAmount),
        interestRate: formData.interestRate ? Number(formData.interestRate) : undefined,
        minimumPayment: formData.minimumPayment ? Number(formData.minimumPayment) : undefined,
        creditor: formData.creditor.trim() || undefined,
        description: formData.description.trim() || undefined,
      };

      await dispatch(updateDebtAsync({ id: debtId, updates: updateData })).unwrap();
      showSuccess("Debt updated successfully!");
      navigation.goBack();
    } catch (error) {
      console.error("Debt update error:", error);
      showError("Failed to update debt. Please try again.");
      setErrors({ submit: "Failed to update debt. Please try again." });
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Debt", "Are you sure you want to delete this debt and all its payments? This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await dispatch(deleteDebt(debtId)).unwrap();
            showSuccess("Debt deleted successfully!");
            navigation.goBack();
          } catch (error) {
            console.error("Debt deletion error:", error);
            showError("Failed to delete debt. Please try again.");
            setErrors({ submit: "Failed to delete debt. Please try again." });
          }
        },
      },
    ]);
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  if (!debt) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={UI.COLORS.SUCCESS} />
          <Text style={styles.loadingText}>Loading debt...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Ionicons name="close" size={24} color={UI.COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Debt</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={20} color={UI.COLORS.ERROR} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSubmit} style={[styles.saveButton, loading && styles.saveButtonDisabled]} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color={UI.COLORS.SURFACE} /> : <Text style={styles.saveButtonText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* Debt Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Debt Name *</Text>
            <View style={[styles.inputContainer, errors.name && styles.inputError]}>
              <Ionicons name="card-outline" size={20} color={UI.COLORS.TEXT_SECONDARY} style={styles.inputIcon} />
              <TextInput
                ref={nameRef}
                style={styles.input}
                placeholder="Enter debt name"
                placeholderTextColor={UI.COLORS.TEXT_SECONDARY}
                value={formData.name}
                onChangeText={(text) => updateFormData("name", text)}
                maxLength={VALIDATION.BUDGET.MAX_NAME_LENGTH}
                returnKeyType="next"
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Total Amount */}
          <View style={styles.section}>
            <Text style={styles.label}>Total Amount *</Text>
            <View style={[styles.inputContainer, errors.totalAmount && styles.inputError]}>
              <Ionicons name="cash-outline" size={20} color={UI.COLORS.TEXT_SECONDARY} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={UI.COLORS.TEXT_SECONDARY}
                value={formData.totalAmount}
                onChangeText={(text) => updateFormData("totalAmount", text)}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>
            {errors.totalAmount && <Text style={styles.errorText}>{errors.totalAmount}</Text>}
          </View>

          {/* Interest Rate */}
          <View style={styles.section}>
            <Text style={styles.label}>Interest Rate (Annual %)</Text>
            <View style={[styles.inputContainer, errors.interestRate && styles.inputError]}>
              <Ionicons name="trending-up-outline" size={20} color={UI.COLORS.TEXT_SECONDARY} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="0.0"
                placeholderTextColor={UI.COLORS.TEXT_SECONDARY}
                value={formData.interestRate}
                onChangeText={(text) => updateFormData("interestRate", text)}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>
            {errors.interestRate && <Text style={styles.errorText}>{errors.interestRate}</Text>}
          </View>

          {/* Minimum Payment */}
          <View style={styles.section}>
            <Text style={styles.label}>Minimum Payment</Text>
            <View style={[styles.inputContainer, errors.minimumPayment && styles.inputError]}>
              <Ionicons name="wallet-outline" size={20} color={UI.COLORS.TEXT_SECONDARY} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={UI.COLORS.TEXT_SECONDARY}
                value={formData.minimumPayment}
                onChangeText={(text) => updateFormData("minimumPayment", text)}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>
            {errors.minimumPayment && <Text style={styles.errorText}>{errors.minimumPayment}</Text>}
          </View>

          {/* Creditor */}
          <View style={styles.section}>
            <Text style={styles.label}>Creditor</Text>
            <View style={[styles.inputContainer, errors.creditor && styles.inputError]}>
              <Ionicons name="business-outline" size={20} color={UI.COLORS.TEXT_SECONDARY} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter creditor name"
                placeholderTextColor={UI.COLORS.TEXT_SECONDARY}
                value={formData.creditor}
                onChangeText={(text) => updateFormData("creditor", text)}
                returnKeyType="next"
              />
            </View>
            {errors.creditor && <Text style={styles.errorText}>{errors.creditor}</Text>}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <View style={[styles.inputContainer, errors.description && styles.inputError]}>
              <Ionicons name="document-text-outline" size={20} color={UI.COLORS.TEXT_SECONDARY} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter description"
                placeholderTextColor={UI.COLORS.TEXT_SECONDARY}
                value={formData.description}
                onChangeText={(text) => updateFormData("description", text)}
                multiline
                numberOfLines={3}
                returnKeyType="done"
              />
            </View>
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          {errors.submit && (
            <View style={styles.section}>
              <Text style={styles.errorText}>{errors.submit}</Text>
            </View>
          )}

          {/* Bottom padding for keyboard */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: UI.COLORS.TEXT_SECONDARY,
    marginTop: UI.SPACING.MD,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: UI.SPACING.MD,
    paddingVertical: UI.SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
  },
  cancelButton: {
    padding: UI.SPACING.XS,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: UI.SPACING.XS,
  },
  deleteButton: {
    padding: UI.SPACING.XS,
  },
  saveButton: {
    backgroundColor: UI.COLORS.PRIMARY,
    paddingHorizontal: UI.SPACING.MD,
    paddingVertical: UI.SPACING.XS,
    borderRadius: UI.SPACING.XS,
    minWidth: 60,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.SURFACE,
  },
  form: {
    flex: 1,
    paddingHorizontal: UI.SPACING.MD,
  },
  section: {
    marginBottom: UI.SPACING.LG,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: UI.COLORS.CARD,
    borderRadius: UI.CARD_RADIUS,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    paddingHorizontal: UI.SPACING.MD,
    paddingVertical: UI.SPACING.XS / 2,
  },
  inputError: {
    borderColor: UI.COLORS.ERROR,
  },
  inputIcon: {
    marginRight: UI.SPACING.SM,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    paddingVertical: UI.SPACING.SM,
  },
  errorText: {
    fontSize: 12,
    color: UI.COLORS.ERROR,
    marginTop: UI.SPACING.XS / 2,
  },
  bottomPadding: {
    height: 100,
  },
});

export default EditDebtScreen;
