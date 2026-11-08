import { styles } from "./ResultsStep.styles";
import React from "react";
import { View, Text } from "react-native";
import { ImportResult } from "../types/import";
import {
  Card,
  SectionHeading,
  Badge,
  useAppTheme,
} from "../../../shared/ui";
import { ImportStepLayout } from "./ImportStepLayout";
import { ImportSummaryCard } from "./ImportSummaryCard";
import { ImportSectionList } from "./ImportSectionList";
import { ImportIssueList } from "./ImportIssueList";

interface ResultsStepProps {
  result: ImportResult;
  onClose: () => void;
  onImportMore: () => void;
}

export const ResultsStep: React.FC<ResultsStepProps> = ({
  result,
  onClose,
  onImportMore,
}) => {
  const { colors, typography, spacing } = useAppTheme();

  const totalAttempted = result.importedCount + result.skippedCount + result.errorCount;
  const successRate = totalAttempted > 0 ? (result.importedCount / totalAttempted) * 100 : 0;

  return (
    <ImportStepLayout
      secondaryAction={{
        title: "Import More",
        onPress: onImportMore,
        variant: "secondary",
        icon: "add-circle-outline",
        flex: 1,
      }}
      primaryAction={{
        title: "Done",
        onPress: onClose,
        icon: "checkmark",
        flex: 1,
      }}>
      <ImportSummaryCard
        title={result.success ? "Import Successful!" : "Completed with Issues"}
        subtitle={`${result.importedCount.toLocaleString()} transactions imported${successRate < 100 ? ` (${successRate.toFixed(1)}% success rate)` : ""}`}
        iconName={result.success ? "checkmark-done-circle-outline" : "alert-circle-outline"}
        iconColor={result.success ? "green" : "red"}
        iconSize="lg"
        borderColor={result.success ? colors.primary : colors.error}
        stats={[
          { label: "Imported", value: result.importedCount, color: colors.primary },
          { label: "Skipped", value: result.skippedCount, color: colors.onSurface },
          {
            label: "Errors",
            value: result.errorCount,
            color: result.errorCount > 0 ? colors.error : colors.onSurface,
          },
        ]}
      />

      {/* Created Categories */}
      {result.createdCategories.length > 0 && (
        <>
          <SectionHeading text={`NEW CATEGORIES CREATED (${result.createdCategories.length})`} />
          <Card variant="outlined" style={{ marginBottom: spacing.lg }}>
            <Text
              style={[
                typography.bodySmall,
                { color: colors.onSurfaceVariant, marginBottom: spacing.sm },
              ]}>
              Automatically created during this import:
            </Text>
            <View style={styles.categoriesWrap}>
              {result.createdCategories.map((categoryName, index) => (
                <Badge
                  key={`${categoryName}-${index}`}
                  label={categoryName}
                  role="primary"
                  size="medium"
                />
              ))}
            </View>
          </Card>
        </>
      )}

      <ImportIssueList
        issues={result.errors}
        headingPrefix="ISSUES ENCOUNTERED"
        limit={10}
      />

      <ImportSectionList
        heading="WHAT'S NEXT"
        items={[
          {
            key: "review-tx",
            icon: "receipt-outline",
            iconColor: "teal",
            title: "Review Transactions",
            subtitle: "Inspect your imported records in the Transactions tab",
          },
          ...(result.createdCategories.length > 0
            ? [
                {
                  key: "customize-cats",
                  icon: "color-palette-outline",
                  iconColor: "purple",
                  title: "Customize New Categories",
                  subtitle: "Pick custom icons and colors in Category Management",
                },
              ]
            : []),
          {
            key: "analytics",
            icon: "analytics-outline",
            iconColor: "blue",
            title: "View Analytics & Budgets",
            subtitle: "See updated spending breakdowns and budget health",
          },
        ]}
      />
    </ImportStepLayout>
  );
};
