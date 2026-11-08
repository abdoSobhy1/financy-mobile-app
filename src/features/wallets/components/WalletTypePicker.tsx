import type { WalletEditorModalController } from "../hooks/useWalletEditorModal";

import { View, Text, TouchableOpacity } from "react-native";

import { WalletType } from "../../../shared/types";
import { useAppTheme, type AppTheme } from "../../../shared/theme/ThemeProvider";

export interface WalletEditorFormValues {
  name: string;
  type: WalletType;
  icon: string;
  color: string;
  initialBalance: string;
  isSecret: boolean;
}
interface WalletTypePickerProps {
  spacing: AppTheme["spacing"];
  formType: WalletEditorModalController["formType"];
  setFormType: WalletEditorModalController["setFormType"];
  colors: AppTheme["colors"];
}
export function WalletTypePicker({ spacing, formType, setFormType, colors }: WalletTypePickerProps) {
  return (<View
    style={{
      flexDirection: "row",
      gap: 8,
      marginBottom: spacing.md,
    }}>
    {(["cash", "bank", "card", "wallet"] as WalletType[]).map((wt) => {
      const selected = formType === wt;
      return (
        <TouchableOpacity
          key={wt}
          onPress={() => setFormType(wt)}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 12,
            alignItems: "center",
            backgroundColor: selected
              ? colors.primaryContainer
              : colors.surfaceVariant,
          }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              textTransform: "capitalize",
              color: selected
                ? colors.onPrimaryContainer
                : colors.onSurface,
            }}>
            {wt}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>);
}
