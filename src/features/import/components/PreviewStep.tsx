import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { ImportPreview, ImportRow } from "../types/import";
import {
  Card,
  SectionHeading,
  Badge,
  useAppTheme,
} from "../../../shared/ui";
import { ImportStepLayout } from "./ImportStepLayout";
import { ImportSummaryCard } from "./ImportSummaryCard";

interface PreviewStepProps {
  preview: ImportPreview;
  onContinue: () => void;
  onBack: () => void;
}

export const PreviewStep: React.FC<PreviewStepProps> = ({
  preview,
  onContinue,
  onBack,
}) => {
  const { colors, typography, spacing } = useAppTheme();

  const renderHeaderCell = (columnName: string, index: number) => (
    <View
      key={index}
      style={[
        styles.headerCell,
        {
          minWidth: Math.max(110, columnName.length * 9),
          borderRightColor: colors.outlineVariant,
        },
      ]}>
      <Text style={[typography.label, styles.headerText, { color: colors.onSurfaceVariant }]}>
        {columnName}
      </Text>
    </View>
  );

  const renderDataCell = (value: any, index: number, columnName: string) => (
    <View
      key={index}
      style={[
        styles.dataCell,
        {
          minWidth: Math.max(110, columnName.length * 9),
          borderRightColor: colors.outlineVariant,
          borderBottomColor: colors.outlineVariant,
        },
      ]}>
      <Text style={[typography.bodySmall, { color: colors.onSurface }]} numberOfLines={2}>
        {value !== null && value !== undefined && String(value) !== "" ? String(value) : "—"}
      </Text>
    </View>
  );

  const renderRow = (item: ImportRow, index: number) => {
    const isEven = index % 2 === 0;
    return (
      <View
        key={index}
        style={[
          styles.row,
          { backgroundColor: isEven ? colors.surface : colors.background },
        ]}>
        {preview.columns.map((column, columnIndex) =>
          renderDataCell(item[column.name], columnIndex, column.name),
        )}
      </View>
    );
  };

  return (
    <ImportStepLayout
      secondaryAction={{
        title: "Back",
        onPress: onBack,
        variant: "secondary",
        icon: "arrow-back",
      }}
      primaryAction={{
        title: "Map Columns",
        onPress: onContinue,
        icon: "arrow-forward",
        iconPosition: "right",
      }}>
      <SectionHeading text="FILE OVERVIEW" />
      <ImportSummaryCard
        title={preview.fileName}
        subtitle={`Showing first ${preview.rows.length} of ${preview.totalRows.toLocaleString()} rows`}
        iconName="document-text-outline"
        iconColor="teal"
        iconShape="rounded-square"
        trailing={<Badge label={`${preview.columns.length} cols`} role="primary" size="small" />}
        stats={[
          { label: "Total Rows", value: preview.totalRows, color: colors.primary },
          { label: "Columns", value: preview.columns.length, color: colors.onSurface },
          {
            label: "Auto-Detected",
            value: preview.columns.filter((c) => Boolean(c.mappedTo)).length,
            color: colors.tertiary,
          },
        ]}
      />

      {/* Detected Columns Strip */}
      <SectionHeading text="DETECTED COLUMNS" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.md }}>
        {preview.columns.map((column, index) => (
          <Card
            key={column.id || index}
            variant="outlined"
            padding="medium"
            style={styles.columnCard}>
            <View style={styles.columnCardHeader}>
              <Text
                style={[typography.label, { color: colors.onSurface, flex: 1 }]}
                numberOfLines={1}>
                {column.name}
              </Text>
              <Badge
                label={column.type.toUpperCase()}
                role={column.mappedTo ? "primary" : "surfaceVariant"}
                size="small"
              />
            </View>
            {column.mappedTo && (
              <Text
                style={[
                  typography.caption,
                  { color: colors.primary, fontWeight: "600", marginTop: 4 },
                ]}>
                Suggested: {column.mappedTo}
              </Text>
            )}
            {column.sampleValues && column.sampleValues.length > 0 && (
              <View style={styles.sampleValues}>
                {column.sampleValues.slice(0, 2).map((sample, sampleIndex) => (
                  <Text
                    key={sampleIndex}
                    style={[
                      typography.caption,
                      { color: colors.onSurfaceVariant, fontStyle: "italic" },
                    ]}
                    numberOfLines={1}>
                    {sample || "—"}
                  </Text>
                ))}
              </View>
            )}
          </Card>
        ))}
      </ScrollView>

      {/* Data Preview Table */}
      <SectionHeading text="SAMPLE DATA ROWS" />
      <Card variant="outlined" padding="none" style={styles.tableCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View>
            <View
              style={[
                styles.headerRow,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderBottomColor: colors.outlineVariant,
                },
              ]}>
              {preview.columns.map((column, index) => renderHeaderCell(column.name, index))}
            </View>
            {preview.rows.map((row, idx) => renderRow(row, idx))}
          </View>
        </ScrollView>
      </Card>
    </ImportStepLayout>
  );
};

const styles = StyleSheet.create({
  columnCard: {
    minWidth: 165,
    maxWidth: 210,
  },
  columnCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sampleValues: {
    marginTop: 8,
    gap: 2,
  },
  tableCard: {
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  headerCell: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    justifyContent: "center",
  },
  headerText: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
  },
  dataCell: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    justifyContent: "center",
  },
});
