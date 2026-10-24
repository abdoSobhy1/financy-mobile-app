import { Transaction, WalletAccount, WalletType } from "../types";

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
  const { db } = await import("../database/queries");
  return db;
};

const warnedUnknownAccounts = new Set<string>();

let cachedWallets: WalletAccount[] = [...DEFAULT_WALLETS];

export const walletService = {
  getCachedWallets(): WalletAccount[] {
    return cachedWallets.length > 0 ? cachedWallets : DEFAULT_WALLETS;
  },

  setCachedWallets(wallets: WalletAccount[]): void {
    if (wallets && wallets.length > 0) {
      cachedWallets = wallets;
    }
  },

  isSecretWallet(wallet?: WalletAccount | null): boolean {
    if (!wallet) return false;
    return Boolean(wallet.isSecret || (wallet as any).type === "secret");
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
    return wallets.filter((w) => !this.isSecretWallet(w) && !w.archived);
  },

  isSecretTransaction(
    transaction: { accountId?: string; toAccountId?: string },
    secretWalletIds: Set<string>,
  ): boolean {
    if (transaction.accountId && secretWalletIds.has(transaction.accountId)) return true;
    if (transaction.toAccountId && secretWalletIds.has(transaction.toAccountId)) return true;
    return false;
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
      if (loaded && loaded.length > 0) {
        if (!options?.includeArchived) {
          cachedWallets = loaded;
        }
        return loaded;
      }
      return cachedWallets.length > 0 ? cachedWallets : DEFAULT_WALLETS;
    } catch (error) {
      console.warn("Failed to load wallets from SQLite:", error);
      return cachedWallets.length > 0 ? cachedWallets : DEFAULT_WALLETS;
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
    const isSecret = Boolean(data.isSecret || (data.type as any) === "secret");
    const safeType: WalletType =
      (data.type as any) === "secret" ? "cash" : data.type;

    const db = await getDb();
    await db.wallets.createWallet({
      name: data.name.trim(),
      type: safeType,
      icon: data.icon || "wallet-outline",
      color: data.color || (isSecret ? "gray" : "teal"),
      initialBalance: Number(data.initialBalance) || 0,
      isSecret,
      archived: Boolean(data.archived),
    });

    return this.getWallets();
  },

  async updateWallet(
    id: string,
    updates: Partial<Omit<WalletAccount, "id" | "createdAt">>,
  ): Promise<WalletAccount[]> {
    const isSecret =
      updates.isSecret !== undefined
        ? updates.isSecret
        : (updates.type as any) === "secret"
        ? true
        : undefined;

    const safeType: WalletType | undefined =
      (updates.type as any) === "secret"
        ? "cash"
        : updates.type;

    const db = await getDb();
    await db.wallets.updateWallet(id, {
      ...updates,
      ...(safeType ? { type: safeType } : {}),
      ...(isSecret !== undefined ? { isSecret } : {}),
    });

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
    if (!fromWalletId || !toWalletId || fromWalletId === toWalletId || amount <= 0) {
      return this.getWallets();
    }

    const db = await getDb();
    const fromWallet = await db.wallets.getWalletById(fromWalletId);
    const toWallet = await db.wallets.getWalletById(toWalletId);

    if (fromWallet && toWallet) {
      await db.transactions.createTransaction({
        amount,
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
    const balances: Record<string, number> = {};
    const periodOnly = options?.periodOnly ?? false;

    for (const w of wallets) {
      balances[w.id] = periodOnly ? 0 : (w.initialBalance || 0);
    }

    // Default cash wallet fallback for missing or unknown account IDs
    const cashWallet =
      wallets.find((w) => w.type === "cash" && !this.isSecretWallet(w)) ||
      wallets.find((w) => w.type === "cash") ||
      wallets.find((w) => w.id === "default_cash") ||
      wallets[0];
    const fallbackCashWalletId = cashWallet?.id || "default_cash";

    if (balances[fallbackCashWalletId] === undefined) {
      balances[fallbackCashWalletId] = 0;
    }

    const resolveWalletId = (accountId?: string, _txId?: string): string => {
      if (accountId && balances[accountId] !== undefined) {
        return accountId;
      }
      return fallbackCashWalletId;
    };

    for (const tx of transactions) {
      if (tx.deleted) continue;

      if (tx.type === "transfer") {
        const fromWalletId = resolveWalletId(tx.accountId, tx.id);
        const toWalletId = resolveWalletId(tx.toAccountId, tx.id);

        if (balances[fromWalletId] === undefined) {
          balances[fromWalletId] = 0;
        }
        balances[fromWalletId] -= tx.amount;

        if (balances[toWalletId] === undefined) {
          balances[toWalletId] = 0;
        }
        balances[toWalletId] += tx.amount;
      } else if (tx.type === "income") {
        const walletId = resolveWalletId(tx.accountId, tx.id);

        if (balances[walletId] === undefined) {
          balances[walletId] = 0;
        }
        balances[walletId] += tx.amount;
      } else if (tx.type === "expense" || tx.type === "debt") {
        const walletId = resolveWalletId(tx.accountId, tx.id);

        if (balances[walletId] === undefined) {
          balances[walletId] = 0;
        }
        balances[walletId] -= tx.amount;
      }
    }

    return balances;
  },
};
