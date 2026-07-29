import { DatabaseManager } from "../index";
import { Transaction, TransactionFilters } from "../../types";
import {
  TransactionTable,
  transformTransaction,
  toTransactionTable,
} from "../models";
import { generateId } from "../../utils";
import { CategoryRepository } from "./categories";
import { offlineFirstSync } from "../../services/OfflineFirstSync";
import { SyncService } from "../../services/syncService";
import {
  validateTransactionData,
  cleanTransactionData,
} from "../../utils/validation";

export class TransactionRepository {
  private db = DatabaseManager.getInstance();

  private async applyWalletBalanceDelta(
    transaction: Partial<Transaction>,
    multiplier: 1 | -1,
  ): Promise<void> {
    const { WalletRepository } = await import("./wallets");
    const walletRepo = new WalletRepository();

    if (transaction.type === "income" && transaction.walletId) {
      await walletRepo.updateWalletBalance(
        transaction.walletId,
        Number(transaction.amount || 0) * multiplier,
      );
    } else if (transaction.type === "expense" && transaction.walletId) {
      await walletRepo.updateWalletBalance(
        transaction.walletId,
        -Number(transaction.amount || 0) * multiplier,
      );
    } else if (
      transaction.type === "transfer" &&
      transaction.fromWalletId &&
      transaction.toWalletId
    ) {
      const amt = Number(transaction.amount || 0) * multiplier;
      await walletRepo.updateWalletBalance(transaction.fromWalletId, -amt);
      await walletRepo.updateWalletBalance(transaction.toWalletId, amt);
    }
  }

