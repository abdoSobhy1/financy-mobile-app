import { DatabaseManager } from "../index";
import { Bill, Transaction } from "../../types";
import { BillTable, transformBill, toBillTable } from "../models";
import { generateId } from "../../utils";
import { offlineFirstSync } from "../../services/OfflineFirstSync";
import { validateBillData, cleanBillData } from "../../utils/validation";
import { DateUtils } from "../../utils/dateUtils";

export class BillRepository {
  private db = DatabaseManager.getInstance();

  async createBill(bill: Omit<Bill, "id" | "createdAt" | "updatedAt">, options?: { skipSync?: boolean; useProvidedId?: string }): Promise<Bill> {
    // Validate the bill data
    validateBillData(bill);

    // Clean the bill data
    const cleanedBill = cleanBillData(bill);

    const database = this.db.getDatabase();
    const id = options?.useProvidedId || generateId();
    const now = new Date().toISOString();
    const tableData = toBillTable(cleanedBill);

    console.log("createBill: Saving bill to database", {
      id,
      originalBill: bill,
      cleanedBill,
      tableData,
      recurring: tableData.recurring,
      recurring_type: tableData.recurring_type,
      due_date: tableData.due_date,
    });

    await database.runAsync(
      `INSERT INTO bills (
        id, name, amount, due_date, paid, budget_id, category_id,
        recurring, recurring_type, created_at, updated_at, sync_updated_at, deleted, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        tableData.name,
        tableData.amount,
        tableData.due_date,
        tableData.paid,
        tableData.budget_id || null,
        tableData.category_id || null,
        tableData.recurring,
        tableData.recurring_type || null,
        now,
        now,
        tableData.sync_updated_at,
        tableData.deleted,
        tableData.sync_status,
      ]
    );

    // Get the actual bill from the database to ensure we return what was actually saved
    const savedBill = await this.getBillById(id);
    if (!savedBill) {
      throw new Error("Failed to retrieve saved bill from database");
    }

    console.log("createBill: Retrieved saved bill from database", {
      id,
      savedBill,
      due_date: savedBill.dueDate,
      recurring: savedBill.recurring,
      recurringType: savedBill.recurringType,
    });

    // Log operation for offline-first sync (never fails)
    if (!options?.skipSync) {
      await offlineFirstSync.logOperation("bills", id, "insert", savedBill);
    }

    return savedBill;
  }

  async getBillById(id: string): Promise<Bill | null> {
    const database = this.db.getDatabase();
    const result = (await database.getFirstAsync("SELECT * FROM bills WHERE id = ?", [id])) as BillTable | null;

    console.log("getBillById: Raw database result", {
      id,
      result,
      due_date: result?.due_date,
      recurring: result?.recurring,
      recurring_type: result?.recurring_type,
    });

    return result ? transformBill(result) : null;
  }

  async getAllBills(): Promise<Bill[]> {
    try {
      await this.db.ensureInitialized();
      const database = this.db.getDatabase();
      const results = (await database.getAllAsync("SELECT * FROM bills ORDER BY due_date ASC")) as BillTable[];

      return results.map(transformBill);
    } catch (error) {
      console.error("Error in getAllBills:", error);
      throw error;
    }
  }

  async updateBill(id: string, updates: Partial<Omit<Bill, "id" | "createdAt">>, options?: { skipSync?: boolean }): Promise<Bill> {
    if (Object.keys(updates).length === 0) {
      throw new Error("No updates provided");
    }

    // Only validate if we're updating core bill data (not just paid status)
    if (Object.keys(updates).some((key) => key !== "paid")) {
      validateBillData(updates);
    }
    const cleanedUpdates = cleanBillData(updates);

    await this.db.ensureInitialized();
    const database = this.db.getDatabase();

    const currentBill = await this.getBillById(id);
    if (!currentBill) {
      throw new Error("Bill not found");
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (cleanedUpdates.name !== undefined) {
      updateFields.push("name = ?");
      updateValues.push(cleanedUpdates.name);
    }

    if (cleanedUpdates.amount !== undefined) {
      updateFields.push("amount = ?");
      updateValues.push(cleanedUpdates.amount);
    }

    if (cleanedUpdates.dueDate !== undefined) {
      updateFields.push("due_date = ?");
      // Ensure dueDate is always stored as ISO string in database
      const dueDateString = DateUtils.isValid(cleanedUpdates.dueDate) ? DateUtils.toISOString(cleanedUpdates.dueDate) : cleanedUpdates.dueDate;
      console.log("updateBill: Converting dueDate for SQL query", {
        originalDueDate: cleanedUpdates.dueDate,
        originalType: typeof cleanedUpdates.dueDate,
        convertedDueDate: dueDateString,
      });
      updateValues.push(dueDateString);
    }

    if (cleanedUpdates.paid !== undefined) {
      updateFields.push("paid = ?");
      updateValues.push(cleanedUpdates.paid);
    }

    if (cleanedUpdates.budgetId !== undefined) {
      updateFields.push("budget_id = ?");
      updateValues.push(cleanedUpdates.budgetId || null);
    }

    if (cleanedUpdates.categoryId !== undefined) {
      updateFields.push("category_id = ?");
      updateValues.push(cleanedUpdates.categoryId);
    }

    if (cleanedUpdates.recurring !== undefined) {
      updateFields.push("recurring = ?");
      updateValues.push(cleanedUpdates.recurring);
    }

    if (cleanedUpdates.recurringType !== undefined) {
      updateFields.push("recurring_type = ?");
      updateValues.push(cleanedUpdates.recurringType || null);
    }

    if (updateFields.length === 0) {
      throw new Error("No valid updates provided");
    }

    // Add updated_at timestamp and sync fields
    updateFields.push("updated_at = ?");
    updateFields.push("sync_updated_at = ?");
    updateFields.push("sync_status = ?");
    updateValues.push(new Date().toISOString());
    updateValues.push(Date.now());
    updateValues.push("pending");

    updateValues.push(id);
    const query = `UPDATE bills SET ${updateFields.join(", ")} WHERE id = ?`;

    console.log("updateBill: Executing SQL query", {
      query,
      values: updateValues,
      updateFields,
      recurringType: cleanedUpdates.recurringType,
    });

    await database.runAsync(query, updateValues);

    // Get the actual updated bill from the database to ensure we return what was actually saved
    const updatedBill = await this.getBillById(id);
    if (!updatedBill) {
      throw new Error("Failed to retrieve updated bill from database");
    }

    console.log("updateBill: Retrieved updated bill from database", {
      id,
      updatedBill,
      due_date: updatedBill.dueDate,
      recurring: updatedBill.recurring,
      recurringType: updatedBill.recurringType,
    });

    // Log operation for offline-first sync (never fails)
    if (!options?.skipSync) {
      await offlineFirstSync.logOperation("bills", id, "update", updatedBill);
    }

    return updatedBill;
  }

  async deleteBill(id: string, options?: { skipSync?: boolean }): Promise<void> {
    await this.db.ensureInitialized();
    const database = this.db.getDatabase();

    const bill = await this.getBillById(id);
    if (!bill) {
      throw new Error("Bill not found");
    }

    await database.runAsync("DELETE FROM bills WHERE id = ?", [id]);

    // Log operation for offline-first sync (never fails)
    if (!options?.skipSync) {
      await offlineFirstSync.logOperation("bills", id, "delete", { id });
    }
  }

  async getUpcomingBills(days: number = 7): Promise<Bill[]> {
    try {
      await this.db.ensureInitialized();
      const database = this.db.getDatabase();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const results = (await database.getAllAsync("SELECT * FROM bills WHERE due_date <= ? AND paid = 0 ORDER BY due_date ASC", [
        futureDate.toISOString().split("T")[0],
      ])) as BillTable[];

      return results.map(transformBill);
    } catch (error) {
      console.error("Error in getUpcomingBills:", error);
      throw error;
    }
  }

  async getOverdueBills(): Promise<Bill[]> {
    try {
      await this.db.ensureInitialized();
      const database = this.db.getDatabase();
      const today = new Date().toISOString().split("T")[0];

      const results = (await database.getAllAsync("SELECT * FROM bills WHERE due_date < ? AND paid = 0 ORDER BY due_date ASC", [
        today,
      ])) as BillTable[];

      return results.map(transformBill);
    } catch (error) {
      console.error("Error in getOverdueBills:", error);
      throw error;
    }
  }

  async getBillsByStatus(paid: boolean): Promise<Bill[]> {
    try {
      await this.db.ensureInitialized();
      const database = this.db.getDatabase();

      const results = (await database.getAllAsync("SELECT * FROM bills WHERE paid = ? ORDER BY due_date ASC", [paid ? 1 : 0])) as BillTable[];

      return results.map(transformBill);
    } catch (error) {
      console.error("Error in getBillsByStatus:", error);
      throw error;
    }
  }

  async markBillAsPaid(id: string): Promise<void> {
    const database = this.db.getDatabase();

    // Get the bill details first
    const bill = await this.getBillById(id);
    if (!bill) {
      throw new Error("Bill not found");
    }

    // Check if bill is already paid and has a linked transaction
    if (bill.paid && bill.linkedTransactionId) {
      console.log(`Bill ${bill.name} is already paid with linked transaction ${bill.linkedTransactionId}`);
      return;
    }

    const transactionId = generateId();
    const now = new Date().toISOString();

    // Use the default "Bills & Utilities" category if bill doesn't have one
    let categoryId = bill.categoryId;
    if (!categoryId) {
      const existingCategory = (await database.getFirstAsync("SELECT id FROM categories WHERE name = ? AND type = ?", [
        "Bills & Utilities",
        "expense",
      ])) as {
        id: string;
      } | null;

      if (existingCategory) {
        categoryId = existingCategory.id;
      } else {
        // Fallback to any expense category if Bills & Utilities doesn't exist
        const fallbackCategory = (await database.getFirstAsync("SELECT id FROM categories WHERE type = ? ORDER BY name LIMIT 1", ["expense"])) as {
          id: string;
        } | null;

        if (fallbackCategory) {
          categoryId = fallbackCategory.id;
        } else {
          throw new Error("No expense category found for bill payment");
        }
      }
    }

    // Create the linked transaction
    await database.runAsync(
      `INSERT INTO transactions (
        id, description, amount, date, type, category_id, budget_id, 
        linked_bill_id, created_at, sync_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionId,
        `Bill Payment: ${bill.name}`,
        bill.amount,
        now,
        "expense",
        categoryId,
        bill.budgetId || null,
        id, // Link to this bill
        now,
        Date.now(),
      ]
    );

    // Update the bill to mark as paid and link to transaction
    await database.runAsync("UPDATE bills SET paid = 1, linked_transaction_id = ?, updated_at = ?, sync_updated_at = ? WHERE id = ?", [
      transactionId,
      now,
      Date.now(),
      id,
    ]);

    // Log sync operations for both transaction and bill update
    const updatedBill = await this.getBillById(id);
    if (updatedBill) {
      await offlineFirstSync.logOperation("bills", id, "update", updatedBill);
    }

    // Get the created transaction and log it for sync
    const createdTransaction = await database.getFirstAsync("SELECT * FROM transactions WHERE id = ?", [transactionId]);
    if (createdTransaction) {
      await offlineFirstSync.logOperation("transactions", transactionId, "insert", createdTransaction);
    }

    console.log(`Bill ${bill.name} marked as paid with linked transaction ${transactionId}`);
  }

