import { TransactionSummary } from "../../transactions/components/TransactionSummary";
import { styles } from "./DashboardSections.styles";
import type { DashboardScreenController } from "../hooks/useDashboardScreen";

import { View, Text, TouchableOpacity } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { formatDate } from "../../../shared/utils";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";

interface DashboardRecentTransactionsProps {
  navigation: DashboardScreenController["navigation"];
  recentTransactions: DashboardScreenController["recentTransactions"];
  categoriesMap: DashboardScreenController["categoriesMap"];
  wallets: DashboardScreenController["wallets"];
  handleTransactionPress: DashboardScreenController["handleTransactionPress"];
  maskCurrency: DashboardScreenController["maskCurrency"];
  handleMorePress: DashboardScreenController["handleMorePress"];

}
export function DashboardRecentTransactions({ navigation, recentTransactions, categoriesMap, wallets, handleTransactionPress, maskCurrency, handleMorePress }: DashboardRecentTransactionsProps) {
  const { colors, spacing, typography } = useAppTheme();

  return (<View
    style={{
      backgroundColor: colors.surface,
      borderRadius: 32,
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      marginHorizontal: spacing.lg,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
    }}>
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.xl,
      }}>
      <Text style={[typography.h2, { color: colors.onBackground }]}>
        Transactions
      </Text>
      <TouchableOpacity
        onPress={() => navigation.navigate("TransactionList" as any)}>
        <Text
          style={[
            typography.bodySmall,
            { color: colors.primary, fontWeight: "bold" },
          ]}>
          View All
        </Text>
      </TouchableOpacity>
    </View>

    <View style={{ gap: spacing.md }}>
      {recentTransactions.map((tx) => (
        <TouchableOpacity key={tx.id} onPress={() => handleTransactionPress(tx)} activeOpacity={0.7} style={{ paddingVertical: 4 }}>
          <TransactionSummary transaction={tx} category={tx.categoryId ? categoriesMap[tx.categoryId] : undefined}
            fromWallet={wallets.find(w => w.id === tx.accountId)} toWallet={wallets.find(w => w.id === tx.toAccountId)}
            dateLabel={formatDate(tx.date)} amountLabel={maskCurrency(tx.amount, tx.type === "transfer" || tx.description === "Balance adjustment" ? "" : tx.type === "income" ? "+" : "-")} />
        </TouchableOpacity>
      ))}

      {recentTransactions.length === 0 && (
        <View style={styles.emptyTransactionsWrap}>
          <View
            style={[
              styles.emptyTransactionsIcon,
              { backgroundColor: colors.surfaceVariant },
            ]}>
            <Ionicons
              name="receipt-outline"
              size={28}
              color={colors.onSurfaceVariant}
            />
          </View>
          <Text
            style={[
              typography.label,
              { color: colors.onBackground, fontSize: 15, marginBottom: 4 },
            ]}>
            No recent transactions
          </Text>
          <Text
            style={[
              typography.bodySmall,
              {
                color: colors.onSurfaceVariant,
                textAlign: "center",
                marginBottom: spacing.md,
              },
            ]}>
            Tap a Quick Add category above or add your first entry.
          </Text>
          <TouchableOpacity
            onPress={handleMorePress}
            activeOpacity={0.8}
            style={[
              styles.emptyAddButton,
              { backgroundColor: colors.primaryContainer },
            ]}>
            <Ionicons
              name="add"
              size={16}
              color={colors.onPrimaryContainer}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: colors.onPrimaryContainer,
              }}>
              Add Transaction
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  </View>);
}
