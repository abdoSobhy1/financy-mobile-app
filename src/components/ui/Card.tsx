import React from "react";
import { View, StyleSheet, ViewStyle, TouchableOpacity } from "react-native";
import { UI } from "../../constants";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: "default" | "blur" | "elevated";
  padding?: "none" | "small" | "medium" | "large";
}

const Card: React.FC<CardProps> = ({ children, style, onPress, variant = "default", padding = "medium" }) => {
  const getVariantStyle = (v: string) => {
    switch (v) {
      case "blur":
        return styles.blur;
      case "elevated":
        return styles.elevated;
      default:
        return styles.default;
    }
  };

  const getPaddingStyle = (p: string) => {
    switch (p) {
      case "none":
        return styles.paddingNone;
      case "small":
        return styles.paddingSmall;
      case "medium":
        return styles.paddingMedium;
      case "large":
        return styles.paddingLarge;
      default:
        return styles.paddingMedium;
    }
  };

  const cardStyle = [styles.card, getVariantStyle(variant), getPaddingStyle(padding), style];

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
    borderRadius: UI.CARD_RADIUS,
    overflow: "hidden",
  },

  // Variants
  default: {
    backgroundColor: UI.COLORS.CARD,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  blur: {
    backgroundColor: UI.COLORS.CARD_BLUR,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  elevated: {
    backgroundColor: UI.COLORS.CARD,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },

  // Padding variants
  paddingNone: {
    padding: 0,
  },
  paddingSmall: {
    padding: UI.SPACING.SM,
  },
  paddingMedium: {
    padding: UI.SPACING.MD,
  },
  paddingLarge: {
    padding: UI.SPACING.LG,
  },
});

export default Card;
