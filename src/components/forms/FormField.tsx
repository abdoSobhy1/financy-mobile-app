import React from "react";
import { View, Text, TextInput, StyleSheet, TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../constants";

interface FormFieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  required?: boolean;
  multiline?: boolean;
  containerStyle?: any;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  icon,
  error,
  required = false,
  multiline = false,
  containerStyle,
  ...textInputProps
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>

      <View style={[styles.inputContainer, error && styles.inputError, multiline && styles.multilineContainer]}>
        {icon && <Ionicons name={icon} size={20} color="#64748B" style={styles.inputIcon} />}
        <TextInput
          style={[styles.input, multiline && styles.multilineInput]}
          placeholderTextColor="#64748B"
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          {...textInputProps}
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  required: {
    color: "#EF4444",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  multilineContainer: {
    alignItems: "flex-start",
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "rgba(239, 68, 68, 0.05)",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    paddingVertical: 16,
  },
  multilineInput: {
    paddingTop: 16,
    minHeight: 80,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    marginTop: 4,
    marginLeft: 16,
  },
});

export default FormField;
