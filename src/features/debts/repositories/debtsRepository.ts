import { DatabaseManager } from "../../../infrastructure/database";
import { Debt, DebtPayment, Transaction } from "../../../shared/types";
import { DebtTable, DebtPaymentTable, fromDebtTable, fromDebtPaymentTable, toDebtTable, toDebtPaymentTable } from "../../../infrastructure/database/models";
import { generateId } from "../../../shared/utils";
import { offlineFirstSync } from "../../../infrastructure/sync/OfflineFirstSync";

export class DebtRepository {
  private db = DatabaseManager.getInstance();

  async createDebt(debt: Omit<Debt, "id" | "createdAt" | "updatedAt">, options?: { skipSync?: boolean; useProvidedId?: string }): Promise<Debt> {
    try {
      const database = this.db.getDatabase();
      const id = options?.useProvidedId || generateId();
      const now = new Date().toISOString();

      // Validate and clean debt data before transformation to ensure required fields exist
      const { cleanDebtData } = await import("../../../shared/utils/validation");
      const cleanedDebt = cleanDebtData({ ...debt, id }); // Add id for validation context

      const debtData = toDebtTable(cleanedDebt);

      await database.runAsync(
        `
        INSERT INTO debts (
          id, name, debt_type, amount, total_amount, current_balance, interest_rate, 
          minimum_payment, due_date, creditor, description, category_id, budget_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          cleanedDebt.id,
          debtData.name,
          debtData.debt_type || "i_owe",
          debtData.amount,
          debtData.total_amount,
          debtData.current_balance,
          debtData.interest_rate,
          debtData.minimum_payment,
          debtData.due_date,
          debtData.creditor,
          debtData.description,
          debtData.category_id,
          debtData.budget_id,
          cleanedDebt.createdAt,
          cleanedDebt.updatedAt,
        ]
      );

      const newDebt = {
        ...cleanedDebt,
        syncStatus: "pending" as const,
      };

      // Log operation for offline-first sync (never fails)
      if (!options?.skipSync) {
        await offlineFirstSync.logOperation("debts", id, "insert", newDebt);
      }

      return newDebt;
    } catch (error) {
      console.error("DebtRepository: Error creating debt:", error);
      throw error;
    }
  }

  async reconcileDebtBalances(debtId?: string): Promise<void> {
    try {
      const database = this.db.getDatabase();
      const whereClause = debtId
        ? "WHERE d.id = ? AND (d.deleted = 0 OR d.deleted IS NULL)"
        : "WHERE d.deleted = 0 OR d.deleted IS NULL";
      const params = debtId ? [debtId] : [];

      const rows = (await database.getAllAsync(
        `
        SELECT
          d.id,
          d.total_amount,
          d.current_balance,
          COUNT(dp.id) as payment_count,
          COALESCE(SUM(dp.amount), 0) as total_paid_amount,
          COALESCE(SUM(CASE WHEN COALESCE(dp.principal, 0) > 0 THEN dp.principal ELSE dp.amount END), 0) as total_paid_principal
        FROM debts d
        LEFT JOIN debt_payments dp
          ON dp.debt_id = d.id AND (dp.deleted = 0 OR dp.deleted IS NULL)
        ${whereClause}
        GROUP BY d.id
        `,
        params
      )) as Array<{
        id: string;
        total_amount: number;
        current_balance: number;
        payment_count: number;
        total_paid_amount: number;
        total_paid_principal: number;
      }>;

      const now = new Date().toISOString();
      for (const row of rows) {
        if (row.payment_count > 0) {
          const paidAmount = Math.max(row.total_paid_amount, row.total_paid_principal);
          const rawExpected = Math.max(
            0,
            Math.round((row.total_amount - paidAmount) * 100) / 100
          );
          const expectedBalance = rawExpected < 0.01 ? 0 : rawExpected;

          if (Math.abs(row.current_balance - expectedBalance) >= 0.01) {
            await database.runAsync(
              `UPDATE debts SET current_balance = ?, updated_at = ?, sync_updated_at = ? WHERE id = ?`,
              [expectedBalance, now, Date.now(), row.id]
            );
            const updatedResult = (await database.getFirstAsync(
              `SELECT * FROM debts WHERE id = ?`,
              [row.id]
            )) as DebtTable | null;
            if (updatedResult) {
              await offlineFirstSync.logOperation(
                "debts",
                row.id,
                "update",
                fromDebtTable(updatedResult)
              );
            }
          }
        } else if (row.current_balance < 0.01 && row.current_balance > 0) {
          await database.runAsync(
            `UPDATE debts SET current_balance = 0, updated_at = ?, sync_updated_at = ? WHERE id = ?`,
            [now, Date.now(), row.id]
          );
        }
      }
    } catch (error) {
      console.warn("DebtRepository: Failed to reconcile debt balances:", error);
    }
  }

  async getDebtById(id: string): Promise<Debt | null> {
    await this.reconcileDebtBalances(id);
    const database = this.db.getDatabase();
    const result = (await database.getFirstAsync(
      `
      SELECT * FROM debts WHERE id = ?
    `,
      [id]
    )) as DebtTable | null;

    return result ? fromDebtTable(result) : null;
  }

  async getAllDebts(): Promise<Debt[]> {
    await this.reconcileDebtBalances();
    const database = this.db.getDatabase();
    const results = (await database.getAllAsync(`
      SELECT * FROM debts ORDER BY created_at DESC
    `)) as DebtTable[];

    return results.map(fromDebtTable);
  }

  async getActiveDebts(): Promise<Debt[]> {
    await this.reconcileDebtBalances();
    const database = this.db.getDatabase();
    const results = (await database.getAllAsync(`
      SELECT * FROM debts WHERE current_balance > 0 ORDER BY created_at DESC
    `)) as DebtTable[];

    return results.map(fromDebtTable);
  }

  async getPaidOffDebts(): Promise<Debt[]> {
    await this.reconcileDebtBalances();
    const database = this.db.getDatabase();
    const results = (await database.getAllAsync(`
      SELECT * FROM debts WHERE current_balance = 0 ORDER BY updated_at DESC
    `)) as DebtTable[];

    return results.map(fromDebtTable);
  }

  async getDebtsByCategory(categoryId: string): Promise<Debt[]> {
    const database = this.db.getDatabase();
    const results = (await database.getAllAsync(
      `
      SELECT * FROM debts WHERE category_id = ? ORDER BY created_at DESC
    `,
      [categoryId]
    )) as DebtTable[];

    return results.map(fromDebtTable);
  }

  async getDebtsWithUpcomingPayments(days: number = 7): Promise<Debt[]> {
    const database = this.db.getDatabase();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStr = futureDate.toISOString().split("T")[0];

    const results = (await database.getAllAsync(
      `
      SELECT * FROM debts 
      WHERE due_date IS NOT NULL 
      AND due_date <= ? 
      AND current_balance > 0
      ORDER BY due_date ASC
    `,
      [futureDateStr]
    )) as DebtTable[];

    return results.map(fromDebtTable);
  }

  async updateDebt(id: string, updates: Partial<Omit<Debt, "id" | "createdAt">>, options?: { skipSync?: boolean }): Promise<void> {
    const database = this.db.getDatabase();
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      updateFields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.type !== undefined) {
      updateFields.push("debt_type = ?");
      values.push(updates.type);
    }
    if (updates.totalAmount !== undefined) {
      updateFields.push("total_amount = ?");
      values.push(updates.totalAmount);
    }
    if (updates.currentBalance !== undefined) {
      updateFields.push("current_balance = ?");
      values.push(updates.currentBalance);
    }
    if (updates.interestRate !== undefined) {
      updateFields.push("interest_rate = ?");
      values.push(updates.interestRate);
    }
    if (updates.minimumPayment !== undefined) {
      updateFields.push("minimum_payment = ?");
      values.push(updates.minimumPayment);
    }
    if (updates.dueDate !== undefined) {
      updateFields.push("due_date = ?");
      values.push(updates.dueDate);
    }
    if (updates.creditor !== undefined) {
      updateFields.push("creditor = ?");
      values.push(updates.creditor);
    }
    if (updates.description !== undefined) {
      updateFields.push("description = ?");
      values.push(updates.description);
    }
    if (updates.categoryId !== undefined) {
      updateFields.push("category_id = ?");
      values.push(updates.categoryId);
    }

    if (updateFields.length === 0) return;

    updateFields.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(id);

    await database.runAsync(
      `
      UPDATE debts SET ${updateFields.join(", ")} WHERE id = ?
    `,
      values
    );

    // Log operation for offline-first sync (never fails)
    const updatedDebt = await this.getDebtById(id);
    if (updatedDebt && !options?.skipSync) {
      await offlineFirstSync.logOperation("debts", id, "update", updatedDebt);
    }
  }

  async deleteDebt(id: string, options?: { skipSync?: boolean }): Promise<void> {
    const database = this.db.getDatabase();
    await database.runAsync("DELETE FROM debts WHERE id = ?", [id]);

    // Log operation for offline-first sync (never fails)
    if (!options?.skipSync) {
      await offlineFirstSync.logOperation("debts", id, "delete", { id });
    }
  }

  // Debt Payment Operations
  async makePayment(
    payment: Omit<DebtPayment, "id" | "createdAt">,
    options?: { skipSync?: boolean; useProvidedId?: string; useProvidedTransactionId?: string }
  ): Promise<DebtPayment> {
    const database = this.db.getDatabase();
    const paymentId = options?.useProvidedId || generateId();
    const transactionId = options?.useProvidedTransactionId || generateId();
    const now = new Date().toISOString();

    // Get the debt details
    const debt = await this.getDebtById(payment.debtId);
    if (!debt) {
      throw new Error("Debt not found");
    }

    // Determine transaction direction based on whether debt is owed to me or I owe
    const isOwedToMe = debt.type === "owed_to_me";
    const txType = isOwedToMe ? "income" : "expense";
    const txDescription = isOwedToMe
      ? `Repayment Received: ${debt.name}`
      : `Debt Payment: ${debt.name}`;

    // Use the debt's category or fallback to an appropriate category
    let categoryId = debt.categoryId;
    if (!categoryId) {
      const existingCategory = (await database.getFirstAsync("SELECT id FROM categories WHERE type = ? ORDER BY name LIMIT 1", [
        txType,
      ])) as { id: string } | null;

      if (existingCategory) {
        categoryId = existingCategory.id;
      } else {
        const fallbackCategory = (await database.getFirstAsync("SELECT id FROM categories ORDER BY name LIMIT 1")) as {
          id: string;
        } | null;

        if (fallbackCategory) {
          categoryId = fallbackCategory.id;
        } else {
          throw new Error("No category found for debt payment");
        }
      }
    }

    // Create the linked transaction first
    await database.runAsync(
      `INSERT INTO transactions (
        id, description, amount, date, type, category_id, budget_id, 
        linked_debt_payment_id, created_at, sync_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionId,
        txDescription,
        payment.amount,
        payment.date || payment.paymentDate, // Use date field, fallback to paymentDate
        txType,
        categoryId,
        isOwedToMe ? null : (debt.budgetId || null),
        paymentId, // Link to the debt payment we're about to create
        now,
        Date.now(),
      ]
    );

    // Create the debt payment record
    // toDebtPaymentTable expects a DebtPayment without id/createdAt; pass payment as any and use paymentId separately
    const paymentData = toDebtPaymentTable(payment as any);

    await database.runAsync(
      `INSERT INTO debt_payments (
        id, debt_id, amount, date, payment_date, principal, interest, note, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        paymentData.debt_id,
        paymentData.amount,
        paymentData.payment_date, // Use payment_date for both date and payment_date
        paymentData.payment_date,
        paymentData.principal,
        paymentData.interest,
        paymentData.note,
        now,
        Date.now(),
      ]
    );

    // Update debt balance safely (subtract payment amount and clamp to >= 0)
    const rawNewBalance = Math.max(
      0,
      Math.round((debt.currentBalance - payment.amount) * 100) / 100
    );
    const finalBalance = rawNewBalance < 0.01 ? 0 : rawNewBalance;

    await database.runAsync(
      `UPDATE debts SET current_balance = ?, updated_at = ?, sync_updated_at = ? WHERE id = ?`,
      [finalBalance, now, Date.now(), payment.debtId]
    );

    const newPayment = {
      id: paymentId,
      ...payment,
      linkedTransactionId: transactionId,
      createdAt: now,
    };

    // Log sync operations unless requested to skip (prevents sync echo)
    if (!options?.skipSync) {
      await offlineFirstSync.logOperation("debt_payments", paymentId, "insert", newPayment);

      // Log the created transaction for sync
      const createdTransaction = await database.getFirstAsync("SELECT * FROM transactions WHERE id = ?", [transactionId]);
      if (createdTransaction) {
        await offlineFirstSync.logOperation("transactions", transactionId, "insert", createdTransaction);
      }

      // Log the updated debt for sync
      const updatedDebt = await this.getDebtById(payment.debtId);
      if (updatedDebt) {
        await offlineFirstSync.logOperation("debts", payment.debtId, "update", updatedDebt);
      }
    }
    return newPayment;
  }

  async getPaymentsByDebt(debtId: string): Promise<DebtPayment[]> {
    const database = this.db.getDatabase();
    const results = (await database.getAllAsync(
      `
      SELECT * FROM debt_payments 
      WHERE debt_id = ? AND (deleted = 0 OR deleted IS NULL)
      ORDER BY payment_date DESC, created_at DESC
    `,
      [debtId]
    )) as DebtPaymentTable[];

    return results.map(fromDebtPaymentTable);
  }

  async getPaymentById(id: string): Promise<DebtPayment | null> {
    const database = this.db.getDatabase();
    const result = (await database.getFirstAsync(
      `
      SELECT * FROM debt_payments WHERE id = ?
    `,
      [id]
    )) as DebtPaymentTable | null;

    return result ? fromDebtPaymentTable(result) : null;
  }

  async updatePayment(
    id: string,
    updates: Partial<Omit<DebtPayment, "id" | "debtId" | "createdAt">>,
    options?: { skipSync?: boolean }
  ): Promise<void> {
    const database = this.db.getDatabase();
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.amount !== undefined) {
      updateFields.push("amount = ?");
      values.push(updates.amount);
    }
    if (updates.paymentDate !== undefined) {
      updateFields.push("payment_date = ?");
      values.push(updates.paymentDate);
    }
    if (updates.principal !== undefined) {
      updateFields.push("principal = ?");
      values.push(updates.principal);
    }
    if (updates.interest !== undefined) {
      updateFields.push("interest = ?");
      values.push(updates.interest);
    }
    if (updates.note !== undefined) {
      updateFields.push("note = ?");
      values.push(updates.note);
    }

    if (updateFields.length === 0) return;

    values.push(id);

    await database.runAsync(
      `
      UPDATE debt_payments SET ${updateFields.join(", ")} WHERE id = ?
    `,
      values
    );

    // Log operation for offline-first sync (never fails)
    const updatedPayment = await this.getPaymentById(id);
    if (updatedPayment && !options?.skipSync) {
      await offlineFirstSync.logOperation("debt_payments", id, "update", updatedPayment);
    }
  }

  async deletePayment(id: string, options?: { skipSync?: boolean }): Promise<void> {
    const database = this.db.getDatabase();

    // Get payment details to adjust debt balance
    const payment = await this.getPaymentById(id);
    if (!payment) return;

    // Find and delete linked transaction(s)
    const linkedTxRows = (await database.getAllAsync(
      "SELECT id FROM transactions WHERE id = ? OR linked_debt_payment_id = ?",
      [payment.linkedTransactionId || "", id]
    )) as Array<{ id: string }>;

    for (const txRow of linkedTxRows) {
      await database.runAsync("DELETE FROM transactions WHERE id = ?", [txRow.id]);
    }

    // Delete payment
    await database.runAsync("DELETE FROM debt_payments WHERE id = ?", [id]);

    // Restore debt balance safely (clamped to total_amount)
    const currentDebtRow = (await database.getFirstAsync(
      "SELECT total_amount, current_balance FROM debts WHERE id = ?",
      [payment.debtId]
    )) as { total_amount: number; current_balance: number } | null;

    const restoredBalance = currentDebtRow
      ? Math.min(
          currentDebtRow.total_amount,
          Math.round((currentDebtRow.current_balance + payment.amount) * 100) / 100
        )
      : payment.amount;

    const now = new Date().toISOString();
    await database.runAsync(
      `UPDATE debts SET current_balance = ?, updated_at = ?, sync_updated_at = ? WHERE id = ?`,
      [restoredBalance, now, Date.now(), payment.debtId]
    );

    // Log sync operations unless requested to skip
    if (!options?.skipSync) {
      await offlineFirstSync.logOperation("debt_payments", id, "delete", { id });

      // Log transaction deletion for sync if there was a linked transaction
      for (const txRow of linkedTxRows) {
        await offlineFirstSync.logOperation("transactions", txRow.id, "delete", { id: txRow.id });
      }

      // Log debt update for sync (balance was restored)
      const updatedDebt = await this.getDebtById(payment.debtId);
      if (updatedDebt) {
        await offlineFirstSync.logOperation("debts", payment.debtId, "update", updatedDebt);
      }
    }
  }

  // Helper function to sync debt payment and transaction updates
  async updatePaymentAndTransaction(paymentId: string, updates: Partial<Omit<DebtPayment, "id" | "createdAt">>): Promise<void> {
    const database = this.db.getDatabase();

    const payment = await this.getPaymentById(paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }

    const debt = await this.getDebtById(payment.debtId);
    if (!debt) {
      throw new Error("Associated debt not found");
    }

    // Update the payment
    await this.updatePayment(paymentId, updates);

    // If the payment has a linked transaction, update it as well
    if (payment.linkedTransactionId) {
      const transactionUpdates: string[] = [];
      const values: any[] = [];

      if (updates.amount !== undefined) {
        transactionUpdates.push("amount = ?");
        values.push(updates.amount);
        transactionUpdates.push("description = ?");
        values.push(`Debt Payment: ${debt.name}`);
      }

      if (updates.paymentDate !== undefined) {
        transactionUpdates.push("date = ?");
        values.push(updates.paymentDate);
      }

      if (transactionUpdates.length > 0) {
        transactionUpdates.push("sync_updated_at = ?");
        values.push(Date.now());
        values.push(payment.linkedTransactionId);

        await database.runAsync(`UPDATE transactions SET ${transactionUpdates.join(", ")} WHERE id = ?`, values);
      }
    }

    // Update debt balance if payment amount changed
    if (updates.amount !== undefined && updates.amount !== payment.amount) {
      const balanceChange = payment.amount - updates.amount;
      const rawNewBalance = Math.max(
        0,
        Math.min(
          debt.totalAmount,
          Math.round((debt.currentBalance + balanceChange) * 100) / 100
        )
      );
      const finalBalance = rawNewBalance < 0.01 ? 0 : rawNewBalance;
      const now = new Date().toISOString();
      await database.runAsync(
        `UPDATE debts SET current_balance = ?, updated_at = ?, sync_updated_at = ? WHERE id = ?`,
        [finalBalance, now, Date.now(), payment.debtId]
      );
    }
  }

  // Analytics and Statistics
  async getDebtSummary(): Promise<{
    totalDebt: number;
    totalPaid: number;
    activeDebts: number;
    paidOffDebts: number;
    monthlyMinimumPayments: number;
  }> {
    await this.reconcileDebtBalances();
    const database = this.db.getDatabase();

    const summaryResult = (await database.getFirstAsync(`
      SELECT 
        COALESCE(SUM(CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END), 0) as totalDebt,
        COALESCE(SUM(total_amount - current_balance), 0) as totalPaid,
        COUNT(CASE WHEN current_balance > 0 THEN 1 END) as activeDebts,
        COUNT(CASE WHEN current_balance = 0 THEN 1 END) as paidOffDebts,
        COALESCE(SUM(CASE WHEN current_balance > 0 AND minimum_payment IS NOT NULL THEN minimum_payment ELSE 0 END), 0) as monthlyMinimumPayments
      FROM debts
    `)) as {
      totalDebt: number;
      totalPaid: number;
      activeDebts: number;
      paidOffDebts: number;
      monthlyMinimumPayments: number;
    } | null;

    return (
      summaryResult || {
        totalDebt: 0,
        totalPaid: 0,
        activeDebts: 0,
        paidOffDebts: 0,
        monthlyMinimumPayments: 0,
      }
    );
  }

  async getPaymentHistory(startDate?: string, endDate?: string): Promise<DebtPayment[]> {
    const database = this.db.getDatabase();
    let query = "SELECT * FROM debt_payments";
    const params: string[] = [];

    if (startDate || endDate) {
      query += " WHERE";
      const conditions: string[] = [];

      if (startDate) {
        conditions.push(" payment_date >= ?");
        params.push(startDate);
      }
      if (endDate) {
        conditions.push(" payment_date <= ?");
        params.push(endDate);
      }

      query += conditions.join(" AND");
    }

    query += " ORDER BY payment_date DESC, created_at DESC";

    const results = (await database.getAllAsync(query, params)) as DebtPaymentTable[];
    return results.map(fromDebtPaymentTable);
  }
}
