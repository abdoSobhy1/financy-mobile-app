import { styles } from "./DebtForm.styles";
import { useDebtForm } from "../hooks/useDebtForm";

import { View, Text, TextInput, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";
interface DebtPaymentFieldsProps {
  minPaymentRef: ReturnType<typeof useDebtForm>["minPaymentRef"];
  formData: ReturnType<typeof useDebtForm>["formData"];
  updateField: ReturnType<typeof useDebtForm>["updateField"];
  interestRateRef: ReturnType<typeof useDebtForm>["interestRateRef"];
  showMore: ReturnType<typeof useDebtForm>["showMore"];
  descriptionRef: ReturnType<typeof useDebtForm>["descriptionRef"];

}
export function DebtPaymentFields({ minPaymentRef, formData, updateField, interestRateRef, showMore, descriptionRef }: DebtPaymentFieldsProps) {
  const { colors, typography, currencySymbol } = useAppTheme();

  return (<View
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
                Keyboard.dismiss();
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
  </View>);
}
