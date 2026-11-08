import { AlertService } from "../../../shared/services/AlertService";
import { useState, useCallback } from "react";

import { useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { AppDispatch } from "../../../app/store";
import { fetchTransactions } from "../../transactions/store/transactionsSlice";
import { fetchCategories } from "../../categories/store/categoriesSlice";
import { fetchBudgets } from "../../budgets/store/budgetsSlice";

import { ImportPreview, ImportMapping, ImportSettings, ImportResult, ImportProgress } from "../types/import";
import { ExcelImportService } from "../services/excelImportService";

interface ImportWizardProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (result: ImportResult) => void;
  fullScreen?: boolean; // When true, don't wrap in Modal
}
type WizardStep = "file-selection" | "preview" | "column-mapping" | "global-settings" | "validation" | "importing" | "results";
export function useImportWizard({ visible, onClose, onSuccess, fullScreen = false }: ImportWizardProps) {

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>("file-selection");
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({} as ImportMapping);
  const [settings, setSettings] = useState<ImportSettings>({
    globalTransactionType: "expense",
    allowIndividualTypeOverride: false,
    createMissingCategories: true,
  });
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Import service instance
  const [importService] = useState(() => new ExcelImportService(setProgress));

  // Reset wizard state when modal closes
  const handleClose = useCallback(() => {
    setCurrentStep("file-selection");
    setSelectedFile(null);
    setPreview(null);
    setMapping({} as ImportMapping);
    setSettings({
      globalTransactionType: "expense",
      allowIndividualTypeOverride: false,
      createMissingCategories: true,
    });
    setProgress(null);
    setImportResult(null);
    onClose();
  }, [onClose]);

  // Handle successful import
  const handleImportComplete = useCallback(
    (result: ImportResult) => {
      setImportResult(result);
      setCurrentStep("results");
      dispatch(fetchTransactions());
      dispatch(fetchCategories());
      dispatch(fetchBudgets());
      onSuccess?.(result);
    },
    [dispatch, onSuccess]
  );

  // Step navigation handlers
  const handleFileSelected = useCallback(
    async (file: DocumentPicker.DocumentPickerAsset) => {
      try {
        setSelectedFile(file);
        const previewData = await importService.parseFile(file);
        setPreview(previewData);
        setCurrentStep("preview");
      } catch (error) {
        AlertService.alert("Error", error instanceof Error ? error.message : "Failed to read file");
      }
    },
    [importService]
  );

  const handlePreviewContinue = useCallback(() => {
    setCurrentStep("column-mapping");
  }, []);

  const handleMappingComplete = useCallback((newMapping: ImportMapping) => {
    setMapping(newMapping);
    setCurrentStep("global-settings");
  }, []);

  const handleSettingsComplete = useCallback((newSettings: ImportSettings) => {
    setSettings(newSettings);
    setCurrentStep("validation");
  }, []);

  const handleValidationComplete = useCallback(async () => {
    if (!preview) return;

    try {
      setCurrentStep("importing");
      const result = await importService.importData(preview, mapping, settings);
      handleImportComplete(result);
    } catch (error) {
      console.error("Import failed:", error);
      AlertService.alert("Import Failed", error instanceof Error ? error.message : "Unknown error occurred");
      setCurrentStep("validation"); // Go back to validation
    }
  }, [preview, mapping, settings, importService, handleImportComplete]);

  // Step back handlers
  const handleStepBack = useCallback(() => {
    switch (currentStep) {
      case "preview":
        setCurrentStep("file-selection");
        break;
      case "column-mapping":
        setCurrentStep("preview");
        break;
      case "global-settings":
        setCurrentStep("column-mapping");
        break;
      case "validation":
        setCurrentStep("global-settings");
        break;
      default:
        break;
    }
  }, [currentStep]);
  return { currentStep, setCurrentStep, setSelectedFile, preview, setPreview, mapping, setMapping, settings, progress, importResult, setImportResult, importService, handleClose, handleFileSelected, handlePreviewContinue, handleMappingComplete, handleSettingsComplete, handleValidationComplete, handleStepBack };
}
