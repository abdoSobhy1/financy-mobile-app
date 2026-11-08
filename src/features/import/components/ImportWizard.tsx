import { useImportWizard } from "../hooks/useImportWizard";

import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Modal, AppHeader, Badge } from "../../../shared/ui";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
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
  fullScreen?: boolean;
}

const WIZARD_STEPS = [
  "file-selection",
  "preview",
  "column-mapping",
  "global-settings",
  "validation",
  "importing",
] as const;

export const ImportWizard: React.FC<ImportWizardProps> = ({
  visible,
  onClose,
  onSuccess,
  fullScreen = false,
}) => {
  const {
    currentStep,
    setCurrentStep,
    setSelectedFile,
    preview,
    setPreview,
    mapping,
    setMapping,
    settings,
    progress,
    importResult,
    setImportResult,
    importService,
    handleClose,
    handleFileSelected,
    handlePreviewContinue,
    handleMappingComplete,
    handleSettingsComplete,
    handleValidationComplete,
    handleStepBack,
  } = useImportWizard({ visible, onClose, onSuccess, fullScreen });
  const { colors, spacing, radius } = useAppTheme();

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
        return "Import Data";
      case "preview":
        return "Preview File";
      case "column-mapping":
        return "Map Columns";
      case "global-settings":
        return "Import Settings";
      case "validation":
        return "Validate Data";
      case "importing":
        return "Importing";
      case "results":
        return "Import Summary";
      default:
        return "Import Data";
    }
  };

  const getStepSubtitle = () => {
    switch (currentStep) {
      case "file-selection":
        return "Upload CSV or Excel spreadsheet";
      case "preview":
        return preview ? `${preview.fileName} • ${preview.totalRows.toLocaleString()} rows` : "Inspect file structure";
      case "column-mapping":
        return "Match spreadsheet columns to fields";
      case "global-settings":
        return "Default type, budget & category rules";
      case "validation":
        return "Verify rows before saving";
      case "importing":
        return "Saving transactions to your database";
      case "results":
        return "Review completed import details";
      default:
        return undefined;
    }
  };

  const currentIndex = WIZARD_STEPS.indexOf(currentStep as any);
  const showStepper = currentStep !== "results" && currentIndex >= 0;
  const canNavigateBack = currentStep !== "importing";
  const isInnerStep =
    currentStep !== "file-selection" &&
    currentStep !== "results" &&
    currentStep !== "importing";

  const onHeaderBack = () => {
    if (currentStep === "file-selection" || currentStep === "results") {
      handleClose();
    } else {
      handleStepBack();
    }
  };

  const content = (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={getStepTitle()}
        subtitle={getStepSubtitle()}
        showBack={canNavigateBack}
        onBackPress={onHeaderBack}
        showSettings={false}
        rightAction={
          <View style={styles.headerRight}>
            {showStepper && (
              <Badge
                label={`Step ${currentIndex + 1}/${WIZARD_STEPS.length}`}
                role="primary"
                size="small"
              />
            )}
            {isInnerStep && (
              <TouchableOpacity
                onPress={handleClose}
                style={[
                  styles.closeBtn,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.outlineVariant,
                    borderRadius: radius.pill,
                  },
                ]}
                activeOpacity={0.7}
                accessibilityLabel="Cancel Import">
                <Ionicons name="close" size={18} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {showStepper && (
        <View
          style={[
            styles.stepperRow,
            {
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.sm,
              borderBottomColor: colors.outlineVariant,
            },
          ]}>
          {WIZARD_STEPS.map((stepKey, idx) => {
            const isCompleted = idx < currentIndex;
            const isActive = idx === currentIndex;
            return (
              <View
                key={stepKey}
                style={[
                  styles.stepSegment,
                  {
                    backgroundColor: isCompleted
                      ? colors.primary
                      : isActive
                        ? colors.primary
                        : colors.surfaceVariant,
                    opacity: isCompleted ? 0.55 : 1,
                  },
                ]}
              />
            );
          })}
        </View>
      )}

      <View style={styles.content}>{renderCurrentStep()}</View>
    </View>
  );

  return fullScreen ? (
    content
  ) : (
    <Modal visible={visible} onClose={handleClose} showCloseButton={false}>
      {content}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  closeBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderBottomWidth: 1,
  },
  stepSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
});
