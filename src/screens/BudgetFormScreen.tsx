import React from "react";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { BudgetForm } from "../components/forms/budget/BudgetForm";
import { BudgetStackParamList } from "../types";

type BudgetFormScreenRouteProp = RouteProp<BudgetStackParamList, "BudgetForm">;
type BudgetFormScreenNavigationProp = StackNavigationProp<BudgetStackParamList, "BudgetForm">;

const BudgetFormScreen: React.FC = () => {
  const route = useRoute<BudgetFormScreenRouteProp>();
  const navigation = useNavigation<BudgetFormScreenNavigationProp>();
  const { budgetId } = (route.params as { budgetId?: string }) || {};

  const budget = useSelector((state: RootState) => (budgetId && state.budgets ? state.budgets.items[budgetId] : null));

  const handleSuccess = () => {
    // Navigate back to the budget list
    navigation.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return <BudgetForm budget={budget} onSuccess={handleSuccess} onCancel={handleCancel} />;
};

export default BudgetFormScreen;
