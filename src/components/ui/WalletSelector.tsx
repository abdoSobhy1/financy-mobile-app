import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../constants";
import { Wallet } from "../../types";

interface WalletSelectorProps {
  wallets: Wallet[];
  selectedWalletId?: string;
  onWalletSelect: (walletId: string | undefined) => void;
  label?: string;
  error?: string;
  showNoneOption?: boolean;
}

export const WalletSelector: React.FC<WalletSelectorProps> = ({
  wallets,
  selectedWalletId,
  onWalletSelect,
  label = "Wallet",
  error,
  showNoneOption = true,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}>
        <View style={styles.chipsContainer}>
          {showNoneOption && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onWalletSelect(undefined)}>
              {!selectedWalletId ? (
                <LinearGradient
                  colors={[UI.COLORS.PRIMARY, UI.COLORS.PRIMARY_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.chip, styles.chipActive]}>
                  <Text style={styles.chipTextActive}>None</Text>
                </LinearGradient>
              ) : (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>None</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {wallets.map((wallet) => {
            const isActive = selectedWalletId === wallet.id;
            return (
              <TouchableOpacity
                key={wallet.id}
                activeOpacity={0.7}
                onPress={() => onWalletSelect(wallet.id)}>
                {isActive ? (
                  <LinearGradient
                    colors={[UI.COLORS.PRIMARY, UI.COLORS.PRIMARY_DARK]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.chip, styles.chipActive]}>
                    <View
                      style={[
                        styles.colorDot,
                        styles.colorDotActive,
                        { backgroundColor: wallet.color || "#10B981" },
                      ]}
                    />
                    <Text style={styles.chipTextActive}>{wallet.name}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.chip}>
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: wallet.color || "#10B981" },
                      ]}
                    />
                    <Text style={styles.chipText}>{wallet.name}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: UI.SPACING.MD,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_SECONDARY,
    marginBottom: UI.SPACING.SM,
  },
  scroll: {
    marginHorizontal: -UI.SPACING.MD,
    paddingHorizontal: UI.SPACING.MD,
  },
  chipsContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginRight: 8,
  },
  chipActive: {
    borderColor: UI.COLORS.PRIMARY_LIGHT,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  colorDotActive: {
    borderWidth: 1,
    borderColor: "#fff",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
    color: UI.COLORS.TEXT_SECONDARY,
  },
  chipTextActive: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  errorText: {
    fontSize: 12,
    color: UI.COLORS.ERROR,
    marginTop: 4,
  },
});
