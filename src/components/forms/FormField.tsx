import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from "react-native";
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

      <View
        style={[
          styles.inputCard,
          error && styles.inputCardError,
          multiline && styles.multilineCard,
        ]}>
        {icon && (
          <View style={styles.iconBox}>
            <Ionicons
              name={icon}
              size={16}
              color={error ? "#FF6B6B" : UI.COLORS.PRIMARY_LIGHT}
            />
          </View>
        )}
        <TextInput
          style={[styles.input, multiline && styles.multilineInput]}
          placeholderTextColor="rgba(255,255,255,0.25)"
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          {...textInputProps}
        />
      </View>

      {error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: UI.COLORS.PRIMARY_LIGHT,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  required: {
    color: "#FF6B6B",
  },
  inputCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20,20,50,0.65)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.15)",
    paddingHorizontal: 14,
    minHeight: 54,
  },
  multilineCard: {
    alignItems: "flex-start",
  },
  inputCardError: {
    borderColor: "rgba(255,107,107,0.5)",
    backgroundColor: "rgba(255,107,107,0.04)",
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(108,92,231,0.12)",
    alignItems: "center",
    justifyContent: "center",
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
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 2,
  },
  errorText: {
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "500",
  },
});

export default FormField;
