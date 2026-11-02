import { useImportWizard } from "../hooks/useImportWizard";

import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { Modal } from "../../../shared/ui";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { UI } from "../../../shared/constants";
import { ImportMapping, ImportResult } from "../types/import";

import { FileSelectionStep } from "./FileSelectionStep";
import { PreviewStep } from "./PreviewStep";
import { ColumnMappingStep } from "./ColumnMappingStep";
import { GlobalSettingsStep } from "./GlobalSettingsStep";
import { ValidationStep } from "./ValidationStep";
import { ImportProgressStep } from "./ImportProgressStep";
import { ResultsStep } from "./ResultsStep";

interface ImportWizardProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (result: ImportResult) => void;
  fullScreen?: boolean; // When true, don't wrap in Modal
}

export const ImportWizard: React.FC<ImportWizardProps> = ({ visible, onClose, onSuccess, fullScreen = false }) => {
  const { currentStep, setCurrentStep, setSelectedFile, preview, setPreview, mapping, setMapping, settings, progress, importResult, setImportResult, importService, handleClose, handleFileSelected, handlePreviewContinue, handleMappingComplete, handleSettingsComplete, handleValidationComplete, handleStepBack } = useImportWizard({ visible, onClose, onSuccess, fullScreen });
  const { colors } = useAppTheme();

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.outlineVariant }]}>
        <Text style={[styles.title, { color: colors.onBackground }]}>{getStepTitle()}</Text>
        {currentStep !== "results" && (
          <View style={styles.progressContainer}>
            <Text style={[styles.progressText, { color: colors.onSurfaceVariant }]}>
              Step {getStepProgress().current + 1} of {getStepProgress().total + 1}
            </Text>
            <View style={[styles.progressBar, { backgroundColor: colors.surfaceVariant }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${(getStepProgress().current / getStepProgress().total) * 100}%` }]} />
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
  },
  header: {
    padding: UI.SPACING.LG,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: UI.SPACING.SM,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressText: {
    fontSize: 14,
    marginRight: UI.SPACING.MD,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
});
