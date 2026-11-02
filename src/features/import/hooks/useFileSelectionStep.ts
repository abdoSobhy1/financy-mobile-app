import { AlertService } from "../../../shared/services/AlertService";
import { useState } from "react";

import * as DocumentPicker from "expo-document-picker";

interface FileSelectionStepProps {
  onFileSelected: (file: DocumentPicker.DocumentPickerAsset) => void;
  onCancel: () => void;
}
export function useFileSelectionStep({ onFileSelected, onCancel }: FileSelectionStepProps) {

  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePickFile = async () => {
    try {
      setIsLoading(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"],
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];

        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if ((file as any).size && (file as any).size > maxSize) {
          AlertService.alert("File Too Large", "Please select a file smaller than 10MB.");
          return;
        }

        setSelectedFile(file);
        onFileSelected(file);
      }
    } catch (error) {
      console.error("Document picker error:", error);
      AlertService.alert("Error", "Failed to select file. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (selectedFile) {
      onFileSelected(selectedFile);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";
    const kb = bytes / 1024;
    const mb = kb / 1024;

    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    } else {
      return `${kb.toFixed(2)} KB`;
    }
  };

  const getFileTypeIcon = (fileName?: string) => {
    if (!fileName) return "document-outline";

    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "xlsx":
      case "xls":
        return "grid-outline";
      case "csv":
        return "list-outline";
      default:
        return "document-outline";
    }
  };
  return { selectedFile, isLoading, handlePickFile, handleContinue, formatFileSize, getFileTypeIcon };
}
