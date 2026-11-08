import { AlertService } from "../../../shared/services/AlertService";
import { useState } from "react";

import { useSelector } from "react-redux";

import { RootState } from "../../../app/store";
import { ImportSettings, ImportMapping } from "../types/import";

interface GlobalSettingsStepProps {
  settings: ImportSettings;
  mapping: ImportMapping;
  onComplete: (settings: ImportSettings) => void;
  onBack: () => void;
}
export function useImportGlobalSettings({ settings, mapping, onComplete, onBack }: GlobalSettingsStepProps) {

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
  return { localSettings, showBudgetPicker, setShowBudgetPicker, showCategoryPreview, setShowCategoryPreview, budgets, selectedBudget, budgetCategories, handleTransactionTypeChange, handleBudgetChange, handleSettingToggle, handleContinue };
}

export type ImportGlobalSettingsController = ReturnType<typeof useImportGlobalSettings>;
