import type { useWalletEditorModal } from "../hooks/useWalletEditorModal";

import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WalletType } from "../../../shared/types";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";

import { Switch } from "../../../shared/ui/Switch";

export interface WalletEditorFormValues {
  name: string;
  type: WalletType;
  icon: string;
  color: string;
  initialBalance: string;
  isSecret: boolean;
}
interface WalletPrivacyToggleProps {
  formIsSecret: ReturnType<typeof useWalletEditorModal>["formIsSecret"];
  setFormIsSecret: ReturnType<typeof useWalletEditorModal>["setFormIsSecret"];
  setFormIcon: ReturnType<typeof useWalletEditorModal>["setFormIcon"];
  colors: ReturnType<typeof useAppTheme>["colors"];
  spacing: ReturnType<typeof useAppTheme>["spacing"];
}
export function WalletPrivacyToggle({ formIsSecret, setFormIsSecret, setFormIcon, colors, spacing }: WalletPrivacyToggleProps) {
  return (<TouchableOpacity
    activeOpacity={0.7}
    onPress={() => {
      const nextVal = !formIsSecret;
      setFormIsSecret(nextVal);
      if (nextVal) {
        setFormIcon("lock-closed-outline");
      }
    }}
    style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surfaceVariant,
      padding: spacing.md,
      borderRadius: 14,
      marginBottom: spacing.md,
    }}>
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: formIsSecret
          ? colors.errorContainer
          : colors.primaryContainer,
        marginRight: 10,
      }}>
      <Ionicons
        name="lock-closed"
        size={16}
        color={formIsSecret ? colors.error : colors.primary}
      />
    </View>
    <View style={{ flex: 1, paddingRight: 10 }}>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "700",
          color: colors.onSurface,
        }}>
        Secret Wallet
      </Text>
      <Text
        style={{
          fontSize: 11,
          color: colors.onSurfaceVariant,
          marginTop: 2,
        }}>
        Money added will not show up in totals unless assigned to a budget
      </Text>
    </View>
    <Switch
      value={formIsSecret}
      onValueChange={(val) => {
        setFormIsSecret(val);
        if (val) {
          setFormIcon("lock-closed-outline");
        }
      }}
    />
  </TouchableOpacity>);
}
