import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { SettingsStackParamList } from "../../../shared/types";
import { db } from "../../../infrastructure/database/repositories";

type ImportScreenNavigationProp = StackNavigationProp<SettingsStackParamList, "Import">;

/** Owns screen state and actions; rendering stays in ImportScreen. */
export function useImportScreen() {

  const navigation = useNavigation<ImportScreenNavigationProp>();

  // Test database connectivity on mount
  useEffect(() => {
    const testDatabase = async () => {
      try {
        console.log("Testing database connectivity...");
        const transactions = await db.transactions.getAllTransactions();
        console.log(`Database test: Found ${transactions.length} existing transactions`);
      } catch (error) {
        console.error("Database test failed:", error);
      }
    };

    testDatabase();
  }, []);

  const handleClose = () => {
    navigation.goBack();
  };

  const handleSuccess = (result: any) => {
    console.log("Import completed successfully:", result);
    // Don't navigate back automatically - let user see results first
    // navigation.goBack() will be called when user closes the results step
  };
  return {
    handleClose,
    handleSuccess
  };
}
