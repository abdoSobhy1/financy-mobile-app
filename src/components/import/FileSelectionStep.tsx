import { AlertService } from "../../services/AlertService";
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../ui";
import { UI } from "../../constants";

interface FileSelectionStepProps {
  onFileSelected: (file: DocumentPicker.DocumentPickerAsset) => void;
  onCancel: () => void;
}

export const FileSelectionStep: React.FC<FileSelectionStepProps> = ({ onFileSelected, onCancel }) => {
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

  return (
    <View style={styles.container}>
      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.title}>Import Transactions from Excel or CSV</Text>
        <Text style={styles.description}>
          Select an Excel (.xlsx, .xls) or CSV file containing your transaction data. The file should have columns for amount, description, and date.
        </Text>

        <View style={styles.supportedFormats}>
          <Text style={styles.supportedTitle}>Supported formats:</Text>
          <View style={styles.formatList}>
            <View style={styles.formatItem}>
              <Ionicons name="grid-outline" size={16} color={UI.COLORS.TEXT_SECONDARY} />
              <Text style={styles.formatText}>Excel files (.xlsx, .xls)</Text>
            </View>
            <View style={styles.formatItem}>
              <Ionicons name="list-outline" size={16} color={UI.COLORS.TEXT_SECONDARY} />
              <Text style={styles.formatText}>CSV files (.csv)</Text>
            </View>
          </View>
        </View>
      </View>

      {/* File Selection Area */}
      <View style={styles.selectionArea}>
        {selectedFile ? (
          <View style={styles.selectedFile}>
            <View style={styles.fileIcon}>
              <Ionicons name={getFileTypeIcon(selectedFile.name || undefined)} size={24} color={UI.COLORS.PRIMARY} />
            </View>
            <View style={styles.fileDetails}>
              <Text style={styles.fileName}>{selectedFile.name}</Text>
              <Text style={styles.fileSize}>{formatFileSize(selectedFile.size || undefined)}</Text>
            </View>
            <TouchableOpacity style={styles.changeButton} onPress={handlePickFile} disabled={isLoading}>
              <Text style={styles.changeButtonText}>Change</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.dropZone} onPress={handlePickFile} disabled={isLoading}>
            <Ionicons name="cloud-upload-outline" size={48} color={UI.COLORS.TEXT_MUTED} />
            <Text style={styles.dropZoneTitle}>{isLoading ? "Opening file picker..." : "Select Import File"}</Text>
            <Text style={styles.dropZoneSubtitle}>Tap to browse for Excel or CSV files</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button title="Cancel" onPress={onCancel} variant="secondary" style={styles.cancelButton} />
        <Button title="Continue" onPress={handleContinue} disabled={!selectedFile || isLoading} style={styles.continueButton} />
      </View>

      {/* Tips */}
      <View style={styles.tips}>
        <Text style={styles.tipsTitle}>💡 Tips for best results:</Text>
        <Text style={styles.tip}>• Include column headers in the first row</Text>
        <Text style={styles.tip}>• Use clear, descriptive column names</Text>
        <Text style={styles.tip}>• Ensure dates are in a recognizable format</Text>
        <Text style={styles.tip}>• Keep file size under 10MB for faster processing</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: UI.SPACING.LG,
  },
  instructionsContainer: {
    marginBottom: UI.SPACING.XL,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.SM,
  },
  description: {
    fontSize: 16,
    color: UI.COLORS.TEXT_SECONDARY,
    lineHeight: 24,
    marginBottom: UI.SPACING.LG,
  },
  supportedFormats: {
    backgroundColor: UI.COLORS.SURFACE,
    padding: UI.SPACING.MD,
    borderRadius: UI.CARD_RADIUS,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  supportedTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.SM,
  },
  formatList: {
    gap: UI.SPACING.XS,
  },
  formatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: UI.SPACING.SM,
  },
  formatText: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
  },
  selectionArea: {
    flex: 1,
    justifyContent: "center",
    marginBottom: UI.SPACING.XL,
  },
  dropZone: {
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 2,
    borderColor: UI.COLORS.BORDER,
    borderStyle: "dashed",
    borderRadius: UI.CARD_RADIUS,
    padding: UI.SPACING.XL,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  dropZoneTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginTop: UI.SPACING.MD,
    marginBottom: UI.SPACING.XS,
  },
  dropZoneSubtitle: {
    fontSize: 14,
    color: UI.COLORS.TEXT_MUTED,
    textAlign: "center",
  },
  selectedFile: {
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    borderRadius: UI.CARD_RADIUS,
    padding: UI.SPACING.LG,
    flexDirection: "row",
    alignItems: "center",
  },
  fileIcon: {
    width: 48,
    height: 48,
    backgroundColor: UI.COLORS.BACKGROUND,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: UI.SPACING.MD,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  fileSize: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
  },
  changeButton: {
    paddingHorizontal: UI.SPACING.MD,
    paddingVertical: UI.SPACING.SM,
  },
  changeButtonText: {
    fontSize: 14,
    color: UI.COLORS.PRIMARY,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: UI.SPACING.MD,
    marginBottom: UI.SPACING.LG,
  },
  cancelButton: {
    flex: 1,
  },
  continueButton: {
    flex: 1,
  },
  tips: {
    backgroundColor: UI.COLORS.SURFACE,
    padding: UI.SPACING.MD,
    borderRadius: UI.CARD_RADIUS,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.SM,
  },
  tip: {
    fontSize: 13,
    color: UI.COLORS.TEXT_SECONDARY,
    lineHeight: 18,
    marginBottom: UI.SPACING.XS,
  },
});