  async markBillAsUnpaid(id: string): Promise<void> {
    const database = this.db.getDatabase();

    // Get the bill details first
    const bill = await this.getBillById(id);
    if (!bill) {
      throw new Error("Bill not found");
    }

    // If there's a linked transaction, delete it
    if (bill.linkedTransactionId) {
      await database.runAsync("DELETE FROM transactions WHERE id = ?", [bill.linkedTransactionId]);
      // Log transaction deletion for sync
      await offlineFirstSync.logOperation("transactions", bill.linkedTransactionId, "delete", { id: bill.linkedTransactionId });
      console.log(`Deleted linked transaction ${bill.linkedTransactionId} for bill ${bill.name}`);
    }

    // Update the bill to mark as unpaid and remove transaction link
    const now = new Date().toISOString();
    await database.runAsync("UPDATE bills SET paid = 0, linked_transaction_id = NULL, updated_at = ?, sync_updated_at = ? WHERE id = ?", [
      now,
      Date.now(),
      id,
    ]);

    // Log bill update for sync
    const updatedBill = await this.getBillById(id);
    if (updatedBill) {
      await offlineFirstSync.logOperation("bills", id, "update", updatedBill);
    }

    console.log(`Bill ${bill.name} marked as unpaid and unlinked from transaction`);
  }

