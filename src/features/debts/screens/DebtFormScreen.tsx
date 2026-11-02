import { useDebtFormScreen } from "../hooks/useDebtFormScreen";
import React from "react";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { SafeAreaView } from "react-native-safe-area-context";

import { DebtForm } from "../components/DebtForm";

const DebtFormScreen: React.FC = () => {
  const { debt, handleSuccess, handleCancel } = useDebtFormScreen();
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
      <DebtForm debt={debt} onSuccess={handleSuccess} onCancel={handleCancel} />
    </SafeAreaView>
  );
};

export default DebtFormScreen;
