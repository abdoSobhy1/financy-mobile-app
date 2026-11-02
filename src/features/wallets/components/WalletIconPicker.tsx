import { useWalletEditorModal } from "../hooks/useWalletEditorModal";

import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WalletType } from "../../../shared/types";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { WALLET_ICONS } from "../model/walletEditorOptions";

export interface WalletEditorFormValues {
  name: string;
  type: WalletType;
  icon: string;
  color: string;
  initialBalance: string;
  isSecret: boolean;
}
interface WalletIconPickerProps {
  spacing: ReturnType<typeof useAppTheme>["spacing"];
  formIcon: ReturnType<typeof useWalletEditorModal>["formIcon"];
  setFormIcon: ReturnType<typeof useWalletEditorModal>["setFormIcon"];
  colors: ReturnType<typeof useAppTheme>["colors"];
}
export function WalletIconPicker({ spacing, formIcon, setFormIcon, colors }: WalletIconPickerProps) {
  return (<View
    style={{
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: spacing.md,
    }}>
    {WALLET_ICONS.map((ic) => {
      const selected = formIcon === ic;
      return (
        <TouchableOpacity
          key={ic}
          onPress={() => setFormIcon(ic)}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: selected
              ? colors.primaryContainer
              : colors.surfaceVariant,
            borderWidth: 1,
            borderColor: selected ? colors.primary : "transparent",
          }}>
          <Ionicons
            name={ic as any}
            size={22}
            color={
              selected ? colors.onPrimaryContainer : colors.onSurface
            }
          />
        </TouchableOpacity>
      );
    })}
  </View>);
}
