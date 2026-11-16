import { AlertService } from "../../../shared/services/AlertService";
import { useState, useEffect } from "react";

import { useSelector } from "react-redux";

import { RootState } from "../../../app/store";
import { ImportSettings, ImportMapping } from "../types/import";
import { walletService } from "../../wallets/services/walletService";
import { WalletAccount } from "../../../shared/types";

interface GlobalSettingsStepProps {
  settings: ImportSettings;
  mapping: ImportMapping;
  onComplete: (settings: ImportSettings) => void;
  onBack: () => void;
}
export function useImportGlobalSettings({ settings, mapping, onComplete, onBack }: GlobalSettingsStepProps) {

  const [localSettings, setLocalSettings] = useState<ImportSettings>({
    createMissingWallets: true,
    ...settings,
  });
  const [showBudgetPicker, setShowBudgetPicker] = useState(false);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [showCategoryPreview, setShowCategoryPreview] = useState(false);
  const [wallets, setWallets] = useState<WalletAccount[]>([]);

  // Get budgets and categories from Redux
  const budgets = useSelector((state: RootState) => Object.values((state as any).budgets?.items ?? {}) as any[]);
  const categories = useSelector((state: RootState) => Object.values((state as any).categories?.items ?? {}) as any[]);

  useEffect(() => {
    walletService.getWallets().then((loaded) => {
      setWallets(loaded);
      if (!localSettings.globalAccountId && loaded.length > 0) {
        const preferred =
          loaded.find((w) => !w.isSecret && w.type === "cash") ||
          loaded.find((w) => !w.isSecret) ||
          loaded[0];
        if (preferred) {
          setLocalSettings((prev) => ({
            ...prev,
            globalAccountId: preferred.id,
            globalAccountName: preferred.name,
          }));
        }
      }
    });
  }, []);

  const selectedBudget = budgets.find((b) => b.id === localSettings.globalBudgetId);
  const selectedWallet = wallets.find((w) => w.id === localSettings.globalAccountId);

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

  const handleWalletChange = (walletId: string | undefined) => {
    const w = wallets.find((item) => item.id === walletId);
    setLocalSettings((prev) => ({
      ...prev,
      globalAccountId: walletId,
      globalAccountName: w?.name,
    }));
    setShowWalletPicker(false);
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
  return {
    localSettings,
    showBudgetPicker,
    setShowBudgetPicker,
    showWalletPicker,
    setShowWalletPicker,
    showCategoryPreview,
    setShowCategoryPreview,
    budgets,
    selectedBudget,
    wallets,
    selectedWallet,
    budgetCategories,
    handleTransactionTypeChange,
    handleBudgetChange,
    handleWalletChange,
    handleSettingToggle,
    handleContinue,
  };
}

export type ImportGlobalSettingsController = ReturnType<typeof useImportGlobalSettings>;
