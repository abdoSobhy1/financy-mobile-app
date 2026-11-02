import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../../app/store";
import { fetchBudgets } from "../../../features/budgets/store/budgetsSlice";
import { fetchTransactions } from "../../../features/transactions/store/transactionsSlice";
import { fetchCategories } from "../../../features/categories/store/categoriesSlice";
import { fetchDebts } from "../../../features/debts/store/debtsSlice";
import { fetchSettings } from "../../../features/settings/store/settingsSlice";
import { syncService } from "../syncService";
import { CollectionName } from "../../../shared/types";

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
          case "settings":
            await dispatch(fetchSettings()).unwrap();
            break;
          case "wallets": {
            const { walletService } = await import("../../../features/wallets/services/walletService");
            await walletService.refreshCache();
            break;
          }
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
