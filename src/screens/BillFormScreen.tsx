import React from "react";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { BillForm } from "../components/forms/bill/BillForm";
import { BillStackParamList } from "../types";

type BillFormScreenRouteProp = RouteProp<BillStackParamList, "BillForm">;
type BillFormScreenNavigationProp = StackNavigationProp<BillStackParamList, "BillForm">;

const BillFormScreen: React.FC = () => {
  const route = useRoute<BillFormScreenRouteProp>();
  const navigation = useNavigation<BillFormScreenNavigationProp>();
  const { billId } = (route.params as { billId?: string }) || {};

  const bill = useSelector((state: RootState) => (billId ? state.bills.items[billId] : null));

  const handleSuccess = () => {
    // Navigate back to the bills list
    navigation.navigate("BillList");
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return <BillForm bill={bill} onSuccess={handleSuccess} onCancel={handleCancel} />;
};

export default BillFormScreen;
