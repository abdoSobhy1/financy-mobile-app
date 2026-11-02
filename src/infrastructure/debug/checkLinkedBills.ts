// Bills feature has been removed from Financy.
import { db } from "../database/repositories";

export const debugLinkedBillIds = async () => {
  const allTransactions = await db.transactions.getAllTransactions();
  return {
    totalTransactions: allTransactions.length,
    linkedTransactions: 0,
    nullLinkedTransactions: allTransactions.length,
    totalBills: 0,
    sampleLinkedTransactions: [],
    sampleNullTransactions: allTransactions.slice(0, 2),
  };
};
