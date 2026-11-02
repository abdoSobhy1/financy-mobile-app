import { useMemo, useState, useEffect } from "react";

import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { TransactionStackParamList, ParsedTransaction } from "../../../shared/types";

import { formatCurrency } from "../../../shared/utils";
import { useToast } from "../../../shared/ui";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../../app/store";
import { addTransaction } from "../../transactions/store/transactionsSlice";
import { addCategory, fetchCategories } from "../../categories/store/categoriesSlice";
import { AIService } from "../../../infrastructure/ai/aiService";
import { getAIConfig } from "../../../infrastructure/ai/aiConfigService";
import { consumeOcrQuota, getOcrQuotaStatus } from "../../receipts/services/ocrRateLimitService";
import { detectCategory } from "../services/voiceParser";

type NavigationProp = StackNavigationProp<TransactionStackParamList>;

type VoiceVerifyRouteProp = RouteProp<TransactionStackParamList, "VoiceVerify">;

function restoreTransactionDates(
  transactions: RouteProp<TransactionStackParamList, "VoiceVerify">["params"]["parsedTransactions"],
): ParsedTransaction[] {
  return transactions.map((transaction) => ({
    ...transaction,
    date: transaction.date ? new Date(transaction.date) : undefined,
  }));
}

/** Owns screen state and actions; rendering stays in VoiceVerifyScreen. */
export function useVoiceVerifyScreen() {

  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<VoiceVerifyRouteProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { showSuccess, showError } = useToast();

  const source = route.params?.source || "voice";
  const [summary, setSummary] = useState(() => ({
    ...route.params?.receiptSummary,
    date: route.params?.receiptSummary?.date
      ? new Date(route.params.receiptSummary.date)
      : undefined,
  }));
  const rawText = route.params?.rawText || "";
  const imageUri = route.params?.imageUri;

  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>(
    restoreTransactionDates(route.params.parsedTransactions || [])
  );

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  // Sync state when navigating back with updated list
  useEffect(() => {
    if (route.params?.parsedTransactions) {
      setParsedTransactions(restoreTransactionDates(route.params.parsedTransactions));
    }
  }, [route.params?.parsedTransactions]);

  useEffect(() => {
    if (route.params?.receiptSummary) {
      setSummary({
        ...route.params.receiptSummary,
        date: route.params.receiptSummary.date
          ? new Date(route.params.receiptSummary.date)
          : undefined,
      });
    }
  }, [route.params?.receiptSummary]);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<{
    amount: string;
    description: string;
    categoryId: string;
    type: "income" | "expense";
    budgetId?: string;
  }>({ amount: "", description: "", categoryId: "", type: "expense", budgetId: undefined });

  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [isEnhancingAI, setIsEnhancingAI] = useState(false);

  const { items: categoriesMap, ids: categoryIds } = useSelector(
    (state: RootState) => state.categories
  );
  const { items: budgetsMap, ids: budgetIds } = useSelector(
    (state: RootState) => state.budgets
  );
  const budgets = useMemo(() => Object.values(budgetsMap), [budgetsMap]);
  const transactionsMap = useSelector((state: RootState) => state.transactions.items);
  const transactions = useMemo(() => Object.values(transactionsMap), [transactionsMap]);

  const itemsSum = useMemo(
    () => Math.round(parsedTransactions.reduce((sum, t) => sum + (t.amount || 0), 0) * 100) / 100,
    [parsedTransactions]
  );

  const discount = summary?.discount || 0;

  const totalAmount = useMemo(() => {
    if (discount > 0) {
      return Math.max(0, Math.round((itemsSum - discount) * 100) / 100);
    }
    return itemsSum;
  }, [itemsSum, discount]);

  const handleQuickCreateCategory = async (data: {
    name: string;
    type: "income" | "expense";
    color?: string;
    icon?: string;
  }) => {
    try {
      const created = await dispatch(
        addCategory({
          name: data.name,
          type: data.type || "expense",
          color: data.color || "#14B8A6",
          icon: data.icon || "pricetag",
        })
      ).unwrap();
      setEditData((prev) => ({ ...prev, categoryId: created.id }));
      setShowCreateCategoryModal(false);
      showSuccess(`Created "${created.name}"`);
    } catch {
      showError("Could not create category");
    }
  };

  // ── Confirm all individual transactions ──────────────────────────────
  const handleConfirmAll = async () => {
    try {
      const promises = parsedTransactions.map((t) =>
        dispatch(
          addTransaction({
            amount: (t.amount || 0).toString(),
            type: t.type || "expense",
            description: t.description || "",
            date: t.date || summary?.date || new Date(),
            categoryId: t.categoryId || "",
            budgetId: t.budgetId,
            note: t.note || (summary?.merchant ? `From: ${summary.merchant}` : ""),
          })
        ).unwrap()
      );
      await Promise.all(promises);
      showSuccess(`Saved ${parsedTransactions.length} transactions`);
      navigation.replace("TransactionList");
    } catch (e: any) {
      showError(e?.message || "Failed to save transactions");
    }
  };

  // ── Save as 1 combined transaction ──────────────────────────────────
  const handleSaveAsSingle = async () => {
    try {
      const singleAmount = totalAmount;
      const merchant =
        summary?.merchant || parsedTransactions[0]?.description || "Receipt Total";
      const itemsListNote = parsedTransactions
        .map((t) => `• ${t.description || "Item"}: ${formatCurrency(t.amount || 0)}`)
        .join("\n");
      const firstCatId = parsedTransactions.find((t) => t.categoryId)?.categoryId || "";

      await dispatch(
        addTransaction({
          amount: singleAmount.toString(),
          type: summary?.type || parsedTransactions[0]?.type || "expense",
          description: merchant,
          date: summary?.date || parsedTransactions[0]?.date || new Date(),
          categoryId: firstCatId,
          note: `Receipt items (${parsedTransactions.length}):\n${itemsListNote}`,
        })
      ).unwrap();

      showSuccess(`Saved single transaction for ${formatCurrency(singleAmount)}`);
      navigation.replace("TransactionList");
    } catch (e: any) {
      showError(e?.message || "Failed to save transaction");
    }
  };

  // ── Add another ─────────────────────────────────────────────────────
  const handleAddAnotherVoice = () => {
    navigation.replace("VoiceInput", {
      existingTransactions: parsedTransactions,
    });
  };

  // ── Edit helpers ────────────────────────────────────────────────────
  const handleEdit = (index: number) => {
    const tx = parsedTransactions[index];
    setEditData({
      amount: tx.amount?.toString() || "",
      description: tx.description || "",
      categoryId: tx.categoryId || "",
      type: tx.type === "income" ? "income" : "expense",
      budgetId: tx.budgetId,
    });
    setEditingIndex(index);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const amountVal = parseFloat(editData.amount);

    if (editingIndex >= parsedTransactions.length) {
      // Adding a new manual item
      setParsedTransactions((prev) => [
        ...prev,
        {
          amount: isNaN(amountVal) ? 0 : amountVal,
          description: editData.description || "New Item",
          categoryId: editData.categoryId,
          budgetId: editData.budgetId,
          confidence: 1.0,
          rawText: editData.description,
          type: editData.type,
          date: new Date(),
        },
      ]);
    } else {
      const updated = [...parsedTransactions];
      updated[editingIndex] = {
        ...updated[editingIndex],
        amount: isNaN(amountVal) ? updated[editingIndex].amount : amountVal,
        description: editData.description,
        categoryId: editData.categoryId,
        type: editData.type,
        budgetId: editData.budgetId,
      };
      setParsedTransactions(updated);
    }
    setEditingIndex(null);
  };

  const handleRemove = (index: number) => {
    setParsedTransactions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEnhanceWithAI = async () => {
    const online = await AIService.isOnline();
    if (!online) {
      showError("No internet connection for AI enhancement");
      return;
    }

    let usesGeminiQuota = false;
    try {
      const config = await getAIConfig();
      usesGeminiQuota = config.provider === "gemini";
      if (usesGeminiQuota) {
        let quota = await getOcrQuotaStatus({ fast: true });
        if (!quota.canScan) quota = await getOcrQuotaStatus();
        if (!quota.canScan) {
          showError(
            `Daily limit of ${quota.dailyLimit} Gemini AI requests reached. The limit resets tomorrow.`,
          );
          return;
        }
      }
    } catch (error: any) {
      showError(error?.message || "Could not check the daily AI request limit");
      return;
    }

    setIsEnhancingAI(true);
    let geminiRequestStarted = false;
    try {
      const voiceText = rawText || parsedTransactions.map((t) => t.rawText).filter(Boolean).join(" و ");

      if (source === "voice" || (!imageUri && voiceText && source !== "ocr")) {
        // Voice transcription AI re-parsing with Gemini
        geminiRequestStarted = usesGeminiQuota;
        const newParsed = await AIService.parseVoiceWithAI(
          voiceText,
          categoriesMap,
          transactions,
          budgets
        );
        if (newParsed && newParsed.length > 0) {
          setParsedTransactions(newParsed);
          showSuccess(`AI extracted ${newParsed.length} transaction${newParsed.length !== 1 ? "s" : ""}!`);
        } else {
          showError("AI could not detect transactions from the transcript");
        }
        return;
      }

      // OCR Image / Text enhancement
      let aiResult: any;
      if (imageUri) {
        // Send the actual resized image (1080w max) directly to Gemini Vision!
        geminiRequestStarted = usesGeminiQuota;
        aiResult = await AIService.parseReceiptImageWithAI(imageUri, categoriesMap);
      } else if (rawText) {
        geminiRequestStarted = usesGeminiQuota;
        aiResult = await AIService.parseReceiptWithAI(rawText, categoriesMap);
      } else {
        showError("No receipt image or text found to analyze");
        setIsEnhancingAI(false);
        return;
      }

      if (aiResult.items && aiResult.items.length > 0) {
        const newParsed: ParsedTransaction[] = aiResult.items.map((it: any) => ({
          amount: it.price,
          type: aiResult.type || "expense",
          description:
            it.quantity && it.quantity > 1 ? `${it.quantity}x ${it.name}` : it.name,
          date: aiResult.date || summary?.date || new Date(),
          note: aiResult.description ? `From: ${aiResult.description}` : undefined,
          confidence: 0.98,
          rawText: `${it.name} ${it.price}`,
          categoryId: detectCategory(it.name, categoriesMap, transactions) || it.categoryId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        }));
        setParsedTransactions(newParsed);
        setSummary((prev: any) => ({
          ...prev,
          merchant: aiResult.description || prev?.merchant,
          date: aiResult.date || prev?.date,
          type: aiResult.type || prev?.type || "expense",
          discount: aiResult.discount || prev?.discount,
          totalAmount: aiResult.amount,
          itemsSum: aiResult.itemsSum,
        }));
        showSuccess(`AI Vision extracted ${newParsed.length} items!`);
      } else {
        showError("AI could not detect items");
      }
    } catch (err: any) {
      showError(err?.message || "AI enhancement failed");
    } finally {
      if (geminiRequestStarted) {
        await consumeOcrQuota().catch((error) =>
          console.warn("[VoiceVerify] Failed to update Gemini request quota:", error),
        );
      }
      setIsEnhancingAI(false);
    }
  };
  return {
    navigation,
    source,
    summary,
    rawText,
    parsedTransactions,
    editingIndex,
    setEditingIndex,
    editData,
    setEditData,
    showCreateCategoryModal,
    setShowCreateCategoryModal,
    isEnhancingAI,
    categoriesMap,
    categoryIds,
    budgetsMap,
    budgetIds,
    itemsSum,
    discount,
    totalAmount,
    handleQuickCreateCategory,
    handleConfirmAll,
    handleSaveAsSingle,
    handleAddAnotherVoice,
    handleEdit,
    saveEdit,
    handleRemove,
    handleEnhanceWithAI
  };
}
