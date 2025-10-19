import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../constants";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: "left" | "right";
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
  icon,
  iconPosition = "left",
}) => {
  const handlePress = () => {
    if (!disabled && !loading) {
      onPress();
    }
  };

  const getVariantStyle = (v: string) => {
    switch (v) {
      case "primary":
        return styles.primary;
      case "secondary":
        return styles.secondary;
      case "danger":
        return styles.danger;
      case "ghost":
        return styles.ghost;
      default:
        return styles.primary;
    }
  };

  const getSizeStyle = (s: string) => {
    switch (s) {
      case "small":
        return styles.small;
      case "medium":
        return styles.medium;
      case "large":
        return styles.large;
      default:
        return styles.medium;
    }
  };

  const getVariantTextStyle = (v: string) => {
    switch (v) {
      case "primary":
        return styles.primaryText;
      case "secondary":
        return styles.secondaryText;
      case "danger":
        return styles.dangerText;
      case "ghost":
        return styles.ghostText;
      default:
        return styles.primaryText;
    }
  };

  const getSizeTextStyle = (s: string) => {
    switch (s) {
      case "small":
        return styles.smallText;
      case "medium":
        return styles.mediumText;
      case "large":
        return styles.largeText;
      default:
        return styles.mediumText;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getVariantStyle(variant),
        getSizeStyle(size),
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={disabled || loading}>
      {loading ? (
        <ActivityIndicator size="small" color={variant === "ghost" ? UI.COLORS.PRIMARY : UI.COLORS.TEXT_PRIMARY} />
      ) : (
        <View style={styles.contentContainer}>
          {icon && iconPosition === "left" && (
            <Ionicons name={icon} size={16} color={variant === "ghost" ? UI.COLORS.PRIMARY : UI.COLORS.TEXT_PRIMARY} style={styles.iconLeft} />
          )}
          <Text style={[styles.text, getVariantTextStyle(variant), getSizeTextStyle(size), textStyle]}>{title}</Text>
          {icon && iconPosition === "right" && (
            <Ionicons name={icon} size={16} color={variant === "ghost" ? UI.COLORS.PRIMARY : UI.COLORS.TEXT_PRIMARY} style={styles.iconRight} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: UI.CARD_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },

  // Variants
  primary: {
    backgroundColor: UI.COLORS.PRIMARY,
  },
  secondary: {
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  danger: {
    backgroundColor: UI.COLORS.ERROR,
  },
  ghost: {
    backgroundColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
  },

  // Sizes
  small: {
    paddingHorizontal: UI.SPACING.SM,
    paddingVertical: UI.SPACING.XS,
    minHeight: 32,
  },
  medium: {
    paddingHorizontal: UI.SPACING.MD,
    paddingVertical: UI.SPACING.SM,
    minHeight: 44,
  },
  large: {
    paddingHorizontal: UI.SPACING.LG,
    paddingVertical: UI.SPACING.MD,
    minHeight: 52,
  },

  // States
  disabled: {
    opacity: 0.6,
  },
  fullWidth: {
    width: "100%",
  },

  // Text styles
  text: {
    fontWeight: "600",
    textAlign: "center",
  },

  // Variant text styles
  primaryText: {
    color: UI.COLORS.TEXT_PRIMARY,
  },
  secondaryText: {
    color: UI.COLORS.TEXT_PRIMARY,
  },
  dangerText: {
    color: UI.COLORS.TEXT_PRIMARY,
  },
  ghostText: {
    color: UI.COLORS.PRIMARY,
  },

  // Size text styles
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default Button;
