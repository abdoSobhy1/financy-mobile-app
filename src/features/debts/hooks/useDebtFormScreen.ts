import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSelector } from "react-redux";

import { RootState } from "../../../app/store";

import { DebtStackParamList } from "../../../shared/types";
type DebtFormScreenRouteProp = RouteProp<DebtStackParamList, "DebtForm">;
type DebtFormScreenNavigationProp = StackNavigationProp<DebtStackParamList, "DebtForm">;
export function useDebtFormScreen() {

  const route = useRoute<DebtFormScreenRouteProp>();
  const navigation = useNavigation<DebtFormScreenNavigationProp>();
  const { debtId } = (route.params as { debtId?: string; }) || {};

  const debt = useSelector((state: RootState) => (debtId && state.debts ? state.debts.items[debtId] : null));

  const handleSuccess = () => {
    // Navigate back to the debt list
    navigation.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
  };
  return { debt, handleSuccess, handleCancel };
}

export type DebtFormScreenController = ReturnType<typeof useDebtFormScreen>;