  async createTransaction(
    transaction: Omit<Transaction, "id" | "createdAt">,
    options?: { skipSync?: boolean; useProvidedId?: string },
  ): Promise<Transaction> {
    validateTransactionData(transaction);
    const cleanedTransaction = cleanTransactionData(transaction);

    const database = this.db.getDatabase();
    const id = options?.useProvidedId || generateId();
    const createdAt = new Date().toISOString();
    const tableData = toTransactionTable(cleanedTransaction);

    await database.runAsync(
      `INSERT INTO transactions (
        id, amount, type, category_id, budget_id, wallet_id, from_wallet_id, to_wallet_id, description, 
        date, note, linked_bill_id, linked_debt_payment_id, created_at, duplicated_at, sync_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        tableData.amount,
        tableData.type,
        tableData.category_id,
        tableData.budget_id || null,
        tableData.wallet_id || null,
        tableData.from_wallet_id || null,
        tableData.to_wallet_id || null,
        tableData.description,
        tableData.date,
        tableData.note || null,
        tableData.linked_bill_id || null,
        tableData.linked_debt_payment_id || null,
        createdAt,
        tableData.duplicated_at || null,
        Date.now(),
      ],
    );

    // Debug: log budget assignment and transaction date to help diagnose period calculation issues
    if (tableData.budget_id) {
      console.log(
        "[TransactionRepository] createTransaction -> budgetId:",
        tableData.budget_id,
        "date:",
        tableData.date,
        "amount:",
        tableData.amount,
      );
    }

    const newTransaction = {
      ...cleanedTransaction,
      id,
      createdAt,
      updatedAt: Date.now(),
    };

    await this.applyWalletBalanceDelta(newTransaction, 1);

    if (!options?.skipSync) {
      await offlineFirstSync.logOperation(
        "transactions",
        id,
        "insert",
        newTransaction,
      );
    }
    return newTransaction;
  }

  // DEBUG helper: force push a single transaction to remote using SyncService
  static async pushTransactionNow(id: string): Promise<void> {
    const db = DatabaseManager.getInstance().getDatabase();
    const rows = (await db.getAllAsync(
      `SELECT * FROM transactions WHERE id = ? LIMIT 1`,
      [id],
    )) as any[];
    if (!rows || rows.length === 0) {
      throw new Error(`transaction ${id} not found`);
    }

    const row = rows[0];
    // build a sync_log like operation and call SyncService to attempt immediate sync
    const op = {
      table_name: "transactions",
      record_id: id,
      operation: "insert",
      payload: JSON.stringify(row),
      created_at: Date.now(),
      log_id: `debug-push-${id}-${Date.now()}`,
    } as any;

    console.log(`🚀 Debug pushTransactionNow for id=${id}`);

    try {
      // Call syncLocalChanges with explicit params: collectionName, operation, documentId, data
      await SyncService.getInstance().syncLocalChanges(
        "transactions",
        "create",
        id,
        row,
      );
      await db.runAsync(
        "UPDATE transactions SET sync_status = 'synced' WHERE id = ?",
        [id],
      );
      SyncService.getInstance().notifyRecordSynced("transactions", id);
      console.log(`✅ pushTransactionNow completed for id=${id}`);
    } catch (err) {
      console.error(`❌ pushTransactionNow failed for id=${id}`, err);
      throw err;
    }
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    const database = this.db.getDatabase();
    const result = (await database.getFirstAsync(
      "SELECT * FROM transactions WHERE id = ?",
      [id],
    )) as TransactionTable | null;

    return result ? transformTransaction(result) : null;
  }

  async getAllTransactions(
    filters?: TransactionFilters,
  ): Promise<Transaction[]> {
    try {
      await this.db.ensureInitialized();
      const database = this.db.getDatabase();
      let query = "SELECT * FROM transactions WHERE 1=1";
      const params: any[] = [];

      if (filters?.budgetId) {
        query += " AND budget_id = ?";
        params.push(filters.budgetId);
      }

      if (filters?.categoryId) {
        query += " AND category_id = ?";
        params.push(filters.categoryId);
      }

      if (filters?.type) {
        query += " AND type = ?";
        params.push(filters.type);
      }

      if (filters?.dateRange) {
        query += " AND date >= ? AND date <= ?";
        params.push(filters.dateRange.start, filters.dateRange.end);
      }

      query += " ORDER BY date DESC, created_at DESC";

      const result = (await database.getAllAsync(
        query,
        params,
      )) as TransactionTable[];
      return result.map(transformTransaction);
    } catch (error) {
      console.error("Error getting all transactions:", error);
      throw error;
    }
  }

  async updateTransaction(
    id: string,
    updates: Partial<Omit<Transaction, "id" | "createdAt">>,
    options?: { skipSync?: boolean },
  ): Promise<Transaction> {
    if (Object.keys(updates).length === 0) {
      throw new Error("No updates provided");
    }

    validateTransactionData(updates);
    const cleanedUpdates = cleanTransactionData(updates);

    await this.db.ensureInitialized();
    const database = this.db.getDatabase();

    const currentTransaction = await this.getTransactionById(id);
    if (!currentTransaction) {
      throw new Error("Transaction not found");
    }

    await this.applyWalletBalanceDelta(currentTransaction, -1);

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (cleanedUpdates.amount !== undefined) {
      updateFields.push("amount = ?");
      updateValues.push(cleanedUpdates.amount);
    }

    if (cleanedUpdates.type !== undefined) {
      updateFields.push("type = ?");
      updateValues.push(cleanedUpdates.type);
    }

    if (cleanedUpdates.categoryId !== undefined) {
      updateFields.push("category_id = ?");
      updateValues.push(cleanedUpdates.categoryId);
    }

    if (cleanedUpdates.budgetId !== undefined) {
      updateFields.push("budget_id = ?");
      updateValues.push(cleanedUpdates.budgetId || null);
    }

    if (cleanedUpdates.walletId !== undefined) {
      updateFields.push("wallet_id = ?");
      updateValues.push(cleanedUpdates.walletId || null);
    }

    if (cleanedUpdates.fromWalletId !== undefined) {
      updateFields.push("from_wallet_id = ?");
      updateValues.push(cleanedUpdates.fromWalletId || null);
    }

    if (cleanedUpdates.toWalletId !== undefined) {
      updateFields.push("to_wallet_id = ?");
      updateValues.push(cleanedUpdates.toWalletId || null);
    }

    if (cleanedUpdates.description !== undefined) {
      updateFields.push("description = ?");
      updateValues.push(cleanedUpdates.description);
    }

    if (cleanedUpdates.date !== undefined) {
      updateFields.push("date = ?");
      updateValues.push(cleanedUpdates.date);
    }

    if (cleanedUpdates.note !== undefined) {
      updateFields.push("note = ?");
      updateValues.push(cleanedUpdates.note || null);
    }

    if (updateFields.length === 0) {
      throw new Error("No valid updates provided");
    }

    updateValues.push(id);
    const query = `UPDATE transactions SET ${updateFields.join(", ")} WHERE id = ?`;
    await database.runAsync(query, updateValues);

    const updatedTransaction = {
      ...currentTransaction,
      ...cleanedUpdates,
      updatedAt: Date.now(),
    };

    await this.applyWalletBalanceDelta(updatedTransaction, 1);

    if (!options?.skipSync) {
      await offlineFirstSync.logOperation(
        "transactions",
        id,
        "update",
        updatedTransaction,
      );
    }

    return updatedTransaction;
  }

  async deleteTransaction(
    id: string,
    options?: { skipSync?: boolean },
  ): Promise<void> {
    await this.db.ensureInitialized();
    const database = this.db.getDatabase();

    const transaction = await this.getTransactionById(id);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    await this.applyWalletBalanceDelta(transaction, -1);

    // If this transaction is linked to a bill, update the bill to unpaid and unlink
    if (transaction.linkedBillId) {
      await database.runAsync(
        "UPDATE bills SET paid = 0, linked_transaction_id = NULL, updated_at = ?, sync_updated_at = ? WHERE id = ?",
        [new Date().toISOString(), Date.now(), transaction.linkedBillId],
      );
      console.log(
        `Unlinked and marked bill ${transaction.linkedBillId} as unpaid when deleting transaction ${id}`,
      );
    }

    // If this transaction is linked to a debt payment, delete the debt payment and restore balance
    if (transaction.linkedDebtPaymentId) {
      const debtPayment = (await database.getFirstAsync(
        "SELECT * FROM debt_payments WHERE id = ?",
        [transaction.linkedDebtPaymentId],
      )) as any;

      if (debtPayment) {
        // Restore debt balance
        await database.runAsync(
          "UPDATE debts SET current_balance = current_balance + ?, updated_at = ?, sync_updated_at = ? WHERE id = ?",
          [
            debtPayment.principal,
            new Date().toISOString(),
            Date.now(),
            debtPayment.debt_id,
          ],
        );

        // Delete the debt payment
        await database.runAsync("DELETE FROM debt_payments WHERE id = ?", [
          transaction.linkedDebtPaymentId,
        ]);
        console.log(
          `Deleted linked debt payment ${transaction.linkedDebtPaymentId} and restored balance when deleting transaction ${id}`,
        );
      }
    }

    await database.runAsync("DELETE FROM transactions WHERE id = ?", [id]);

    if (!options?.skipSync) {
      await offlineFirstSync.logOperation("transactions", id, "delete", { id });
    }
  }

  // Helper function to get transactions linked to bills
  async getTransactionsByBillId(billId: string): Promise<Transaction[]> {
    await this.db.ensureInitialized();
    const database = this.db.getDatabase();

    const results = (await database.getAllAsync(
      "SELECT * FROM transactions WHERE linked_bill_id = ? ORDER BY date DESC",
      [billId],
    )) as TransactionTable[];

    return results.map(transformTransaction);
  }

  // Helper function to get transactions linked to debt payments
  async getTransactionsByDebtPaymentId(
    debtPaymentId: string,
  ): Promise<Transaction[]> {
    await this.db.ensureInitialized();
    const database = this.db.getDatabase();

    const results = (await database.getAllAsync(
      "SELECT * FROM transactions WHERE linked_debt_payment_id = ? ORDER BY date DESC",
      [debtPaymentId],
    )) as TransactionTable[];

    return results.map(transformTransaction);
  }

  async duplicateTransaction(id: string): Promise<Transaction> {
    const originalTransaction = await this.getTransactionById(id);
    if (!originalTransaction) {
      throw new Error("Transaction not found");
    }

    const duplicatedTransaction = await this.createTransaction({
      amount: originalTransaction.amount,
      type: originalTransaction.type,
      categoryId: originalTransaction.categoryId,
      budgetId: originalTransaction.budgetId,
      description: originalTransaction.description,
      date: new Date().toISOString().split("T")[0],
      note: originalTransaction.note,
      duplicatedAt: new Date().toISOString(),
      updatedAt: Date.now(),
    });

    return duplicatedTransaction;
  }

  async getTransactionStats(): Promise<{
    totalExpenses: number;
    totalIncome: number;
    totalTransactions: number;
  }> {
    await this.db.ensureInitialized();
    const database = this.db.getDatabase();

    const result = (await database.getFirstAsync(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpenses,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
        COUNT(*) as totalTransactions
      FROM transactions
    `)) as {
      totalExpenses: number;
      totalIncome: number;
      totalTransactions: number;
    };

    return result;
  }

  async getLastTransaction(): Promise<Transaction | null> {
    await this.db.ensureInitialized();
    const database = this.db.getDatabase();
    const result = (await database.getFirstAsync(
      "SELECT * FROM transactions ORDER BY created_at DESC LIMIT 1",
    )) as TransactionTable | null;
    return result ? transformTransaction(result) : null;
  }
}
