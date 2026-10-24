import React, { useEffect, useState } from "react";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSelector } from "react-redux";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { SafeAreaView } from "react-native-safe-area-context";
import { RootState } from "../store";
import { DebtForm } from "../components/forms/debt/DebtForm";
import { DebtStackParamList } from "../types";

type DebtFormScreenRouteProp = RouteProp<DebtStackParamList, "DebtForm">;
type DebtFormScreenNavigationProp = StackNavigationProp<DebtStackParamList, "DebtForm">;

const DebtFormScreen: React.FC = () => {
  const route = useRoute<DebtFormScreenRouteProp>();
  const navigation = useNavigation<DebtFormScreenNavigationProp>();
  const { debtId } = (route.params as { debtId?: string }) || {};

  const debt = useSelector((state: RootState) => (debtId && state.debts ? state.debts.items[debtId] : null));

  const handleSuccess = () => {
    // Navigate back to the debt list
    navigation.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <DebtForm debt={debt} onSuccess={handleSuccess} onCancel={handleCancel} />
    </SafeAreaView>
  );
};

export default DebtFormScreen;
