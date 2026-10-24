import React from "react";
import { View, StyleSheet, ViewStyle, TouchableOpacity } from "react-native";
import { useAppTheme } from "./ThemeProvider";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: "default" | "elevated" | "outlined";
  padding?: "none" | "small" | "medium" | "large";
}

const Card: React.FC<CardProps> = ({ children, style, onPress, variant = "default", padding = "medium" }) => {
  const { colors, radius, spacing, isDark } = useAppTheme();

  let bgColor = colors.surface;
  let borderColor = colors.outlineVariant;
  let borderWidth = 1;
  let shadowStyle = {};

  if (variant === "outlined") {
    borderColor = colors.outlineVariant;
    borderWidth = 1;
  } else if (variant === "elevated") {
    bgColor = colors.surface;
    borderColor = colors.outlineVariant;
    borderWidth = 1;
    shadowStyle = {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 6,
      elevation: 3,
    };
  } else {
    // default
    bgColor = colors.surface;
    borderColor = colors.outlineVariant;
    borderWidth = 1;
  }

  let paddingValue = spacing.md;
  if (padding === "none") paddingValue = 0;
  if (padding === "small") paddingValue = spacing.sm;
  if (padding === "large") paddingValue = spacing.lg;

  const cardStyle = [
    styles.card,
    {
      backgroundColor: bgColor,
      borderColor,
      borderWidth,
      padding: paddingValue,
      borderRadius: radius.md,
    },
    shadowStyle,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.9}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
  },
});

export default Card;
