import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge, useAppTheme } from "../../../shared/ui";

interface ImportOptionCardProps {
  title: string;
  description?: string;
  selected: boolean;
  disabled?: boolean;
  badges?: Array<{
    label: string;
    role?: "primary" | "secondary" | "tertiary" | "error" | "success" | "warning" | "surfaceVariant";
  }>;
  onPress: () => void;
}

export const ImportOptionCard: React.FC<ImportOptionCardProps> = ({
  title,
  description,
  selected,
  disabled = false,
  badges,
  onPress,
}) => {
  const { colors, typography } = useAppTheme();

  return (
    <TouchableOpacity
      style={[
        styles.option,
        {
          backgroundColor: selected ? colors.primaryContainer : colors.surface,
          borderColor: selected ? colors.primary : colors.outlineVariant,
          opacity: disabled && !selected ? 0.55 : 1,
        },
      ]}
      onPress={onPress}
      disabled={disabled && !selected}
      activeOpacity={0.75}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text
            style={[
              typography.label,
              {
                color: selected ? colors.onPrimaryContainer : colors.onSurface,
              },
            ]}>
            {title}
          </Text>
          {badges?.map((badge, idx) => (
            <Badge
              key={`${badge.label}-${idx}`}
              label={badge.label}
              role={badge.role || "surfaceVariant"}
              size="small"
            />
          ))}
        </View>
        {selected && (
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
        )}
      </View>
      {description && (
        <Text
          style={[
            typography.caption,
            {
              color: selected
                ? colors.onPrimaryContainer
                : colors.onSurfaceVariant,
            },
          ]}>
          {description}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  option: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
});
