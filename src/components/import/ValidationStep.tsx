import { AlertService } from "../../services/AlertService";
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, FlatList, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ImportPreview, ImportMapping, ImportSettings, ImportValidation, ImportError } from "../../types/import";
import { ExcelImportService } from "../../services/excelImportService";
import { Button, Card } from "../ui";
import { UI } from "../../constants";

interface ValidationStepProps {
  preview: ImportPreview;
  mapping: ImportMapping;
  settings: ImportSettings;
  importService: ExcelImportService;
  onComplete: () => void;
  onBack: () => void;
}

export const ValidationStep: React.FC<ValidationStepProps> = ({ preview, mapping, settings, importService, onComplete, onBack }) => {
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

  const renderValidationSummary = () => {
    if (isValidating) {
      return (
        <Card style={styles.summaryCard}>
          <View style={styles.loadingContainer}>
            <Ionicons name="hourglass" size={32} color={UI.COLORS.PRIMARY} />
            <Text style={styles.loadingText}>Validating your data...</Text>
            <Text style={styles.loadingSubtext}>This may take a moment for large files</Text>
          </View>
        </Card>
      );
    }

    if (validationError) {
      return (
        <Card style={StyleSheet.flatten([styles.summaryCard, styles.errorCard])}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={32} color={UI.COLORS.ERROR} />
            <Text style={styles.errorTitle}>Validation Failed</Text>
            <Text style={styles.errorMessage}>{validationError}</Text>
            <Button title="Retry Validation" onPress={runValidation} variant="secondary" style={styles.retryButton} />
          </View>
        </Card>
      );
    }

    if (!validation) return null;

    const { isValid, errors, warnings, validRowCount, totalRowCount } = validation;
    const successRate = totalRowCount > 0 ? (validRowCount / totalRowCount) * 100 : 0;

    return (
      <Card style={StyleSheet.flatten([styles.summaryCard, isValid ? styles.successCard : styles.warningCard])}>
        <View style={styles.summaryHeader}>
          <Ionicons name={isValid ? "checkmark-circle" : "warning"} size={32} color={isValid ? UI.COLORS.SUCCESS : UI.COLORS.WARNING} />
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>{isValid ? "Ready to Import" : "Issues Found"}</Text>
            <Text style={styles.summarySubtitle}>
              {validRowCount} of {totalRowCount} rows will be imported ({successRate.toFixed(1)}%)
            </Text>
          </View>
        </View>

        <View style={styles.summaryStats}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{validRowCount}</Text>
            <Text style={styles.statLabel}>Valid Rows</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: UI.COLORS.ERROR }]}>{errors.length}</Text>
            <Text style={styles.statLabel}>Errors</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: UI.COLORS.WARNING }]}>{warnings.length}</Text>
            <Text style={styles.statLabel}>Warnings</Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderImportSettings = () => (
    <Card style={styles.settingsCard}>
      <Text style={styles.settingsTitle}>Import Configuration</Text>

      <View style={styles.settingsList}>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Transaction Type:</Text>
          <Text style={styles.settingValue}>
            {settings.globalTransactionType
              ? settings.globalTransactionType.charAt(0).toUpperCase() + settings.globalTransactionType.slice(1)
              : "Not set"}
          </Text>
        </View>

        {settings.globalBudgetName && (
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Budget:</Text>
            <Text style={styles.settingValue}>{settings.globalBudgetName}</Text>
          </View>
        )}

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Create Missing Categories:</Text>
          <Text style={styles.settingValue}>{settings.createMissingCategories ? "Yes" : "No"}</Text>
        </View>

        {mapping.type && (
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Type Column Override:</Text>
            <Text style={styles.settingValue}>{settings.allowIndividualTypeOverride ? "Enabled" : "Disabled"}</Text>
          </View>
        )}
      </View>
    </Card>
  );

  const renderMappingSummary = () => (
    <Card style={styles.mappingCard}>
      <Text style={styles.mappingTitle}>Column Mapping</Text>

      <View style={styles.mappingList}>
        {Object.entries(mapping).map(([field, column]) => (
          <View key={field} style={styles.mappingItem}>
            <View style={styles.mappingField}>
              <Text style={styles.mappingFieldName}>{field.charAt(0).toUpperCase() + field.slice(1)}</Text>
              {(["amount", "description", "date"] as Array<keyof ImportMapping>).includes(field as keyof ImportMapping) && (
                <Text style={styles.requiredBadge}>Required</Text>
              )}
            </View>
            <Text style={styles.mappingColumn}>"{column.name}"</Text>
          </View>
        ))}
      </View>
    </Card>
  );

  const renderErrorList = () => {
    if (!validation || (validation.errors.length === 0 && validation.warnings.length === 0)) {
      return null;
    }

    const allIssues = [...validation.errors, ...validation.warnings];

    const renderIssue = ({ item }: { item: ImportError }) => (
      <View style={[styles.issueItem, item.severity === "error" ? styles.errorItem : styles.warningItem]}>
        <View style={styles.issueHeader}>
          <Ionicons
            name={item.severity === "error" ? "close-circle" : "warning"}
            size={16}
            color={item.severity === "error" ? UI.COLORS.ERROR : UI.COLORS.WARNING}
          />
          <Text style={styles.issueLocation}>
            Row {item.row}, Column "{item.column}"
          </Text>
        </View>
        <Text style={styles.issueMessage}>{item.message}</Text>
      </View>
    );

    return (
      <Card style={styles.issuesCard}>
        <View style={styles.issuesHeader}>
          <Text style={styles.issuesTitle}>Issues Found ({allIssues.length})</Text>
          <Text style={styles.issuesSubtitle}>Rows with errors will be skipped during import</Text>
        </View>

        <FlatList
          data={allIssues.slice(0, 20)} // Limit to first 20 issues
          renderItem={renderIssue}
          keyExtractor={(item, index) => `${item.row}-${item.column}-${index}`}
          style={styles.issuesList}
          maxToRenderPerBatch={10}
        />

        {allIssues.length > 20 && <Text style={styles.moreIssuesText}>... and {allIssues.length - 20} more issues</Text>}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderValidationSummary()}
        {renderImportSettings()}
        {renderMappingSummary()}
        {renderErrorList()}
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <Button title="Back" onPress={onBack} variant="secondary" style={styles.backButton} />
        <Button
          title={validation?.isValid ? "Start Import" : "Fix Issues First"}
          onPress={handleProceedWithWarnings}
          disabled={isValidating || !!validationError || !validation}
          style={styles.importButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: UI.SPACING.LG,
  },
  summaryCard: {
    marginBottom: UI.SPACING.LG,
  },
  successCard: {
    borderLeftWidth: 4,
    borderLeftColor: UI.COLORS.SUCCESS,
  },
  warningCard: {
    borderLeftWidth: 4,
    borderLeftColor: UI.COLORS.WARNING,
  },
  errorCard: {
    borderLeftWidth: 4,
    borderLeftColor: UI.COLORS.ERROR,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: UI.SPACING.LG,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginTop: UI.SPACING.MD,
    marginBottom: UI.SPACING.XS,
  },
  loadingSubtext: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: UI.SPACING.LG,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.ERROR,
    marginTop: UI.SPACING.MD,
    marginBottom: UI.SPACING.XS,
  },
  errorMessage: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    textAlign: "center",
    marginBottom: UI.SPACING.MD,
  },
  retryButton: {
    minWidth: 120,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: UI.SPACING.MD,
  },
  summaryContent: {
    flex: 1,
    marginLeft: UI.SPACING.MD,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  summarySubtitle: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: UI.SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
  },
  stat: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: UI.COLORS.SUCCESS,
    marginBottom: UI.SPACING.XS,
  },
  statLabel: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
    textTransform: "uppercase",
  },
  settingsCard: {
    marginBottom: UI.SPACING.LG,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.MD,
  },
  settingsList: {
    gap: UI.SPACING.SM,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: UI.SPACING.SM,
  },
  settingLabel: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    fontWeight: "500",
  },
  settingValue: {
    fontSize: 14,
    color: UI.COLORS.TEXT_PRIMARY,
    fontWeight: "600",
  },
  mappingCard: {
    marginBottom: UI.SPACING.LG,
  },
  mappingTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.MD,
  },
  mappingList: {
    gap: UI.SPACING.SM,
  },
  mappingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: UI.SPACING.SM,
  },
  mappingField: {
    flexDirection: "row",
    alignItems: "center",
    gap: UI.SPACING.SM,
  },
  mappingFieldName: {
    fontSize: 14,
    color: UI.COLORS.TEXT_PRIMARY,
    fontWeight: "600",
  },
  requiredBadge: {
    fontSize: 10,
    color: UI.COLORS.PRIMARY,
    backgroundColor: "rgba(79, 70, 229, 0.2)",
    paddingHorizontal: UI.SPACING.XS,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  mappingColumn: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    fontStyle: "italic",
  },
  issuesCard: {
    marginBottom: UI.SPACING.LG,
  },
  issuesHeader: {
    marginBottom: UI.SPACING.MD,
  },
  issuesTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  issuesSubtitle: {
    fontSize: 13,
    color: UI.COLORS.TEXT_SECONDARY,
  },
  issuesList: {
    maxHeight: 200,
  },
  issueItem: {
    padding: UI.SPACING.SM,
    borderRadius: 6,
    marginBottom: UI.SPACING.XS,
  },
  errorItem: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  warningItem: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  issueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: UI.SPACING.XS,
    marginBottom: UI.SPACING.XS,
  },
  issueLocation: {
    fontSize: 12,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  issueMessage: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
    lineHeight: 16,
  },
  moreIssuesText: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
    textAlign: "center",
    marginTop: UI.SPACING.SM,
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    gap: UI.SPACING.MD,
    padding: UI.SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
    backgroundColor: UI.COLORS.SURFACE,
  },
  backButton: {
    flex: 1,
  },
  importButton: {
    flex: 2,
  },
});
