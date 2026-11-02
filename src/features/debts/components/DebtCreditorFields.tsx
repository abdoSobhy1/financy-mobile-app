import { styles } from "./DebtForm.styles";
import { useDebtForm } from "../hooks/useDebtForm";

import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";
interface DebtCreditorFieldsProps {
  nameRef: ReturnType<typeof useDebtForm>["nameRef"];
  formData: ReturnType<typeof useDebtForm>["formData"];
  updateField: ReturnType<typeof useDebtForm>["updateField"];
  creditorRef: ReturnType<typeof useDebtForm>["creditorRef"];
  minPaymentRef: ReturnType<typeof useDebtForm>["minPaymentRef"];
  setShowDatePicker: ReturnType<typeof useDebtForm>["setShowDatePicker"];
  setFormData: ReturnType<typeof useDebtForm>["setFormData"];

}
export function DebtCreditorFields({ nameRef, formData, updateField, creditorRef, minPaymentRef, setShowDatePicker, setFormData }: DebtCreditorFieldsProps) {
  const { colors, typography } = useAppTheme();

  return (<View
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
  </View>);
}
