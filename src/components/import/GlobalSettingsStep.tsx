import { AlertService } from "../../services/AlertService";
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { RootState } from "../../store";
import { ImportSettings, ImportMapping } from "../../types/import";
import { Button, Card } from "../ui";
import { UI } from "../../constants";
import { Budget, Category } from "../../types";

interface GlobalSettingsStepProps {
  settings: ImportSettings;
  mapping: ImportMapping;
  onComplete: (settings: ImportSettings) => void;
  onBack: () => void;
}

export const GlobalSettingsStep: React.FC<GlobalSettingsStepProps> = ({ settings, mapping, onComplete, onBack }) => {
  const [localSettings, setLocalSettings] = useState<ImportSettings>(settings);
  const [showBudgetPicker, setShowBudgetPicker] = useState(false);
  const [showCategoryPreview, setShowCategoryPreview] = useState(false);

  // Get budgets and categories from Redux
  const budgets = useSelector((state: RootState) => Object.values((state as any).budgets?.items ?? {}) as any[]);
  const categories = useSelector((state: RootState) => Object.values((state as any).categories?.items ?? {}) as any[]);

  const selectedBudget = budgets.find((b) => b.id === localSettings.globalBudgetId);
  // In this app, categories aren't directly linked to budgets
  // We'll show all categories but filter by transaction type if applicable
  const budgetCategories = categories.filter(
    (c) => (localSettings.globalTransactionType ? c.type === localSettings.globalTransactionType : true) // Show all categories if no transaction type selected
  );

  const handleTransactionTypeChange = (type: "income" | "expense") => {
    setLocalSettings((prev) => ({
      ...prev,
      globalTransactionType: type,
    }));
  };

  const handleBudgetChange = (budgetId: string | undefined) => {
    setLocalSettings((prev) => ({
      ...prev,
      globalBudgetId: budgetId,
      globalBudgetName: budgetId ? budgets.find((b) => b.id === budgetId)?.name : undefined,
    }));
    setShowBudgetPicker(false);
  };

  const handleSettingToggle = (key: keyof ImportSettings) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleContinue = () => {
    // Validate settings
    if (!localSettings.globalTransactionType) {
      AlertService.alert("Error", "Please select a transaction type");
      return;
    }

    onComplete(localSettings);
  };

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  instructions: {
    padding: UI.SPACING.LG,
    backgroundColor: UI.COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  description: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  content: {
    flex: 1,
    padding: UI.SPACING.LG,
  },
  settingCard: {
    marginBottom: UI.SPACING.LG,
  },
  settingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: UI.SPACING.MD,
  },
  settingIcon: {
    width: 40,
    height: 40,
    backgroundColor: UI.COLORS.BACKGROUND,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: UI.SPACING.MD,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  settingDescription: {
    fontSize: 13,
    color: UI.COLORS.TEXT_SECONDARY,
    lineHeight: 18,
  },
  typeSelector: {
    flexDirection: "row",
    gap: UI.SPACING.SM,
  },
  typeOption: {
    flex: 1,
    backgroundColor: UI.COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    borderRadius: UI.CARD_RADIUS,
    padding: UI.SPACING.MD,
    alignItems: "center",
  },
  typeOptionSelected: {
    borderColor: UI.COLORS.PRIMARY,
    backgroundColor: "rgba(79, 70, 229, 0.1)",
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginTop: UI.SPACING.SM,
    marginBottom: UI.SPACING.XS,
  },
  typeOptionTextSelected: {
    color: UI.COLORS.PRIMARY,
  },
  typeOptionDescription: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
    textAlign: "center",
  },
  budgetOptions: {
    gap: UI.SPACING.SM,
    marginTop: UI.SPACING.MD,
  },
  budgetOption: {
    backgroundColor: UI.COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    borderRadius: 8,
    padding: UI.SPACING.MD,
  },
  budgetOptionSelected: {
    borderColor: UI.COLORS.SUCCESS,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  budgetOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: UI.SPACING.XS,
  },
  budgetOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  budgetOptionTextSelected: {
    color: UI.COLORS.SUCCESS,
  },
  budgetOptionDescription: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
  },
  categoryPreviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: UI.SPACING.SM,
    marginTop: UI.SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
  },
  categoryPreviewText: {
    fontSize: 13,
    color: UI.COLORS.TEXT_SECONDARY,
    fontWeight: "500",
  },
  categoryPreview: {
    marginTop: UI.SPACING.SM,
  },
  categoryPreviewTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.SM,
  },
  categoryList: {
    gap: UI.SPACING.XS,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: UI.SPACING.SM,
    backgroundColor: UI.COLORS.BACKGROUND,
    borderRadius: 6,
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: UI.SPACING.SM,
  },
  categoryName: {
    flex: 1,
    fontSize: 12,
    color: UI.COLORS.TEXT_PRIMARY,
    fontWeight: "500",
  },
  categoryType: {
    fontSize: 11,
    color: UI.COLORS.TEXT_MUTED,
    textTransform: "uppercase",
  },
  noCategoriesText: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
    fontStyle: "italic",
    textAlign: "center",
    padding: UI.SPACING.MD,
  },
  advancedOptions: {
    gap: UI.SPACING.MD,
  },
  toggleOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: UI.SPACING.SM,
  },
  toggleInfo: {
    flex: 1,
    marginRight: UI.SPACING.MD,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  toggleDescription: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
    lineHeight: 16,
  },
  toggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: UI.COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: UI.COLORS.SUCCESS,
    borderColor: UI.COLORS.SUCCESS,
  },
  actions: {
    flexDirection: "row",
    gap: UI.SPACING.MD,
    padding: UI.SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
    backgroundColor: UI.COLORS.SURFACE,
  },
  backButton: {
    flex: 1,
  },
  continueButton: {
    flex: 2,
  },
});
