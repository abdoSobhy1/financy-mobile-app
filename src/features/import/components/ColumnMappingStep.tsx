import { styles } from "./ColumnMappingStep.styles";
import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ImportPreview, ImportMapping, ImportColumn } from "../types/import";
import { Button } from "../../../shared/ui";
import { UI } from "../../../shared/constants";
import { useColumnMappingStep } from "../hooks/useColumnMappingStep";
import type { MappingTarget } from "../hooks/useColumnMappingStep";

interface ColumnMappingStepProps {
  preview: ImportPreview;
  mapping: ImportMapping;
  onComplete: (mapping: ImportMapping) => void;
  onBack: () => void;
}


export const ColumnMappingStep: React.FC<ColumnMappingStepProps> = ({ preview, onComplete, onBack }) => {
  const { columnMappings, selectedColumn, setSelectedColumn, mappingTargets, handleMappingChange, handleContinue, getMappedTarget, getTargetInfo, getColumnSamples, isTargetUsed } = useColumnMappingStep({ preview, onComplete });

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
