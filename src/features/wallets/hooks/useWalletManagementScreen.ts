import { useState, useEffect, useCallback, useMemo, useRef } from "react";

import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../../app/store";
import { WalletAccount, WalletType } from "../../../shared/types";
import { walletService } from "../services/walletService";
import { fetchTransactions } from "../../transactions/store/transactionsSlice";

import { useToast } from "../../../shared/ui";
import type { WalletEditorFormValues } from "../components/WalletEditorModal";

import { AlertService } from "../../../shared/services/AlertService";

/** Owns screen state and actions; rendering stays in WalletManagementScreen. */
export function useWalletManagementScreen() {

  const dispatch = useDispatch<AppDispatch>();
  const { showSuccess, showError, showInfo } = useToast();

  const transactions = useSelector(
    (state: RootState) => state.transactions.items,
  );

  const [wallets, setWallets] = useState<WalletAccount[]>([]);
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({});
  const [activeType, setActiveType] = useState<"all" | WalletType | "secret" | "archived">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Move Modal state
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [walletToMove, setWalletToMove] = useState<WalletAccount | null>(null);
  const [destinationWalletId, setDestinationWalletId] = useState("");

  // Add / Edit Modal state
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletAccount | null>(null);

  // Transfer Modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromWalletId, setFromWalletId] = useState("");
  const [toWalletId, setToWalletId] = useState("");

  const loadWallets = useCallback(async () => {
    try {
      const list = await walletService.getWallets({ includeArchived: true });
      const allTx = Object.values(transactions).filter((t) => !t.deleted);

      setWallets(list);
      setWalletBalances(
        walletService.calculateWalletBalances(list, allTx),
      );
      const activeList = list.filter((w) => !w.archived);
      if (activeList.length >= 2) {
        setFromWalletId((prev) => prev || activeList[0].id);
        setToWalletId((prev) => prev || activeList[1].id);
      }
    } catch (e) {
      console.warn("Failed to load wallets:", e);
    }
  }, [transactions]);

  useEffect(() => {
    dispatch(fetchTransactions());
    loadWallets();
  }, [dispatch, loadWallets]);

  const totalNetWorth = useMemo(() => {
    return wallets
      .filter((w) => !walletService.isSecretWallet(w))
      .reduce((sum, w) => sum + (walletBalances[w.id] || 0), 0);
  }, [wallets, walletBalances]);

  const filteredWallets = useMemo(() => {
    if (activeType === "archived") {
      return wallets.filter((w) => w.archived);
    }
    const nonArchived = wallets.filter((w) => !w.archived);
    if (activeType === "all") return nonArchived;
    if (activeType === "secret") {
      return nonArchived.filter((w) => walletService.isSecretWallet(w));
    }
    return nonArchived.filter((w) => w.type === activeType);
  }, [wallets, activeType]);

  const openAddModal = () => {
    setEditingWallet(null);
    setShowEditorModal(true);
  };

  const openEditModal = (wallet: WalletAccount) => {
    setEditingWallet(wallet);
    setShowEditorModal(true);
  };

  const isSavingWalletRef = useRef(false);

  const handleSaveWallet = async (values: WalletEditorFormValues) => {
    if (isSavingWalletRef.current) return;

    if (!values.name.trim()) {
      showError("Please enter an account name");
      return;
    }

    isSavingWalletRef.current = true;
    const initBal = parseFloat(values.initialBalance.replace(/,/g, "")) || 0;
    try {
      if (editingWallet) {
        const enteredBal = parseFloat(values.initialBalance.replace(/,/g, "")) || 0;
        const currentBal = walletBalances[editingWallet.id] || 0;
        const diff = enteredBal - currentBal;

        if (Math.abs(diff) > 0.001) {
          const { db } = require("../../../infrastructure/database/repositories");
          await db.transactions.createTransaction({
            amount: Math.abs(diff),
            type: diff > 0 ? "income" : "expense",
            description: "Balance adjustment",
            accountId: editingWallet.id,
            date: new Date().toISOString(),
            updatedAt: Date.now(),
          });
          await dispatch(fetchTransactions());
        }

        await walletService.updateWallet(editingWallet.id, {
          name: values.name.trim(),
          type: values.type,
          icon: values.icon,
          color: values.color,
          isSecret: values.isSecret,
          initialBalance: editingWallet.initialBalance || 0,
        });
        await loadWallets();
        setShowEditorModal(false);
        showSuccess(`Reconciled and updated "${values.name.trim()}"`);
      } else {
        await walletService.addWallet({
          name: values.name.trim(),
          type: values.type,
          icon: values.icon,
          color: values.color,
          initialBalance: initBal,
          isSecret: values.isSecret,
        });
        await dispatch(fetchTransactions());
        await loadWallets();
        setShowEditorModal(false);
        showSuccess(`Created "${values.name.trim()}"`);
      }
    } catch (err) {
      console.error("[WalletManagementScreen] Failed to save account:", err);
      showError("Failed to save account");
    } finally {
      isSavingWalletRef.current = false;
    }
  };

  const handleDeleteWallet = async (wallet: WalletAccount) => {
    const activeWallets = wallets.filter((w) => !w.archived);
    if (activeWallets.length <= 1 && !wallet.archived) {
      showError("You must keep at least one active account");
      return;
    }

    const txCount = await walletService.countTransactionsForWallet(wallet.id);

    if (txCount === 0) {
      AlertService.alert(
        `Delete "${wallet.name}"?`,
        "This account has no transactions. Would you like to permanently delete it or archive it?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Archive",
            onPress: async () => {
              await walletService.archiveWallet(wallet.id);
              await loadWallets();
              showSuccess(`Archived "${wallet.name}"`);
            },
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              const { db } = require("../../../infrastructure/database/repositories");
              await db.wallets.hardDeleteWallet(wallet.id);
              await loadWallets();
              showSuccess(`Permanently deleted "${wallet.name}"`);
            },
          },
        ],
      );
    } else {
      AlertService.alert(
        `"${wallet.name}" has ${txCount} transaction${txCount > 1 ? "s" : ""}`,
        "You can archive it (keeps history and balance math) or move all its transactions to another wallet and delete it.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Archive",
            onPress: async () => {
              await walletService.archiveWallet(wallet.id);
              await loadWallets();
              showSuccess(`Archived "${wallet.name}"`);
            },
          },
          {
            text: "Move & Delete",
            style: "destructive",
            onPress: () => {
              const otherWallets = wallets.filter(
                (w) => w.id !== wallet.id && !w.archived,
              );
              if (otherWallets.length === 0) {
                showError("No other active account available to receive transactions.");
                return;
              }
              setWalletToMove(wallet);
              setDestinationWalletId(otherWallets[0].id);
              setShowMoveModal(true);
            },
          },
        ],
      );
    }
  };

  const handleOpenTransfer = (initialFrom?: string) => {
    const visibleWallets = walletService.getVisibleWallets(wallets);
    if (visibleWallets.length < 2) {
      showInfo("Please create another account first to make transfers.");
      return;
    }
    if (initialFrom) setFromWalletId(initialFrom);
    setShowTransferModal(true);
  };
  const handleUnarchiveWallet = async (wallet: WalletAccount) => {
    await walletService.unarchiveWallet(wallet.id);
    await loadWallets();
    showSuccess(`Unarchived "${wallet.name}"`);
  };

  const handleMoveAndDeleteWallet = async () => {
    if (!walletToMove || !destinationWalletId) return;
    try {
      await walletService.reassignTransactions(
        walletToMove.id,
        destinationWalletId,
      );
      const { db } = require("../../../infrastructure/database/repositories");
      await db.wallets.hardDeleteWallet(walletToMove.id);
      await dispatch(fetchTransactions());
      await loadWallets();
      setShowMoveModal(false);
      showSuccess(
        `Moved transactions and deleted "${walletToMove.name}"`,
      );
    } catch {
      showError("Failed to move transactions and delete wallet");
    }
  };

  return {
    handleUnarchiveWallet,
    handleMoveAndDeleteWallet,
    wallets,
    walletBalances,
    activeType,
    setActiveType,
    viewMode,
    setViewMode,
    showMoveModal,
    setShowMoveModal,
    walletToMove,
    destinationWalletId,
    setDestinationWalletId,
    showEditorModal,
    setShowEditorModal,
    editingWallet,
    showTransferModal,
    setShowTransferModal,
    fromWalletId,
    toWalletId,
    loadWallets,
    totalNetWorth,
    filteredWallets,
    openAddModal,
    openEditModal,
    handleSaveWallet,
    handleDeleteWallet,
    handleOpenTransfer
  };
}

export type WalletManagementScreenController = ReturnType<typeof useWalletManagementScreen>;
