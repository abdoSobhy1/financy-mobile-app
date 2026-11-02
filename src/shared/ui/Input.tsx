import React, { useState } from "react";
import { View, TextInput, Text, StyleSheet, ViewStyle, TextStyle, TextInputProps, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../theme/ThemeProvider";

interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  variant?: "default" | "outlined" | "filled";
  size?: "small" | "medium" | "large";
  required?: boolean;
}

const Input = React.forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      containerStyle,
      inputStyle,
      labelStyle,
      errorStyle,
      variant = "default",
      size = "medium",
      required = false,
      secureTextEntry,
      onFocus,
      onBlur,
      ...textInputProps
    },
    ref,
  ) => {
    const { colors, typography, radius, spacing } = useAppTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [isSecure, setIsSecure] = useState(secureTextEntry);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const toggleSecureEntry = () => {
    setIsSecure(!isSecure);
  };

  let bgColor = colors.surfaceVariant;
  let borderColor = colors.outlineVariant;
  let borderWidth = 1;

  if (variant === "outlined") {
    bgColor = "transparent";
    borderColor = colors.outline;
    borderWidth = 2;
  } else if (variant === "filled") {
    bgColor = colors.surface;
    borderColor = "transparent";
  }

  if (isFocused) {
    borderColor = colors.primary;
  }
  if (error) {
    borderColor = colors.error;
  }

  let paddingHorizontal = spacing.md;
  let paddingVertical = spacing.sm;
  let minHeight = 44;

  if (size === "small") {
    paddingHorizontal = spacing.sm;
    paddingVertical = spacing.xs;
    minHeight = 36;
  } else if (size === "large") {
    paddingHorizontal = spacing.md;
    paddingVertical = spacing.md;
    minHeight = 52;
  }

  return (
    <View style={[{ marginBottom: spacing.md }, containerStyle]}>
      {label && (
        <Text style={[typography.label, { color: colors.onSurface, marginBottom: spacing.xs }, labelStyle]}>
          {label}
          {required && <Text style={{ color: colors.error }}> *</Text>}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: bgColor,
            borderColor,
            borderWidth,
            borderRadius: radius.sm,
            paddingHorizontal,
            paddingVertical,
            minHeight,
          },
        ]}>
        {leftIcon && <View style={{ marginRight: spacing.sm }}>{leftIcon}</View>}

        <TextInput
          ref={ref}
          style={[{ flex: 1, fontSize: 16, color: colors.onSurface, padding: 0 }, inputStyle]}
          placeholderTextColor={colors.onSurfaceVariant}
          secureTextEntry={isSecure}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...textInputProps}
        />

        {secureTextEntry && (
          <TouchableOpacity style={{ marginLeft: spacing.sm, padding: spacing.xs }} onPress={toggleSecureEntry}>
            <Ionicons name={isSecure ? "eye-off" : "eye"} size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}

        {rightIcon && !secureTextEntry && <View style={{ marginLeft: spacing.sm }}>{rightIcon}</View>}
      </View>

      {error && <Text style={[typography.bodySmall, { color: colors.error, marginTop: spacing.xs }, errorStyle]}>{error}</Text>}
      {hint && !error && <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: spacing.xs }]}>{hint}</Text>}
    </View>
  );
});

Input.displayName = "Input";

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default Input;
