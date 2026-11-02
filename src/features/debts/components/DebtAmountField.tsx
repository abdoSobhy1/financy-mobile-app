import { styles } from "./DebtForm.styles";
import { useDebtForm } from "../hooks/useDebtForm";

import { View, Text, TextInput } from "react-native";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";
interface DebtAmountFieldProps {
  typography: ReturnType<typeof useAppTheme>["typography"];
  colors: ReturnType<typeof useAppTheme>["colors"];
  formData: ReturnType<typeof useDebtForm>["formData"];
  currencySymbol: ReturnType<typeof useAppTheme>["currencySymbol"];
  totalAmountRef: ReturnType<typeof useDebtForm>["totalAmountRef"];
  updateField: ReturnType<typeof useDebtForm>["updateField"];
  isEditing: ReturnType<typeof useDebtForm>["isEditing"];
  nameRef: ReturnType<typeof useDebtForm>["nameRef"];
  errors: ReturnType<typeof useDebtForm>["errors"];
}
export function DebtAmountField({ typography, colors, formData, currencySymbol, totalAmountRef, updateField, isEditing, nameRef, errors }: DebtAmountFieldProps) {
  return (<View style={styles.amountSection}>
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
  </View>);
}
