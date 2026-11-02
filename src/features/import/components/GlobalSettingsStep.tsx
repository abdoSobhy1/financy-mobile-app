import { styles } from "./GlobalSettingsStep.styles";
import { useImportGlobalSettings } from "../hooks/useImportGlobalSettings";

import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { ImportSettings, ImportMapping } from "../types/import";
import { Button, Card } from "../../../shared/ui";
import { UI } from "../../../shared/constants";

interface GlobalSettingsStepProps {
  settings: ImportSettings;
  mapping: ImportMapping;
  onComplete: (settings: ImportSettings) => void;
  onBack: () => void;
}

export const GlobalSettingsStep: React.FC<GlobalSettingsStepProps> = ({ settings, mapping, onComplete, onBack }) => {
  const { localSettings, showBudgetPicker, setShowBudgetPicker, showCategoryPreview, setShowCategoryPreview, budgets, selectedBudget, budgetCategories, handleTransactionTypeChange, handleBudgetChange, handleSettingToggle, handleContinue } = useImportGlobalSettings({ settings, mapping, onComplete, onBack });

  const renderTransactionTypeSelector = () => (
    <Card style={styles.settingCard}>
      <View style={styles.settingHeader}>
        <View style={styles.settingIcon}>
          <Ionicons name="swap-horizontal" size={20} color={UI.COLORS.PRIMARY} />
        </View>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Transaction Type</Text>
          <Text style={styles.settingDescription}>Set the type for ALL imported transactions</Text>
        </View>
      </View>

      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[styles.typeOption, localSettings.globalTransactionType === "expense" && styles.typeOptionSelected]}
          onPress={() => handleTransactionTypeChange("expense")}>
          <Ionicons
            name="arrow-down-circle"
            size={24}
            color={localSettings.globalTransactionType === "expense" ? UI.COLORS.PRIMARY : UI.COLORS.TEXT_MUTED}
          />
          <Text style={[styles.typeOptionText, localSettings.globalTransactionType === "expense" && styles.typeOptionTextSelected]}>Expense</Text>
          <Text style={styles.typeOptionDescription}>Money going out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typeOption, localSettings.globalTransactionType === "income" && styles.typeOptionSelected]}
          onPress={() => handleTransactionTypeChange("income")}>
          <Ionicons
            name="arrow-up-circle"
            size={24}
            color={localSettings.globalTransactionType === "income" ? UI.COLORS.SUCCESS : UI.COLORS.TEXT_MUTED}
          />
          <Text style={[styles.typeOptionText, localSettings.globalTransactionType === "income" && styles.typeOptionTextSelected]}>Income</Text>
          <Text style={styles.typeOptionDescription}>Money coming in</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderBudgetSelector = () => (
    <Card style={styles.settingCard}>
      <TouchableOpacity style={styles.settingHeader} onPress={() => setShowBudgetPicker(!showBudgetPicker)}>
        <View style={styles.settingIcon}>
          <Ionicons name="wallet" size={20} color={UI.COLORS.ACCENT} />
        </View>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Budget Assignment</Text>
          <Text style={styles.settingDescription}>
            {selectedBudget
              ? `All transactions will be assigned to "${selectedBudget.name}"`
              : "Assign all transactions to a specific budget (optional)"}
          </Text>
        </View>
        <Ionicons name={showBudgetPicker ? "chevron-up" : "chevron-down"} size={20} color={UI.COLORS.TEXT_SECONDARY} />
      </TouchableOpacity>

      {showBudgetPicker && (
        <View style={styles.budgetOptions}>
          <TouchableOpacity
            style={[styles.budgetOption, !localSettings.globalBudgetId && styles.budgetOptionSelected]}
            onPress={() => handleBudgetChange(undefined)}>
            <Text style={[styles.budgetOptionText, !localSettings.globalBudgetId && styles.budgetOptionTextSelected]}>No Budget</Text>
            <Text style={styles.budgetOptionDescription}>Don't assign to any budget</Text>
          </TouchableOpacity>

          {budgets.map((budget) => (
            <TouchableOpacity
              key={budget.id}
              style={[styles.budgetOption, localSettings.globalBudgetId === budget.id && styles.budgetOptionSelected]}
              onPress={() => handleBudgetChange(budget.id)}>
              <View style={styles.budgetOptionHeader}>
                <Text style={[styles.budgetOptionText, localSettings.globalBudgetId === budget.id && styles.budgetOptionTextSelected]}>
                  {budget.name}
                </Text>
                {localSettings.globalBudgetId === budget.id && <Ionicons name="checkmark-circle" size={20} color={UI.COLORS.SUCCESS} />}
              </View>
              <Text style={styles.budgetOptionDescription}>
                ${budget.currentBalance.toFixed(2)} of ${budget.amount.toFixed(2)} remaining
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {selectedBudget && (
        <TouchableOpacity style={styles.categoryPreviewButton} onPress={() => setShowCategoryPreview(!showCategoryPreview)}>
          <Text style={styles.categoryPreviewText}>View available categories ({budgetCategories.length})</Text>
          <Ionicons name={showCategoryPreview ? "chevron-up" : "chevron-down"} size={16} color={UI.COLORS.TEXT_SECONDARY} />
        </TouchableOpacity>
      )}

      {showCategoryPreview && (
        <View style={styles.categoryPreview}>
          <Text style={styles.categoryPreviewTitle}>Available Categories:</Text>
          <View style={styles.categoryList}>
            {budgetCategories.length > 0 ? (
              budgetCategories.map((category) => (
                <View key={category.id} style={styles.categoryItem}>
                  <View style={[styles.categoryColor, { backgroundColor: category.color || UI.COLORS.PRIMARY }]} />
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryType}>{category.type}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noCategoriesText}>No categories found for this budget</Text>
            )}
          </View>
        </View>
      )}
    </Card>
  );

  const renderAdvancedSettings = () => (
    <Card style={styles.settingCard}>
      <View style={styles.settingHeader}>
        <View style={styles.settingIcon}>
          <Ionicons name="options" size={20} color={UI.COLORS.WARNING} />
        </View>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Advanced Options</Text>
          <Text style={styles.settingDescription}>Configure additional import behavior</Text>
        </View>
      </View>

      <View style={styles.advancedOptions}>
        <TouchableOpacity style={styles.toggleOption} onPress={() => handleSettingToggle("createMissingCategories")}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Create Missing Categories</Text>
            <Text style={styles.toggleDescription}>Automatically create new categories for unmapped category names</Text>
          </View>
          <View style={[styles.toggle, localSettings.createMissingCategories && styles.toggleActive]}>
            <Ionicons
              name={localSettings.createMissingCategories ? "checkmark" : "close"}
              size={16}
              color={localSettings.createMissingCategories ? UI.COLORS.SUCCESS : UI.COLORS.ERROR}
            />
          </View>
        </TouchableOpacity>

        {mapping.type && (
          <TouchableOpacity style={styles.toggleOption} onPress={() => handleSettingToggle("allowIndividualTypeOverride")}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Allow Type Column Override</Text>
              <Text style={styles.toggleDescription}>Let the mapped type column override the global transaction type setting</Text>
            </View>
            <View style={[styles.toggle, localSettings.allowIndividualTypeOverride && styles.toggleActive]}>
              <Ionicons
                name={localSettings.allowIndividualTypeOverride ? "checkmark" : "close"}
                size={16}
                color={localSettings.allowIndividualTypeOverride ? UI.COLORS.SUCCESS : UI.COLORS.ERROR}
              />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.title}>Import Settings</Text>
        <Text style={styles.description}>
          Configure how your transactions will be imported. These settings apply to ALL transactions in your file.
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTransactionTypeSelector()}
        {renderBudgetSelector()}
        {renderAdvancedSettings()}
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <Button title="Back" onPress={onBack} variant="secondary" style={styles.backButton} />
        <Button title="Continue to Validation" onPress={handleContinue} style={styles.continueButton} />
      </View>
    </View>
  );
};
