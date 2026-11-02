import type { WalletAccount } from "../../../shared/types";
import { styles } from "../screens/AddTransactionScreen.styles";
import { useAddTransactionScreen } from "../hooks/useAddTransactionScreen";

import { View, ScrollView, Text, TouchableOpacity } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";

import { isSecretWallet } from "../../wallets/model/walletVisibility";

interface TransactionWalletPickerProps {
  showKeypad: ReturnType<typeof useAddTransactionScreen>["showKeypad"];
  setShowKeypad: ReturnType<typeof useAddTransactionScreen>["setShowKeypad"];
  displayWallets: WalletAccount[];
  accountId: ReturnType<typeof useAddTransactionScreen>["accountId"];
  setAccountId: ReturnType<typeof useAddTransactionScreen>["setAccountId"];

}
export function TransactionWalletPicker({ showKeypad, setShowKeypad, displayWallets, accountId, setAccountId }: TransactionWalletPickerProps) {
  const { typography, colors, spacing } = useAppTheme();

  return (<>
    <Text
      style={[
        typography.label,
        {
          color: colors.onSurfaceVariant,
          marginBottom: spacing.sm,
          textTransform: "uppercase",
          letterSpacing: 0.8,
        },
      ]}>
      Account / Wallet
    </Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      style={{ flexGrow: 0 }}
      onScrollBeginDrag={() => {
        if (showKeypad) setShowKeypad(false);
      }}
      contentContainerStyle={{
        gap: spacing.sm,
        marginBottom: spacing.lg,
      }}>
      {displayWallets.map((w) => {
        const isSelected = w.id === accountId;
        const isSecret = isSecretWallet(w);
        return (
          <TouchableOpacity
            key={w.id}
            onPress={() => {
              if (showKeypad) setShowKeypad(false);
              setAccountId(w.id);
            }}
            style={[
              styles.categoryChip,
              {
                backgroundColor: isSelected
                  ? colors.primaryContainer
                  : colors.surfaceVariant,
                borderColor: isSelected
                  ? isSecret
                    ? colors.error
                    : colors.primaryContainer
                  : isSecret
                    ? "rgba(239, 68, 68, 0.4)"
                    : colors.outlineVariant,
                borderWidth: isSecret ? 1.5 : 1,
              },
            ]}>
            <Ionicons
              name={
                (w.icon ||
                  (isSecret ? "lock-closed-outline" : "wallet-outline")) as any
              }
              size={18}
              color={
                isSelected
                  ? colors.onPrimaryContainer
                  : isSecret
                    ? colors.error
                    : colors.primary
              }
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                typography.bodyMedium,
                {
                  color: isSelected
                    ? colors.onPrimaryContainer
                    : colors.onBackground,
                  fontWeight: isSelected ? "700" : "500",
                },
              ]}>
              {w.name} {isSecret ? "🔒" : ""}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
    {isSecretWallet(
      displayWallets.find((w) => w.id === accountId),
    ) && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: "rgba(239, 68, 68, 0.12)",
            padding: spacing.sm,
            borderRadius: 12,
            marginBottom: spacing.md,
            borderWidth: 1,
            borderColor: "rgba(239, 68, 68, 0.25)",
          }}>
          <Ionicons name="lock-closed" size={16} color={colors.error} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: colors.error,
              flex: 1,
            }}>
            Secret Wallet: Money added or spent here will not show up in totals unless assigned to a budget.
          </Text>
        </View>
      )}
  </>);
}
