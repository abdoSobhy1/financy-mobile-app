import { Transaction, WalletAccount, WalletType } from "../../../shared/types";
import {
  fromMinorUnits,
  isZeroMoney,
  normalizeMoney,
  toMinorUnits,
} from "../../../shared/utils";
import {
  getVisibleWallets,
  isSecretTransaction,
  isSecretWallet,
} from "../model/walletVisibility";

export const DEFAULT_WALLETS: WalletAccount[] = [
  {
    id: "default_cash",
    name: "Cash",
    type: "cash",
    icon: "cash-outline",
    color: "teal",
    initialBalance: 0,
    isSecret: false,
    archived: false,
    createdAt: new Date(2025, 0, 1).toISOString(),
    updatedAt: new Date(2025, 0, 1).getTime(),
    deleted: false,
    syncStatus: "pending",
  },
  {
    id: "default_bank",
    name: "Bank Account",
    type: "bank",
    icon: "business-outline",
    color: "blue",
    initialBalance: 0,
    isSecret: false,
    archived: false,
    createdAt: new Date(2025, 0, 1).toISOString(),
    updatedAt: new Date(2025, 0, 1).getTime(),
    deleted: false,
    syncStatus: "pending",
  },
  {
    id: "default_card",
    name: "Credit Card",
    type: "card",
    icon: "card-outline",
    color: "purple",
    initialBalance: 0,
    isSecret: false,
    archived: false,
    createdAt: new Date(2025, 0, 1).toISOString(),
    updatedAt: new Date(2025, 0, 1).getTime(),
    deleted: false,
    syncStatus: "pending",
  },
  {
    id: "default_wallet",
    name: "Mobile Wallet",
    type: "wallet",
    icon: "phone-portrait-outline",
    color: "orange",
    initialBalance: 0,
    isSecret: false,
    archived: false,
    createdAt: new Date(2025, 0, 1).toISOString(),
    updatedAt: new Date(2025, 0, 1).getTime(),
    deleted: false,
    syncStatus: "pending",
  },
  {
    id: "default_secret",
    name: "Secret Wallet",
    type: "cash",
    icon: "lock-closed-outline",
    color: "gray",
    initialBalance: 0,
    isSecret: true,
    archived: false,
    createdAt: new Date(2025, 0, 1).toISOString(),
    updatedAt: new Date(2025, 0, 1).getTime(),
    deleted: false,
    syncStatus: "pending",
  },
];

const getDb = async () => {
  const { db } = require("../../../infrastructure/database/repositories");
  return db;
};

const warnedUnknownAccounts = new Set<string>();

let cachedWallets: WalletAccount[] = [];

let lastAddWalletCall: { name: string; type: string; timestamp: number } | null = null;
let isAddingWallet = false;

