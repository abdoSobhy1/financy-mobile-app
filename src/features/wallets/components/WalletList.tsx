import { styles } from "../screens/WalletManagementScreen.styles";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import type { useWalletManagementScreen } from "../hooks/useWalletManagementScreen";

import { View, Text, TouchableOpacity } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { isSecretWallet } from "../model/walletVisibility";

import { IconChip } from "../../../shared/ui/IconChip";

import { formatCurrency } from "../../../shared/utils";

interface WalletListProps {
  filteredWallets: ReturnType<typeof useWalletManagementScreen>["filteredWallets"];
  walletBalances: ReturnType<typeof useWalletManagementScreen>["walletBalances"];
  openEditModal: ReturnType<typeof useWalletManagementScreen>["openEditModal"];
  handleUnarchiveWallet: ReturnType<typeof useWalletManagementScreen>["handleUnarchiveWallet"];
  handleDeleteWallet: ReturnType<typeof useWalletManagementScreen>["handleDeleteWallet"];
  openAddModal: ReturnType<typeof useWalletManagementScreen>["openAddModal"];

}
export function WalletList({ filteredWallets, walletBalances, openEditModal, handleUnarchiveWallet, handleDeleteWallet, openAddModal }: WalletListProps) {
  const { colors, typography } = useAppTheme();

  return (<View style={{ gap: 10 }}>
    {filteredWallets.map((wallet) => {
      const bal = walletBalances[wallet.id] || 0;
      const isSecret = isSecretWallet(wallet);
      return (
        <TouchableOpacity
          key={wallet.id}
          style={[
            styles.walletRow,
            {
              backgroundColor: colors.surface,
              borderColor: isSecret ? colors.error : colors.outlineVariant,
              borderWidth: isSecret ? 1.5 : 1,
            },
          ]}
          onPress={() => openEditModal(wallet)}
          activeOpacity={0.75}>
          <IconChip
            iconName={
              (wallet.icon ||
                (isSecret ? "lock-closed-outline" : "wallet-outline")) as any
            }
            colorName={(wallet.color as any) || (isSecret ? "gray" : "teal")}
            size={40}
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text
                style={[
                  typography.label,
                  { color: colors.onBackground, fontSize: 15 },
                ]}>
                {wallet.name}
              </Text>
              {isSecret && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                    backgroundColor: "rgba(239, 68, 68, 0.15)",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 6,
                  }}>
                  <Ionicons
                    name="lock-closed"
                    size={10}
                    color={colors.error}
                  />
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "700",
                      color: colors.error,
                    }}>
                    Secret · Excluded
                  </Text>
                </View>
              )}
              {Boolean(wallet.archived) && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                    backgroundColor: colors.surfaceVariant,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 6,
                  }}>
                  <Ionicons
                    name="archive-outline"
                    size={10}
                    color={colors.onSurfaceVariant}
                  />
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "700",
                      color: colors.onSurfaceVariant,
                    }}>
                    Archived
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={{
                fontSize: 12,
                textTransform: "capitalize",
                color: colors.onSurfaceVariant,
              }}>
              {wallet.type} · Initial: {formatCurrency(wallet.initialBalance || 0)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", marginRight: 8 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "800",
                color: colors.onBackground,
              }}>
              {formatCurrency(bal)}
            </Text>
          </View>
          {wallet.archived ? (
            <TouchableOpacity
              onPress={() => handleUnarchiveWallet(wallet)}
              style={{ padding: 6 }}>
              <Ionicons
                name="arrow-undo-outline"
                size={18}
                color={colors.primary}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => handleDeleteWallet(wallet)}
              style={{ padding: 6 }}>
              <Ionicons
                name="trash-outline"
                size={18}
                color={colors.error}
              />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      );
    })}

    <TouchableOpacity
      style={[
        styles.walletAddRow,
        {
          backgroundColor: colors.surface,
          borderColor: colors.outlineVariant,
        },
      ]}
      onPress={openAddModal}
      activeOpacity={0.7}>
      <Ionicons
        name="add-circle-outline"
        size={22}
        color={colors.primary}
      />
      <Text
        style={[
          typography.label,
          { color: colors.primary, fontWeight: "700" },
        ]}>
        Add New Account
      </Text>
    </TouchableOpacity>
  </View>);
}
