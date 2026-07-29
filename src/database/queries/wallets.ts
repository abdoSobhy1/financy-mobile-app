import { DatabaseManager } from "../index";
import { Wallet } from "../../types";
import { WalletTable, transformWallet, toWalletTable } from "../models";
import { generateId } from "../../utils";
import { offlineFirstSync } from "../../services/OfflineFirstSync";
import { validateWalletData, cleanWalletData } from "../../utils/validation";

export class WalletRepository {
  private db = DatabaseManager.getInstance();

  async createWallet(
    wallet: Omit<Wallet, "id" | "createdAt" | "updatedAt">,
    options?: { skipSync?: boolean; useProvidedId?: string }
  ): Promise<Wallet> {
    // Validate the wallet data
    validateWalletData(wallet);

    // Clean the wallet data
    const cleanedWallet = cleanWalletData(wallet);

    const database = this.db.getDatabase();
    const id = options?.useProvidedId || generateId();
    const now = new Date().toISOString();
    const tableData = toWalletTable(cleanedWallet);

    await database.runAsync(
      `
      INSERT INTO wallets (
        id, name, icon, color, balance, created_at, updated_at, sync_updated_at, deleted, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        id,
        tableData.name,
        tableData.icon || null,
        tableData.color || null,
        tableData.balance,
        now,
        now,
        tableData.sync_updated_at,
        tableData.deleted,
        tableData.sync_status,
      ]
    );

    const newWallet = {
      ...cleanedWallet,
      id,
      createdAt: now,
      updatedAt: tableData.sync_updated_at,
    };

    if (!options?.skipSync) {
      await offlineFirstSync.logOperation("wallets", id, "insert", newWallet);
    }

    return newWallet;
  }

  async getWalletById(id: string): Promise<Wallet | null> {
    const database = this.db.getDatabase();
    const result = (await database.getFirstAsync(
      "SELECT * FROM wallets WHERE id = ? AND deleted = 0",
      [id]
    )) as WalletTable | null;

    return result ? transformWallet(result) : null;
  }

  async getAllWallets(): Promise<Wallet[]> {
    try {
      await this.db.ensureInitialized();
      const database = this.db.getDatabase();
      const results = (await database.getAllAsync(
        "SELECT * FROM wallets WHERE deleted = 0 ORDER BY name ASC"
      )) as WalletTable[];

      return results.map(transformWallet);
    } catch (error) {
      console.error("Error in getAllWallets:", error);
      throw error;
    }
  }

  async updateWallet(
    id: string,
    updates: Partial<Omit<Wallet, "id" | "createdAt" | "updatedAt">>,
    options?: { skipSync?: boolean }
  ): Promise<void> {
    const database = this.db.getDatabase();

    const setParts: string[] = ["updated_at = ?", "sync_updated_at = ?"];
    const now = new Date().toISOString();
    const syncTime = Date.now();
    const params: any[] = [now, syncTime];

    if (updates.name !== undefined) {
      setParts.push("name = ?");
      params.push(updates.name);
    }

    if (updates.icon !== undefined) {
      setParts.push("icon = ?");
      params.push(updates.icon || null);
    }

    if (updates.color !== undefined) {
      setParts.push("color = ?");
      params.push(updates.color || null);
    }

    if (updates.balance !== undefined) {
      setParts.push("balance = ?");
      params.push(updates.balance);
    }

    params.push(id);

    await database.runAsync(
      `
      UPDATE wallets 
      SET ${setParts.join(", ")}
      WHERE id = ?
    `,
      params
    );

    const updatedWallet = await this.getWalletById(id);
    if (!options?.skipSync && updatedWallet) {
      await offlineFirstSync.logOperation("wallets", id, "update", updatedWallet);
    }
  }

  async updateWalletBalance(id: string, delta: number): Promise<void> {
    if (!id || delta === 0) return;
    const database = this.db.getDatabase();
    const now = new Date().toISOString();
    const syncTime = Date.now();

    await database.runAsync(
      `
      UPDATE wallets 
      SET balance = balance + ?, updated_at = ?, sync_updated_at = ?
      WHERE id = ?
    `,
      [delta, now, syncTime, id]
    );

    const updatedWallet = await this.getWalletById(id);
    if (updatedWallet) {
      await offlineFirstSync.logOperation("wallets", id, "update", updatedWallet);
    }
  }

  async deleteWallet(id: string, options?: { skipSync?: boolean }): Promise<void> {
    const database = this.db.getDatabase();

    // Soft delete wallet
    const now = new Date().toISOString();
    const syncTime = Date.now();

    await database.runAsync(
      `
      UPDATE wallets 
      SET deleted = 1, updated_at = ?, sync_updated_at = ?
      WHERE id = ?
    `,
      [now, syncTime, id]
    );

    if (!options?.skipSync) {
      await offlineFirstSync.logOperation("wallets", id, "delete", { id });
    }
  }
}
