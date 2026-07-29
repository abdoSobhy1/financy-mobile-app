// Debug script to check linked_bill_id values in transactions
import { db } from "../database/queries";

export const debugLinkedBillIds = async () => {
  try {
    console.log("🔍 Debugging linked_bill_id values...");

    // Get all transactions
    const allTransactions = await db.transactions.getAllTransactions();

    console.log("📊 Total transactions:", allTransactions.length);

    // Check for transactions with linkedBillId
    const linkedTransactions = allTransactions.filter((t) => t.linkedBillId);
    console.log("🔗 Transactions with linkedBillId:", linkedTransactions.length);

    if (linkedTransactions.length > 0) {
      console.log(
        "💳 Linked transactions:",
        linkedTransactions.map((t) => ({
          id: t.id,
          description: t.description,
          amount: t.amount,
          linkedBillId: t.linkedBillId,
          date: t.date,
          syncStatus: t.syncStatus,
        }))
      );
    }

    // Bills data removed - skip bill checks
    const allBills: any[] = [];
    console.log("📋 Bills feature removed. Skipping bill checks.");

    // Check raw database for null/empty linkedBillId
    const nullLinkedTransactions = allTransactions.filter((t) => !t.linkedBillId);
    console.log("❌ Transactions with null/empty linkedBillId:", nullLinkedTransactions.length);

    // Show a few examples of null linked transactions
    if (nullLinkedTransactions.length > 0) {
      console.log(
        "📝 Sample null linkedBillId transactions:",
        nullLinkedTransactions.slice(0, 3).map((t) => ({
          id: t.id,
          description: t.description,
          amount: t.amount,
          date: t.date,
          type: t.type,
          syncStatus: t.syncStatus,
        }))
      );
    }

    return {
      totalTransactions: allTransactions.length,
      linkedTransactions: linkedTransactions.length,
      nullLinkedTransactions: nullLinkedTransactions.length,
      totalBills: 0,
      sampleLinkedTransactions: linkedTransactions.slice(0, 2),
      sampleNullTransactions: nullLinkedTransactions.slice(0, 2),
    };
  } catch (error) {
    console.error("❌ Debug error:", error);
    throw error;
  }
};
