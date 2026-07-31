import React from "react";
import { TextInputProps } from "react-native";
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
    <Input
      label={label}
      error={error}
      required={required}
      containerStyle={containerStyle}
      multiline={multiline}
      leftIcon={icon ? <Ionicons name={icon} size={18} /> : undefined}
      {...textInputProps}
    />
  );
};

export default FormField;
