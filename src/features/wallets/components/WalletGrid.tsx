import { CARD_MARGIN } from "../screens/WalletManagementScreen.styles";
import { styles } from "../screens/WalletManagementScreen.styles";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { useWalletManagementScreen } from "../hooks/useWalletManagementScreen";

import { View, Text, TouchableOpacity } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { isSecretWallet } from "../model/walletVisibility";

import { IconChip } from "../../../shared/ui/IconChip";

import { formatCurrency } from "../../../shared/utils";

interface WalletGridProps {
  filteredWallets: ReturnType<typeof useWalletManagementScreen>["filteredWallets"];
  walletBalances: ReturnType<typeof useWalletManagementScreen>["walletBalances"];
  openEditModal: ReturnType<typeof useWalletManagementScreen>["openEditModal"];
  handleUnarchiveWallet: ReturnType<typeof useWalletManagementScreen>["handleUnarchiveWallet"];
  handleOpenTransfer: ReturnType<typeof useWalletManagementScreen>["handleOpenTransfer"];
  handleDeleteWallet: ReturnType<typeof useWalletManagementScreen>["handleDeleteWallet"];
  openAddModal: ReturnType<typeof useWalletManagementScreen>["openAddModal"];

}
export function WalletGrid({ filteredWallets, walletBalances, openEditModal, handleUnarchiveWallet, handleOpenTransfer, handleDeleteWallet, openAddModal }: WalletGridProps) {
  const { colors, typography } = useAppTheme();

  return (<View
    style={{
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: -CARD_MARGIN,
    }}>
    {filteredWallets.map((wallet) => {
      const bal = walletBalances[wallet.id] || 0;
      const isSecret = isSecretWallet(wallet);
      return (
        <TouchableOpacity
          key={wallet.id}
          style={[
            styles.walletCard,
            {
              backgroundColor: colors.surface,
              borderColor: isSecret ? colors.error : colors.outlineVariant,
              borderWidth: isSecret ? 1.5 : 1,
            },
          ]}
          onPress={() => openEditModal(wallet)}
          activeOpacity={0.75}>
          <View style={{ alignItems: "center", marginBottom: 10 }}>
            <IconChip
              iconName={
                (wallet.icon ||
                  (isSecret ? "lock-closed-outline" : "wallet-outline")) as any
              }
              colorName={(wallet.color as any) || (isSecret ? "gray" : "teal")}
              size={48}
            />
          </View>
          <Text
            style={[
              typography.label,
              {
                color: colors.onBackground,
                textAlign: "center",
                fontSize: 15,
                fontWeight: "700",
              },
            ]}
            numberOfLines={1}>
            {wallet.name}
          </Text>
          <Text
            style={{
              fontSize: 11,
              textTransform: "capitalize",
              color: colors.onSurfaceVariant,
              marginTop: 2,
            }}>
            {wallet.type}
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
                marginTop: 4,
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
                marginTop: 4,
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
          <Text
            style={{
              fontSize: 16,
              fontWeight: "800",
              color: colors.onBackground,
              marginTop: 8,
            }}
            numberOfLines={1}>
            {formatCurrency(bal)}
          </Text>

          {/* Actions Row */}
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              marginTop: 12,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: colors.outlineVariant,
            }}>
            {wallet.archived ? (
              <TouchableOpacity
                onPress={() => handleUnarchiveWallet(wallet)}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons
                  name="arrow-undo-outline"
                  size={16}
                  color={colors.primary}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: colors.primary,
                  }}>
                  Restore
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => openEditModal(wallet)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons
                    name="pencil-outline"
                    size={16}
                    color={colors.primary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleOpenTransfer(wallet.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons
                    name="swap-horizontal"
                    size={16}
                    color={colors.primary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteWallet(wallet)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={colors.error}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      );
    })}

    {/* Quick Add Card */}
    <TouchableOpacity
      style={[
        styles.addCard,
        {
          borderColor: colors.outlineVariant,
          backgroundColor: colors.surface,
        },
      ]}
      onPress={openAddModal}
      activeOpacity={0.7}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.primaryContainer,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}>
        <Ionicons name="add" size={26} color={colors.onPrimaryContainer} />
      </View>
      <Text
        style={[
          typography.label,
          { color: colors.primary, fontWeight: "700" },
        ]}>
        Add Account
      </Text>
    </TouchableOpacity>
  </View>);
}
