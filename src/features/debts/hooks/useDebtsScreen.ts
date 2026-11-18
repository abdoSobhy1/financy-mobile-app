import { useEffect, useState, useCallback } from "react";

import { useDispatch, useSelector } from "react-redux";

import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { RootState, AppDispatch } from "../../../app/store";
import { fetchDebts } from "../store/debtsSlice";
import { DebtStackParamList } from "../../../shared/types";
import { isZeroMoney, subtractMoney, sumMoney } from "../../../shared/utils";

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
  const iOweList = debts.filter((d) => d.type !== "owed_to_me" && !isZeroMoney(d.currentBalance));
  const owedToMeList = debts.filter((d) => d.type === "owed_to_me" && !isZeroMoney(d.currentBalance));
  const overdueList = debts.filter(
    (d) =>
      !isZeroMoney(d.currentBalance) && d.dueDate && new Date(d.dueDate) < new Date()
  );

  const totalYouOwe = sumMoney(iOweList, (d) => d.currentBalance);
  const totalOwedToYou = sumMoney(
    owedToMeList,
    (d) => Math.abs(d.currentBalance)
  );
  const netPosition = subtractMoney(totalOwedToYou, totalYouOwe);

  const [filter, setFilter] = useState<
    "All Debts" | "Owed to Me" | "I Owe" | "Overdue" | "Paid Off"
  >("All Debts");

  const filteredDebts = debts.filter((d) => {
    if (filter === "Owed to Me") return d.type === "owed_to_me";
    if (filter === "I Owe") return d.type !== "owed_to_me";
    if (filter === "Overdue")
      return (
        !isZeroMoney(d.currentBalance) && d.dueDate && new Date(d.dueDate) < new Date()
      );
    if (filter === "Paid Off") return isZeroMoney(d.currentBalance);
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
