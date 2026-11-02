import type { Transaction, WalletAccount } from "../../../shared/types";

export function isSecretWallet(wallet?: WalletAccount | null): boolean {
  if (!wallet) return false;
  return Boolean(wallet.isSecret || (wallet as any).type === "secret");
}

export function getVisibleWallets(wallets: WalletAccount[]): WalletAccount[] {
  return wallets.filter((wallet) => !isSecretWallet(wallet) && !wallet.archived);
}

export function isSecretTransaction(
  transaction: Pick<Transaction, "accountId" | "toAccountId">,
  secretWalletIds: Set<string>,
): boolean {
  if (transaction.accountId && secretWalletIds.has(transaction.accountId)) return true;
  if (transaction.toAccountId && secretWalletIds.has(transaction.toAccountId)) return true;
  return false;
}
