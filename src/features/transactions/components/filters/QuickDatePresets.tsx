import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../../../shared/constants";

export interface QuickDatePreset {
  id: string;
  label: string;
  startDate: Date;
  endDate: Date;
  icon?: string;
}

interface QuickDatePresetsProps {
  selectedPresetId?: string;
  onPresetSelect: (preset: QuickDatePreset) => void;
  customPresets?: QuickDatePreset[];
  presets?: QuickDatePreset[]; // Allow passing in custom presets (e.g., billing period presets)
}

export const QuickDatePresets: React.FC<QuickDatePresetsProps> = ({ selectedPresetId, onPresetSelect, customPresets = [], presets }) => {
  const now = new Date();

  // Use provided presets or fall back to default calendar month presets
  const defaultPresets: QuickDatePreset[] = presets || [
    {
      id: "today",
      label: "Today",
      startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
      icon: "today",
    },
    {
      id: "yesterday",
      label: "Yesterday",
      startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
      endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59),
      icon: "arrow-back",
    },
    {
      id: "last7days",
      label: "Last 7 Days",
      startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6),
      endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
      icon: "calendar-outline",
    },
    {
      id: "last30days",
      label: "Last 30 Days",
      startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29),
      endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
      icon: "calendar",
    },
    {
      id: "thisMonth",
      label: "This Month",
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      icon: "calendar-sharp",
    },
    {
      id: "lastMonth",
      label: "Last Month",
      startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      endDate: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
      icon: "arrow-back-circle",
    },
    {
      id: "thisYear",
      label: "This Year",
      startDate: new Date(now.getFullYear(), 0, 1),
      endDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
      icon: "calendar-number",
    },
  ];

  const allPresets = [...defaultPresets, ...customPresets];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Date Ranges</Text>
      <View style={styles.presetsGrid}>
        {allPresets.map((preset) => {
          const isSelected = selectedPresetId === preset.id;

          return (
            <TouchableOpacity
              key={preset.id}
              style={[styles.presetButton, isSelected && styles.selectedPreset]}
              onPress={() => onPresetSelect(preset)}>
              <View style={styles.presetContent}>
                {preset.icon && (
                  <Ionicons
                    name={preset.icon as any}
                    size={16}
                    color={isSelected ? UI.COLORS.BACKGROUND : UI.COLORS.TEXT_SECONDARY}
                    style={styles.presetIcon}
                  />
                )}
                <Text style={[styles.presetLabel, isSelected && styles.selectedPresetLabel]}>{preset.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: UI.SPACING.LG,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.MD,
  },
  presetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: UI.SPACING.SM,
  },
  presetButton: {
    paddingHorizontal: UI.SPACING.MD,
    paddingVertical: UI.SPACING.SM,
    borderRadius: UI.CARD_RADIUS,
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    minWidth: 80,
    alignItems: "center",
  },
  selectedPreset: {
    backgroundColor: UI.COLORS.PRIMARY,
    borderColor: UI.COLORS.PRIMARY,
  },
  presetContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  presetIcon: {
    marginRight: UI.SPACING.XS,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: UI.COLORS.TEXT_SECONDARY,
    textAlign: "center",
  },
  selectedPresetLabel: {
    color: UI.COLORS.BACKGROUND,
    fontWeight: "600",
  },
});
