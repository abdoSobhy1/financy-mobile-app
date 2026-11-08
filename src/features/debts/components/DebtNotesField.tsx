import { styles } from "./DebtForm.styles";
import type { useDebtForm } from "../hooks/useDebtForm";

import { View, TextInput, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";
interface DebtNotesFieldProps {
  showMore: ReturnType<typeof useDebtForm>["showMore"];
  colors: ReturnType<typeof useAppTheme>["colors"];
  spacing: ReturnType<typeof useAppTheme>["spacing"];
  descriptionRef: ReturnType<typeof useDebtForm>["descriptionRef"];
  typography: ReturnType<typeof useAppTheme>["typography"];
  formData: ReturnType<typeof useDebtForm>["formData"];
  updateField: ReturnType<typeof useDebtForm>["updateField"];
}
export function DebtNotesField({ showMore, colors, spacing, descriptionRef, typography, formData, updateField }: DebtNotesFieldProps) {
  return (<>{showMore && (
    <View
      style={[
        styles.optionsCard,
        {
          backgroundColor: colors.surfaceVariant,
          borderColor: colors.outlineVariant,
          borderWidth: 1,
          marginBottom: spacing.xl,
        },
      ]}>
      <View
        style={[
          styles.optionRow,
          {
            borderBottomColor: "transparent",
            borderBottomWidth: 0,
            alignItems: "flex-start",
          },
        ]}>
        <View
          style={[
            styles.optionIcon,
            { backgroundColor: colors.surface, marginTop: 2 },
          ]}>
          <Ionicons
            name="document-text-outline"
            size={20}
            color={colors.primary}
          />
        </View>
        <View style={styles.optionContent}>
          <TextInput
            ref={descriptionRef}
            style={[
              typography.bodyMedium,
              {
                color: colors.onBackground,
                padding: 0,
                minHeight: 60,
                textAlignVertical: "top",
              },
            ]}
            placeholder="Additional notes about this debt..."
            placeholderTextColor={colors.onSurfaceVariant}
            value={formData.description}
            onChangeText={(text) => updateField("description", text)}
            multiline
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>
      </View>
    </View>
  )}</>);
}
