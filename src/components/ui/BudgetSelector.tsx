import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { UI } from "../../constants";
import { getLastUsedBudgetId, setLastUsedBudgetId } from "../../utils/userPreferences";

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
  rememberLastUsed?: boolean; // New prop to enable last used functionality
}

export const BudgetSelector: React.FC<BudgetSelectorProps> = ({
  budgets,
  selectedBudgetId,
  onBudgetSelect,
  label = "Budget",
  error,
  rememberLastUsed = false,
}) => {
  // Load last used budget on component mount if enabled
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
    // Toggle behavior: if already selected, unselect it
    if (selectedBudgetId === budgetId) {
      onBudgetSelect(undefined);
      if (rememberLastUsed) {
        await setLastUsedBudgetId(null);
      }
    } else {
      onBudgetSelect(budgetId);
      if (rememberLastUsed) {
        await setLastUsedBudgetId(budgetId);
      }
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.budgetScroll}>
        <View style={styles.budgetContainer}>
          {/* None option for deselecting */}
          <TouchableOpacity
            style={[styles.budgetChip, !selectedBudgetId && styles.budgetChipActive]}
            onPress={() => {
              onBudgetSelect(undefined);
              if (rememberLastUsed) {
                setLastUsedBudgetId(null);
              }
            }}>
            <Text style={[styles.budgetChipText, !selectedBudgetId && styles.budgetChipTextActive]}>None</Text>
          </TouchableOpacity>

          {budgets.map((budget) => (
            <TouchableOpacity
              key={budget.id}
              style={[styles.budgetChip, selectedBudgetId === budget.id && styles.budgetChipActive]}
              onPress={() => handleBudgetSelect(budget.id)}>
              <Text style={[styles.budgetChipText, selectedBudgetId === budget.id && styles.budgetChipTextActive]}>{budget.name}</Text>
            </TouchableOpacity>
          ))}
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
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  budgetScroll: {
    marginHorizontal: -UI.SPACING.SM,
    paddingHorizontal: UI.SPACING.SM,
  },
  budgetContainer: {
    flexDirection: "row",
    paddingRight: UI.SPACING.SM,
  },
  budgetChip: {
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  budgetChipActive: {
    backgroundColor: UI.COLORS.PRIMARY,
    borderColor: UI.COLORS.PRIMARY,
  },
  budgetChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: UI.COLORS.TEXT_SECONDARY,
  },
  budgetChipTextActive: {
    color: UI.COLORS.TEXT_PRIMARY,
  },
  errorText: {
    fontSize: 12,
    color: UI.COLORS.ERROR,
    marginTop: 4,
  },
});
