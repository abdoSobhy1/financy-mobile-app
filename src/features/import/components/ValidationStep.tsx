import { styles } from "./ValidationStep.styles";
import { useImportValidation } from "../hooks/useImportValidation";

import React from "react";
import { View, Text, StyleSheet, ScrollView, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ImportPreview, ImportMapping, ImportSettings, ImportError } from "../types/import";
import type { ExcelImportService } from "../services/excelImportService";
import { Button, Card } from "../../../shared/ui";
import { UI } from "../../../shared/constants";

interface ValidationStepProps {
  preview: ImportPreview;
  mapping: ImportMapping;
  settings: ImportSettings;
  importService: ExcelImportService;
  onComplete: () => void;
  onBack: () => void;
}

export const ValidationStep: React.FC<ValidationStepProps> = ({ preview, mapping, settings, importService, onComplete, onBack }) => {
  const { validation, isValidating, validationError, runValidation, handleProceedWithWarnings } = useImportValidation({ preview, mapping, settings, importService, onComplete, onBack });

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
