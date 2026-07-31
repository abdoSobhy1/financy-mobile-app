import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "./ThemeProvider";

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
  const { colors, typography, radius, spacing } = useAppTheme();

  const handlePress = () => {
    if (!disabled && !loading) {
      onPress();
    }
  };

  let bgColor = colors.primary;
  let textColor = colors.onPrimary;
  let borderColor = "transparent";
  let borderWidth = 0;

  switch (variant) {
    case "primary":
      bgColor = colors.primary;
      textColor = colors.onPrimary;
      break;
    case "secondary":
      bgColor = colors.surface;
      textColor = colors.onSurface;
      borderColor = colors.outline;
      borderWidth = 1;
      break;
    case "danger":
      bgColor = colors.error;
      textColor = colors.onError;
      break;
    case "ghost":
      bgColor = "transparent";
      textColor = colors.primary;
      break;
  }

  let paddingHorizontal = spacing.md;
  let paddingVertical = spacing.sm;
  let minHeight = 44;
  let textSize = typography.bodyMedium;

  switch (size) {
    case "small":
      paddingHorizontal = spacing.sm;
      paddingVertical = spacing.xs;
      minHeight = 32;
      textSize = typography.bodySmall;
      break;
    case "large":
      paddingHorizontal = spacing.lg;
      paddingVertical = spacing.md;
      minHeight = 52;
      textSize = typography.bodyLarge;
      break;
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth,
          paddingHorizontal,
          paddingVertical,
          minHeight,
          borderRadius: radius.md,
          width: fullWidth ? "100%" : undefined,
          opacity: disabled || loading ? 0.6 : 1,
        },
        variant !== "ghost" && styles.shadow,
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={disabled || loading}>
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.contentContainer}>
          {icon && iconPosition === "left" && (
            <Ionicons name={icon} size={16} color={textColor} style={{ marginRight: 8 }} />
          )}
          <Text style={[textSize, { color: textColor, fontWeight: "600", textAlign: "center" }, textStyle]}>
            {title}
          </Text>
          {icon && iconPosition === "right" && (
            <Ionicons name={icon} size={16} color={textColor} style={{ marginLeft: 8 }} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Button;
