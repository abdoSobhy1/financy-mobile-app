import { useState, useEffect, useRef } from "react";
import { TextInput } from "react-native";

import { useDispatch } from "react-redux";
import { WalletAccount } from "../../../shared/types";

import { useToast } from "../../../shared/ui";
import { AppDispatch } from "../../../app/store";
import { fetchTransactions } from "../../transactions/store/transactionsSlice";
import { walletService } from "../services/walletService";
import { parseMoneyInput } from "../../../shared/utils";
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

  const [fromWalletId, setFromWalletId] = useState<string>("");
  const [toWalletId, setToWalletId] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
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

    if (toWalletId === newFromId) {
      const otherCandidate = visibleWallets.find((w) => w.id !== newFromId);
      if (otherCandidate) {
        setToWalletId(otherCandidate.id);
      }
    }
  };

  const handleTransferSubmit = async () => {
    const amt = parseMoneyInput(transferAmount);

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
      await walletService.transferBetweenWallets(fromWalletId, toWalletId, amt);
      await dispatch(fetchTransactions());

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

  const destinationOptions = visibleWallets.filter((w) => w.id !== fromWalletId);
  return {
    fromWalletId,
    toWalletId,
    setToWalletId,
    transferAmount,
    setTransferAmount,
    transferError,
    setTransferError,
    loading,
    amountInputRef,
    visibleWallets,
    handleFromWalletChange,
    handleTransferSubmit,
    confirmExit,
    destinationOptions,
  };
}

export type TransferModalController = ReturnType<typeof useTransferModal>;
