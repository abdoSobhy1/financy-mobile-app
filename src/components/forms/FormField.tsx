import React from "react";
import { TextInputProps, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Input from "../ui/Input";

interface FormFieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  required?: boolean;
  multiline?: boolean;
  containerStyle?: any;
}

export const FormField = React.forwardRef<TextInput, FormFieldProps>(
  (
    {
      label,
      icon,
      error,
      required = false,
      multiline = false,
      containerStyle,
      ...textInputProps
    },
    ref,
  ) => {
    return (
      <Input
        ref={ref}
        label={label}
        error={error}
        required={required}
        containerStyle={containerStyle}
        multiline={multiline}
        leftIcon={icon ? <Ionicons name={icon} size={18} /> : undefined}
        {...textInputProps}
      />
    );
  },
);

FormField.displayName = "FormField";

export default FormField;
