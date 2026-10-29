import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { DebtStackParamList } from "../../../types";
import { useToast, CustomDatePicker } from "../../ui";
import { AppDispatch } from "../../../store";
import {
  addDebt,
  updateDebt,
  deleteDebt,
} from "../../../store/slices/debtsSlice";
import { Debt, DebtDirection } from "../../../types";
import { useAppTheme } from "../../ui/ThemeProvider";
import { AlertService } from "../../../services/AlertService";

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

export const DebtForm: React.FC<DebtFormProps> = ({
  debt,
  onSuccess,
  onCancel,
}) => {
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const totalAmountRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const creditorRef = useRef<TextInput>(null);
  const minPaymentRef = useRef<TextInput>(null);
  const interestRateRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);

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
      if (debt.description) {
        setShowMore(true);
      }
    }
  }, [debt]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const amountNum = Number(formData.totalAmount.replace(/,/g, ""));

    if (!formData.totalAmount.trim()) {
      newErrors.totalAmount = "Amount is required";
    } else if (isNaN(amountNum) || amountNum <= 0) {
      newErrors.totalAmount = "Please enter a valid amount greater than 0";
    }

    if (!formData.name.trim()) {
      newErrors.name = "Debt name is required";
    }

    if (
      formData.interestRate &&
      (isNaN(Number(formData.interestRate)) || Number(formData.interestRate) < 0)
    ) {
      newErrors.interestRate = "Please enter a valid interest rate";
    }

    if (
      formData.minimumPayment &&
      (isNaN(Number(formData.minimumPayment)) ||
        Number(formData.minimumPayment) <= 0)
    ) {
      newErrors.minimumPayment = "Please enter a valid minimum payment";
    }

    setErrors(newErrors);
    if (newErrors.totalAmount) {
      showError(newErrors.totalAmount);
    } else if (newErrors.name) {
      showError(newErrors.name);
    } else if (newErrors.minimumPayment) {
      showError(newErrors.minimumPayment);
    } else if (newErrors.interestRate) {
      showError(newErrors.interestRate);
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const cleanAmount = Number(formData.totalAmount.replace(/,/g, ""));
      const debtData = {
        name: formData.name.trim(),
        type: formData.type,
        totalAmount: cleanAmount,
        currentBalance: isEditing ? debt!.currentBalance : cleanAmount,
        interestRate: formData.interestRate
          ? Number(formData.interestRate)
          : undefined,
        minimumPayment: formData.minimumPayment
          ? Number(formData.minimumPayment)
          : undefined,
        creditor: formData.creditor.trim() || undefined,
        description: formData.description.trim() || undefined,
        dueDate: formData.dueDate ? formData.dueDate.toISOString() : undefined,
      };

      if (isEditing) {
        await dispatch(
          updateDebt({
            id: debt!.id,
            updates: debtData,
          }),
        ).unwrap();
        showSuccess("Debt updated successfully!");
      } else {
        await dispatch(addDebt(debtData)).unwrap();
        showSuccess("Debt added successfully!");
      }

      onSuccess?.();
      navigation.goBack();
    } catch (error) {
      console.error("Debt operation error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      const action = isEditing ? "update" : "add";
      showError(`Failed to ${action} debt: ${errorMessage}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!debt) return;

    AlertService.alert(
      "Delete Debt",
      `Are you sure you want to delete "${debt.name}" and all its payment history? This action cannot be undone.`,
      [
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
              navigation.goBack();
            } catch (error) {
              console.error("Debt deletion error:", error);
              showError("Failed to delete debt. Please try again.");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}>
      {/* Top Bar matching AddTransactionScreen */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[
            styles.iconButton,
            { backgroundColor: colors.surfaceVariant },
          ]}
          onPress={onCancel || (() => navigation.goBack())}>
          <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.onBackground }]}>
          {isEditing ? "Edit Debt" : "New Debt"}
        </Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {isEditing && (
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: "rgba(239, 68, 68, 0.12)" },
              ]}
              onPress={handleDelete}
              disabled={loading}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: colors.primaryContainer },
            ]}
            onPress={handleSubmit}
            disabled={loading}>
            <Ionicons
              name="checkmark"
              size={24}
              color={colors.onPrimaryContainer}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled">
        {/* Direction Segmented Control matching AddTransactionScreen */}
        <View
          style={[
            styles.segmentContainer,
            {
              backgroundColor: colors.surfaceVariant,
              borderRadius: radius.pill,
              marginBottom: spacing.xl,
            },
          ]}>
          {(
            [
              {
                key: "i_owe",
                label: "I Owe (Borrowed)",
                icon: "arrow-up-circle-outline",
                color: colors.error,
              },
              {
                key: "owed_to_me",
                label: "Owed to Me (Lent)",
                icon: "arrow-down-circle-outline",
                color: colors.primary,
              },
            ] as const
          ).map((opt) => {
            const isActive = formData.type === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.segmentButton,
                  {
                    borderRadius: radius.pill,
                    backgroundColor: isActive
                      ? colors.surface
                      : "transparent",
                  },
                ]}
                onPress={() => setFormData((prev) => ({ ...prev, type: opt.key }))}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons
                    name={opt.icon as any}
                    size={16}
                    color={isActive ? opt.color : colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      typography.bodyMedium,
                      {
                        color: isActive
                          ? colors.onBackground
                          : colors.onSurfaceVariant,
                        fontWeight: isActive ? "700" : "500",
                      },
                    ]}>
                    {opt.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Amount Section — Tactile Display matching AddTransactionScreen */}
        <View style={styles.amountSection}>
          <Text
            style={[
              typography.bodyMedium,
              { color: colors.onSurfaceVariant, marginBottom: 6 },
            ]}>
            {formData.type === "owed_to_me" ? "Amount Lent" : "Total Debt Amount"}
          </Text>
          <View style={styles.amountRow}>
            <View style={styles.amountTextContainer}>
              <Text
                style={[
                  styles.currencySymbol,
                  { color: colors.onSurfaceVariant },
                ]}>
                {currencySymbol.trim()}
              </Text>
              <TextInput
                ref={totalAmountRef}
                style={[
                  styles.amountValue,
                  {
                    color: formData.type === "owed_to_me"
                      ? colors.tertiary
                      : formData.totalAmount
                      ? colors.onBackground
                      : colors.onSurfaceVariant,
                  },
                ]}
                placeholder="0.00"
                placeholderTextColor={colors.onSurfaceVariant}
                keyboardType="decimal-pad"
                value={formData.totalAmount}
                onChangeText={(text) => updateField("totalAmount", text)}
                autoFocus={!isEditing}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => nameRef.current?.focus()}
              />
            </View>
          </View>
          {errors.totalAmount ? (
            <Text style={styles.errorText}>{errors.totalAmount}</Text>
          ) : (
            <Text
              style={[
                typography.bodySmall,
                { color: colors.onSurfaceVariant, marginTop: 4, opacity: 0.7 },
              ]}>
              {formData.type === "owed_to_me"
                ? "Total principal you lent"
                : "Initial loan or balance owed"}
            </Text>
          )}
        </View>

        {/* Details Card matching AddTransactionScreen optionsCard */}
        <Text
          style={[
            typography.label,
            {
              color: colors.onSurfaceVariant,
              marginBottom: spacing.sm,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            },
          ]}>
          Details
        </Text>
        <View
          style={[
            styles.optionsCard,
            {
              backgroundColor: colors.surfaceVariant,
              borderColor: colors.outlineVariant,
              borderWidth: 1,
            },
          ]}>
          {/* Debt Name */}
          <View
            style={[
              styles.optionRow,
              {
                borderBottomColor: colors.outlineVariant,
                borderBottomWidth: 1,
              },
            ]}>
            <View
              style={[
                styles.optionIcon,
                { backgroundColor: colors.surface },
              ]}>
              <Ionicons
                name="card-outline"
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={styles.optionContent}>
              <TextInput
                ref={nameRef}
                style={[
                  typography.bodyMedium,
                  { color: colors.onBackground, padding: 0 },
                ]}
                placeholder={
                  formData.type === "owed_to_me"
                    ? "What did you lend for? (e.g. Loan to Ahmed)"
                    : "Debt Name (e.g. Credit Card, Student Loan)"
                }
                placeholderTextColor={colors.onSurfaceVariant}
                value={formData.name}
                onChangeText={(text) => updateField("name", text)}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => creditorRef.current?.focus()}
              />
            </View>
          </View>

          {/* Creditor / Borrower */}
          <View
            style={[
              styles.optionRow,
              {
                borderBottomColor: colors.outlineVariant,
                borderBottomWidth: 1,
              },
            ]}>
            <View
              style={[
                styles.optionIcon,
                { backgroundColor: colors.surface },
              ]}>
              <Ionicons
                name="person-outline"
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={styles.optionContent}>
              <TextInput
                ref={creditorRef}
                style={[
                  typography.bodyMedium,
                  { color: colors.onBackground, padding: 0 },
                ]}
                placeholder={
                  formData.type === "owed_to_me"
                    ? "Borrower (Who owes you?)"
                    : "Creditor / Lender (e.g. CIB Bank)"
                }
                placeholderTextColor={colors.onSurfaceVariant}
                value={formData.creditor}
                onChangeText={(text) => updateField("creditor", text)}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => minPaymentRef.current?.focus()}
              />
            </View>
          </View>

          {/* Due Date */}
          <TouchableOpacity
            style={[
              styles.optionRow,
              {
                borderBottomColor: "transparent",
                borderBottomWidth: 0,
              },
            ]}
            onPress={() => setShowDatePicker(true)}>
            <View
              style={[
                styles.optionIcon,
                { backgroundColor: colors.surface },
              ]}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={styles.optionContent}>
              <Text
                style={[
                  typography.bodyMedium,
                  {
                    color: formData.dueDate
                      ? colors.onBackground
                      : colors.onSurfaceVariant,
                    fontWeight: formData.dueDate ? "600" : "400",
                  },
                ]}>
                {formData.dueDate
                  ? formData.dueDate.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Due Date (Optional)"}
              </Text>
            </View>
            {formData.dueDate ? (
              <TouchableOpacity
                onPress={() => setFormData((prev) => ({ ...prev, dueDate: null }))}
                style={{ padding: 4, marginRight: 4 }}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            ) : null}
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>
        {errors.name ? (
          <Text
            style={[
              styles.errorText,
              {
                marginTop: -16,
                marginBottom: spacing.lg,
                marginLeft: 8,
                textAlign: "left",
              },
            ]}>
            {errors.name}
          </Text>
        ) : null}

        {/* Financial Terms Card */}
        <Text
          style={[
            typography.label,
            {
              color: colors.onSurfaceVariant,
              marginBottom: spacing.sm,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            },
          ]}>
          Terms (Optional)
        </Text>
        <View
          style={[
            styles.optionsCard,
            {
              backgroundColor: colors.surfaceVariant,
              borderColor: colors.outlineVariant,
              borderWidth: 1,
            },
          ]}>
          {/* Minimum Payment */}
          <View
            style={[
              styles.optionRow,
              {
                borderBottomColor: colors.outlineVariant,
                borderBottomWidth: 1,
              },
            ]}>
            <View
              style={[
                styles.optionIcon,
                { backgroundColor: colors.surface },
              ]}>
              <Ionicons
                name="cash-outline"
                size={20}
                color={colors.primary}
              />
            </View>
            <View
              style={[
                styles.optionContent,
                { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
              ]}>
              <Text
                style={[
                  typography.bodyMedium,
                  { color: colors.onSurfaceVariant, marginRight: 8 },
                ]}>
                Min Payment
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={[
                    typography.bodyMedium,
                    { color: colors.onSurfaceVariant, marginRight: 4 },
                  ]}>
                  {currencySymbol.trim()}
                </Text>
                <TextInput
                  ref={minPaymentRef}
                  style={[
                    typography.bodyMedium,
                    {
                      color: colors.onBackground,
                      padding: 0,
                      textAlign: "right",
                      minWidth: 80,
                    },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={colors.onSurfaceVariant}
                  keyboardType="decimal-pad"
                  value={formData.minimumPayment}
                  onChangeText={(text) => updateField("minimumPayment", text)}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => interestRateRef.current?.focus()}
                />
              </View>
            </View>
          </View>

          {/* Interest Rate */}
          <View
            style={[
              styles.optionRow,
              {
                borderBottomColor: "transparent",
                borderBottomWidth: 0,
              },
            ]}>
            <View
              style={[
                styles.optionIcon,
                { backgroundColor: colors.surface },
              ]}>
              <Ionicons
                name="trending-up-outline"
                size={20}
                color={colors.primary}
              />
            </View>
            <View
              style={[
                styles.optionContent,
                { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
              ]}>
              <Text
                style={[
                  typography.bodyMedium,
                  { color: colors.onSurfaceVariant, marginRight: 8 },
                ]}>
                Interest Rate
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  ref={interestRateRef}
                  style={[
                    typography.bodyMedium,
                    {
                      color: colors.onBackground,
                      padding: 0,
                      textAlign: "right",
                      minWidth: 60,
                    },
                  ]}
                  placeholder="0"
                  placeholderTextColor={colors.onSurfaceVariant}
                  keyboardType="decimal-pad"
                  value={formData.interestRate}
                  onChangeText={(text) => updateField("interestRate", text)}
                  returnKeyType={showMore ? "next" : "done"}
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    if (showMore) {
                      descriptionRef.current?.focus();
                    } else {
                      handleSubmit();
                    }
                  }}
                />
                <Text
                  style={[
                    typography.bodyMedium,
                    { color: colors.onSurfaceVariant, marginLeft: 4 },
                  ]}>
                  % APR
                </Text>
              </View>
            </View>
          </View>
        </View>
        {errors.minimumPayment || errors.interestRate ? (
          <Text
            style={[
              styles.errorText,
              {
                marginTop: -16,
                marginBottom: spacing.lg,
                marginLeft: 8,
                textAlign: "left",
              },
            ]}>
            {errors.minimumPayment || errors.interestRate}
          </Text>
        ) : null}

        {/* More options toggle matching AddTransactionScreen */}
        <TouchableOpacity
          style={styles.moreOptionsBtn}
          onPress={() => setShowMore(!showMore)}>
          <Text
            style={[
              typography.bodyMedium,
              {
                color: colors.primary,
                fontWeight: "700",
                marginRight: 4,
              },
            ]}>
            {showMore ? "Fewer options" : "More options (Notes)"}
          </Text>
          <Ionicons
            name={showMore ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.primary}
          />
        </TouchableOpacity>

        {showMore && (
          <View
            style={[
              styles.optionsCard,
              {
                backgroundColor: colors.surfaceVariant,
                borderColor: colors.outlineVariant,
                borderWidth: 1,
                marginBottom: spacing.xl,
              },
            ]}>
            <View
              style={[
                styles.optionRow,
                {
                  borderBottomColor: "transparent",
                  borderBottomWidth: 0,
                  alignItems: "flex-start",
                },
              ]}>
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: colors.surface, marginTop: 2 },
                ]}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.optionContent}>
                <TextInput
                  ref={descriptionRef}
                  style={[
                    typography.bodyMedium,
                    {
                      color: colors.onBackground,
                      padding: 0,
                      minHeight: 60,
                      textAlignVertical: "top",
                    },
                  ]}
                  placeholder="Additional notes about this debt..."
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={formData.description}
                  onChangeText={(text) => updateField("description", text)}
                  multiline
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </View>
            </View>
          </View>
        )}

        {/* Record Payment Action Button (Editing only) */}
        {isEditing && (
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: colors.tertiaryContainer,
                marginBottom: spacing.md,
                flexDirection: "row",
                gap: 8,
              },
            ]}
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
            disabled={loading}>
            <Ionicons
              name="card-outline"
              size={20}
              color={colors.onTertiaryContainer}
            />
            <Text
              style={[
                typography.bodyLarge,
                { color: colors.onTertiaryContainer, fontWeight: "700" },
              ]}>
              Record Payment
            </Text>
          </TouchableOpacity>
        )}

        {/* Primary Save Button at bottom of ScrollView */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: colors.primaryContainer,
              opacity: loading ? 0.7 : 1,
            },
          ]}
          onPress={handleSubmit}
          disabled={loading}>
          <Text
            style={[
              typography.bodyLarge,
              { color: colors.onPrimaryContainer, fontWeight: "700" },
            ]}>
            {loading
              ? "Saving..."
              : isEditing
              ? "Update Debt"
              : "Create Debt"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {showDatePicker && (
        <CustomDatePicker
          value={formData.dueDate || new Date()}
          onDateChange={(d) => {
            setFormData((prev) => ({ ...prev, dueDate: d }));
            setShowDatePicker(false);
          }}
          label="Due Date"
          hideTrigger
          open
          onClose={() => setShowDatePicker(false)}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  segmentContainer: {
    flexDirection: "row",
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  amountSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  amountTextContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: "700",
    marginRight: 4,
  },
  amountValue: {
    fontSize: 48,
    fontWeight: "800",
    textAlign: "center",
    minWidth: 150,
    padding: 0,
  },
  optionsCard: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
    justifyContent: "center",
  },
  moreOptionsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: "center",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },
});

export default DebtForm;
