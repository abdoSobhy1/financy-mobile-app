import { useEffect, useState, useCallback } from "react";

import { useDispatch, useSelector } from "react-redux";

import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { RootState, AppDispatch } from "../../../app/store";
import { fetchDebts } from "../store/debtsSlice";
import { DebtStackParamList } from "../../../shared/types";

type DebtsScreenNavigationProp = StackNavigationProp<
  DebtStackParamList,
  "DebtsList"
>;

/** Owns screen state and actions; rendering stays in DebtsScreen. */
export function useDebtsScreen() {

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<DebtsScreenNavigationProp>();

  const { items, ids, loading } = useSelector(
    (state: RootState) => state.debts
  );

  useEffect(() => {
    dispatch(fetchDebts());
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchDebts());
    }, [dispatch])
  );

  const debts = ids
    .map((id) => items[id])
    .filter((d) => d && !d.deleted);

  // Compute real stats using debt.type ("owed_to_me" vs "i_owe")
  const iOweList = debts.filter((d) => d.type !== "owed_to_me" && d.currentBalance > 0.005);
  const owedToMeList = debts.filter((d) => d.type === "owed_to_me" && d.currentBalance > 0.005);
  const overdueList = debts.filter(
    (d) =>
      d.currentBalance > 0.005 && d.dueDate && new Date(d.dueDate) < new Date()
  );

  const totalYouOwe = iOweList.reduce((sum, d) => sum + d.currentBalance, 0);
  const totalOwedToYou = owedToMeList.reduce(
    (sum, d) => sum + Math.abs(d.currentBalance),
    0
  );
  const netPosition = totalOwedToYou - totalYouOwe;

  const [filter, setFilter] = useState<
    "All Debts" | "Owed to Me" | "I Owe" | "Overdue" | "Paid Off"
  >("All Debts");

  const filteredDebts = debts.filter((d) => {
    if (filter === "Owed to Me") return d.type === "owed_to_me";
    if (filter === "I Owe") return d.type !== "owed_to_me";
    if (filter === "Overdue")
      return (
        d.currentBalance > 0.005 && d.dueDate && new Date(d.dueDate) < new Date()
      );
    if (filter === "Paid Off") return d.currentBalance <= 0.005;
    return true;
  });
  return {
    navigation,
    loading,
    iOweList,
    owedToMeList,
    overdueList,
    totalYouOwe,
    totalOwedToYou,
    netPosition,
    filter,
    setFilter,
    filteredDebts
  };
}

export type DebtsScreenController = ReturnType<typeof useDebtsScreen>;
