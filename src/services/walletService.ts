import AsyncStorage from "@react-native-async-storage/async-storage";
import { Transaction, WalletAccount, WalletType } from "../types";

const WALLETS_STORAGE_KEY = "financy_wallets_v1";

export const DEFAULT_WALLETS: WalletAccount[] = [
  {
    id: "default_cash",
    name: "Cash",
    type: "cash",
    icon: "cash-outline",
    color: "teal",
    initialBalance: 0,
    createdAt: new Date(2025, 0, 1).toISOString(),
  },
  {
    id: "default_bank",
    name: "Bank Account",
    type: "bank",
    icon: "business-outline",
    color: "blue",
    initialBalance: 0,
    createdAt: new Date(2025, 0, 1).toISOString(),
  },
  {
    id: "default_card",
    name: "Credit Card",
    type: "card",
    icon: "card-outline",
    color: "purple",
    initialBalance: 0,
    createdAt: new Date(2025, 0, 1).toISOString(),
  },
  {
    id: "default_wallet",
    name: "Mobile Wallet",
    type: "wallet",
    icon: "phone-portrait-outline",
    color: "orange",
    initialBalance: 0,
    createdAt: new Date(2025, 0, 1).toISOString(),
  },
];

export const walletService = {
  async getWallets(): Promise<WalletAccount[]> {
    try {
      const raw = await AsyncStorage.getItem(WALLETS_STORAGE_KEY);
      if (!raw) {
        await AsyncStorage.setItem(
          WALLETS_STORAGE_KEY,
          JSON.stringify(DEFAULT_WALLETS),
        );
        return DEFAULT_WALLETS;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return DEFAULT_WALLETS;
    } catch (error) {
      console.warn("Failed to load wallets:", error);
      return DEFAULT_WALLETS;
    }
  },

  async saveWallets(wallets: WalletAccount[]): Promise<void> {
    await AsyncStorage.setItem(WALLETS_STORAGE_KEY, JSON.stringify(wallets));
  },

  async addWallet(data: {
    name: string;
    type: WalletType;
    icon?: string;
    color?: string;
    initialBalance?: number;
  }): Promise<WalletAccount[]> {
    const wallets = await this.getWallets();
    const iconByType: Record<WalletType, string> = {
      cash: "cash-outline",
      bank: "business-outline",
      card: "card-outline",
      wallet: "phone-portrait-outline",
    };
    const colorByType: Record<WalletType, string> = {
      cash: "teal",
      bank: "blue",
      card: "purple",
      wallet: "orange",
    };

    const newWallet: WalletAccount = {
      id: `wallet_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: data.name.trim(),
      type: data.type,
      icon: data.icon || iconByType[data.type] || "wallet-outline",
      color: data.color || colorByType[data.type] || "teal",
      initialBalance: Number(data.initialBalance) || 0,
      createdAt: new Date().toISOString(),
    };

    const updated = [...wallets, newWallet];
    await this.saveWallets(updated);
    return updated;
  },

  async updateWallet(
    id: string,
    updates: Partial<Omit<WalletAccount, "id" | "createdAt">>,
  ): Promise<WalletAccount[]> {
    const wallets = await this.getWallets();
    const updated = wallets.map((w) => (w.id === id ? { ...w, ...updates } : w));
    await this.saveWallets(updated);
    return updated;
  },

  async deleteWallet(id: string): Promise<WalletAccount[]> {
    const wallets = await this.getWallets();
    if (wallets.length <= 1) {
      return wallets; // Keep at least one wallet
    }
    const updated = wallets.filter((w) => w.id !== id);
    await this.saveWallets(updated);
    return updated;
  },

  async transferBetweenWallets(
    fromWalletId: string,
    toWalletId: string,
    amount: number,
  ): Promise<WalletAccount[]> {
    if (!fromWalletId || !toWalletId || fromWalletId === toWalletId || amount <= 0) {
      return this.getWallets();
    }
    const wallets = await this.getWallets();
    const updated = wallets.map((w) => {
      if (w.id === fromWalletId) {
        return { ...w, initialBalance: (w.initialBalance || 0) - amount };
      }
      if (w.id === toWalletId) {
        return { ...w, initialBalance: (w.initialBalance || 0) + amount };
      }
      return w;
    });
    await this.saveWallets(updated);
    return updated;
  },

  calculateWalletBalances(
    wallets: WalletAccount[],
    transactions: Transaction[],
  ): Record<string, number> {
    const balances: Record<string, number> = {};
    const fallbackWalletId = wallets[0]?.id || "default_cash";

    for (const w of wallets) {
      balances[w.id] = w.initialBalance || 0;
    }

    for (const tx of transactions) {
      if (tx.deleted) continue;
      const walletId =
        tx.accountId && balances[tx.accountId] !== undefined
          ? tx.accountId
          : fallbackWalletId;

      if (balances[walletId] === undefined) {
        balances[walletId] = 0;
      }

      if (tx.type === "income") {
        balances[walletId] += tx.amount;
      } else {
        balances[walletId] -= tx.amount;
      }
    }

    return balances;
  },
};
