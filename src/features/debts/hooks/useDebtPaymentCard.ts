import { AlertService } from "../../../shared/services/AlertService";
import { useState } from "react";

import { useDispatch } from "react-redux";
import { useToast } from "../../../shared/ui";

import { DebtPayment } from "../../../shared/types";
import { AppDispatch } from "../../../app/store";
interface DebtPaymentCardProps {
  payment: DebtPayment;
  onEdit?: (payment: DebtPayment) => void;
  onDelete?: (paymentId: string) => void;
}
export function useDebtPaymentCard({
  payment,
  onEdit,
  onDelete,
}: DebtPaymentCardProps) {

  const dispatch = useDispatch<AppDispatch>();
  const { showSuccess, showError } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDelete = () => {
    AlertService.alert(
      "Delete Payment",
      "Are you sure you want to delete this payment? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (onDelete) {
              onDelete(payment.id);
              showSuccess("Payment deleted successfully");
            }
          },
        },
      ],
    );
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(payment);
    }
  };

  const interestRatio =
    payment.amount > 0 ? (payment.interest || 0) / payment.amount : 0;
  return { isExpanded, setIsExpanded, handleDelete, handleEdit, interestRatio };
}

export type DebtPaymentCardController = ReturnType<typeof useDebtPaymentCard>;
