import { TransactionSummary } from "./TransactionSummary";
import React, { useEffect, useRef } from "react";
import { View, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Transaction } from "../../../shared/types";
import { isSecretTransaction } from "../../wallets/model/walletVisibility";

import { IconChip } from "../../../shared/ui";

import { format } from "date-fns";

export const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
export interface TransactionRowItemProps {
  tx: Transaction;
  cat: any;
  walletsMap: Record<string, any>;
  secretWalletIds: Set<string>;
  isAdjustment: boolean;
  isFirst: boolean;
  isLast: boolean;
  isOnlyOne: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
  colors: any;
  styles: any;
}
export const TransactionRowItem: React.FC<TransactionRowItemProps> = React.memo(
  ({
    tx,
    cat,
    walletsMap,
    secretWalletIds,
    isAdjustment,
    isFirst,
    isLast,
    isOnlyOne,
    isSelected,
    isSelectionMode,
    onPress,
    onLongPress,
    colors,
    styles,
  }) => {
    const anim = useRef(
      new Animated.Value(isSelectionMode && isSelected ? 1 : 0),
    ).current;

    useEffect(() => {
      Animated.timing(anim, {
        toValue: isSelectionMode && isSelected ? 1 : 0,
        duration: 180,
        useNativeDriver: false,
      }).start();
    }, [isSelected, isSelectionMode]);

    const animatedBg = anim.interpolate({
      inputRange: [0, 1],
      outputRange: ["transparent", colors.surfaceVariant],
    });

    const isIncome = tx.type === "income";
    const isTransfer = tx.type === "transfer";
    const fromWallet = tx.accountId ? walletsMap[tx.accountId] : null;
    const toWallet = tx.toAccountId ? walletsMap[tx.toAccountId] : null;

    const transferTitle =
      fromWallet?.name && toWallet?.name
        ? `${fromWallet.name} → ${toWallet.name}`
        : tx.description?.replace(/^Transfer:\s*/i, "") || "Transfer";

    const transferSubtitle =
      fromWallet?.name && toWallet?.name
        ? `${fromWallet.name} → ${toWallet.name} • ${format(new Date(tx.date), "hh:mm a")}`
        : tx.description && tx.description.includes("->")
          ? `${tx.description.replace(/^Transfer:\s*/i, "")} • ${format(new Date(tx.date), "hh:mm a")}`
          : `Transfer • ${format(new Date(tx.date), "hh:mm a")}`;

    const reconcileSubtitle = fromWallet?.name
      ? `${fromWallet.name} • Reconcile • ${format(new Date(tx.date), "hh:mm a")}`
      : `Reconcile • ${format(new Date(tx.date), "hh:mm a")}`;

    const selectedRadiusStyle = isOnlyOne
      ? { borderRadius: 18 }
      : isFirst
        ? {
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          borderBottomLeftRadius: 3,
          borderBottomRightRadius: 3,
        }
        : isLast
          ? {
            borderBottomLeftRadius: 18,
            borderBottomRightRadius: 18,
            borderTopLeftRadius: 3,
            borderTopRightRadius: 3,
          }
          : {
            borderRadius: 3,
          };

    return (
      <View key={tx.id}>
        <AnimatedTouchable
          style={[
            styles.txRow,
            { backgroundColor: animatedBg },
            selectedRadiusStyle,
          ]}
          onPress={onPress}
          onLongPress={onLongPress}
          activeOpacity={0.7}>
          <TransactionSummary transaction={tx} category={cat} fromWallet={fromWallet} toWallet={toWallet} dateLabel={format(new Date(tx.date), "hh:mm a")} secret={isSecretTransaction(tx, secretWalletIds)} adjustment={isAdjustment} leading={<View
            style={{
              width: 44,
              height: 44,
              marginRight: 14,
              justifyContent: "center",
              alignItems: "center",
            }}>
            <Animated.View
              style={{
                position: "absolute",
                opacity: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
              }}>
              <IconChip
                icon={
                  (isTransfer
                    ? "swap-horizontal-outline"
                    : isAdjustment
                      ? "wallet-outline"
                      : cat?.icon || "receipt-outline") as React.ComponentProps<typeof Ionicons>["name"]
                }
                color={
                  isTransfer
                    ? colors.onSurfaceVariant
                    : isAdjustment
                      ? "teal"
                      : cat?.color || colors.primary
                }
                size="md"
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.iconBadge,
                {
                  position: "absolute",
                  marginRight: 0,
                  backgroundColor: colors.primary,
                  opacity: anim,
                  transform: [
                    {
                      scale: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.65, 1],
                      }),
                    },
                  ],
                },
              ]}
              pointerEvents={isSelected ? "auto" : "none"}>
              <Ionicons name="checkmark" size={22} color={colors.onPrimary} />
            </Animated.View>
          </View>} />
        </AnimatedTouchable>
        {!isLast && <View style={styles.separator} />}
      </View>
    );
  },
);
