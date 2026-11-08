import type { useWalletEditorModal } from "../hooks/useWalletEditorModal";

import { View, Text, TouchableOpacity } from "react-native";

import { WalletType } from "../../../shared/types";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { WALLET_COLORS } from "../model/walletEditorOptions";

export interface WalletEditorFormValues {
  name: string;
  type: WalletType;
  icon: string;
  color: string;
  initialBalance: string;
  isSecret: boolean;
}
interface WalletColorPickerProps {
  spacing: ReturnType<typeof useAppTheme>["spacing"];
  formColor: ReturnType<typeof useWalletEditorModal>["formColor"];
  setFormColor: ReturnType<typeof useWalletEditorModal>["setFormColor"];
  colors: ReturnType<typeof useAppTheme>["colors"];
}
export function WalletColorPicker({ spacing, formColor, setFormColor, colors }: WalletColorPickerProps) {
  return (<View
    style={{
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: spacing.lg,
    }}>
    {WALLET_COLORS.map((col) => {
      const selected = formColor === col;
      return (
        <TouchableOpacity
          key={col}
          onPress={() => setFormColor(col)}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            backgroundColor: selected
              ? colors.primaryContainer
              : colors.surfaceVariant,
            borderWidth: 1,
            borderColor: selected ? colors.primary : "transparent",
          }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              textTransform: "capitalize",
              color: selected
                ? colors.onPrimaryContainer
                : colors.onSurface,
            }}>
            {col}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>);
}
