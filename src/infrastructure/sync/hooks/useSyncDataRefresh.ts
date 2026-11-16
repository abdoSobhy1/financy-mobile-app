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

    let callbackCount = 0;
    const handleDataChange = async (collectionName: CollectionName, operation: "create" | "update" | "delete", docId: string) => {
      callbackCount++;

      try {
        // Refresh the appropriate Redux slice based on collection
        switch (collectionName) {
          case "budgets":
            const budgets = await dispatch(fetchBudgets()).unwrap();
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
            const { walletService } = require("../../../features/wallets/services/walletService");
            await walletService.refreshCache();
            break;
          }
          default:
            console.warn(`Unknown collection for Redux refresh: ${collectionName}`);
        }
      } catch (error) {
        console.error(`❌ Failed to refresh Redux store for ${collectionName}:`, error);
      }
    };

    // Register the callback with sync service
    const unsubscribe = syncService.onDataChange(handleDataChange);

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [dispatch]);
};
