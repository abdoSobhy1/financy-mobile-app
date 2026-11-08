import { useState, useEffect, useRef, useMemo } from "react";
import { TextInput } from "react-native";

import { WalletAccount, WalletType } from "../../../shared/types";

import { useUnsavedChanges } from "../../../shared/hooks";
import { WALLET_COLORS, WALLET_ICONS } from "../model/walletEditorOptions";
export interface WalletEditorFormValues {
  name: string;
  type: WalletType;
  icon: string;
  color: string;
  initialBalance: string;
  isSecret: boolean;
}
interface WalletEditorModalProps {
  visible: boolean;
  editingWallet?: WalletAccount | null;
  currentBalance?: number;
  onClose: () => void;
  onSave: (values: WalletEditorFormValues) => Promise<void> | void;
}
export function useWalletEditorModal({
  visible,
  editingWallet = null,
  currentBalance = 0,
  onClose,
  onSave,
}: WalletEditorModalProps) {

  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<WalletType>("bank");
  const [formIcon, setFormIcon] = useState("business-outline");
  const [formColor, setFormColor] = useState("blue");
  const [formInitialBalance, setFormInitialBalance] = useState("");
  const [formIsSecret, setFormIsSecret] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; initialBalance?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const nameInputRef = useRef<TextInput>(null);
  const balanceInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setErrors({});
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      if (editingWallet) {
        setFormName(editingWallet.name);
        setFormType(editingWallet.type);
        setFormIcon(editingWallet.icon || "wallet-outline");
        setFormColor(editingWallet.color || "teal");
        setFormInitialBalance(currentBalance.toString());
        setFormIsSecret(
          Boolean(editingWallet.isSecret || (editingWallet as any).type === "secret")
        );
      } else {
        setFormName("");
        setFormType("bank");
        setFormIcon("business-outline");
        setFormColor("blue");
        setFormInitialBalance("");
        setFormIsSecret(false);
      }
    } else {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [visible, editingWallet, currentBalance]);

  const handleSave = async () => {
    if (isSubmittingRef.current) return;

    const trimmedName = formName.trim();
    const newErrors: { name?: string; initialBalance?: string } = {};

    if (!trimmedName) {
      newErrors.name = "Account name is required";
    }

    const cleanedBalance = formInitialBalance.trim().replace(/,/g, "");
    if (cleanedBalance && isNaN(Number(cleanedBalance))) {
      newErrors.initialBalance = "Please enter a valid amount";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.name) {
        nameInputRef.current?.focus();
      } else if (newErrors.initialBalance) {
        balanceInputRef.current?.focus();
      }
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      await onSave({
        name: trimmedName,
        type: formType,
        icon: formIcon,
        color: formColor,
        initialBalance: cleanedBalance,
        isSecret: formIsSecret,
      });
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const hasChanges = useMemo(() => {
    if (!visible) return false;
    if (editingWallet) {
      const origName = editingWallet.name || "";
      const origType = editingWallet.type || "bank";
      const origColor = editingWallet.color || "teal";
      const origIcon = editingWallet.icon || "wallet-outline";
      const origSecret = editingWallet.isSecret || false;
      return (
        formName !== origName ||
        formType !== origType ||
        formColor !== origColor ||
        formIcon !== origIcon ||
        formIsSecret !== origSecret
      );
    } else {
      return (
        formName.trim() !== "" ||
        formInitialBalance.trim() !== "" ||
        formType !== "bank" ||
        formIsSecret
      );
    }
  }, [
    visible,
    editingWallet,
    formName,
    formType,
    formColor,
    formIcon,
    formInitialBalance,
    formIsSecret,
  ]);

  const { confirmExit } = useUnsavedChanges({
    hasChanges,
    isEditing: !!editingWallet,
    isModal: true,
    enabled: visible,
  });
  return { formName, setFormName, formType, setFormType, formIcon, setFormIcon, formColor, setFormColor, formInitialBalance, setFormInitialBalance, formIsSecret, setFormIsSecret, errors, setErrors, isSubmitting, nameInputRef, balanceInputRef, handleSave, confirmExit };
}

export type WalletEditorModalController = ReturnType<typeof useWalletEditorModal>;
