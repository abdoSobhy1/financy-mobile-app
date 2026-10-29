import { Platform, ActionSheetIOS } from "react-native";
import { useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { AppDispatch } from "../store";
import { Transaction } from "../types";
import { AlertService } from "../services/AlertService";
import {
  deleteTransaction,
  duplicateTransaction,
} from "../store/slices/transactionsSlice";
import { fetchDebts } from "../store/slices/debtsSlice";
import { fetchBudgets } from "../store/slices/budgetsSlice";

import { isWalletRelatedTransaction } from "../utils";
export { isWalletRelatedTransaction };

export const useTransactionActions = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();

  const handleEdit = (transaction: Transaction) => {
    if (isWalletRelatedTransaction(transaction)) {
      AlertService.alert("Notice", "Wallet-related transactions cannot be edited directly.");
      return;
    }
    navigation.navigate("AddTransaction" as never, {
      editTransaction: transaction,
    } as never);
  };

  const handleDuplicate = async (transaction: Transaction) => {
    if (isWalletRelatedTransaction(transaction)) {
      AlertService.alert("Notice", "Wallet-related transactions cannot be duplicated.");
      return;
    }
    try {
      await dispatch(duplicateTransaction(transaction.id)).unwrap();
    } catch (err) {
      console.error("Failed to duplicate transaction:", err);
    }
  };

  const handleDelete = (transaction: Transaction) => {
    AlertService.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await dispatch(deleteTransaction(transaction.id));
            dispatch(fetchBudgets());
            if (transaction.linkedDebtPaymentId) {
              dispatch(fetchDebts());
            }
          },
        },
      ],
    );
  };

  const handleTransactionPress = (transaction: Transaction) => {
    const isWalletRelated = isWalletRelatedTransaction(transaction);

    if (Platform.OS === "ios") {
      const options = isWalletRelated
        ? ["Cancel", "Delete"]
        : ["Cancel", "Edit", "Duplicate", "Delete"];
      const destructiveIndex = isWalletRelated ? 1 : 3;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: destructiveIndex,
          cancelButtonIndex: 0,
          title: transaction.description || "Transaction",
        },
        (buttonIndex) => {
          if (isWalletRelated) {
            if (buttonIndex === 1) handleDelete(transaction);
          } else {
            if (buttonIndex === 1) handleEdit(transaction);
            if (buttonIndex === 2) handleDuplicate(transaction);
            if (buttonIndex === 3) handleDelete(transaction);
          }
        },
      );
    } else {
      const alertButtons: any[] = [];
      if (!isWalletRelated) {
        alertButtons.push({ text: "Edit", onPress: () => handleEdit(transaction) });
        alertButtons.push({ text: "Duplicate", onPress: () => handleDuplicate(transaction) });
      }
      alertButtons.push({
        text: "Delete",
        onPress: () => handleDelete(transaction),
        style: "destructive",
      });
      alertButtons.push({ text: "Cancel", style: "cancel" });

      AlertService.alert(
        transaction.description || "Transaction",
        "What would you like to do?",
        alertButtons,
      );
    }
  };

  return {
    handleTransactionPress,
    handleEdit,
    handleDuplicate,
    handleDelete,
  };
};
