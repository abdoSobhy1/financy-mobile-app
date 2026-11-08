import { styles } from "./ColumnMappingStep.styles";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ImportPreview, ImportMapping, ImportColumn } from "../types/import";
import {
  Card,
  SectionHeading,
  ListRow,
  IconChip,
  Badge,
  useAppTheme,
} from "../../../shared/ui";
import { useColumnMappingStep } from "../hooks/useColumnMappingStep";
import { ImportStepLayout } from "./ImportStepLayout";
import { ImportOptionCard } from "./ImportOptionCard";

interface ColumnMappingStepProps {
  preview: ImportPreview;
  mapping: ImportMapping;
  onComplete: (mapping: ImportMapping) => void;
  onBack: () => void;
}

const getColumnIcon = (type: ImportColumn["type"]) => {
  switch (type) {
    case "number":
      return { icon: "calculator-outline", color: "green" };
    case "date":
      return { icon: "calendar-outline", color: "blue" };
    default:
      return { icon: "text-outline", color: "indigo" };
  }
};

export const ColumnMappingStep: React.FC<ColumnMappingStepProps> = ({
  preview,
  onComplete,
  onBack,
}) => {
  const {
    selectedColumn,
    setSelectedColumn,
    mappingTargets,
    handleMappingChange,
    handleContinue,
    getMappedTarget,
    getTargetInfo,
    getColumnSamples,
    isTargetUsed,
  } = useColumnMappingStep({ preview, onComplete });
  const { colors, typography } = useAppTheme();

  return (
    <ImportStepLayout
      secondaryAction={{
        title: "Back",
        onPress: onBack,
        variant: "secondary",
        icon: "arrow-back",
      }}
      primaryAction={{
        title: "Continue",
        onPress: handleContinue,
        icon: "arrow-forward",
        iconPosition: "right",
      }}>
      {/* Mapping Summary Status */}
      <SectionHeading text="TARGET FIELDS STATUS" />
      <View style={styles.summaryGrid}>
        {mappingTargets
          .filter((t) => t.key !== null)
          .map((target) => {
            const isRequired = target.required;
            const isMapped = isTargetUsed(target.key);

            return (
              <View
                key={target.key}
                style={[
                  styles.summaryChip,
                  {
                    backgroundColor: isMapped
                      ? colors.primaryContainer
                      : isRequired
                        ? colors.errorContainer
                        : colors.surface,
                    borderColor: isMapped
                      ? colors.primary
                      : isRequired
                        ? colors.error
                        : colors.outlineVariant,
                  },
                ]}>
                <Ionicons
                  name={
                    isMapped
                      ? "checkmark-circle"
                      : isRequired
                        ? "alert-circle"
                        : "ellipse-outline"
                  }
                  size={16}
                  color={
                    isMapped
                      ? colors.primary
                      : isRequired
                        ? colors.error
                        : colors.onSurfaceVariant
                  }
                />
                <Text
                  style={[
                    typography.bodySmall,
                    {
                      fontWeight: "600",
                      color: isMapped
                        ? colors.onPrimaryContainer
                        : isRequired
                          ? colors.onErrorContainer
                          : colors.onSurfaceVariant,
                    },
                  ]}>
                  {target.label}
                  {isRequired ? " *" : ""}
                </Text>
              </View>
            );
          })}
      </View>

      {/* Columns List */}
      <SectionHeading text="YOUR FILE COLUMNS (TAP TO ASSIGN)" />
      {preview.columns.map((column) => {
        const mappedTarget = getMappedTarget(column.id);
        const targetInfo = getTargetInfo(mappedTarget);
        const isSelected = selectedColumn === column.id;
        const colMeta = getColumnIcon(column.type);

        return (
          <Card
            key={column.id}
            variant="outlined"
            padding="none"
            style={StyleSheet.flatten([
              styles.columnCard,
              {
                borderColor: isSelected
                  ? colors.primary
                  : mappedTarget
                    ? colors.primary + "66"
                    : colors.outlineVariant,
              },
            ])}>
            <ListRow
              onPress={() => setSelectedColumn(isSelected ? null : column.id)}
              leading={
                <IconChip
                  iconName={colMeta.icon}
                  colorName={mappedTarget ? "teal" : colMeta.color}
                  size="sm"
                  shape="rounded-square"
                />
              }
              title={column.name}
              subtitle={`${column.type.toUpperCase()} • ${getColumnSamples(column)}`}
              trailing={
                <View style={styles.columnRight}>
                  <Badge
                    label={targetInfo?.label || "Unmapped"}
                    role={mappedTarget ? "primary" : "surfaceVariant"}
                    size="small"
                  />
                  <Ionicons
                    name={isSelected ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={colors.onSurfaceVariant}
                  />
                </View>
              }
            />

            {isSelected && (
              <View
                style={[
                  styles.optionsContainer,
                  {
                    backgroundColor: colors.background,
                    borderTopColor: colors.outlineVariant,
                  },
                ]}>
                <Text
                  style={[
                    typography.caption,
                    {
                      color: colors.onSurfaceVariant,
                      fontWeight: "600",
                      marginBottom: 4,
                    },
                  ]}>
                  Assign "{column.name}" to Financy field:
                </Text>
                {mappingTargets.map((target) => {
                  const isUsed = target.key !== null && isTargetUsed(target.key);
                  const isTargetSelected = mappedTarget === target.key;
                  const badges: Array<{
                    label: string;
                    role?: "primary" | "secondary" | "tertiary" | "error" | "success" | "warning" | "surfaceVariant";
                  }> = [];
                  if (target.required) {
                    badges.push({
                      label: "Required",
                      role: isTargetSelected ? "primary" : "error",
                    });
                  }
                  if (isUsed && !isTargetSelected) {
                    badges.push({
                      label: "Assigned",
                      role: "surfaceVariant",
                    });
                  }

                  return (
                    <ImportOptionCard
                      key={target.key || "skip"}
                      title={target.label}
                      description={target.description}
                      selected={isTargetSelected}
                      disabled={isUsed && !isTargetSelected}
                      badges={badges}
                      onPress={() => handleMappingChange(column.id, target.key)}
                    />
                  );
                })}
              </View>
            )}
          </Card>
        );
      })}
    </ImportStepLayout>
  );
};
