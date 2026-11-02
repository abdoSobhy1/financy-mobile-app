import { useImportScreen } from "../hooks/useImportScreen";
import React from "react";

import { Screen } from "../../../shared/ui";
import { ImportWizard } from "../components/ImportWizard";

export const ImportScreen: React.FC = () => {
  const {
    handleClose,
    handleSuccess
  } = useImportScreen();

  return (
    <Screen style={{ flex: 1 }}>
      <ImportWizard visible={true} onClose={handleClose} onSuccess={handleSuccess} fullScreen={true} />
    </Screen>
  );
};
