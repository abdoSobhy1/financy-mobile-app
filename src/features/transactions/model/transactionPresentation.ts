import type { Category, Transaction, WalletAccount } from "../../../shared/types";

export function getTransactionPresentation(
  transaction: Transaction,
  category: Category | null | undefined,
  fromWallet: WalletAccount | null | undefined,
  toWallet: WalletAccount | null | undefined,
  dateLabel: string,
  secret = false,
  adjustment = transaction.description === "Balance adjustment",
) {
  const transfer = transaction.type === "transfer";
  const income = transaction.type === "income";
  const walletPair = fromWallet?.name && toWallet?.name
    ? `${fromWallet.name} → ${toWallet.name}` : undefined;
  const transferLabel = walletPair || transaction.description?.replace(/^Transfer:\s*/i, "") || "Transfer";
  const title = transfer ? transaction.description || transferLabel
    : adjustment ? "Balance adjustment" : transaction.description || category?.name || "Transaction";
  const detail = transfer ? transferLabel
    : adjustment ? `${fromWallet?.name ? fromWallet.name + " • " : ""}Reconcile`
      : category?.name || "Uncategorized";

  return {
    title,
    subtitle: `${detail} • ${dateLabel}${secret ? " • 🔒 Secret" : ""}`,
    icon: transfer ? "swap-horizontal-outline" : adjustment ? "wallet-outline" : category?.icon || "receipt-outline",
    color: transfer ? "bluegrey" : adjustment ? "teal" : category?.color || "bluegrey",
    neutral: transfer || adjustment,
    income,
    prefix: transfer || adjustment ? "" : income ? "+" : "-",
  };
}
