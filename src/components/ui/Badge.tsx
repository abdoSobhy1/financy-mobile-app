import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme";

export type BadgeVariant =
  | "primary"
  | "surfaceVariant"
  | "error"
  | "success"
  | "outline"
  | "category";

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  categoryKey?: string; // used when variant === "category"
  size?: "small" | "medium";
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = "surfaceVariant",
  categoryKey = "neutral",
  size = "medium",
  icon,
  style,
  textStyle,
}) => {
  const { colors, isDark, categoryPalette, typography, spacing, radius } =
    useAppTheme();

  let bg = colors.surfaceVariant;
  let fg = colors.onSurfaceVariant;

  switch (variant) {
    case "primary":
      bg = colors.primaryContainer;
      fg = colors.onPrimaryContainer;
      break;
    case "error":
      bg = isDark ? "#4C0519" : "#FFE4E6";
      fg = isDark ? "#FDA4AF" : "#BE123C";
      break;
    case "success":
      bg = isDark ? "#064E3B" : "#D1FAE5";
      fg = isDark ? "#6EE7B7" : "#047857";
      break;
    case "outline":
      bg = "transparent";
      fg = colors.onSurface;
      break;
    case "category": {
      const pair = categoryPalette[categoryKey] || categoryPalette.neutral;
      bg = isDark ? pair.dark : pair.light;
      fg = isDark ? pair.textDark : pair.textLight;
      break;
    }
    case "surfaceVariant":
    default:
      bg = colors.surfaceVariant;
      fg = colors.onSurfaceVariant;
      break;
  }

  const isSmall = size === "small";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bg,
          borderRadius: radius.pill,
          paddingHorizontal: isSmall ? spacing.s8 : spacing.s12,
          paddingVertical: isSmall ? spacing.s4 : spacing.s4,
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: variant === "outline" ? colors.outline : undefined,
        },
        style,
      ]}>
      {icon && (
        <Ionicons
          name={icon}
          size={isSmall ? 12 : 14}
          color={fg}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          isSmall ? typography.labelSmall : typography.labelMedium,
          { color: fg },
          textStyle,
        ]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  icon: {
    marginRight: 4,
  },
});
