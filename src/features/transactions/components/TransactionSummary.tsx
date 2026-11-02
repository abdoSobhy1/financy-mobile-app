import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Category, Transaction, WalletAccount } from "../../../shared/types";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { IconChip } from "../../../shared/ui/IconChip";
import { formatCurrency } from "../../../shared/utils";
import { getTransactionPresentation } from "../model/transactionPresentation";

interface TransactionSummaryProps {
  transaction: Transaction;
  category?: Category | null;
  fromWallet?: WalletAccount | null;
  toWallet?: WalletAccount | null;
  dateLabel: string;
  secret?: boolean;
  adjustment?: boolean;
  amountLabel?: string;
  leading?: ReactNode;
}

/** Shared transaction content for dashboard previews and the selectable ledger. */
export function TransactionSummary({ transaction, category, fromWallet, toWallet, dateLabel, secret, adjustment, amountLabel, leading }: TransactionSummaryProps) {
  const { colors } = useAppTheme();
  const presentation = getTransactionPresentation(transaction, category, fromWallet, toWallet, dateLabel, secret, adjustment);
  const icon = presentation.icon in Ionicons.glyphMap ? presentation.icon as keyof typeof Ionicons.glyphMap : "receipt-outline";
  return (
    <View style={styles.row}>
      {leading || <IconChip icon={icon} color={presentation.color} size="md" style={styles.icon} />}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.onSurface }]} numberOfLines={1}>{presentation.title}</Text>
          {transaction.receiptUri && <Ionicons name="attach-outline" size={15} color={colors.primary} />}
        </View>
        <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]} numberOfLines={1}>{presentation.subtitle}</Text>
      </View>
      <Text style={[styles.amount, { color: presentation.neutral ? colors.onSurface : presentation.income ? colors.tertiary : colors.onSurface }]}>
        {amountLabel ?? `${presentation.prefix}${formatCurrency(transaction.amount)}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", flex: 1 },
  icon: { marginRight: 14 },
  content: { flex: 1, marginRight: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontSize: 15, fontWeight: "600", flexShrink: 1, marginBottom: 3 },
  subtitle: { fontSize: 12 },
  amount: { fontSize: 16, fontWeight: "700", textAlign: "right" },
});
