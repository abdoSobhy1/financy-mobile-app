import React, { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Screen } from "../components/ui";
import { ImportWizard } from "../components/ImportWizard";
import { SettingsStackParamList } from "../types";
import { db } from "../database/queries";

type ImportScreenNavigationProp = StackNavigationProp<SettingsStackParamList, "Import">;

export const ImportScreen: React.FC = () => {
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

  return (
    <Screen style={{ flex: 1 }}>
      <ImportWizard visible={true} onClose={handleClose} onSuccess={handleSuccess} fullScreen={true} />
    </Screen>
  );
};
