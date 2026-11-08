import { useState } from "react";
import { AlertService } from "../../../shared/services/AlertService";
import { useToast } from "../../../shared/ui/ToastProvider";
import {
  firebaseCleanup,
  CleanupReport,
} from "../../../infrastructure/firebase/firebaseCleanup";

export function useFirebaseCleanupModal() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [lastReport, setLastReport] = useState<CleanupReport | null>(null);
  const { showSuccess, showError } = useToast();

  const analyzeFirebaseData = async () => {
    setIsAnalyzing(true);
    try {
      const report = await firebaseCleanup.analyzeFirebaseData();
      setLastReport(report);

      if (report.errors.length > 0) {
        showError(
          `Analysis completed with ${report.errors.length} errors. Check console for details.`,
        );
      } else {
        showSuccess("Firebase data analysis completed successfully!");
      }
    } catch (error) {
      console.error("Firebase analysis failed:", error);
      showError(
        `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const performQuickCleanup = async () => {
    setIsCleaning(true);
    try {
      const report = await firebaseCleanup.quickCleanup();
      setLastReport(report);

      if (report.errors.length > 0) {
        showError(`Quick cleanup completed with ${report.errors.length} errors.`);
      } else {
        showSuccess(
          `Quick cleanup completed! Cleaned ${report.fieldsCleanedUp} fields from ${report.totalDocuments} documents.`,
        );
      }
    } catch (error) {
      console.error("Quick cleanup failed:", error);
      showError(
        `Quick cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsCleaning(false);
    }
  };

  const performFullCleanup = () => {
    AlertService.alert(
      "Full Firebase Cleanup",
      "This will remove duplicate documents, orphaned records, and unused fields. This action cannot be undone. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed",
          style: "destructive",
          onPress: async () => {
            setIsCleaning(true);
            try {
              const report = await firebaseCleanup.fullCleanup();
              setLastReport(report);

              if (report.errors.length > 0) {
                showError(
                  `Full cleanup completed with ${report.errors.length} errors.`,
                );
              } else {
                showSuccess(
                  `Full cleanup completed! Removed ${report.duplicatesRemoved} duplicates and cleaned ${report.fieldsCleanedUp} fields.`,
                );
              }
            } catch (error) {
              console.error("Full cleanup failed:", error);
              showError(
                `Full cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              );
            } finally {
              setIsCleaning(false);
            }
          },
        },
      ],
    );
  };

  return {
    isAnalyzing,
    isCleaning,
    lastReport,
    analyzeFirebaseData,
    performQuickCleanup,
    performFullCleanup,
  };
}

export type FirebaseCleanupModalController = ReturnType<typeof useFirebaseCleanupModal>;
