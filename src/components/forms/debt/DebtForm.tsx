import { AlertService } from "../../../services/AlertService";
import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { DebtStackParamList } from "../../../navigation/DebtStackNavigator";
import { useToast, CustomDatePicker } from "../../ui";
import { AppDispatch } from "../../../store";
import { addDebt, updateDebt, deleteDebt } from "../../../store/slices/debtsSlice";
import { Debt, DebtDirection } from "../../../types";
import { useAppTheme } from "../../ui/ThemeProvider";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface DebtFormProps {
  debt?: Debt | null; 
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  name: string;
  type: DebtDirection;
  totalAmount: string;
  interestRate: string;
  minimumPayment: string;
  creditor: string;
  description: string;
  dueDate?: Date | null;
}

type DebtFormNavigationProp = StackNavigationProp<DebtStackParamList, "DebtForm">;

export const DebtForm: React.FC<DebtFormProps> = ({ debt, onSuccess, onCancel }) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<DebtFormNavigationProp>();
  const { showSuccess, showError } = useToast();
  const { colors, typography, spacing, radius, currencySymbol } = useAppTheme();

  const isEditing = !!debt;

  const [formData, setFormData] = useState<FormData>({
    name: "",
    type: "i_owe",
    totalAmount: "",
    interestRate: "",
    minimumPayment: "",
    creditor: "",
    description: "",
    dueDate: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (debt) {
      setFormData({
        name: debt.name || "",
        type: debt.type === "owed_to_me" ? "owed_to_me" : "i_owe",
        totalAmount: debt.totalAmount?.toString() || "",
        interestRate: debt.interestRate?.toString() || "",
        minimumPayment: debt.minimumPayment?.toString() || "",
        creditor: debt.creditor || "",
        description: debt.description || "",
        dueDate: debt.dueDate ? new Date(debt.dueDate) : null,
      });
    }
  }, [debt]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Debt name is required";
    if (!formData.totalAmount.trim()) newErrors.totalAmount = "Amount is required";
    else if (isNaN(Number(formData.totalAmount)) || Number(formData.totalAmount) <= 0) {
      newErrors.totalAmount = "Please enter a valid amount";
    }

    if (formData.interestRate && (isNaN(Number(formData.interestRate)) || Number(formData.interestRate) < 0)) {
      newErrors.interestRate = "Please enter a valid interest rate";
    }

    if (formData.minimumPayment && (isNaN(Number(formData.minimumPayment)) || Number(formData.minimumPayment) <= 0)) {
      newErrors.minimumPayment = "Please enter a valid minimum payment";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const debtData = {
        name: formData.name.trim(),
        type: formData.type,
        totalAmount: Number(formData.totalAmount),
        currentBalance: isEditing ? debt!.currentBalance : Number(formData.totalAmount),
        interestRate: formData.interestRate ? Number(formData.interestRate) : undefined,
        minimumPayment: formData.minimumPayment ? Number(formData.minimumPayment) : undefined,
        creditor: formData.creditor.trim() || undefined,
        description: formData.description.trim() || undefined,
        dueDate: formData.dueDate ? formData.dueDate.toISOString() : undefined,
      };

      if (isEditing) {
        await dispatch(
          updateDebt({
            id: debt!.id,
            updates: debtData,
          })
        ).unwrap();
        showSuccess("Debt updated successfully!");
      } else {
        await dispatch(addDebt(debtData)).unwrap();
        showSuccess("Debt added successfully!");
      }

      onSuccess?.();
      setTimeout(() => navigation.goBack(), 1000);
    } catch (error) {
      console.error("Debt operation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      const action = isEditing ? "update" : "add";
      showError(`Failed to ${action} debt: ${errorMessage}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!debt) return;

    AlertService.alert("Delete Debt", `Are you sure you want to delete "${debt.name}" and all its payment history? This action cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await dispatch(deleteDebt(debt.id)).unwrap();
            showSuccess("Debt deleted successfully!");
            onSuccess?.();
            setTimeout(() => navigation.goBack(), 1000);
          } catch (error) {
            console.error("Debt deletion error:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            showError(`Failed to delete debt: ${errorMessage}. Please try again.`);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      {/* Top Bar */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}>
        <TouchableOpacity style={{ width: 40, height: 40, justifyContent: "center" }} onPress={onCancel || (() => navigation.goBack())}>
          <Text style={[typography.bodyLarge, { color: colors.onSurfaceVariant }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.onBackground }]}>
          {isEditing ? "Edit Debt" : "New Debt"}
        </Text>
        {isEditing ? (
          <TouchableOpacity style={{ width: 40, height: 40, justifyContent: "center", alignItems: "flex-end" }} onPress={handleDelete}>
            <Text style={[typography.bodyLarge, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Direction Selector: I Owe vs Owed to Me */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: colors.surfaceVariant,
            borderRadius: radius.pill,
            padding: 4,
            borderWidth: 1,
            borderColor: colors.outlineVariant,
          }}
        >
          {(
            [
              { key: "i_owe", label: "I Owe (Borrowed)", icon: "arrow-up-circle-outline", color: colors.error },
              { key: "owed_to_me", label: "Owed to Me (Lent)", icon: "arrow-down-circle-outline", color: colors.primary },
            ] as const
          ).map((opt) => {
            const active = formData.type === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 10,
                  borderRadius: radius.pill,
                  backgroundColor: active ? colors.surface : "transparent",
                  gap: 6,
                }}
                onPress={() => setFormData((prev) => ({ ...prev, type: opt.key }))}
              >
                <Ionicons
                  name={opt.icon as any}
                  size={16}
                  color={active ? opt.color : colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    typography.label,
                    {
                      color: active ? opt.color : colors.onSurfaceVariant,
                      fontWeight: active ? "700" : "600",
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Giant Amount Input */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginVertical: 28 }}>
          <Text style={{ fontSize: 32, fontWeight: "600", marginRight: 8, color: colors.onSurfaceVariant }}>
            {currencySymbol}
          </Text>
          <TextInput
            style={{ fontSize: 56, fontWeight: "700", textAlign: "center", minWidth: 150, color: formData.totalAmount ? colors.onBackground : colors.onSurfaceVariant }}
            placeholder="0.00"
            placeholderTextColor={colors.onSurfaceVariant}
            keyboardType="decimal-pad"
            value={formData.totalAmount}
            onChangeText={(text) => updateField("totalAmount", text)}
            autoFocus={!isEditing}
          />
        </View>

        {/* Debt Name */}
        <View style={{ marginBottom: spacing.xl }}>
          <Text style={[typography.label, { color: colors.onSurfaceVariant, marginBottom: spacing.xs, marginLeft: spacing.sm }]}>
            {formData.type === "owed_to_me" ? "What did you lend for?" : "Debt Name"}
          </Text>
          <View style={{ borderWidth: 1, borderColor: errors.name ? colors.error : colors.outlineVariant, backgroundColor: colors.surfaceVariant, borderRadius: radius.lg }}>
            <TextInput
              style={[typography.bodyMedium, { color: colors.onBackground, padding: spacing.md, textAlign: "center" }]}
              placeholder={formData.type === "owed_to_me" ? "e.g. Personal Loan to Ahmed" : "e.g. Student Loan / Credit Card"}
              placeholderTextColor={colors.onSurfaceVariant}
              value={formData.name}
              onChangeText={(text) => updateField("name", text)}
            />
          </View>
        </View>

        {/* Min Payment & Interest Rate */}
        <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl }}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.label, { color: colors.onSurfaceVariant, marginBottom: spacing.xs, marginLeft: spacing.sm, textAlign: "center" }]}>Min Payment</Text>
            <View style={{ borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: colors.surfaceVariant, borderRadius: radius.lg }}>
              <TextInput
                style={[typography.bodyMedium, { color: colors.onBackground, padding: spacing.md, textAlign: "center" }]}
                placeholder="0.00"
                placeholderTextColor={colors.onSurfaceVariant}
                keyboardType="decimal-pad"
                value={formData.minimumPayment}
                onChangeText={(text) => updateField("minimumPayment", text)}
              />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.label, { color: colors.onSurfaceVariant, marginBottom: spacing.xs, marginLeft: spacing.sm, textAlign: "center" }]}>Interest Rate (%)</Text>
            <View style={{ borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: colors.surfaceVariant, borderRadius: radius.lg }}>
              <TextInput
                style={[typography.bodyMedium, { color: colors.onBackground, padding: spacing.md, textAlign: "center" }]}
                placeholder="0"
                placeholderTextColor={colors.onSurfaceVariant}
                keyboardType="decimal-pad"
                value={formData.interestRate}
                onChangeText={(text) => updateField("interestRate", text)}
              />
            </View>
          </View>
        </View>

        {/* Creditor / Borrower */}
        <View style={{ marginBottom: spacing.xl }}>
          <Text style={[typography.label, { color: colors.onSurfaceVariant, marginBottom: spacing.xs, marginLeft: spacing.sm }]}>
            {formData.type === "owed_to_me" ? "Borrower (Who owes you?)" : "Creditor / Lender"}
          </Text>
          <View style={{ borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: colors.surfaceVariant, borderRadius: radius.lg }}>
            <TextInput
              style={[typography.bodyMedium, { color: colors.onBackground, padding: spacing.md, textAlign: "center" }]}
              placeholder={formData.type === "owed_to_me" ? "e.g. Friend / Colleague" : "e.g. CIB Bank"}
              placeholderTextColor={colors.onSurfaceVariant}
              value={formData.creditor}
              onChangeText={(text) => updateField("creditor", text)}
            />
          </View>
        </View>

        {/* Due Date - wrapping CustomDatePicker to look somewhat like the input cards */}
        <View style={{ marginBottom: spacing.xl }}>
          <CustomDatePicker
            label="Due Date"
            value={formData.dueDate || undefined}
            onDateChange={(date) => setFormData((prev) => ({ ...prev, dueDate: date }))}
          />
        </View>

        {/* Description */}
        <View style={{ marginBottom: spacing.xl }}>
          <Text style={[typography.label, { color: colors.onSurfaceVariant, marginBottom: spacing.xs, marginLeft: spacing.sm }]}>Notes (Optional)</Text>
          <View style={{ borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: colors.surfaceVariant, borderRadius: radius.lg }}>
            <TextInput
              style={[typography.bodyMedium, { color: colors.onBackground, padding: spacing.md, textAlign: "center", minHeight: 80 }]}
              placeholder="Additional Notes..."
              placeholderTextColor={colors.onSurfaceVariant}
              value={formData.description}
              onChangeText={(text) => updateField("description", text)}
              multiline
            />
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={{ padding: 20, paddingTop: 10, paddingBottom: Platform.OS === "ios" ? 34 : 24, backgroundColor: colors.background, borderTopWidth: 1, borderColor: colors.outlineVariant }}>
        {isEditing && (
          <TouchableOpacity
            style={{ backgroundColor: colors.tertiaryContainer, paddingVertical: 16, borderRadius: radius.pill, alignItems: "center", marginBottom: 12, opacity: loading ? 0.7 : 1 }}
            onPress={() => {
              if (debt) {
                navigation.navigate("AddPayment", {
                  debtId: debt.id,
                  debtName: debt.name,
                  currentBalance: debt.currentBalance,
                  minimumPayment: debt.minimumPayment,
                  interestRate: debt.interestRate,
                });
              }
            }}
            disabled={loading}
          >
            <Text style={[typography.bodyLarge, { color: colors.onTertiaryContainer, fontWeight: "700" }]}>
              Record Payment
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={{ backgroundColor: colors.primaryContainer, paddingVertical: 16, borderRadius: radius.pill, alignItems: "center", opacity: loading ? 0.7 : 1 }}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={[typography.bodyLarge, { color: colors.onPrimaryContainer, fontWeight: "700" }]}>
            {loading ? "Saving..." : isEditing ? "Update Debt" : "Create Debt"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default DebtForm;