export const walletService = {
  getCachedWallets(): WalletAccount[] {
    return cachedWallets;
  },

  setCachedWallets(wallets: WalletAccount[]): void {
    cachedWallets = wallets || [];
  },

  clearCache(): void {
    cachedWallets = [];
  },

  async refreshCache(): Promise<WalletAccount[]> {
    this.clearCache();
    return this.getWallets();
  },

  isSecretWallet(wallet?: WalletAccount | null): boolean {
    return isSecretWallet(wallet);
  },

  getSecretWalletIds(wallets: WalletAccount[]): Set<string> {
    const set = new Set<string>();
    for (const w of wallets) {
      if (this.isSecretWallet(w)) {
        set.add(w.id);
      }
    }
    return set;
  },

  getVisibleWallets(wallets: WalletAccount[]): WalletAccount[] {
    return getVisibleWallets(wallets);
  },

  isSecretTransaction(
    transaction: { accountId?: string; toAccountId?: string },
    secretWalletIds: Set<string>,
  ): boolean {
    return isSecretTransaction(transaction, secretWalletIds);
  },

  isSecretTransactionExcluded(
    transaction: { accountId?: string; toAccountId?: string; budgetId?: string },
    secretWalletIds: Set<string>,
  ): boolean {
    const isSecret = this.isSecretTransaction(transaction, secretWalletIds);
    if (!isSecret) return false;
    // If a secret wallet transaction has a budget, it affects totals (not excluded)
    return !transaction.budgetId;
  },

  async getWallets(options?: { includeArchived?: boolean }): Promise<WalletAccount[]> {
    try {
      const db = await getDb();
      const loaded = await db.wallets.getAllWallets(options);
      if (!options?.includeArchived) {
        cachedWallets = loaded;
      }
      return loaded;
    } catch (error) {
      console.warn("Failed to load wallets from SQLite:", error);
      return cachedWallets;
    }
  },

  async getWalletById(id: string): Promise<WalletAccount | null> {
    try {
      const db = await getDb();
      return await db.wallets.getWalletById(id);
    } catch (error) {
      console.warn("Failed to get wallet by ID:", error);
      return null;
    }
  },

  async saveWallets(wallets: WalletAccount[]): Promise<void> {
    const db = await getDb();
    for (const w of wallets) {
      await db.wallets.updateWallet(w.id, {
        name: w.name,
        type: w.type,
        icon: w.icon,
        color: w.color,
        initialBalance: w.initialBalance,
        isSecret: w.isSecret,
        archived: w.archived,
      });
    }
  },

  async addWallet(data: {
    name: string;
    type: WalletType;
    icon?: string;
    color?: string;
    initialBalance?: number;
    isSecret?: boolean;
    archived?: boolean;
  }): Promise<WalletAccount[]> {
    const trimmedName = data.name.trim();
    const isSecret = Boolean(data.isSecret);
    const safeType: WalletType = data.type;

    // Prevent rapid duplicate submissions for the same account name & type (within 1.5s)
    const now = Date.now();
    if (
      isAddingWallet ||
      (lastAddWalletCall &&
        now - lastAddWalletCall.timestamp < 1500 &&
        lastAddWalletCall.name.toLowerCase() === trimmedName.toLowerCase() &&
        lastAddWalletCall.type === safeType)
    ) {
      console.warn(`[walletService] Debouncing duplicate addWallet call for "${trimmedName}"`);
      return this.getWallets();
    }

    isAddingWallet = true;
    lastAddWalletCall = { name: trimmedName, type: safeType, timestamp: now };

    try {
      const initBal = normalizeMoney(data.initialBalance);
      const db = await getDb();
      const newWallet = await db.wallets.createWallet({
        name: trimmedName,
        type: safeType,
        icon: data.icon || "wallet-outline",
        color: data.color || (isSecret ? "gray" : "teal"),
        initialBalance: 0,
        isSecret,
        archived: Boolean(data.archived),
      });

      if (!isZeroMoney(initBal)) {
        await db.transactions.createTransaction({
          amount: Math.abs(initBal),
          type: initBal >= 0 ? "income" : "expense",
          description: "Balance adjustment",
          accountId: newWallet.id,
          date: new Date().toISOString(),
          updatedAt: Date.now(),
        });
      }

      return this.getWallets();
    } finally {
      isAddingWallet = false;
    }
  },

  async updateWallet(
    id: string,
    updates: Partial<Omit<WalletAccount, "id" | "createdAt">>,
  ): Promise<WalletAccount[]> {
    const db = await getDb();
    await db.wallets.updateWallet(id, updates);

    return this.getWallets();
  },

  async deleteWallet(id: string): Promise<WalletAccount[]> {
    const db = await getDb();
    await db.wallets.deleteWallet(id);
    return this.getWallets();
  },

  async archiveWallet(id: string): Promise<WalletAccount[]> {
    const db = await getDb();
    await db.wallets.archiveWallet(id);
    return this.getWallets();
  },

  async unarchiveWallet(id: string): Promise<WalletAccount[]> {
    const db = await getDb();
    await db.wallets.unarchiveWallet(id);
    return this.getWallets({ includeArchived: true });
  },

  async countTransactionsForWallet(walletId: string): Promise<number> {
    const db = await getDb();
    return await db.wallets.countTransactionsForWallet(walletId);
  },

  async reassignTransactions(
    fromWalletId: string,
    toWalletId: string,
  ): Promise<number> {
    const db = await getDb();
    return await db.wallets.reassignTransactions(fromWalletId, toWalletId);
  },

  async transferBetweenWallets(
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    budgetId?: string,
  ): Promise<WalletAccount[]> {
    const cleanAmount = normalizeMoney(amount);
    if (!fromWalletId || !toWalletId || fromWalletId === toWalletId || cleanAmount <= 0) {
      return this.getWallets();
    }

    const db = await getDb();
    const fromWallet = await db.wallets.getWalletById(fromWalletId);
    const toWallet = await db.wallets.getWalletById(toWalletId);

    if (fromWallet && toWallet) {
      await db.transactions.createTransaction({
        amount: cleanAmount,
        type: "transfer",
        accountId: fromWalletId,
        toAccountId: toWalletId,
        budgetId: budgetId || undefined,
        description: `Transfer: ${fromWallet.name} -> ${toWallet.name}`,
        date: new Date().toISOString(),
        updatedAt: Date.now(),
      });
    }

    return this.getWallets();
  },

  calculateWalletBalances(
    wallets: WalletAccount[],
    transactions: Transaction[],
    options?: { periodOnly?: boolean },
  ): Record<string, number> {
    const minorBalances: Record<string, number> = {};
    const periodOnly = options?.periodOnly ?? false;

    for (const w of wallets) {
      minorBalances[w.id] = periodOnly ? 0 : toMinorUnits(w.initialBalance);
    }

    // Default cash wallet fallback for missing or unknown account IDs
    const cashWallet =
      wallets.find((w) => w.type === "cash" && !this.isSecretWallet(w)) ||
      wallets.find((w) => w.type === "cash") ||
      wallets.find((w) => w.id === "default_cash") ||
      wallets[0];
    const fallbackCashWalletId = cashWallet?.id || "default_cash";

    if (minorBalances[fallbackCashWalletId] === undefined) {
      minorBalances[fallbackCashWalletId] = 0;
    }

    const resolveWalletId = (accountId?: string, _txId?: string): string => {
      if (accountId && minorBalances[accountId] !== undefined) {
        return accountId;
      }
      return fallbackCashWalletId;
    };

    for (const tx of transactions) {
      if (tx.deleted) continue;
      const amountMinor = toMinorUnits(tx.amount);

      if (tx.type === "transfer") {
        const fromWalletId = resolveWalletId(tx.accountId, tx.id);
        const toWalletId = resolveWalletId(tx.toAccountId, tx.id);

        if (minorBalances[fromWalletId] === undefined) {
          minorBalances[fromWalletId] = 0;
        }
        minorBalances[fromWalletId] -= amountMinor;

        if (minorBalances[toWalletId] === undefined) {
          minorBalances[toWalletId] = 0;
        }
        minorBalances[toWalletId] += amountMinor;
      } else if (tx.type === "income") {
        const walletId = resolveWalletId(tx.accountId, tx.id);

        if (minorBalances[walletId] === undefined) {
          minorBalances[walletId] = 0;
        }
        minorBalances[walletId] += amountMinor;
      } else if (tx.type === "expense" || tx.type === "debt") {
        const walletId = resolveWalletId(tx.accountId, tx.id);

        if (minorBalances[walletId] === undefined) {
          minorBalances[walletId] = 0;
        }
        minorBalances[walletId] -= amountMinor;
      }
    }

    const balances: Record<string, number> = {};
    for (const id of Object.keys(minorBalances)) {
      balances[id] = fromMinorUnits(minorBalances[id]);
    }

    return balances;
  },
};
