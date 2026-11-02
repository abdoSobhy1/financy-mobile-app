import { styles } from "../screens/AddTransactionScreen.styles";
import { useAddTransactionScreen } from "../hooks/useAddTransactionScreen";

import { ScrollView, Text, TouchableOpacity } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";

interface TransactionBudgetPickerProps {
  showKeypad: ReturnType<typeof useAddTransactionScreen>["showKeypad"];
  setShowKeypad: ReturnType<typeof useAddTransactionScreen>["setShowKeypad"];
  setBudgetId: ReturnType<typeof useAddTransactionScreen>["setBudgetId"];
  setManualBudgetSelected: ReturnType<typeof useAddTransactionScreen>["setManualBudgetSelected"];
  budgetId: ReturnType<typeof useAddTransactionScreen>["budgetId"];
  budgets: ReturnType<typeof useAddTransactionScreen>["budgets"];

}
export function TransactionBudgetPicker({ showKeypad, setShowKeypad, setBudgetId, setManualBudgetSelected, budgetId, budgets }: TransactionBudgetPickerProps) {
  const { typography, colors, spacing } = useAppTheme();

  return (<>
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
      Budget
    </Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      style={{ flexGrow: 0 }}
      onScrollBeginDrag={() => {
        if (showKeypad) setShowKeypad(false);
      }}
      contentContainerStyle={{
        gap: spacing.sm,
        marginBottom: spacing.lg,
      }}>
      <TouchableOpacity
        onPress={() => {
          if (showKeypad) setShowKeypad(false);
          setBudgetId("");
          setManualBudgetSelected(true);
        }}
        style={[
          styles.categoryChip,
          {
            backgroundColor: !budgetId
              ? colors.primaryContainer
              : colors.surfaceVariant,
            borderColor: !budgetId
              ? colors.primaryContainer
              : colors.outlineVariant,
          },
        ]}>
        <Ionicons
          name="pie-chart-outline"
          size={18}
          color={
            !budgetId
              ? colors.onPrimaryContainer
              : colors.onSurfaceVariant
          }
          style={{ marginRight: 6 }}
        />
        <Text
          style={[
            typography.bodyMedium,
            {
              color: !budgetId
                ? colors.onPrimaryContainer
                : colors.onBackground,
              fontWeight: !budgetId ? "700" : "500",
            },
          ]}>
          None
        </Text>
      </TouchableOpacity>
      {Object.values(budgets)
        .filter((b) => !b.deleted)
        .map((b) => {
          const isSelected = b.id === budgetId;
          return (
            <TouchableOpacity
              key={b.id}
              onPress={() => {
                if (showKeypad) setShowKeypad(false);
                setBudgetId(b.id);
                setManualBudgetSelected(true);
              }}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: isSelected
                    ? colors.primaryContainer
                    : colors.surfaceVariant,
                  borderColor: isSelected
                    ? colors.primaryContainer
                    : colors.outlineVariant,
                },
              ]}>
              <Ionicons
                name="pie-chart"
                size={18}
                color={
                  isSelected
                    ? colors.onPrimaryContainer
                    : colors.primary
                }
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  typography.bodyMedium,
                  {
                    color: isSelected
                      ? colors.onPrimaryContainer
                      : colors.onBackground,
                    fontWeight: isSelected ? "700" : "500",
                  },
                ]}>
                {b.name}
              </Text>
            </TouchableOpacity>
          );
        })}
    </ScrollView>
  </>);
}
