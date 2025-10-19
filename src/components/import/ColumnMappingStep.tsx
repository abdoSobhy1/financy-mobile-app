import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ImportPreview, ImportMapping, ImportColumn, COLUMN_PATTERNS } from "../../types/import";
import { Button } from "../ui";
import { UI } from "../../constants";

interface ColumnMappingStepProps {
  preview: ImportPreview;
  mapping: ImportMapping;
  onComplete: (mapping: ImportMapping) => void;
  onBack: () => void;
}

type MappingTarget = "amount" | "description" | "date" | "category" | "type" | "note" | null;

export const ColumnMappingStep: React.FC<ColumnMappingStepProps> = ({ preview, mapping, onComplete, onBack }) => {
  const [columnMappings, setColumnMappings] = useState<Record<string, MappingTarget>>({});
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);

  // Initialize mappings with smart detection
  useEffect(() => {
    const initialMappings: Record<string, MappingTarget> = {};

    preview.columns.forEach((column) => {
      // Check if column already has a suggested mapping
      if (column.mappedTo) {
        initialMappings[column.id] = column.mappedTo as MappingTarget;
      }
    });

    setColumnMappings(initialMappings);
  }, [preview.columns]);

  const mappingTargets: Array<{ key: MappingTarget; label: string; required: boolean; description: string }> = [
    { key: null, label: "Skip Column", required: false, description: "Do not import this column" },
    { key: "amount", label: "Amount", required: true, description: "Transaction amount (required)" },
    { key: "description", label: "Description", required: true, description: "Transaction description (required)" },
    { key: "date", label: "Date", required: true, description: "Transaction date (required)" },
    { key: "category", label: "Category", required: false, description: "Transaction category (optional)" },
    { key: "type", label: "Type", required: false, description: "Income or Expense (optional)" },
    { key: "note", label: "Note", required: false, description: "Additional notes (optional)" },
  ];

  const handleMappingChange = (columnId: string, target: MappingTarget) => {
    setColumnMappings((prev) => {
      // If assigning a target that's already used by another column, clear that column first
      if (target !== null) {
        const newMappings = { ...prev };
        Object.keys(newMappings).forEach((key) => {
          if (newMappings[key] === target && key !== columnId) {
            newMappings[key] = null;
          }
        });
        newMappings[columnId] = target;
        return newMappings;
      } else {
        const newMappings = { ...prev };
        newMappings[columnId] = target;
        return newMappings;
      }
    });
    setSelectedColumn(null);
  };

  const handleContinue = () => {
    // Validate required mappings
    const requiredTargets = mappingTargets.filter((t) => t.required).map((t) => t.key);
    const mappedTargets = Object.values(columnMappings).filter(Boolean);
    const missingRequired = requiredTargets.filter((target) => !mappedTargets.includes(target));

    if (missingRequired.length > 0) {
      Alert.alert("Missing Required Mappings", `Please map the following required columns: ${missingRequired.join(", ")}`);
      return;
    }

    // Build mapping object
    const newMapping: ImportMapping = {} as ImportMapping;

    Object.entries(columnMappings).forEach(([columnId, target]) => {
      if (target) {
        const column = preview.columns.find((c) => c.id === columnId);
        if (column) {
          newMapping[target as keyof ImportMapping] = column;
        }
      }
    });

    onComplete(newMapping);
  };

  const getMappedTarget = (columnId: string): MappingTarget => {
    return columnMappings[columnId] || null;
  };

  const getTargetInfo = (target: MappingTarget) => {
    return mappingTargets.find((t) => t.key === target);
  };

  const getColumnSamples = (column: ImportColumn): string => {
    if (!column.sampleValues || column.sampleValues.length === 0) {
      return "No sample data";
    }
    return column.sampleValues.slice(0, 3).join(", ");
  };

  const isTargetUsed = (target: MappingTarget): boolean => {
    return Object.values(columnMappings).includes(target);
  };

  const renderMappingOption = (target: { key: MappingTarget; label: string; required: boolean; description: string }) => {
    const isUsed = isTargetUsed(target.key);
    const isSelected = selectedColumn && getMappedTarget(selectedColumn) === target.key;

    return (
      <TouchableOpacity
        key={target.key || "skip"}
        style={[styles.mappingOption, isSelected && styles.mappingOptionSelected, isUsed && !isSelected && styles.mappingOptionUsed]}
        onPress={() => selectedColumn && handleMappingChange(selectedColumn, target.key)}
        disabled={!selectedColumn || (isUsed && !isSelected)}>
        <View style={styles.mappingOptionHeader}>
          <Text style={[styles.mappingOptionLabel, target.required && styles.requiredLabel, isUsed && !isSelected && styles.usedLabel]}>
            {target.label}
            {target.required && " *"}
          </Text>
          {isSelected && <Ionicons name="checkmark-circle" size={20} color={UI.COLORS.SUCCESS} />}
          {isUsed && !isSelected && <Ionicons name="checkmark-circle-outline" size={20} color={UI.COLORS.TEXT_MUTED} />}
        </View>
        <Text style={[styles.mappingOptionDescription, isUsed && !isSelected && styles.usedDescription]}>{target.description}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.title}>Map Your Columns</Text>
        <Text style={styles.description}>
          Match each column from your file to the corresponding field in Financy. Required fields are marked with *.
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Column List */}
        <View style={styles.columnsSection}>
          <Text style={styles.sectionTitle}>Your Columns</Text>
          <Text style={styles.sectionSubtitle}>Tap a column to assign it to a field</Text>

          {preview.columns.map((column) => {
            const mappedTarget = getMappedTarget(column.id);
            const targetInfo = getTargetInfo(mappedTarget);
            const isSelected = selectedColumn === column.id;

            return (
              <TouchableOpacity
                key={column.id}
                style={[styles.columnItem, isSelected && styles.columnItemSelected, mappedTarget && styles.columnItemMapped]}
                onPress={() => setSelectedColumn(isSelected ? null : column.id)}>
                <View style={styles.columnHeader}>
                  <View style={styles.columnInfo}>
                    <Text style={styles.columnName}>{column.name}</Text>
                    <Text style={styles.columnType}>
                      {column.type} • {getColumnSamples(column)}
                    </Text>
                  </View>
                  <View style={styles.columnMapping}>
                    {mappedTarget ? (
                      <View style={styles.mappingChip}>
                        <Text style={styles.mappingChipText}>{targetInfo?.label}</Text>
                      </View>
                    ) : (
                      <Text style={styles.unmappedText}>Not mapped</Text>
                    )}
                    <Ionicons name={isSelected ? "chevron-up" : "chevron-down"} size={20} color={UI.COLORS.TEXT_SECONDARY} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Mapping Options */}
        {selectedColumn && (
          <View style={styles.mappingSection}>
            <Text style={styles.sectionTitle}>Map "{preview.columns.find((c) => c.id === selectedColumn)?.name}" to:</Text>
            <View style={styles.mappingOptions}>{mappingTargets.map(renderMappingOption)}</View>
          </View>
        )}

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.sectionTitle}>Mapping Summary</Text>
          <View style={styles.summaryGrid}>
            {mappingTargets
              .filter((t) => t.key !== null)
              .map((target) => {
                const isRequired = target.required;
                const isMapped = isTargetUsed(target.key);

                return (
                  <View key={target.key} style={styles.summaryItem}>
                    <View style={styles.summaryHeader}>
                      <Text style={[styles.summaryLabel, isRequired && !isMapped && styles.summaryLabelMissing]}>
                        {target.label}
                        {isRequired && " *"}
                      </Text>
                      <View style={[styles.summaryStatus, isMapped ? styles.summaryStatusMapped : styles.summaryStatusUnmapped]}>
                        <Ionicons name={isMapped ? "checkmark" : "close"} size={12} color={isMapped ? UI.COLORS.SUCCESS : UI.COLORS.ERROR} />
                      </View>
                    </View>
                    <Text style={styles.summaryValue}>{isMapped ? "Mapped" : isRequired ? "Required" : "Optional"}</Text>
                  </View>
                );
              })}
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <Button title="Back" onPress={onBack} variant="secondary" style={styles.backButton} />
        <Button title="Continue" onPress={handleContinue} style={styles.continueButton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  instructions: {
    padding: UI.SPACING.LG,
    backgroundColor: UI.COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  description: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  columnsSection: {
    padding: UI.SPACING.LG,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    marginBottom: UI.SPACING.MD,
  },
  columnItem: {
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    borderRadius: UI.CARD_RADIUS,
    marginBottom: UI.SPACING.SM,
  },
  columnItemSelected: {
    borderColor: UI.COLORS.PRIMARY,
    backgroundColor: "rgba(79, 70, 229, 0.1)",
  },
  columnItemMapped: {
    borderColor: UI.COLORS.SUCCESS,
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: UI.SPACING.MD,
  },
  columnInfo: {
    flex: 1,
  },
  columnName: {
    fontSize: 15,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  columnType: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
  },
  columnMapping: {
    flexDirection: "row",
    alignItems: "center",
    gap: UI.SPACING.SM,
  },
  mappingChip: {
    backgroundColor: UI.COLORS.SUCCESS,
    paddingHorizontal: UI.SPACING.SM,
    paddingVertical: UI.SPACING.XS,
    borderRadius: 12,
  },
  mappingChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  unmappedText: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
    fontStyle: "italic",
  },
  mappingSection: {
    padding: UI.SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
    backgroundColor: UI.COLORS.BACKGROUND,
  },
  mappingOptions: {
    gap: UI.SPACING.SM,
  },
  mappingOption: {
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    borderRadius: UI.CARD_RADIUS,
    padding: UI.SPACING.MD,
  },
  mappingOptionSelected: {
    borderColor: UI.COLORS.PRIMARY,
    backgroundColor: "rgba(79, 70, 229, 0.1)",
  },
  mappingOptionUsed: {
    opacity: 0.5,
    backgroundColor: UI.COLORS.BACKGROUND,
  },
  mappingOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: UI.SPACING.XS,
  },
  mappingOptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  requiredLabel: {
    color: UI.COLORS.PRIMARY,
  },
  usedLabel: {
    color: UI.COLORS.TEXT_MUTED,
  },
  mappingOptionDescription: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
    lineHeight: 16,
  },
  usedDescription: {
    color: UI.COLORS.TEXT_MUTED,
  },
  summary: {
    padding: UI.SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
    backgroundColor: UI.COLORS.SURFACE,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: UI.SPACING.SM,
  },
  summaryItem: {
    backgroundColor: UI.COLORS.BACKGROUND,
    padding: UI.SPACING.SM,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    minWidth: "45%",
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: UI.SPACING.XS,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  summaryLabelMissing: {
    color: UI.COLORS.ERROR,
  },
  summaryStatus: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryStatusMapped: {
    backgroundColor: UI.COLORS.SUCCESS,
  },
  summaryStatusUnmapped: {
    backgroundColor: UI.COLORS.ERROR,
  },
  summaryValue: {
    fontSize: 11,
    color: UI.COLORS.TEXT_MUTED,
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
  continueButton: {
    flex: 1,
  },
});
