import { styles } from "./ValidationStep.styles";
import { useImportValidation } from "../hooks/useImportValidation";

import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { ImportPreview, ImportMapping, ImportSettings, ImportError } from "../types/import";
import type { ExcelImportService } from "../services/excelImportService";
import {
  Button,
  Card,
  IconChip,
  useAppTheme,
} from "../../../shared/ui";
import { ImportStepLayout } from "./ImportStepLayout";
import { ImportSummaryCard } from "./ImportSummaryCard";
import { ImportSectionList } from "./ImportSectionList";
import { ImportIssueList } from "./ImportIssueList";

interface ValidationStepProps {
  preview: ImportPreview;
  mapping: ImportMapping;
  settings: ImportSettings;
  importService: ExcelImportService;
  onComplete: () => void;
  onBack: () => void;
}

export const ValidationStep: React.FC<ValidationStepProps> = ({
  preview,
  mapping,
  settings,
  importService,
  onComplete,
  onBack,
}) => {
  const {
    validation,
    isValidating,
    validationError,
    runValidation,
    handleProceedWithWarnings,
  } = useImportValidation({
    preview,
    mapping,
    settings,
    importService,
    onComplete,
    onBack,
  });
  const { colors, typography, spacing } = useAppTheme();

  const renderValidationSummary = () => {
    if (isValidating) {
      return (
        <Card variant="outlined" style={styles.summaryCard}>
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.h3, { color: colors.onSurface, marginTop: spacing.md }]}>
              Validating your data...
            </Text>
            <Text
              style={[
                typography.bodySmall,
                { color: colors.onSurfaceVariant, marginTop: 4 },
              ]}>
              Checking {preview.totalRows.toLocaleString()} rows against mapping rules
            </Text>
          </View>
        </Card>
      );
    }

    if (validationError) {
      return (
        <Card
          variant="outlined"
          style={StyleSheet.flatten([
            styles.summaryCard,
            { borderColor: colors.error, backgroundColor: colors.errorContainer + "33" },
          ])}>
          <View style={styles.stateContainer}>
            <IconChip iconName="alert-circle-outline" colorName="red" size="lg" />
            <Text style={[typography.h3, { color: colors.error, marginTop: spacing.md }]}>
              Validation Failed
            </Text>
            <Text
              style={[
                typography.bodySmall,
                {
                  color: colors.onSurfaceVariant,
                  textAlign: "center",
                  marginTop: 4,
                  marginBottom: spacing.md,
                },
              ]}>
              {validationError}
            </Text>
            <Button
              title="Retry Validation"
              onPress={runValidation}
              variant="secondary"
              size="small"
              icon="refresh-outline"
            />
          </View>
        </Card>
      );
    }

    if (!validation) return null;

    const { isValid, errors, warnings, validRowCount, totalRowCount } = validation;
    const successRate = totalRowCount > 0 ? (validRowCount / totalRowCount) * 100 : 0;

    return (
      <ImportSummaryCard
        title={isValid ? "Ready to Import" : "Attention Needed"}
        subtitle={`${validRowCount.toLocaleString()} of ${totalRowCount.toLocaleString()} rows valid (${successRate.toFixed(1)}%)`}
        iconName={isValid ? "checkmark-circle-outline" : "warning-outline"}
        iconColor={isValid ? "green" : "orange"}
        borderColor={isValid ? colors.primary : colors.error}
        stats={[
          { label: "Valid Rows", value: validRowCount, color: colors.primary },
          {
            label: "Errors",
            value: errors.length,
            color: errors.length > 0 ? colors.error : colors.onSurface,
          },
          {
            label: "Warnings",
            value: warnings.length,
            color: warnings.length > 0 ? colors.tertiary : colors.onSurface,
          },
        ]}
      />
    );
  };

  const mappedEntries = Object.entries(mapping).filter(([, col]) => Boolean(col));
  const allIssues: ImportError[] = validation
    ? [...validation.errors, ...validation.warnings]
    : [];

  return (
    <ImportStepLayout
      secondaryAction={{
        title: "Back",
        onPress: onBack,
        variant: "secondary",
        icon: "arrow-back",
      }}
      primaryAction={{
        title: validation?.isValid ? "Start Import" : "Fix Issues First",
        onPress: handleProceedWithWarnings,
        disabled: isValidating || !!validationError || !validation,
        icon: validation?.isValid ? "cloud-upload-outline" : "alert-circle-outline",
      }}>
      {renderValidationSummary()}

      <ImportSectionList
        heading="IMPORT CONFIGURATION"
        items={[
          {
            key: "default-type",
            icon: "swap-vertical-outline",
            iconColor: "teal",
            title: "Default Type",
            subtitle: "Applied when row type is not overridden",
            badge: {
              label: settings.globalTransactionType
                ? settings.globalTransactionType.toUpperCase()
                : "NOT SET",
              role: settings.globalTransactionType === "income" ? "primary" : "error",
            },
          },
          {
            key: "target-budget",
            icon: "pie-chart-outline",
            iconColor: "purple",
            title: "Target Budget",
            subtitle: "Budget linked to imported transactions",
            badge: {
              label: settings.globalBudgetName || "None",
              role: settings.globalBudgetName ? "primary" : "surfaceVariant",
            },
          },
          {
            key: "create-categories",
            icon: "add-circle-outline",
            iconColor: "orange",
            title: "Create Missing Categories",
            subtitle: "Auto-create unrecognized categories",
            badge: {
              label: settings.createMissingCategories ? "Enabled" : "Disabled",
              role: settings.createMissingCategories ? "primary" : "surfaceVariant",
            },
          },
        ]}
      />

      <ImportSectionList
        heading="MAPPED COLUMNS"
        items={mappedEntries.map(([field, column]) => {
          const isRequired = ["amount", "description", "date"].includes(field);
          return {
            key: field,
            icon: "git-compare-outline",
            iconColor: isRequired ? "green" : "blue",
            title: field.charAt(0).toUpperCase() + field.slice(1),
            subtitle: isRequired ? "Required field" : "Optional field",
            badge: { label: column.name, role: "primary" as const },
          };
        })}
      />

      <ImportIssueList issues={allIssues} headingPrefix="ISSUES FOUND" limit={20} />
    </ImportStepLayout>
  );
};
