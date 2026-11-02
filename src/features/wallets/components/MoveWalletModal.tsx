import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { useWalletManagementScreen } from "../hooks/useWalletManagementScreen";

import { View, Text, TouchableOpacity, Modal } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { ToastOverlay } from "../../../shared/ui";

interface MoveWalletModalProps {
  showMoveModal: ReturnType<typeof useWalletManagementScreen>["showMoveModal"];
  setShowMoveModal: ReturnType<typeof useWalletManagementScreen>["setShowMoveModal"];
  walletToMove: ReturnType<typeof useWalletManagementScreen>["walletToMove"];
  wallets: ReturnType<typeof useWalletManagementScreen>["wallets"];
  destinationWalletId: ReturnType<typeof useWalletManagementScreen>["destinationWalletId"];
  setDestinationWalletId: ReturnType<typeof useWalletManagementScreen>["setDestinationWalletId"];
  handleMoveAndDeleteWallet: ReturnType<typeof useWalletManagementScreen>["handleMoveAndDeleteWallet"];

}
export function MoveWalletModal({ showMoveModal, setShowMoveModal, walletToMove, wallets, destinationWalletId, setDestinationWalletId, handleMoveAndDeleteWallet }: MoveWalletModalProps) {
  const { spacing, colors, typography } = useAppTheme();

  return (<Modal
    visible={showMoveModal}
    transparent
    animationType="fade"
    onRequestClose={() => setShowMoveModal(false)}>
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.lg,
      }}>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 20,
          padding: spacing.lg,
          width: "100%",
          maxWidth: 400,
          borderWidth: 1,
          borderColor: colors.outlineVariant,
        }}>
        <Text
          style={[
            typography.h3,
            { color: colors.onSurface, fontWeight: "700", marginBottom: 8 },
          ]}>
          Move Transactions
        </Text>
        <Text
          style={[
            typography.bodyMedium,
            { color: colors.onSurfaceVariant, marginBottom: spacing.md },
          ]}>
          Select the active wallet to receive all transactions from "{walletToMove?.name}" before deleting it:
        </Text>
        <View style={{ gap: 8, marginBottom: spacing.lg }}>
          {wallets
            .filter((w) => w.id !== walletToMove?.id && !w.archived)
            .map((w) => {
              const selected = destinationWalletId === w.id;
              return (
                <TouchableOpacity
                  key={w.id}
                  onPress={() => setDestinationWalletId(w.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: selected
                      ? colors.primaryContainer
                      : colors.surfaceVariant,
                  }}>
                  <Text
                    style={{
                      fontWeight: "600",
                      color: selected
                        ? colors.onPrimaryContainer
                        : colors.onSurface,
                    }}>
                    {w.name}
                  </Text>
                  {selected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: "center",
              backgroundColor: colors.surfaceVariant,
            }}
            onPress={() => setShowMoveModal(false)}>
            <Text style={{ fontWeight: "700", color: colors.onSurface }}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: "center",
              backgroundColor: colors.error,
            }}
            onPress={handleMoveAndDeleteWallet}>
            <Text style={{ fontWeight: "700", color: "#FFFFFF" }}>
              Move & Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
    <ToastOverlay visible={showMoveModal} priority={1} />
  </Modal>);
}
