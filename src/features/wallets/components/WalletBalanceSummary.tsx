import { getAlphaColor } from "../../../shared/utils/colors";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { useWalletManagementScreen } from "../hooks/useWalletManagementScreen";

import { View, Text, TouchableOpacity } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { Card } from "../../../shared/ui";

import { formatCurrency } from "../../../shared/utils";

interface WalletBalanceSummaryProps {
  wallets: ReturnType<typeof useWalletManagementScreen>["wallets"];
  totalNetWorth: ReturnType<typeof useWalletManagementScreen>["totalNetWorth"];
  handleOpenTransfer: ReturnType<typeof useWalletManagementScreen>["handleOpenTransfer"];
  openAddModal: ReturnType<typeof useWalletManagementScreen>["openAddModal"];

}
export function WalletBalanceSummary({ wallets, totalNetWorth, handleOpenTransfer, openAddModal }: WalletBalanceSummaryProps) {
  const { colors, spacing, typography, isDark } = useAppTheme();

  return (<Card
    variant="default"
    style={{
      backgroundColor: colors.primaryContainer,
      borderRadius: 28,
      padding: spacing.xl,
      marginBottom: spacing.lg,
    }}>
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.xs,
      }}>
      <Text
        style={[
          typography.label,
          {
            color: colors.onPrimaryContainer,
            textTransform: "uppercase",
            letterSpacing: 1,
            opacity: 0.8,
          },
        ]}>
        TOTAL BALANCE
      </Text>
      <View
        style={{
          backgroundColor: isDark ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.75)",
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 12,
          borderWidth: isDark ? 0 : 1,
          borderColor: isDark ? "transparent" : getAlphaColor(colors.onPrimaryContainer, "1F"),
        }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: colors.onPrimaryContainer,
          }}>
          {wallets.length} Accounts
        </Text>
      </View>
    </View>
    <Text
      style={[
        typography.h1,
        {
          color: colors.onPrimaryContainer,
          fontSize: 34,
          fontWeight: "900",
          marginBottom: spacing.md,
        },
      ]}>
      {formatCurrency(totalNetWorth)}
    </Text>

    {/* Transfer & Add Action Buttons inside Header Card */}
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      <TouchableOpacity
        onPress={() => handleOpenTransfer()}
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          backgroundColor: colors.primary,
          paddingVertical: 10,
          borderRadius: 16,
        }}>
        <Ionicons name="swap-horizontal" size={18} color={colors.onPrimary} />
        <Text
          style={{
            color: colors.onPrimary,
            fontWeight: "700",
            fontSize: 14,
          }}>
          Transfer
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={openAddModal}
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          backgroundColor: isDark ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.75)",
          paddingVertical: 10,
          borderRadius: 16,
          borderWidth: isDark ? 0 : 1,
          borderColor: isDark ? "transparent" : getAlphaColor(colors.onPrimaryContainer, "1F"),
        }}>
        <Ionicons
          name="add-circle-outline"
          size={18}
          color={colors.onPrimaryContainer}
        />
        <Text
          style={{
            color: colors.onPrimaryContainer,
            fontWeight: "700",
            fontSize: 14,
          }}>
          New Account
        </Text>
      </TouchableOpacity>
    </View>
  </Card>);
}
