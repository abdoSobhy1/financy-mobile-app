import { styles } from "./AddTransactionForm.styles";
import type { AddTransactionScreenController } from "../hooks/useAddTransactionScreen";

import { View, Text, TouchableOpacity, Keyboard, Animated } from "react-native";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";

import { formatCurrency } from "../../../shared/utils";

interface TransactionAmountFieldProps {
  setShowKeypad: AddTransactionScreenController["setShowKeypad"];
  setAmountFocused: AddTransactionScreenController["setAmountFocused"];
  scrollViewRef: AddTransactionScreenController["scrollViewRef"];
  amountFocused: AddTransactionScreenController["amountFocused"];
  amountStr: AddTransactionScreenController["amountStr"];
  type: AddTransactionScreenController["type"];
  amountDisplay: AddTransactionScreenController["amountDisplay"];
  showKeypad: AddTransactionScreenController["showKeypad"];
  cursorOpacity: AddTransactionScreenController["cursorOpacity"];
  hasMathOperator: AddTransactionScreenController["hasMathOperator"];
  evaluatedAmount: AddTransactionScreenController["evaluatedAmount"];
  handleEvaluateExpression: AddTransactionScreenController["handleEvaluateExpression"];
  formErrors: AddTransactionScreenController["formErrors"];

}
export function TransactionAmountField({ setShowKeypad, setAmountFocused, scrollViewRef, amountFocused, amountStr, type, amountDisplay, showKeypad, cursorOpacity, hasMathOperator, evaluatedAmount, handleEvaluateExpression, formErrors }: TransactionAmountFieldProps) {
  const { typography, colors, spacing, radius, currencySymbol } = useAppTheme();

  return (<TouchableOpacity
    activeOpacity={0.85}
    style={styles.amountSection}
    onPress={() => {
      Keyboard.dismiss();
      setShowKeypad(true);
      setAmountFocused(true);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }}>
    <Text
      style={[
        typography.bodyMedium,
        {
          color: amountFocused ? colors.primary : colors.onSurfaceVariant,
          marginBottom: 6,
          fontWeight: amountFocused ? "700" : "500",
        },
      ]}>
      Amount
    </Text>
    <View
      style={[
        styles.amountRow,
        amountFocused && {
          paddingHorizontal: spacing.md,
          paddingVertical: 4,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceVariant + "40",
        },
      ]}>
      <View style={styles.amountTextContainer}>
        <Text
          style={[
            styles.currencySymbol,
            { color: amountFocused ? colors.primary : colors.onSurfaceVariant },
          ]}>
          {currencySymbol.trim()}
        </Text>
        <Text
          style={[
            styles.amountValue,
            {
              color: amountStr
                ? type === "income"
                  ? colors.tertiary
                  : colors.onBackground
                : colors.onSurfaceVariant,
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit>
          {amountDisplay}
        </Text>
        {showKeypad && (
          <Animated.View
            style={{
              width: 3,
              height: 38,
              backgroundColor: colors.primary,
              borderRadius: 1.5,
              marginLeft: 4,
              alignSelf: "center",
              opacity: cursorOpacity,
            }}
          />
        )}
      </View>
    </View>

    {/* Live Math Preview Pill */}
    {hasMathOperator && evaluatedAmount > 0 ? (
      <TouchableOpacity
        onPress={handleEvaluateExpression}
        style={{
          marginTop: 8,
          paddingHorizontal: 12,
          paddingVertical: 4,
          borderRadius: 12,
          backgroundColor: colors.secondaryContainer,
        }}>
        <Text
          style={[
            typography.label,
            { color: colors.onSecondaryContainer },
          ]}>
          = {formatCurrency(evaluatedAmount)} (Tap to resolve)
        </Text>
      </TouchableOpacity>
    ) : (
      <Text
        style={[
          typography.bodySmall,
          { color: colors.onSurfaceVariant, marginTop: 4, opacity: 0.7 },
        ]}>
        {showKeypad
          ? "Tap outside to dismiss • or use Done below"
          : "Tap amount to open calculator keypad"}
      </Text>
    )}
    {formErrors.amount ? (
      <Text
        style={{
          color: colors.error,
          fontSize: 13,
          fontWeight: "600",
          marginTop: 6,
          textAlign: "center",
        }}>
        {formErrors.amount}
      </Text>
    ) : null}
  </TouchableOpacity>);
}