  // Helper function to sync bill and transaction updates
  async updateBillAndTransaction(billId: string, updates: Partial<Omit<Bill, "id" | "createdAt" | "updatedAt">>): Promise<void> {
    const database = this.db.getDatabase();

    const bill = await this.getBillById(billId);
    if (!bill) {
      throw new Error("Bill not found");
    }

    // Update the bill
    await this.updateBill(billId, updates);

    // If the bill has a linked transaction, update it as well
    if (bill.linkedTransactionId) {
      const transactionUpdates: string[] = [];
      const values: any[] = [];

      if (updates.name !== undefined) {
        transactionUpdates.push("description = ?");
        values.push(`Bill Payment: ${updates.name}`);
      }

      if (updates.amount !== undefined) {
        transactionUpdates.push("amount = ?");
        values.push(updates.amount);
      }

      if (updates.categoryId !== undefined) {
        transactionUpdates.push("category_id = ?");
        values.push(updates.categoryId);
      }

      if (updates.budgetId !== undefined) {
        transactionUpdates.push("budget_id = ?");
        values.push(updates.budgetId);
      }

      if (transactionUpdates.length > 0) {
        transactionUpdates.push("sync_updated_at = ?");
        values.push(Date.now());
        values.push(bill.linkedTransactionId);

        await database.runAsync(`UPDATE transactions SET ${transactionUpdates.join(", ")} WHERE id = ?`, values);

        console.log(`Updated linked transaction ${bill.linkedTransactionId} for bill ${bill.name}`);
      }
    }
  }

