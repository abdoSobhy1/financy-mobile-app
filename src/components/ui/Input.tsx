import React, { useState } from "react";
import { View, TextInput, Text, StyleSheet, ViewStyle, TextStyle, TextInputProps, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../constants";

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

const Input: React.FC<InputProps> = ({
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
}) => {
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

  const getVariantStyle = (v: string) => {
    switch (v) {
      case "outlined":
        return styles.outlined;
      case "filled":
        return styles.filled;
      default:
        return styles.default;
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

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <View style={[styles.inputContainer, getVariantStyle(variant), getSizeStyle(size), isFocused && styles.focused, error && styles.error]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <TextInput
          style={[styles.input, inputStyle]}
          placeholderTextColor={UI.COLORS.TEXT_MUTED}
          secureTextEntry={isSecure}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...textInputProps}
        />

        {secureTextEntry && (
          <TouchableOpacity style={styles.rightIcon} onPress={toggleSecureEntry}>
            <Ionicons name={isSecure ? "eye-off" : "eye"} size={20} color="#666" />
          </TouchableOpacity>
        )}

        {rightIcon && !secureTextEntry && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>

      {error && <Text style={[styles.errorText, errorStyle]}>{error}</Text>}

      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: UI.SPACING.MD,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },

  required: {
    color: UI.COLORS.ERROR,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: UI.CARD_RADIUS / 2,
    borderWidth: 1,
  },

  // Variants
  default: {
    backgroundColor: UI.COLORS.INPUT_BACKGROUND,
    borderColor: UI.COLORS.BORDER,
  },
  outlined: {
    backgroundColor: "transparent",
    borderColor: UI.COLORS.BORDER,
    borderWidth: 2,
  },
  filled: {
    backgroundColor: UI.COLORS.SURFACE,
    borderColor: "transparent",
  },

  // Sizes
  small: {
    paddingHorizontal: UI.SPACING.SM,
    paddingVertical: UI.SPACING.XS,
    minHeight: 36,
  },
  medium: {
    paddingHorizontal: UI.SPACING.MD,
    paddingVertical: UI.SPACING.SM,
    minHeight: 44,
  },
  large: {
    paddingHorizontal: UI.SPACING.MD,
    paddingVertical: UI.SPACING.MD,
    minHeight: 52,
  },

  // States
  focused: {
    borderColor: UI.COLORS.PRIMARY,
  },
  error: {
    borderColor: UI.COLORS.ERROR,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    padding: 0,
  },

  leftIcon: {
    marginRight: UI.SPACING.SM,
  },

  rightIcon: {
    marginLeft: UI.SPACING.SM,
    padding: UI.SPACING.XS,
  },

  togglePassword: {
    fontSize: 16,
  },

  errorText: {
    fontSize: 12,
    color: UI.COLORS.ERROR,
    marginTop: UI.SPACING.XS,
  },

  hint: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
    marginTop: UI.SPACING.XS,
  },
});

export default Input;
