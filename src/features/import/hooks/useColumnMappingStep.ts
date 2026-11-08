import { useEffect, useState } from "react";
import { AlertService } from "../../../shared/services/AlertService";
import type { ImportColumn, ImportMapping, ImportPreview } from "../types/import";

export type MappingTarget = keyof ImportMapping | null;

const mappingTargets: Array<{
  key: MappingTarget;
  label: string;
  required: boolean;
  description: string;
}> = [
  { key: null, label: "Skip Column", required: false, description: "Do not import this column" },
  { key: "amount", label: "Amount", required: true, description: "Transaction amount (required)" },
  { key: "description", label: "Description", required: true, description: "Transaction description (required)" },
  { key: "date", label: "Date", required: true, description: "Transaction date (required)" },
  { key: "category", label: "Category", required: false, description: "Transaction category (optional)" },
  { key: "type", label: "Type", required: false, description: "Income or Expense (optional)" },
  { key: "note", label: "Note", required: false, description: "Additional notes (optional)" },
];

interface UseColumnMappingStepOptions {
  preview: ImportPreview;
  onComplete: (mapping: ImportMapping) => void;
}

export function useColumnMappingStep({ preview, onComplete }: UseColumnMappingStepOptions) {
  const [columnMappings, setColumnMappings] = useState<Record<string, MappingTarget>>({});
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);

  useEffect(() => {
    const initialMappings: Record<string, MappingTarget> = {};
    preview.columns.forEach((column) => {
      if (column.mappedTo) initialMappings[column.id] = column.mappedTo as MappingTarget;
    });
    setColumnMappings(initialMappings);
  }, [preview.columns]);

  const handleMappingChange = (columnId: string, target: MappingTarget) => {
    setColumnMappings((previous) => {
      const next = { ...previous };
      if (target !== null) {
        Object.keys(next).forEach((key) => {
          if (next[key] === target && key !== columnId) next[key] = null;
        });
      }
      next[columnId] = target;
      return next;
    });
    setSelectedColumn(null);
  };

  const handleContinue = () => {
    const requiredTargets = mappingTargets.filter((target) => target.required).map((target) => target.key);
    const mappedTargets = Object.values(columnMappings).filter(Boolean);
    const missingRequired = requiredTargets.filter((target) => !mappedTargets.includes(target));
    if (missingRequired.length > 0) {
      AlertService.alert("Missing Required Mappings", `Please map the following required columns: ${missingRequired.join(", ")}`);
      return;
    }

    const nextMapping = {} as ImportMapping;
    Object.entries(columnMappings).forEach(([columnId, target]) => {
      if (!target) return;
      const column = preview.columns.find((item) => item.id === columnId);
      if (column) nextMapping[target] = column;
    });
    onComplete(nextMapping);
  };

  const getMappedTarget = (columnId: string): MappingTarget => columnMappings[columnId] || null;
  const getTargetInfo = (target: MappingTarget) => mappingTargets.find((item) => item.key === target);
  const getColumnSamples = (column: ImportColumn): string =>
    !column.sampleValues?.length ? "No sample data" : column.sampleValues.slice(0, 3).join(", ");
  const isTargetUsed = (target: MappingTarget): boolean => Object.values(columnMappings).includes(target);

  return {
    columnMappings,
    selectedColumn,
    setSelectedColumn,
    mappingTargets,
    handleMappingChange,
    handleContinue,
    getMappedTarget,
    getTargetInfo,
    getColumnSamples,
    isTargetUsed,
  };
}

export type ColumnMappingStepController = ReturnType<typeof useColumnMappingStep>;