  // Helper function to delete bill and its linked transaction
  async deleteBillAndTransaction(id: string): Promise<void> {
    const database = this.db.getDatabase();

    const bill = await this.getBillById(id);
    if (!bill) {
      throw new Error("Bill not found");
    }

    // Delete linked transaction first
    if (bill.linkedTransactionId) {
      await database.runAsync("DELETE FROM transactions WHERE id = ?", [bill.linkedTransactionId]);
      console.log(`Deleted linked transaction ${bill.linkedTransactionId} for bill ${bill.name}`);
    }

    // Delete the bill
    await this.deleteBill(id);
    console.log(`Deleted bill ${bill.name} and its linked transaction`);
  }

  async getBillStats(): Promise<{
    totalBills: number;
    paidBills: number;
    unpaidBills: number;
    overdueBills: number;
    totalAmount: number;
    paidAmount: number;
    unpaidAmount: number;
  }> {
    await this.db.ensureInitialized();
    const database = this.db.getDatabase();
    const today = new Date().toISOString().split("T")[0];

    const result = (await database.getFirstAsync(
      `
      SELECT 
        COUNT(*) as totalBills,
        SUM(CASE WHEN paid = 1 THEN 1 ELSE 0 END) as paidBills,
        SUM(CASE WHEN paid = 0 THEN 1 ELSE 0 END) as unpaidBills,
        SUM(CASE WHEN paid = 0 AND due_date < ? THEN 1 ELSE 0 END) as overdueBills,
        SUM(amount) as totalAmount,
        SUM(CASE WHEN paid = 1 THEN amount ELSE 0 END) as paidAmount,
        SUM(CASE WHEN paid = 0 THEN amount ELSE 0 END) as unpaidAmount
      FROM bills
    `,
      [today]
    )) as {
      totalBills: number;
      paidBills: number;
      unpaidBills: number;
      overdueBills: number;
      totalAmount: number;
      paidAmount: number;
      unpaidAmount: number;
    };

    return {
      totalBills: result.totalBills || 0,
      paidBills: result.paidBills || 0,
      unpaidBills: result.unpaidBills || 0,
      overdueBills: result.overdueBills || 0,
      totalAmount: result.totalAmount || 0,
      paidAmount: result.paidAmount || 0,
      unpaidAmount: result.unpaidAmount || 0,
    };
  }

  async getRecurringBills(): Promise<Bill[]> {
    try {
      await this.db.ensureInitialized();
      const database = this.db.getDatabase();

      const results = (await database.getAllAsync("SELECT * FROM bills WHERE recurring = 1 ORDER BY due_date ASC")) as BillTable[];

      return results.map(transformBill);
    } catch (error) {
      console.error("Error in getRecurringBills:", error);
      throw error;
    }
  }

  async createRecurringBillInstance(originalBillId: string): Promise<Bill> {
    const originalBill = await this.getBillById(originalBillId);
    if (!originalBill) {
      throw new Error("Original bill not found");
    }

    if (!originalBill.recurring) {
      throw new Error("Bill is not recurring");
    }

    // Calculate next due date based on recurring type
    let nextDueDate = new Date(originalBill.dueDate);

    switch (originalBill.recurringType) {
      case "weekly":
        nextDueDate.setDate(nextDueDate.getDate() + 7);
        break;
      case "monthly":
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        break;
      case "yearly":
        nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
        break;
      default:
        nextDueDate.setMonth(nextDueDate.getMonth() + 1); // Default to monthly
    }

    return await this.createBill({
      name: originalBill.name,
      amount: originalBill.amount,
      dueDate: nextDueDate.toISOString().split("T")[0],
      paid: false,
      budgetId: originalBill.budgetId,
      categoryId: originalBill.categoryId,
      recurring: originalBill.recurring,
      recurringType: originalBill.recurringType,
      syncUpdatedAt: Date.now(),
    });
  }
}
