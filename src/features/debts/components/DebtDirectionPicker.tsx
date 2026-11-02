import { styles } from "./DebtForm.styles";
import { useDebtForm } from "../hooks/useDebtForm";

import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";
interface DebtDirectionPickerProps {
  colors: ReturnType<typeof useAppTheme>["colors"];
  radius: ReturnType<typeof useAppTheme>["radius"];
  spacing: ReturnType<typeof useAppTheme>["spacing"];
  formData: ReturnType<typeof useDebtForm>["formData"];
  setFormData: ReturnType<typeof useDebtForm>["setFormData"];
  typography: ReturnType<typeof useAppTheme>["typography"];
}
export function DebtDirectionPicker({ colors, radius, spacing, formData, setFormData, typography }: DebtDirectionPickerProps) {
  return (<View
    style={[
      styles.segmentContainer,
      {
        backgroundColor: colors.surfaceVariant,
        borderRadius: radius.pill,
        marginBottom: spacing.xl,
      },
    ]}>
    {(
      [
        {
          key: "i_owe",
          label: "I Owe (Borrowed)",
          icon: "arrow-up-circle-outline",
          color: colors.error,
        },
        {
          key: "owed_to_me",
          label: "Owed to Me (Lent)",
          icon: "arrow-down-circle-outline",
          color: colors.primary,
        },
      ] as const
    ).map((opt) => {
      const isActive = formData.type === opt.key;
      return (
        <TouchableOpacity
          key={opt.key}
          style={[
            styles.segmentButton,
            {
              borderRadius: radius.pill,
              backgroundColor: isActive
                ? colors.surface
                : "transparent",
            },
          ]}
          onPress={() => setFormData((prev) => ({ ...prev, type: opt.key }))}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons
              name={opt.icon as any}
              size={16}
              color={isActive ? opt.color : colors.onSurfaceVariant}
            />
            <Text
              style={[
                typography.bodyMedium,
                {
                  color: isActive
                    ? colors.onBackground
                    : colors.onSurfaceVariant,
                  fontWeight: isActive ? "700" : "500",
                },
              ]}>
              {opt.label}
            </Text>
          </View>
        </TouchableOpacity>
      );
    })}
  </View>);
}
