import React from "react";
import { View, Text, StyleSheet, ScrollView, FlatList } from "react-native";
import { ImportPreview, ImportRow } from "../../types/import";
import { Button } from "../ui";
import { UI } from "../../constants";

interface PreviewStepProps {
  preview: ImportPreview;
  onContinue: () => void;
  onBack: () => void;
}

export const PreviewStep: React.FC<PreviewStepProps> = ({ preview, onContinue, onBack }) => {
  const renderHeaderCell = (columnName: string, index: number) => (
    <View key={index} style={[styles.headerCell, { minWidth: Math.max(100, columnName.length * 8) }]}>
      <Text style={styles.headerText}>{columnName}</Text>
    </View>
  );

  const renderDataCell = (value: any, index: number, columnName: string) => (
    <View key={index} style={[styles.dataCell, { minWidth: Math.max(100, columnName.length * 8) }]}>
      <Text style={styles.dataText} numberOfLines={2}>
        {value !== null && value !== undefined ? String(value) : "—"}
      </Text>
    </View>
  );

  const renderRow = ({ item, index }: { item: ImportRow; index: number }) => {
    const isEven = index % 2 === 0;
    return (
      <View style={[styles.row, isEven && styles.evenRow]}>
        {preview.columns.map((column, columnIndex) => renderDataCell(item[column.name], columnIndex, column.name))}
      </View>
    );
  };

  const renderListHeader = () => <View style={styles.headerRow}>{preview.columns.map((column, index) => renderHeaderCell(column.name, index))}</View>;

  return (
    <View style={styles.container}>
      {/* File Info */}
      <View style={styles.fileInfo}>
        <View style={styles.fileInfoRow}>
          <Text style={styles.fileInfoLabel}>File:</Text>
          <Text style={styles.fileInfoValue}>{preview.fileName}</Text>
        </View>
        <View style={styles.fileInfoRow}>
          <Text style={styles.fileInfoLabel}>Total Rows:</Text>
          <Text style={styles.fileInfoValue}>{preview.totalRows.toLocaleString()}</Text>
        </View>
        <View style={styles.fileInfoRow}>
          <Text style={styles.fileInfoLabel}>Columns:</Text>
          <Text style={styles.fileInfoValue}>{preview.columns.length}</Text>
        </View>
        <View style={styles.fileInfoRow}>
          <Text style={styles.fileInfoLabel}>Preview:</Text>
          <Text style={styles.fileInfoValue}>First {preview.rows.length} rows</Text>
        </View>
      </View>

      {/* Data Preview */}
      <View style={styles.previewContainer}>
        <Text style={styles.previewTitle}>Data Preview</Text>
        <Text style={styles.previewSubtitle}>Review your data structure before mapping columns</Text>

        <View style={styles.tableContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              {renderListHeader()}
              <FlatList
                data={preview.rows}
                renderItem={renderRow}
                keyExtractor={(_, index) => index.toString()}
                style={styles.table}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              />
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Column Detection Info */}
      <View style={styles.detectionInfo}>
        <Text style={styles.detectionTitle}>Column Detection</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.columnsContainer}>
            {preview.columns.map((column, index) => (
              <View key={index} style={styles.columnCard}>
                <Text style={styles.columnName}>{column.name}</Text>
                <Text style={styles.columnType}>{column.type.charAt(0).toUpperCase() + column.type.slice(1)}</Text>
                {column.sampleValues && column.sampleValues.length > 0 && (
                  <View style={styles.sampleValues}>
                    {column.sampleValues.slice(0, 2).map((sample, sampleIndex) => (
                      <Text key={sampleIndex} style={styles.sampleValue} numberOfLines={1}>
                        {sample || "—"}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button title="Back" onPress={onBack} variant="secondary" style={styles.backButton} />
        <Button title="Continue to Mapping" onPress={onContinue} style={styles.continueButton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: UI.SPACING.LG,
  },
  fileInfo: {
    backgroundColor: UI.COLORS.SURFACE,
    padding: UI.SPACING.MD,
    borderRadius: UI.CARD_RADIUS,
    marginBottom: UI.SPACING.LG,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  fileInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: UI.SPACING.XS,
  },
  fileInfoLabel: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    fontWeight: "500",
  },
  fileInfoValue: {
    fontSize: 14,
    color: UI.COLORS.TEXT_PRIMARY,
    fontWeight: "600",
  },
  previewContainer: {
    flex: 1,
    marginBottom: UI.SPACING.LG,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  previewSubtitle: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    marginBottom: UI.SPACING.MD,
  },
  tableContainer: {
    flex: 1,
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: UI.CARD_RADIUS,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    overflow: "hidden",
  },
  table: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: UI.COLORS.BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
  },
  headerCell: {
    padding: UI.SPACING.SM,
    borderRightWidth: 1,
    borderRightColor: UI.COLORS.BORDER,
    justifyContent: "center",
  },
  headerText: {
    fontSize: 12,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
  },
  evenRow: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  dataCell: {
    padding: UI.SPACING.SM,
    borderRightWidth: 1,
    borderRightColor: UI.COLORS.BORDER,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
    justifyContent: "center",
  },
  dataText: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
  },
  detectionInfo: {
    marginBottom: UI.SPACING.LG,
  },
  detectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.SM,
  },
  columnsContainer: {
    flexDirection: "row",
    gap: UI.SPACING.SM,
  },
  columnCard: {
    backgroundColor: UI.COLORS.SURFACE,
    padding: UI.SPACING.SM,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    minWidth: 120,
    maxWidth: 150,
  },
  columnName: {
    fontSize: 13,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  columnType: {
    fontSize: 11,
    color: UI.COLORS.PRIMARY,
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: UI.SPACING.XS,
  },
  sampleValues: {
    gap: 2,
  },
  sampleValue: {
    fontSize: 10,
    color: UI.COLORS.TEXT_MUTED,
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    gap: UI.SPACING.MD,
  },
  backButton: {
    flex: 1,
  },
  continueButton: {
    flex: 2,
  },
});
