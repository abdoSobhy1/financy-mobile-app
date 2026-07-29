import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useAppTheme } from "../../theme";
import {
  getLastUsedBudgetId,
  setLastUsedBudgetId,
} from "../../utils/userPreferences";

interface Budget {
  id: string;
  name: string;
  amount: number;
  categoryId?: string;
}

interface BudgetSelectorProps {
  budgets: Budget[];
  selectedBudgetId?: string;
  onBudgetSelect: (budgetId: string | undefined) => void;
  label?: string;
  error?: string;
  rememberLastUsed?: boolean;
}

export const BudgetSelector: React.FC<BudgetSelectorProps> = ({
  budgets,
  selectedBudgetId,
  onBudgetSelect,
  label = "Budget",
  error,
  rememberLastUsed = false,
}) => {
  const { colors, typography, spacing, radius } = useAppTheme();

  useEffect(() => {
    if (rememberLastUsed && !selectedBudgetId && budgets.length > 0) {
      loadLastUsedBudget();
    }
  }, [rememberLastUsed, selectedBudgetId, budgets.length]);

  const loadLastUsedBudget = async () => {
    try {
      const lastUsedId = await getLastUsedBudgetId();
      if (lastUsedId && budgets.some((budget) => budget.id === lastUsedId)) {
        onBudgetSelect(lastUsedId);
      }
    } catch (error) {
      console.warn("Failed to load last used budget:", error);
    }
  };

  const handleBudgetSelect = async (budgetId: string) => {
    if (selectedBudgetId === budgetId) {
      onBudgetSelect(undefined);
      if (rememberLastUsed) await setLastUsedBudgetId(null);
    } else {
      onBudgetSelect(budgetId);
      if (rememberLastUsed) await setLastUsedBudgetId(budgetId);
    }
  };

  return (
    <View style={[styles.container, { marginBottom: spacing.s16 }]}>
      {label && (
        <Text
          style={[
            styles.label,
            typography.labelMedium,
            { color: colors.primary },
          ]}>
          {label}
        </Text>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={{ paddingHorizontal: spacing.s16, gap: 10 }}>
        <View style={styles.chipRow}>
          {/* None chip */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              onBudgetSelect(undefined);
              if (rememberLastUsed) setLastUsedBudgetId(null);
            }}
            style={[
              styles.chip,
              {
                backgroundColor: !selectedBudgetId
                  ? colors.primaryContainer
                  : colors.surface,
                borderRadius: radius.medium, // 16px radius
                borderColor: !selectedBudgetId
                  ? colors.primary
                  : colors.outline,
                borderWidth: 1,
                paddingHorizontal: spacing.s16,
                paddingVertical: spacing.s8,
              },
            ]}>
            <Text
              style={[
                typography.labelMedium,
                {
                  color: !selectedBudgetId
                    ? colors.onPrimaryContainer
                    : colors.onSurfaceVariant,
                },
              ]}>
              None
            </Text>
          </TouchableOpacity>

          {/* Budget chips */}
          {budgets.map((budget) => {
            const isActive = selectedBudgetId === budget.id;
            return (
              <TouchableOpacity
                key={budget.id}
                activeOpacity={0.7}
                onPress={() => handleBudgetSelect(budget.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive
                      ? colors.primaryContainer
                      : colors.surface,
                    borderRadius: radius.medium, // 16px radius
                    borderColor: isActive ? colors.primary : colors.outline,
                    borderWidth: isActive ? 1.5 : StyleSheet.hairlineWidth,
                    paddingHorizontal: spacing.s16,
                    paddingVertical: spacing.s8,
                  },
                ]}>
                <Text
                  style={[
                    typography.labelMedium,
                    {
                      color: isActive
                        ? colors.onPrimaryContainer
                        : colors.onSurfaceVariant,
                    },
                  ]}>
                  {budget.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {error && (
        <Text
          style={[
            styles.errorText,
            typography.caption,
            { color: colors.error, marginTop: spacing.s4 },
          ]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    marginBottom: 8,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  scroll: {
    width: "100%",
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    marginLeft: 4,
  },
});

