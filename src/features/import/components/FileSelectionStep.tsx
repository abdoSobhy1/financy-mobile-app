import { useFileSelectionStep } from "../hooks/useFileSelectionStep";

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  Card,
  SectionHeading,
  Badge,
  useAppTheme,
} from "../../../shared/ui";
import { ImportStepLayout } from "./ImportStepLayout";
import { ImportSectionList } from "./ImportSectionList";

interface FileSelectionStepProps {
  onFileSelected: (file: DocumentPicker.DocumentPickerAsset) => void;
  onCancel: () => void;
}

const SUPPORTED_FORMAT_ITEMS = [
  {
    key: "xlsx",
    icon: "grid-outline",
    iconColor: "green",
    iconShape: "rounded-square" as const,
    title: "Excel Spreadsheets",
    subtitle: "Microsoft Excel workbooks (.xlsx, .xls)",
    badge: { label: "XLSX / XLS", role: "surfaceVariant" as const },
  },
  {
    key: "csv",
    icon: "list-outline",
    iconColor: "blue",
    iconShape: "rounded-square" as const,
    title: "CSV Documents",
    subtitle: "Comma-separated values exported from banks (.csv)",
    badge: { label: "CSV", role: "surfaceVariant" as const },
  },
];

const TIP_ITEMS = [
  {
    key: "headers",
    icon: "albums-outline",
    iconColor: "indigo",
    title: "Include column headers",
    subtitle: "Place column titles in the first row of your file",
  },
  {
    key: "dates",
    icon: "calendar-outline",
    iconColor: "indigo",
    title: "Standard date formats",
    subtitle: "YYYY-MM-DD, MM/DD/YYYY, or DD/MM/YYYY",
  },
  {
    key: "names",
    icon: "pricetag-outline",
    iconColor: "indigo",
    title: "Clear column names",
    subtitle: "Use Amount, Description, Date, and Category",
  },
  {
    key: "size",
    icon: "speedometer-outline",
    iconColor: "indigo",
    title: "Under 10MB file size",
    subtitle: "Smaller files parse and validate much faster",
  },
];

export const FileSelectionStep: React.FC<FileSelectionStepProps> = ({
  onFileSelected,
  onCancel,
}) => {
  const {
    selectedFile,
    isLoading,
    handlePickFile,
    handleContinue,
    formatFileSize,
    getFileTypeIcon,
  } = useFileSelectionStep({ onFileSelected, onCancel });
  const { colors, typography, spacing, radius } = useAppTheme();

  return (
    <ImportStepLayout
      secondaryAction={{
        title: "Cancel",
        onPress: onCancel,
        variant: "secondary",
        flex: 1,
      }}
      primaryAction={{
        title: "Continue",
        onPress: handleContinue,
        disabled: !selectedFile || isLoading,
        loading: isLoading,
        icon: "arrow-forward",
        iconPosition: "right",
        flex: 1,
      }}>
      {/* Hero Overview Banner */}
      <Card
        variant="default"
        style={StyleSheet.flatten([
          styles.bannerCard,
          {
            backgroundColor: colors.primaryContainer,
            borderColor: colors.primary + "33",
            marginBottom: spacing.lg,
          },
        ])}>
        <View style={styles.bannerHeader}>
          <View style={[styles.bannerIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="document-attach" size={22} color={colors.onPrimary} />
          </View>
          <View style={styles.bannerTextContainer}>
            <Text style={[typography.h3, { color: colors.onPrimaryContainer, fontSize: 17 }]}>
              Import from Excel or CSV
            </Text>
            <Text
              style={[
                typography.bodySmall,
                { color: colors.onPrimaryContainer, opacity: 0.85, marginTop: 4 },
              ]}>
              Bring your bank statements or spreadsheets into Financy. Columns for amount,
              description, and date will be automatically detected.
            </Text>
          </View>
        </View>
      </Card>

      {/* File Selection Area */}
      {selectedFile ? (
        <ImportSectionList
          heading="SELECT FILE"
          cardStyle={{ marginBottom: spacing.lg }}
          items={[
            {
              key: "selected-file",
              icon: getFileTypeIcon(selectedFile.name || undefined),
              iconColor: "teal",
              iconSize: "md",
              iconShape: "rounded-square",
              title: selectedFile.name || "Selected File",
              subtitle: formatFileSize(selectedFile.size || undefined),
              trailing: (
                <Button
                  title="Change"
                  onPress={handlePickFile}
                  variant="ghost"
                  size="small"
                  disabled={isLoading}
                />
              ),
            },
          ]}
        />
      ) : (
        <>
          <SectionHeading text="SELECT FILE" />
          <TouchableOpacity
            style={[
              styles.dropZone,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primary + "55",
                borderRadius: radius.lg,
                marginBottom: spacing.lg,
              },
            ]}
            onPress={handlePickFile}
            disabled={isLoading}
            activeOpacity={0.8}>
            <View
              style={[
                styles.uploadCircle,
                { backgroundColor: colors.primaryContainer },
              ]}>
              <Ionicons name="cloud-upload-outline" size={34} color={colors.primary} />
            </View>
            <Text style={[typography.h3, { color: colors.onSurface, marginTop: spacing.md }]}>
              {isLoading ? "Opening file picker..." : "Tap to Browse Files"}
            </Text>
            <Text
              style={[
                typography.bodySmall,
                { color: colors.onSurfaceVariant, marginTop: 4, textAlign: "center" },
              ]}>
              Supports .xlsx, .xls, and .csv up to 10 MB
            </Text>
            <View style={styles.badgeRow}>
              <Badge label="Excel (.xlsx)" role="primary" size="small" />
              <Badge label="CSV (.csv)" role="secondary" size="small" />
            </View>
          </TouchableOpacity>
        </>
      )}

      <ImportSectionList heading="SUPPORTED FORMATS" items={SUPPORTED_FORMAT_ITEMS} />
      <ImportSectionList heading="TIPS FOR BEST RESULTS" items={TIP_ITEMS} />
    </ImportStepLayout>
  );
};

const styles = StyleSheet.create({
  bannerCard: {
    borderRadius: 20,
    borderWidth: 1,
  },
  bannerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  bannerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTextContainer: {
    flex: 1,
  },
  dropZone: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
});
