import { styles } from "./GlobalSettingsStep.styles";
import { useImportGlobalSettings } from "../hooks/useImportGlobalSettings";

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ImportSettings, ImportMapping } from "../types/import";
import {
  SectionHeading,
  IconChip,
  Badge,
  Switch,
  useAppTheme,
} from "../../../shared/ui";
import { formatCurrency } from "../../../shared/utils";
import { ImportStepLayout } from "./ImportStepLayout";
import { ImportSectionList } from "./ImportSectionList";
import { ImportOptionCard } from "./ImportOptionCard";

interface GlobalSettingsStepProps {
  settings: ImportSettings;
  mapping: ImportMapping;
  onComplete: (settings: ImportSettings) => void;
  onBack: () => void;
}

export const GlobalSettingsStep: React.FC<GlobalSettingsStepProps> = ({
  settings,
  mapping,
  onComplete,
  onBack,
}) => {
  const {
    localSettings,
    showBudgetPicker,
    setShowBudgetPicker,
    showCategoryPreview,
    setShowCategoryPreview,
    budgets,
    selectedBudget,
    budgetCategories,
    handleTransactionTypeChange,
    handleBudgetChange,
    handleSettingToggle,
    handleContinue,
  } = useImportGlobalSettings({ settings, mapping, onComplete, onBack });
  const { colors, typography, spacing, resolveCategoryColor } = useAppTheme();

  const isExpense = localSettings.globalTransactionType === "expense";
  const isIncome = localSettings.globalTransactionType === "income";

  return (
    <ImportStepLayout
      secondaryAction={{
        title: "Back",
        onPress: onBack,
        variant: "secondary",
        icon: "arrow-back",
      }}
      primaryAction={{
        title: "Validate Data",
        onPress: handleContinue,
        icon: "shield-checkmark-outline",
        iconPosition: "right",
      }}>
      {/* Transaction Type Selector */}
      <SectionHeading text="DEFAULT TRANSACTION TYPE" />
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[
            styles.typeOption,
            {
              backgroundColor: isExpense ? colors.errorContainer : colors.surface,
              borderColor: isExpense ? colors.error : colors.outlineVariant,
            },
          ]}
          onPress={() => handleTransactionTypeChange("expense")}
          activeOpacity={0.8}>
          <IconChip iconName="arrow-down-outline" colorName="red" size="md" />
          <Text
            style={[
              typography.label,
              {
                color: isExpense ? colors.onErrorContainer : colors.onSurface,
                marginTop: spacing.sm,
              },
            ]}>
            Expense
          </Text>
          <Text
            style={[
              typography.caption,
              {
                color: isExpense ? colors.onErrorContainer : colors.onSurfaceVariant,
                marginTop: 2,
                textAlign: "center",
              },
            ]}>
            Money going out
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeOption,
            {
              backgroundColor: isIncome ? colors.primaryContainer : colors.surface,
              borderColor: isIncome ? colors.primary : colors.outlineVariant,
            },
          ]}
          onPress={() => handleTransactionTypeChange("income")}
          activeOpacity={0.8}>
          <IconChip iconName="arrow-up-outline" colorName="green" size="md" />
          <Text
            style={[
              typography.label,
              {
                color: isIncome ? colors.onPrimaryContainer : colors.onSurface,
                marginTop: spacing.sm,
              },
            ]}>
            Income
          </Text>
          <Text
            style={[
              typography.caption,
              {
                color: isIncome ? colors.onPrimaryContainer : colors.onSurfaceVariant,
                marginTop: 2,
                textAlign: "center",
              },
            ]}>
            Money coming in
          </Text>
        </TouchableOpacity>
      </View>

      {/* Budget Assignment & Categories Preview */}
      <ImportSectionList
        heading="BUDGET & CATEGORIES"
        items={[
          {
            key: "target-budget",
            icon: "pie-chart-outline",
            iconColor: "purple",
            title: "Target Budget",
            subtitle: selectedBudget
              ? `Assigned to "${selectedBudget.name}"`
              : "Don't assign imported transactions to a budget",
            onPress: () => setShowBudgetPicker(!showBudgetPicker),
            trailing: (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Badge
                  label={selectedBudget ? selectedBudget.name : "None"}
                  role={selectedBudget ? "primary" : "surfaceVariant"}
                  size="small"
                />
                <Ionicons
                  name={showBudgetPicker ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.onSurfaceVariant}
                />
              </View>
            ),
            expandedContent: showBudgetPicker ? (
              <>
                <ImportOptionCard
                  title="No Budget"
                  description="Do not link imported transactions to any budget"
                  selected={!localSettings.globalBudgetId}
                  onPress={() => handleBudgetChange(undefined)}
                />
                {budgets.map((budget) => (
                  <ImportOptionCard
                    key={budget.id}
                    title={budget.name}
                    description={`${formatCurrency(budget.currentBalance || 0)} of ${formatCurrency(budget.amount || 0)} remaining`}
                    selected={localSettings.globalBudgetId === budget.id}
                    onPress={() => handleBudgetChange(budget.id)}
                  />
                ))}
              </>
            ) : undefined,
          },
          {
            key: "matching-categories",
            icon: "pricetags-outline",
            iconColor: "teal",
            title: "Matching Categories",
            subtitle: `${budgetCategories.length} existing ${localSettings.globalTransactionType || ""} categories available`,
            onPress: () => setShowCategoryPreview(!showCategoryPreview),
            trailing: (
              <Ionicons
                name={showCategoryPreview ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.onSurfaceVariant}
              />
            ),
            expandedContent: showCategoryPreview ? (
              budgetCategories.length > 0 ? (
                <View style={styles.categoryChipsWrap}>
                  {budgetCategories.map((category) => {
                    const resolved = resolveCategoryColor(category.color);
                    return (
                      <View
                        key={category.id}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.outlineVariant,
                          },
                        ]}>
                        <View
                          style={[
                            styles.categoryDot,
                            { backgroundColor: resolved.iconColor },
                          ]}
                        />
                        <Text style={[typography.caption, { color: colors.onSurface }]}>
                          {category.name}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text
                  style={[
                    typography.caption,
                    { color: colors.onSurfaceVariant, textAlign: "center" },
                  ]}>
                  No matching categories found
                </Text>
              )
            ) : undefined,
          },
        ]}
      />

      {/* Advanced Options */}
      <ImportSectionList
        heading="ADVANCED OPTIONS"
        items={[
          {
            key: "create-missing-categories",
            icon: "add-circle-outline",
            iconColor: "orange",
            title: "Create Missing Categories",
            subtitle: "Auto-create new categories for unrecognized names",
            onPress: () => handleSettingToggle("createMissingCategories"),
            trailing: (
              <Switch
                value={localSettings.createMissingCategories}
                onValueChange={() => handleSettingToggle("createMissingCategories")}
              />
            ),
          },
          ...(mapping.type
            ? [
                {
                  key: "allow-type-override",
                  icon: "swap-horizontal-outline",
                  iconColor: "blue",
                  title: "Allow Type Column Override",
                  subtitle: "Let mapped type column override the default type",
                  onPress: () => handleSettingToggle("allowIndividualTypeOverride"),
                  trailing: (
                    <Switch
                      value={localSettings.allowIndividualTypeOverride}
                      onValueChange={() =>
                        handleSettingToggle("allowIndividualTypeOverride")
                      }
                    />
                  ),
                },
              ]
            : []),
        ]}
      />
    </ImportStepLayout>
  );
};
