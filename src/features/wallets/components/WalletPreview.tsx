import { useWalletEditorModal } from "../hooks/useWalletEditorModal";

import { View, Text } from "react-native";

import { WalletType } from "../../../shared/types";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { IconChip } from "../../../shared/ui/IconChip";

export interface WalletEditorFormValues {
  name: string;
  type: WalletType;
  icon: string;
  color: string;
  initialBalance: string;
  isSecret: boolean;
}
interface WalletPreviewProps {
  colors: ReturnType<typeof useAppTheme>["colors"];
  spacing: ReturnType<typeof useAppTheme>["spacing"];
  formIcon: ReturnType<typeof useWalletEditorModal>["formIcon"];
  formColor: ReturnType<typeof useWalletEditorModal>["formColor"];
  formName: ReturnType<typeof useWalletEditorModal>["formName"];
  formType: ReturnType<typeof useWalletEditorModal>["formType"];
}
export function WalletPreview({ colors, spacing, formIcon, formColor, formName, formType }: WalletPreviewProps) {
  return (<View
    style={{
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 20,
      marginBottom: spacing.md,
    }}>
    <IconChip
      iconName={formIcon as any}
      colorName={formColor as any}
      size={56}
    />
    <Text
      style={{
        fontSize: 16,
        fontWeight: "800",
        color: colors.onSurface,
        marginTop: 8,
      }}>
      {formName || "Account Name"}
    </Text>
    <Text
      style={{
        fontSize: 12,
        textTransform: "capitalize",
        color: colors.onSurfaceVariant,
      }}>
      {formType} Account
    </Text>
  </View>);
}
