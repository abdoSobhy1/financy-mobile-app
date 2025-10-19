import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { RootState, AppDispatch } from "../store";
import { Modal, Screen } from "./ui";
import { UI } from "../constants";
import { ImportPreview, ImportMapping, ImportSettings, ImportResult, ImportProgress } from "../types/import";
import { ExcelImportService } from "../services/excelImportService";
import { FileSelectionStep } from "./import/FileSelectionStep";
import { PreviewStep } from "./import/PreviewStep";
import { ColumnMappingStep } from "./import/ColumnMappingStep";
import { GlobalSettingsStep } from "./import/GlobalSettingsStep";
import { ValidationStep } from "./import/ValidationStep";
import { ImportProgressStep } from "./import/ImportProgressStep";
import { ResultsStep } from "./import/ResultsStep";

interface ImportWizardProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (result: ImportResult) => void;
  fullScreen?: boolean; // When true, don't wrap in Modal
}

type WizardStep = "file-selection" | "preview" | "column-mapping" | "global-settings" | "validation" | "importing" | "results";

export const ImportWizard: React.FC<ImportWizardProps> = ({ visible, onClose, onSuccess, fullScreen = false }) => {
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
      onSuccess?.(result);
    },
    [onSuccess]
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
        Alert.alert("Error", error instanceof Error ? error.message : "Failed to read file");
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
      Alert.alert("Import Failed", error instanceof Error ? error.message : "Unknown error occurred");
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

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case "file-selection":
        return <FileSelectionStep onFileSelected={handleFileSelected} onCancel={handleClose} />;

      case "preview":
        return <PreviewStep preview={preview!} onContinue={handlePreviewContinue} onBack={handleStepBack} />;

      case "column-mapping":
        return <ColumnMappingStep preview={preview!} mapping={mapping} onComplete={handleMappingComplete} onBack={handleStepBack} />;

      case "global-settings":
        return <GlobalSettingsStep settings={settings} mapping={mapping} onComplete={handleSettingsComplete} onBack={handleStepBack} />;

      case "validation":
        return (
          <ValidationStep
            preview={preview!}
            mapping={mapping}
            settings={settings}
            importService={importService}
            onComplete={handleValidationComplete}
            onBack={handleStepBack}
          />
        );

      case "importing":
        return <ImportProgressStep progress={progress} />;

      case "results":
        return (
          <ResultsStep
            result={importResult!}
            onClose={handleClose}
            onImportMore={() => {
              setCurrentStep("file-selection");
              setSelectedFile(null);
              setPreview(null);
              setMapping({} as ImportMapping);
              setImportResult(null);
            }}
          />
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case "file-selection":
        return "Select Import File";
      case "preview":
        return "Preview Data";
      case "column-mapping":
        return "Map Columns";
      case "global-settings":
        return "Import Settings";
      case "validation":
        return "Validate Data";
      case "importing":
        return "Importing...";
      case "results":
        return "Import Complete";
      default:
        return "Import Wizard";
    }
  };

  const getStepProgress = () => {
    const steps = ["file-selection", "preview", "column-mapping", "global-settings", "validation", "importing", "results"];
    const currentIndex = steps.indexOf(currentStep);
    return {
      current: Math.max(0, currentIndex),
      total: steps.length - 1, // Don't count results as a step
    };
  };

  const content = (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{getStepTitle()}</Text>
        {currentStep !== "results" && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Step {getStepProgress().current + 1} of {getStepProgress().total + 1}
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(getStepProgress().current / getStepProgress().total) * 100}%` }]} />
            </View>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>{renderCurrentStep()}</View>
    </View>
  );

  return fullScreen ? (
    content
  ) : (
    <Modal visible={visible} onClose={handleClose}>
      {content}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.COLORS.BACKGROUND,
  },
  header: {
    padding: UI.SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.SM,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressText: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    marginRight: UI.SPACING.MD,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: UI.COLORS.PRIMARY,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
});
