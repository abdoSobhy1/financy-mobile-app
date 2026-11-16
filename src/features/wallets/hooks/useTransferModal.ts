import { useState, useEffect, useRef } from "react";
import { TextInput } from "react-native";

import { useDispatch, useSelector } from "react-redux";
import { WalletAccount } from "../../../shared/types";

import { useToast } from "../../../shared/ui";
import { AppDispatch, RootState } from "../../../app/store";
import { fetchTransactions } from "../../transactions/store/transactionsSlice";
import { walletService } from "../services/walletService";
import { formatCurrency } from "../../../shared/utils";
import { useUnsavedChanges } from "../../../shared/hooks";
export interface TransferModalProps {
  visible: boolean;
  onClose: () => void;
  wallets: WalletAccount[];
  initialFromWalletId?: string;
  initialToWalletId?: string;
  onSuccess?: (fromId: string, toId: string, amount: number) => Promise<void> | void;
}
export function useTransferModal({
  visible,
  onClose,
  wallets,
  initialFromWalletId,
  initialToWalletId,
  onSuccess,
}: TransferModalProps) {

  const dispatch = useDispatch<AppDispatch>();
  const { showSuccess, showError, showInfo } = useToast();

  const budgetsMap = useSelector((state: RootState) => state.budgets.items);

  const [fromWalletId, setFromWalletId] = useState<string>("");
  const [toWalletId, setToWalletId] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [transferBudgetId, setTransferBudgetId] = useState<string>("");
  const [transferError, setTransferError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const amountInputRef = useRef<TextInput>(null);

  const visibleWallets = walletService.getVisibleWallets(wallets);

  useEffect(() => {
    if (visible) {
      if (visibleWallets.length < 2) {
        showInfo("Please create another account first to make transfers.");
        onClose();
        return;
      }

      setTransferAmount("");
      setTransferBudgetId("");
      setTransferError("");
      setLoading(false);

      const defaultFrom =
        initialFromWalletId && visibleWallets.some((w) => w.id === initialFromWalletId)
          ? initialFromWalletId
          : visibleWallets[0]?.id || "";

      const defaultToCandidates = visibleWallets.filter((w) => w.id !== defaultFrom);
      const defaultTo =
        initialToWalletId &&
          initialToWalletId !== defaultFrom &&
          defaultToCandidates.some((w) => w.id === initialToWalletId)
          ? initialToWalletId
          : defaultToCandidates[0]?.id || "";

      setFromWalletId(defaultFrom);
      setToWalletId(defaultTo);
    }
  }, [visible, initialFromWalletId, initialToWalletId, wallets.length]);

  const handleFromWalletChange = (newFromId: string) => {
    setFromWalletId(newFromId);
    if (transferError) setTransferError("");

    // If destination is now the same as source, pick the first other available wallet
    if (toWalletId === newFromId) {
      const otherCandidate = visibleWallets.find((w) => w.id !== newFromId);
      if (otherCandidate) {
        setToWalletId(otherCandidate.id);
      }
    }
  };

  const handleTransferSubmit = async () => {
    const cleaned = transferAmount.trim().replace(/,/g, "");
    const amt = parseFloat(cleaned);

    if (!amt || isNaN(amt) || amt <= 0) {
      setTransferError("Please enter a valid transfer amount");
      amountInputRef.current?.focus();
      return;
    }

    if (!fromWalletId || !toWalletId || fromWalletId === toWalletId) {
      setTransferError("Source and destination accounts must be different");
      return;
    }

    setLoading(true);
    setTransferError("");

    try {
      await walletService.transferBetweenWallets(
        fromWalletId,
        toWalletId,
        amt,
        transferBudgetId || undefined,
      );

      await dispatch(fetchTransactions());

      // If budget assigned, trigger notification if over 80%
      if (transferBudgetId) {
        const targetBudget = budgetsMap[transferBudgetId];
        if (targetBudget && !targetBudget.deleted && targetBudget.alertsEnabled !== false) {
          try {
            const now = new Date();
            const isWeekly = targetBudget.period === "weekly";
            const diffToMon = (now.getDay() + 6) % 7;
            const start = isWeekly
              ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMon, 0, 0, 0, 0)
              : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            const end = isWeekly
              ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMon + 6, 23, 59, 59, 999)
              : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

            const { db } = require("../../../infrastructure/database/repositories");
            const progress = await db.budgets.getBudgetProgressForPeriod(
              targetBudget.id,
              start.toISOString(),
              end.toISOString(),
            );
            if (progress && progress.percentageUsed >= 80) {
              const NotificationService = require(
                "../../../infrastructure/notifications/notificationService"
              ).default;
              await NotificationService.getInstance().sendBudgetAlertNotification(
                targetBudget.name,
                formatCurrency(progress.spent),
                formatCurrency(targetBudget.amount),
                progress.percentageUsed,
                targetBudget.id,
              );
            }
          } catch { }
        }
      }

      showSuccess("Transfer completed successfully");
      await onSuccess?.(fromWalletId, toWalletId, amt);
      onClose();
    } catch (err: any) {
      console.error("[TransferModal] Error:", err);
      showError(err?.message || "Failed to complete transfer");
    } finally {
      setLoading(false);
    }
  };

  const { confirmExit } = useUnsavedChanges({
    hasChanges: visible && transferAmount.trim() !== "",
    title: "Discard Transfer",
    isModal: true,
    enabled: visible,
  });

  // Only wallets other than fromWalletId can be selected as destination
  const destinationOptions = visibleWallets.filter((w) => w.id !== fromWalletId);
  return { budgetsMap, fromWalletId, toWalletId, setToWalletId, transferAmount, setTransferAmount, transferBudgetId, setTransferBudgetId, transferError, setTransferError, loading, amountInputRef, visibleWallets, handleFromWalletChange, handleTransferSubmit, confirmExit, destinationOptions };
}

export type TransferModalController = ReturnType<typeof useTransferModal>;
