import { useDashboardScreen } from "../hooks/useDashboardScreen";

import { View, Text, ScrollView, TouchableOpacity } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";

import { IconChip } from "../../../shared/ui/IconChip";

interface DashboardWalletsSectionProps {
  navigation: ReturnType<typeof useDashboardScreen>["navigation"];
  openAddWalletModal: ReturnType<typeof useDashboardScreen>["openAddWalletModal"];
  handleOpenTransferModal: ReturnType<typeof useDashboardScreen>["handleOpenTransferModal"];
  visibleWallets: ReturnType<typeof useDashboardScreen>["visibleWallets"];
  walletBalances: ReturnType<typeof useDashboardScreen>["walletBalances"];
  maskCurrency: ReturnType<typeof useDashboardScreen>["maskCurrency"];

}
export function DashboardWalletsSection({ navigation, openAddWalletModal, handleOpenTransferModal, visibleWallets, walletBalances, maskCurrency }: DashboardWalletsSectionProps) {
  const { spacing, typography, colors } = useAppTheme();

  return (<View style={{ marginBottom: spacing.xl }}>
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.sm,
      }}>
      <TouchableOpacity
        onPress={() =>
          (navigation as any).navigate("Settings", {
            screen: "WalletManagement",
          })
        }
        style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text
          style={[
            typography.h3,
            {
              color: colors.onBackground,
              fontSize: 14,
              textTransform: "uppercase",
            },
          ]}>
          WALLETS & ACCOUNTS
        </Text>
        <Ionicons
          name="chevron-forward"
          size={14}
          color={colors.onSurfaceVariant}
        />
      </TouchableOpacity>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <TouchableOpacity
          onPress={openAddWalletModal}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: colors.primaryContainer,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 12,
          }}>
          <Ionicons name="add" size={15} color={colors.onPrimaryContainer} />
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.onPrimaryContainer }}>
            Add
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleOpenTransferModal()}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: colors.surface,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.outlineVariant,
          }}>
          <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
            Transfer
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            (navigation as any).navigate("Settings", {
              screen: "WalletManagement",
            })
          }
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: colors.surface,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.outlineVariant,
          }}>
          <Ionicons name="settings-outline" size={14} color={colors.primary} />
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
            Manage
          </Text>
        </TouchableOpacity>
      </View>
    </View>

    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
      }}>
      {visibleWallets.map((w) => {
        const bal = walletBalances[w.id] || 0;
        return (
          <TouchableOpacity
            key={w.id}
            onPress={() =>
              (navigation as any).navigate("Settings", {
                screen: "WalletManagement",
              })
            }
            activeOpacity={0.7}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 12,
              minWidth: 145,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              borderWidth: 1,
              borderColor: colors.outlineVariant,
            }}>
            <IconChip
              iconName={(w.icon || "wallet-outline") as any}
              colorName={(w.color as any) || "teal"}
              size={38}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: colors.onSurfaceVariant,
                }}
                numberOfLines={1}>
                {w.name}
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: colors.onBackground,
                  marginTop: 2,
                }}
                numberOfLines={1}>
                {maskCurrency(bal)}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Instant Add New Wallet / Account Card */}
      <TouchableOpacity
        onPress={openAddWalletModal}
        activeOpacity={0.7}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 20,
          paddingHorizontal: 14,
          paddingVertical: 12,
          minWidth: 135,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: colors.primary,
        }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: colors.primaryContainer,
            alignItems: "center",
            justifyContent: "center",
          }}>
          <Ionicons name="add" size={20} color={colors.onPrimaryContainer} />
        </View>
        <View>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: colors.primary,
            }}>
            New Account
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: colors.onSurfaceVariant,
              marginTop: 1,
            }}>
            Instant create
          </Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  </View>);
}
