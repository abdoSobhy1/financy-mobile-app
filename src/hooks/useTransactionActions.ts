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

export const useTransactionActions = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();

  const handleEdit = (transaction: Transaction) => {
    navigation.navigate("AddTransaction" as never, {
      editTransaction: transaction,
    } as never);
  };

  const handleDuplicate = async (transaction: Transaction) => {
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
          },
        },
      ],
    );
  };

  const handleTransactionPress = (transaction: Transaction) => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Edit", "Duplicate", "Delete"],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
          title: transaction.description || "Transaction",
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleEdit(transaction);
          if (buttonIndex === 2) handleDuplicate(transaction);
          if (buttonIndex === 3) handleDelete(transaction);
        },
      );
    } else {
      AlertService.alert(
        transaction.description || "Transaction",
        "What would you like to do?",
        [
          { text: "Edit", onPress: () => handleEdit(transaction) },
          { text: "Duplicate", onPress: () => handleDuplicate(transaction) },
          {
            text: "Delete",
            onPress: () => handleDelete(transaction),
            style: "destructive",
          },
          { text: "Cancel", style: "cancel" },
        ],
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
