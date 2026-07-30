import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../store";
import { fetchBudgets } from "../store/slices/budgetsSlice";
import { fetchTransactions } from "../store/slices/transactionsSlice";
import { fetchCategories } from "../store/slices/categoriesSlice";
import { fetchDebts } from "../store/slices/debtsSlice";
import { syncService } from "../services/syncService";
import { CollectionName } from "../types";

/**
 * Hook that listens for Firebase sync changes and refreshes Redux store accordingly
 */
export const useSyncDataRefresh = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    console.log("🔄 Registering sync data refresh hook with sync service");

    let callbackCount = 0;
    const handleDataChange = async (collectionName: CollectionName, operation: "create" | "update" | "delete", docId: string) => {
      callbackCount++;
      console.log(`🔄 [${callbackCount}] Sync detected ${operation} on ${collectionName}/${docId}, refreshing Redux store`);

      try {
        // Refresh the appropriate Redux slice based on collection
        switch (collectionName) {
          case "budgets":
            console.log(`🔄 Refreshing budgets in Redux after Firebase sync`);
            const budgets = await dispatch(fetchBudgets()).unwrap();
            console.log(`✅ Budgets refreshed, got ${budgets.length} budgets`);
            break;
          case "transactions":
            await dispatch(fetchTransactions()).unwrap();
            break;
          case "categories":
            await dispatch(fetchCategories()).unwrap();
            break;
          // bills collection removed
          case "debts":
            await dispatch(fetchDebts()).unwrap();
            break;
          default:
            console.warn(`Unknown collection for Redux refresh: ${collectionName}`);
        }

        console.log(`✅ Redux store refreshed for ${collectionName} after sync`);
      } catch (error) {
        console.error(`❌ Failed to refresh Redux store for ${collectionName}:`, error);
      }
    };

    // Register the callback with sync service
    const unsubscribe = syncService.onDataChange(handleDataChange);
    console.log("✅ Sync data refresh callback registered successfully");

    // Cleanup on unmount
    return () => {
      console.log("🧹 Cleaning up sync data refresh callback");
      unsubscribe();
    };
  }, [dispatch]);
};
