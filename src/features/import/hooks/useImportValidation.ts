import { AlertService } from "../../../shared/services/AlertService";
import { useState, useEffect } from "react";

import { ImportPreview, ImportMapping, ImportSettings, ImportValidation } from "../types/import";
import { ExcelImportService } from "../services/excelImportService";

interface ValidationStepProps {
  preview: ImportPreview;
  mapping: ImportMapping;
  settings: ImportSettings;
  importService: ExcelImportService;
  onComplete: () => void;
  onBack: () => void;
}
export function useImportValidation({ preview, mapping, settings, importService, onComplete, onBack }: ValidationStepProps) {

  const [validation, setValidation] = useState<ImportValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    runValidation();
  }, []);

  const runValidation = async () => {
    setIsValidating(true);
    setValidationError(null);

    try {
      const result = await importService.validateImport(preview, mapping, settings);
      setValidation(result);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Validation failed");
    } finally {
      setIsValidating(false);
    }
  };

  const handleProceedWithWarnings = () => {
    if (!validation?.isValid) {
      AlertService.alert(
        "Validation Errors",
        "There are validation errors that must be fixed before importing. Please go back and correct the mapping or data.",
        [{ text: "OK" }]
      );
      return;
    }

    if (validation.warnings.length > 0) {
      AlertService.alert(
        "Proceed with Warnings?",
        `There are ${validation.warnings.length} warnings. The import will skip problematic rows. Do you want to continue?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Continue Anyway", onPress: onComplete },
        ]
      );
    } else {
      onComplete();
    }
  };
  return { validation, isValidating, validationError, runValidation, handleProceedWithWarnings };
}
