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
  const { colors, radius, spacing } = useAppTheme();

  let bgColor = colors.surface;
  let borderColor = "transparent";
  let borderWidth = 0;
  let shadowStyle = {};

  if (variant === "outlined") {
    borderColor = colors.outlineVariant;
    borderWidth = 1;
  } else if (variant === "elevated") {
    bgColor = colors.surface;
    shadowStyle = {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    };
  } else {
    // default
    bgColor = colors.surfaceVariant;
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
