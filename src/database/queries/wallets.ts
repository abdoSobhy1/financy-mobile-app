import AsyncStorage from "@react-native-async-storage/async-storage";
import { DatabaseManager } from "../index";
import { WalletAccount, WalletType } from "../../types";
import { WalletTable, transformWallet } from "../models";
import { generateId } from "../../utils";
import { offlineFirstSync } from "../../services/OfflineFirstSync";

export const WALLETS_STORAGE_KEY = "financy_wallets_v1";
export const WALLETS_MIGRATED_KEY = "financy_wallets_migrated_to_sqlite_v1";

import { DEFAULT_WALLETS } from "../../services/walletService";
export { DEFAULT_WALLETS };

export class WalletRepository {
  private db = DatabaseManager.getInstance();
  private initialized = false;

  public async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    await this.db.ensureInitialized();
    await this.migrateAndSeedIfNeeded();
    this.initialized = true;
  }

  private async migrateAndSeedIfNeeded(): Promise<void> {
    const database = this.db.getDatabase();

    try {
      const migrationDone = await AsyncStorage.getItem(WALLETS_MIGRATED_KEY);
      if (!migrationDone) {
        const legacyData = await AsyncStorage.getItem(WALLETS_STORAGE_KEY);
        if (legacyData) {
          try {
            const parsed = JSON.parse(legacyData);
            if (Array.isArray(parsed) && parsed.length > 0) {
              for (const item of parsed) {
                const isSecret = Boolean(item.isSecret || item.type === "secret");
                const walletType: WalletType =
                  item.type === "secret"
                    ? "cash"
                    : ["cash", "bank", "card", "wallet"].includes(item.type)
                    ? item.type
                    : "cash";

                const existing = await database.getFirstAsync<{ id: string }>(
                  "SELECT id FROM wallets WHERE id = ?",
                  [item.id],
                );

                if (!existing) {
                  const now = Date.now();
                  await database.runAsync(
                    `INSERT INTO wallets (id, name, type, icon, color, initial_balance, is_secret, archived, created_at, updated_at, sync_updated_at, deleted, sync_status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                      item.id,
                      item.name || "Wallet",
                      walletType,
                      item.icon || "wallet-outline",
                      item.color || (isSecret ? "gray" : "teal"),
                      Number(item.initialBalance) || 0,
                      isSecret ? 1 : 0,
                      item.archived ? 1 : 0,
                      item.createdAt || new Date().toISOString(),
                      now,
                      now,
                      0,
                      "pending",
                    ],
                  );
                }
              }
            }
          } catch (e) {
            console.warn("Failed to parse legacy wallets from AsyncStorage:", e);
          }
        }
        await AsyncStorage.setItem(WALLETS_MIGRATED_KEY, "true");
      }

      // Check if table has any wallets
      const totalRow = await database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM wallets WHERE deleted = 0",
      );

      if (!totalRow || totalRow.count === 0) {
        const anyRow = await database.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM wallets",
        );
        if (!anyRow || anyRow.count === 0) {
          await this.seedDefaultWallets();
        }
      }
    } catch (error) {
      console.warn("Error during wallets migrate/seed check:", error);
    }
  }

  public async seedDefaultWallets(): Promise<void> {
    const database = this.db.getDatabase();
    const now = Date.now();

    for (const w of DEFAULT_WALLETS) {
      await database.runAsync(
        `INSERT OR IGNORE INTO wallets (id, name, type, icon, color, initial_balance, is_secret, archived, created_at, updated_at, sync_updated_at, deleted, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          w.id,
          w.name,
          w.type,
          w.icon || "wallet-outline",
          w.color || "teal",
          w.initialBalance || 0,
          w.isSecret ? 1 : 0,
          0,
          w.createdAt,
          w.updatedAt || now,
          w.updatedAt || now,
          0,
          "pending",
        ],
      );
    }
  }

  async getAllWallets(options?: {
    includeArchived?: boolean;
    includeDeleted?: boolean;
  }): Promise<WalletAccount[]> {
    await this.ensureInitialized();
    const database = this.db.getDatabase();

    const conditions: string[] = [];
    if (!options?.includeDeleted) {
      conditions.push("(deleted = 0 OR deleted IS NULL)");
    }
    if (!options?.includeArchived) {
      conditions.push("(archived = 0 OR archived IS NULL)");
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const results = (await database.getAllAsync(
      `SELECT * FROM wallets ${whereClause} ORDER BY created_at ASC`,
    )) as WalletTable[];

    return results.map(transformWallet);
  }

  async getWalletById(id: string): Promise<WalletAccount | null> {
    await this.ensureInitialized();
    const database = this.db.getDatabase();
    const result = (await database.getFirstAsync(
      "SELECT * FROM wallets WHERE id = ?",
      [id],
    )) as WalletTable | null;

    return result ? transformWallet(result) : null;
  }

  async createWallet(
    wallet: Omit<WalletAccount, "id" | "createdAt">,
    options?: { skipSync?: boolean; useProvidedId?: string },
  ): Promise<WalletAccount> {
    await this.ensureInitialized();
    const database = this.db.getDatabase();
    const id = options?.useProvidedId || generateId();
    const createdAt = new Date().toISOString();
    const now = Date.now();
    const isSecret = Boolean(wallet.isSecret);
    const type = wallet.type;
    const initialBalance = Number(wallet.initialBalance) || 0;
    const icon =
      wallet.icon ||
      (type === "cash"
        ? "cash-outline"
        : type === "bank"
        ? "business-outline"
        : type === "card"
        ? "card-outline"
        : "phone-portrait-outline");
    const color = wallet.color || (isSecret ? "gray" : "teal");

    await database.runAsync(
      `INSERT INTO wallets (id, name, type, icon, color, initial_balance, is_secret, archived, created_at, updated_at, sync_updated_at, deleted, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        wallet.name.trim(),
        type,
        icon,
        color,
        initialBalance,
        isSecret ? 1 : 0,
        wallet.archived ? 1 : 0,
        createdAt,
        now,
        now,
        0,
        options?.skipSync ? "synced" : "pending",
      ],
    );

    const newWallet: WalletAccount = {
      id,
      name: wallet.name.trim(),
      type,
      icon,
      color,
      initialBalance,
      isSecret,
      archived: Boolean(wallet.archived),
      createdAt,
      updatedAt: now,
      deleted: false,
      syncStatus: options?.skipSync ? "synced" : "pending",
    };

    if (!options?.skipSync) {
      await offlineFirstSync.logOperation("wallets", id, "insert", newWallet);
    }

    return newWallet;
  }

  async updateWallet(
    id: string,
    updates: Partial<Omit<WalletAccount, "id" | "createdAt">>,
    options?: { skipSync?: boolean },
  ): Promise<void> {
    await this.ensureInitialized();
    const database = this.db.getDatabase();
    const now = Date.now();

    const setParts: string[] = ["updated_at = ?", "sync_updated_at = ?"];
    const params: any[] = [now, now];

    if (updates.name !== undefined) {
      setParts.push("name = ?");
      params.push(updates.name.trim());
    }
    if (updates.type !== undefined) {
      setParts.push("type = ?");
      params.push(updates.type);
    }
    if (updates.icon !== undefined) {
      setParts.push("icon = ?");
      params.push(updates.icon);
    }
    if (updates.color !== undefined) {
      setParts.push("color = ?");
      params.push(updates.color);
    }
    if (updates.initialBalance !== undefined) {
      setParts.push("initial_balance = ?");
      params.push(Number(updates.initialBalance) || 0);
    }
    if (updates.isSecret !== undefined) {
      setParts.push("is_secret = ?");
      params.push(updates.isSecret ? 1 : 0);
    }
    if (updates.archived !== undefined) {
      setParts.push("archived = ?");
      params.push(updates.archived ? 1 : 0);
    }
    if (updates.deleted !== undefined) {
      setParts.push("deleted = ?");
      params.push(updates.deleted ? 1 : 0);
    }
    if (updates.syncStatus !== undefined) {
      setParts.push("sync_status = ?");
      params.push(updates.syncStatus);
    }

    params.push(id);

    await database.runAsync(
      `UPDATE wallets SET ${setParts.join(", ")} WHERE id = ?`,
      params,
    );

    const updatedWallet = await this.getWalletById(id);
    if (!options?.skipSync && updatedWallet) {
      await offlineFirstSync.logOperation(
        "wallets",
        id,
        "update",
        updatedWallet,
      );
    }
  }

  async deleteWallet(
    id: string,
    options?: { skipSync?: boolean },
  ): Promise<void> {
    await this.ensureInitialized();
    const database = this.db.getDatabase();
    const now = Date.now();

    await database.runAsync(
      `UPDATE wallets SET deleted = 1, updated_at = ?, sync_updated_at = ?, sync_status = 'pending' WHERE id = ?`,
      [now, now, id],
    );

    if (!options?.skipSync) {
      await offlineFirstSync.logOperation("wallets", id, "delete", { id });
    }
  }

  async archiveWallet(
    id: string,
    options?: { skipSync?: boolean },
  ): Promise<void> {
    await this.updateWallet(id, { archived: true }, options);
  }

  async unarchiveWallet(
    id: string,
    options?: { skipSync?: boolean },
  ): Promise<void> {
    await this.updateWallet(id, { archived: false }, options);
  }

  async hardDeleteWallet(id: string): Promise<void> {
    await this.ensureInitialized();
    const database = this.db.getDatabase();
    await database.runAsync("DELETE FROM wallets WHERE id = ?", [id]);
  }

  async countTransactionsForWallet(walletId: string): Promise<number> {
    await this.ensureInitialized();
    const database = this.db.getDatabase();

    try {
      const row = await database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM transactions 
         WHERE (account_id = ? OR to_account_id = ?) AND (deleted = 0 OR deleted IS NULL)`,
        [walletId, walletId],
      );
      return row?.count || 0;
    } catch {
      const row = await database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM transactions 
         WHERE account_id = ? AND (deleted = 0 OR deleted IS NULL)`,
        [walletId],
      );
      return row?.count || 0;
    }
  }

  async reassignTransactions(
    fromWalletId: string,
    toWalletId: string,
  ): Promise<number> {
    await this.ensureInitialized();
    const database = this.db.getDatabase();
    const now = Date.now();

    let affected = 0;
    await database.withTransactionAsync(async () => {
      const resFrom = await database.runAsync(
        `UPDATE transactions SET account_id = ?, updated_at = ?, sync_updated_at = ?, sync_status = 'pending'
         WHERE account_id = ?`,
        [toWalletId, now, now, fromWalletId],
      );
      affected += resFrom.changes;

      try {
        const resTo = await database.runAsync(
          `UPDATE transactions SET to_account_id = ?, updated_at = ?, sync_updated_at = ?, sync_status = 'pending'
           WHERE to_account_id = ?`,
          [toWalletId, now, now, fromWalletId],
        );
        affected += resTo.changes;
      } catch {
        // to_account_id might not exist yet before phase 3
      }
    });

    return affected;
  }
}
