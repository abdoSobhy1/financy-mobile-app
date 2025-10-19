import { BillPayment, BillPaymentHistory, Bill } from "../types";
import { DatabaseManager } from "../database";
import AsyncStorage from "@react-native-async-storage/async-storage";

export class BillPaymentService {
  private static instance: BillPaymentService;
  private db: DatabaseManager;

  private constructor() {
    this.db = DatabaseManager.getInstance();
  }

  public static getInstance(): BillPaymentService {
    if (!BillPaymentService.instance) {
      BillPaymentService.instance = new BillPaymentService();
    }
    return BillPaymentService.instance;
  }

  /**
   * Record a bill payment
   */
  async recordPayment(payment: Omit<BillPayment, "id" | "createdAt" | "updatedAt" | "syncUpdatedAt">): Promise<BillPayment> {
    const now = new Date().toISOString();
    const newPayment: BillPayment = {
      id: `bill_payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...payment,
      createdAt: now,
      updatedAt: now,
      syncUpdatedAt: Date.now(),
      syncStatus: "pending",
    };

    try {
      await this.db.ensureInitialized();
      const database = this.db.getDatabase();

      await database.runAsync(
        `INSERT INTO bill_payments (
          id, bill_id, amount, payment_date, payment_method, transaction_id, note, 
          created_at, updated_at, sync_updated_at, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newPayment.id,
          newPayment.billId,
          newPayment.amount,
          newPayment.paymentDate,
          newPayment.paymentMethod || null,
          newPayment.transactionId || null,
          newPayment.note || null,
          newPayment.createdAt,
          newPayment.updatedAt,
          newPayment.syncUpdatedAt,
          newPayment.syncStatus || "pending",
        ]
      );

      // Update bill's last paid date
      await this.updateBillLastPaidDate(newPayment.billId, newPayment.paymentDate);

      return newPayment;
    } catch (error) {
      console.error("Error recording bill payment:", error);
      throw new Error("Failed to record bill payment");
    }
  }

  /**
   * Get payment history for a specific bill
   */
  async getPaymentHistory(billId: string): Promise<BillPaymentHistory> {
    try {
      await this.db.ensureInitialized();
      const database = this.db.getDatabase();

      // Get all payments for the bill
      const paymentsResult = await database.getAllAsync(
        `SELECT * FROM bill_payments 
         WHERE bill_id = ? AND (deleted IS NULL OR deleted = 0)
         ORDER BY payment_date DESC`,
        [billId]
      );

      const payments: BillPayment[] = paymentsResult.map((row: any) => ({
        id: row.id,
        billId: row.bill_id,
        amount: row.amount,
        paymentDate: row.payment_date,
        paymentMethod: row.payment_method,
        transactionId: row.transaction_id,
        note: row.note,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        syncUpdatedAt: row.sync_updated_at,
        deleted: row.deleted,
        syncStatus: row.sync_status,
      }));

      // Calculate total paid
      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

      // Get the bill to calculate upcoming payments
      const bill = await database.getFirstAsync("SELECT * FROM bills WHERE id = ? AND (deleted IS NULL OR deleted = 0)", [billId]);

      const upcomingPayments = await this.calculateUpcomingPayments(bill);

      return {
        billId,
        payments,
        totalPaid,
        lastPaymentDate: payments.length > 0 ? payments[0].paymentDate : undefined,
        upcomingPayments,
      };
    } catch (error) {
      console.error("Error getting payment history:", error);
      throw new Error("Failed to get payment history");
    }
  }

  /**
   * Get all bill payments within a date range
   */
  async getPaymentsInRange(startDate: string, endDate: string): Promise<BillPayment[]> {
    try {
      await this.db.ensureInitialized();
      const database = this.db.getDatabase();

      const result = await database.getAllAsync(
        `SELECT * FROM bill_payments 
         WHERE payment_date BETWEEN ? AND ? 
         AND (deleted IS NULL OR deleted = 0)
         ORDER BY payment_date DESC`,
        [startDate, endDate]
      );

      return result.map((row: any) => ({
        id: row.id,
        billId: row.bill_id,
        amount: row.amount,
        paymentDate: row.payment_date,
        paymentMethod: row.payment_method,
        transactionId: row.transaction_id,
        note: row.note,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        syncUpdatedAt: row.sync_updated_at,
        deleted: row.deleted,
        syncStatus: row.sync_status,
      }));
    } catch (error) {
      console.error("Error getting payments in range:", error);
      throw new Error("Failed to get payments in range");
    }
  }

  /**
   * Update a bill payment
   */
  async updatePayment(paymentId: string, updates: Partial<BillPayment>): Promise<BillPayment> {
    try {
      await this.db.ensureInitialized();
      const database = this.db.getDatabase();

      const now = new Date().toISOString();
      const syncUpdatedAt = Date.now();

      // Get current payment
      const current = (await database.getFirstAsync("SELECT * FROM bill_payments WHERE id = ?", [paymentId])) as any;

      if (!current) {
        throw new Error("Payment not found");
      }

      const updated = {
        ...current,
        ...updates,
        updated_at: now,
        sync_updated_at: syncUpdatedAt,
        sync_status: "pending",
      };

      await database.runAsync(
        `UPDATE bill_payments SET 
         amount = ?, payment_date = ?, payment_method = ?, transaction_id = ?, note = ?,
         updated_at = ?, sync_updated_at = ?, sync_status = ?
         WHERE id = ?`,
        [
          updated.amount,
          updated.payment_date,
          updated.payment_method || null,
          updated.transaction_id || null,
          updated.note || null,
          updated.updated_at,
          updated.sync_updated_at,
          updated.sync_status,
          paymentId,
        ]
      );

      return {
        id: updated.id,
        billId: updated.bill_id,
        amount: updated.amount,
        paymentDate: updated.payment_date,
        paymentMethod: updated.payment_method,
        transactionId: updated.transaction_id,
        note: updated.note,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
        syncUpdatedAt: updated.sync_updated_at,
        deleted: updated.deleted,
        syncStatus: updated.sync_status,
      };
    } catch (error) {
      console.error("Error updating bill payment:", error);
      throw new Error("Failed to update bill payment");
    }
  }

  /**
   * Delete a bill payment (soft delete)
   */
  async deletePayment(paymentId: string): Promise<void> {
    try {
      await this.db.ensureInitialized();
      const database = this.db.getDatabase();

      const now = new Date().toISOString();
      const syncUpdatedAt = Date.now();

      await database.runAsync(
        `UPDATE bill_payments SET 
         deleted = 1, updated_at = ?, sync_updated_at = ?, sync_status = ?
         WHERE id = ?`,
        [now, syncUpdatedAt, "pending", paymentId]
      );
    } catch (error) {
      console.error("Error deleting bill payment:", error);
      throw new Error("Failed to delete bill payment");
    }
  }

  /**
   * Calculate upcoming payments for a bill
   */
  private async calculateUpcomingPayments(
    bill: any
  ): Promise<Array<{ dueDate: string; amount: number; status: "upcoming" | "due" | "overdue" | "paid" | "skipped" }>> {
    if (!bill || !bill.due_date) {
      return [];
    }

    const upcoming: Array<{ dueDate: string; amount: number; status: "upcoming" | "due" | "overdue" | "paid" | "skipped" }> = [];
    const today = new Date();
    const dueDate = new Date(bill.due_date);

    // If bill is overdue
    if (dueDate < today) {
      upcoming.push({
        dueDate: bill.due_date,
        amount: bill.amount,
        status: "overdue",
      });
    } else if (dueDate.toDateString() === today.toDateString()) {
      // If due today
      upcoming.push({
        dueDate: bill.due_date,
        amount: bill.amount,
        status: "due",
      });
    } else {
      // If upcoming
      upcoming.push({
        dueDate: bill.due_date,
        amount: bill.amount,
        status: "upcoming",
      });
    }

    return upcoming;
  }

  /**
   * Update bill's last paid date
   */
  private async updateBillLastPaidDate(billId: string, paymentDate: string): Promise<void> {
    try {
      const database = this.db.getDatabase();
      const syncUpdatedAt = Date.now();
      const now = new Date().toISOString();

      await database.runAsync(
        `UPDATE bills SET 
         last_paid_date = ?, updated_at = ?, sync_updated_at = ?, sync_status = ?
         WHERE id = ?`,
        [paymentDate, now, syncUpdatedAt, "pending", billId]
      );
    } catch (error) {
      console.error("Error updating bill last paid date:", error);
      // Don't throw here as the payment was already recorded
    }
  }

  /**
   * Get payment statistics for a date range
   */
  async getPaymentStats(
    startDate: string,
    endDate: string
  ): Promise<{
    totalPaid: number;
    paymentCount: number;
    averagePayment: number;
    paymentsByMethod: Record<string, number>;
  }> {
    try {
      const payments = await this.getPaymentsInRange(startDate, endDate);

      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const paymentCount = payments.length;
      const averagePayment = paymentCount > 0 ? totalPaid / paymentCount : 0;

      const paymentsByMethod: Record<string, number> = {};
      payments.forEach((payment) => {
        const method = payment.paymentMethod || "Unknown";
        paymentsByMethod[method] = (paymentsByMethod[method] || 0) + payment.amount;
      });

      return {
        totalPaid,
        paymentCount,
        averagePayment,
        paymentsByMethod,
      };
    } catch (error) {
      console.error("Error getting payment stats:", error);
      throw new Error("Failed to get payment statistics");
    }
  }
}

export default BillPaymentService;
