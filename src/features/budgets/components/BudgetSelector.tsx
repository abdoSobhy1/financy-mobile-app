import { useBudgetSelector } from "../hooks/useBudgetSelector";
import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { UI } from "../../../shared/constants";
import { setLastUsedBudgetId } from "../../settings/utils/userPreferences";

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
  const { handleBudgetSelect } = useBudgetSelector({ budgets, selectedBudgetId, onBudgetSelect, label, error, rememberLastUsed });

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}>
        <View style={styles.chipRow}>
          {/* None chip */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              onBudgetSelect(undefined);
              if (rememberLastUsed) setLastUsedBudgetId(null);
            }}>
            {!selectedBudgetId ? (
              <LinearGradient
                colors={[UI.COLORS.PRIMARY, UI.COLORS.PRIMARY_DARK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.chip, styles.chipActive]}>
                <Text style={styles.chipTextActive}>None</Text>
              </LinearGradient>
            ) : (
              <View style={styles.chip}>
                <Text style={styles.chipText}>None</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Budget chips */}
          {budgets.map((budget) => {
            const isActive = selectedBudgetId === budget.id;
            return (
              <TouchableOpacity
                key={budget.id}
                activeOpacity={0.7}
                onPress={() => handleBudgetSelect(budget.id)}>
                {isActive ? (
                  <LinearGradient
                    colors={[UI.COLORS.PRIMARY, UI.COLORS.PRIMARY_DARK]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.chip, styles.chipActive]}>
                    <Text style={styles.chipTextActive}>{budget.name}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{budget.name}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: UI.SPACING.MD,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: UI.COLORS.PRIMARY_LIGHT,
    marginBottom: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  scroll: {
    marginHorizontal: -UI.SPACING.SM,
    paddingHorizontal: UI.SPACING.SM,
  },
  chipRow: {
    flexDirection: "row",
    gap: 10,
    paddingRight: UI.SPACING.SM,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: "rgba(20,20,50,0.65)",
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.18)",
  },
  chipActive: {
    borderWidth: 0,
    shadowColor: UI.COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
    color: UI.COLORS.TEXT_SECONDARY,
  },
  chipTextActive: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  errorText: {
    fontSize: 12,
    color: UI.COLORS.ERROR,
    marginTop: 6,
  },
});
