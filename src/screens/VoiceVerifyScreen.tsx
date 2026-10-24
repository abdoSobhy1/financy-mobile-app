import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Share,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { TransactionStackParamList, ParsedTransaction } from "../types";
import { useAppTheme, resolveCategoryColor } from "../components/ui/ThemeProvider";
import { formatCurrency } from "../utils";
import { useToast, Card, IconChip } from "../components/ui";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store";
import { addTransaction } from "../store/slices/transactionsSlice";
import { OcrDebugReport } from "../services/ocrService";
import { AIService } from "../services/aiService";

type NavigationProp = StackNavigationProp<TransactionStackParamList>;
type VoiceVerifyRouteProp = RouteProp<TransactionStackParamList, "VoiceVerify">;

export const VoiceVerifyScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<VoiceVerifyRouteProp>();
  const { colors, typography, isDark } = useAppTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { showSuccess, showError } = useToast();

  const source = route.params?.source || "voice";
  const ocrReport = route.params?.ocrReport as OcrDebugReport | undefined;
  const receiptSummary = route.params?.receiptSummary;
  const rawText = route.params?.rawText || ocrReport?.rawText || "";
  const imageUri = route.params?.imageUri;

  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>(
    route.params.parsedTransactions || []
  );

  // Sync state when navigating back with updated list
  useEffect(() => {
    if (route.params?.parsedTransactions) {
      setParsedTransactions(route.params.parsedTransactions);
    }
  }, [route.params?.parsedTransactions]);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<{
    amount: string;
    description: string;
    categoryId: string;
    budgetId?: string;
  }>({ amount: "", description: "", categoryId: "", budgetId: undefined });

  // Debug inspector modal state
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [debugTab, setDebugTab] = useState<"items" | "unrecognized" | "raw">("items");
  const [isEnhancingAI, setIsEnhancingAI] = useState(false);

  const { items: categoriesMap, ids: categoryIds } = useSelector(
    (state: RootState) => state.categories
  );
  const { items: budgetsMap, ids: budgetIds } = useSelector(
    (state: RootState) => state.budgets
  );

  const totalAmount = useMemo(
    () => parsedTransactions.reduce((sum, t) => sum + (t.amount || 0), 0),
    [parsedTransactions]
  );

  // Unrecognized or non-item lines from OCR
  const nonItemLines = useMemo(() => {
    if (!ocrReport?.lines) {
      return (receiptSummary?.unrecognizedLines || []).map((line) => ({
        line,
        type: "unrecognized" as const,
        reason: "Unmatched line",
      }));
    }
    return ocrReport.lines.filter((l) => l.type !== "item");
  }, [ocrReport, receiptSummary]);

  // ── Confirm all individual transactions ──────────────────────────────
  const handleConfirmAll = async () => {
    try {
      const promises = parsedTransactions.map((t) =>
        dispatch(
          addTransaction({
            amount: (t.amount || 0).toString(),
            type: t.type || "expense",
            description: t.description || "",
            date: t.date || receiptSummary?.date || new Date(),
            categoryId: t.categoryId || "",
            budgetId: t.budgetId,
            note: t.note || (receiptSummary?.merchant ? `From: ${receiptSummary.merchant}` : ""),
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
      const singleAmount = receiptSummary?.totalAmount || totalAmount;
      const merchant =
        receiptSummary?.merchant || parsedTransactions[0]?.description || "Receipt Total";
      const itemsListNote = parsedTransactions
        .map((t) => `• ${t.description || "Item"}: ${formatCurrency(t.amount || 0)}`)
        .join("\n");
      const firstCatId = parsedTransactions.find((t) => t.categoryId)?.categoryId || "";

      await dispatch(
        addTransaction({
          amount: singleAmount.toString(),
          type: "expense",
          description: merchant,
          date: receiptSummary?.date || parsedTransactions[0]?.date || new Date(),
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
          type: "expense",
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
        budgetId: editData.budgetId,
      };
      setParsedTransactions(updated);
    }
    setEditingIndex(null);
  };

  const handleRemove = (index: number) => {
    setParsedTransactions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleShareRawText = async () => {
    if (!rawText) return;
    try {
      await Share.share({
        message: rawText,
        title: "OCR Extracted Receipt Text",
      });
    } catch {
      // ignored
    }
  };

  const handleEnhanceWithAI = async () => {
    const online = await AIService.isOnline();
    if (!online) {
      showError("No internet connection for AI enhancement");
      return;
    }
    setIsEnhancingAI(true);
    try {
      let aiResult: any;
      if (imageUri) {
        // Send the actual resized image (1080w max) directly to Gemini Vision!
        aiResult = await AIService.parseReceiptImageWithAI(imageUri, categoriesMap);
      } else if (rawText) {
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
          date: aiResult.date || receiptSummary?.date || new Date(),
          note: aiResult.description ? `From: ${aiResult.description}` : undefined,
          confidence: 0.98,
          rawText: `${it.name} ${it.price}`,
          categoryId: it.categoryId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        }));
        setParsedTransactions(newParsed);
        showSuccess(`AI Vision extracted ${newParsed.length} items!`);
      } else {
        showError("AI could not detect items");
      }
    } catch (err: any) {
      showError(err?.message || "AI Vision enhancement failed");
    } finally {
      setIsEnhancingAI(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.onBackground} />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={[typography.h3, { color: colors.onBackground }]}>
            {source === "ocr" ? "Verify Receipt Items" : "Verify Transactions"}
          </Text>
          {source === "ocr" && receiptSummary?.merchant && (
            <Text style={[typography.label, { color: colors.primary, marginTop: 2 }]}>
              {receiptSummary.merchant}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setShowDebugModal(true)}
          style={styles.debugIconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* OCR Summary & Reconciliation Banner */}
        {source === "ocr" && (
          <Card
            variant="elevated"
            style={StyleSheet.flatten([
              styles.summaryBanner,
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
            ])}>
            <View style={styles.summaryTopRow}>
              <View style={styles.summaryBadge}>
                <Ionicons name="receipt-outline" size={16} color={colors.primary} />
                <Text style={[typography.label, { color: colors.primary, marginLeft: 6, fontWeight: "700" }]}>
                  {parsedTransactions.length} Items Detected
                </Text>
              </View>
              {receiptSummary?.date && (
                <View style={styles.dateBadge}>
                  <Ionicons name="calendar-outline" size={14} color={colors.onSurfaceVariant} />
                  <Text style={[typography.label, { color: colors.onSurfaceVariant, marginLeft: 4 }]}>
                    {new Date(receiptSummary.date).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.summaryStatsRow}>
              <View style={styles.statBox}>
                <Text style={[typography.label, { color: colors.onSurfaceVariant }]}>Receipt Total</Text>
                <Text style={[typography.bodyLarge, { color: colors.onSurface, fontWeight: "700" }]}>
                  {formatCurrency(receiptSummary?.totalAmount || totalAmount)}
                </Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statBox}>
                <Text style={[typography.label, { color: colors.onSurfaceVariant }]}>Items Sum</Text>
                <Text style={[typography.bodyLarge, { color: colors.onSurface, fontWeight: "700" }]}>
                  {formatCurrency(receiptSummary?.itemsSum || totalAmount)}
                </Text>
              </View>

              {receiptSummary?.discount ? (
                <>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={[typography.label, { color: colors.error }]}>Discount</Text>
                    <Text style={[typography.bodyLarge, { color: colors.error, fontWeight: "700" }]}>
                      -{formatCurrency(receiptSummary.discount)}
                    </Text>
                  </View>
                </>
              ) : null}
            </View>

            {/* Actions Row: Debug report & Re-parse with AI */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.inspectBtn, { flex: 1, backgroundColor: colors.surfaceVariant, marginTop: 0 }]}
                onPress={() => setShowDebugModal(true)}>
                <Ionicons name="search-outline" size={16} color={colors.primary} />
                <Text
                  style={[typography.label, { color: colors.primary, fontWeight: "600", marginLeft: 6 }]}
                  numberOfLines={1}>
                  Scan Report ({nonItemLines.length})
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} style={{ marginLeft: "auto" }} />
              </TouchableOpacity>

              {rawText ? (
                <TouchableOpacity
                  style={[
                    styles.inspectBtn,
                    {
                      backgroundColor: colors.primaryContainer,
                      marginTop: 0,
                      paddingHorizontal: 12,
                    },
                  ]}
                  onPress={handleEnhanceWithAI}
                  disabled={isEnhancingAI}>
                  {isEnhancingAI ? (
                    <ActivityIndicator size="small" color={colors.onPrimaryContainer} />
                  ) : (
                    <Ionicons name="sparkles" size={16} color={colors.onPrimaryContainer} />
                  )}
                  <Text
                    style={[
                      typography.label,
                      { color: colors.onPrimaryContainer, fontWeight: "700", marginLeft: 6 },
                    ]}>
                    {isEnhancingAI ? "Analyzing..." : "Re-parse with AI"}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </Card>
        )}

        <Text
          style={[typography.bodyMedium, styles.subtitle, { color: colors.onSurfaceVariant }]}>
          {source === "ocr"
            ? "Review each recognized item below. Edit, remove, or confirm."
            : `${parsedTransactions.length} transaction${parsedTransactions.length !== 1 ? "s" : ""} detected. Review before saving.`}
        </Text>

        {/* Transaction Cards List */}
        {parsedTransactions.map((tx, index) => {
          const category = tx.categoryId ? categoriesMap[tx.categoryId] : null;
          const iconColor = category?.color || colors.primary;

          return (
            <Card
              key={index}
              variant="elevated"
              style={StyleSheet.flatten([
                styles.card,
                { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant },
              ])}>
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <IconChip
                    icon={(category as any)?.icon || "pricetag"}
                    color={iconColor}
                    size="md"
                    style={{ marginRight: 12 }}
                  />
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text
                      style={[typography.bodyLarge, { color: colors.onSurface, fontWeight: "600" }]}
                      numberOfLines={2}>
                      {tx.description || "Item"}
                    </Text>

                    {/* Quantity & Unit Price details */}
                    {tx.quantity && tx.quantity > 1 ? (
                      <Text style={[typography.label, { color: colors.primary, marginTop: 2, fontWeight: "600" }]}>
                        {tx.quantity} × {formatCurrency(tx.unitPrice || (tx.amount || 0) / tx.quantity)}
                      </Text>
                    ) : null}

                    <View style={[styles.categoryPill, { backgroundColor: colors.surfaceVariant }]}>
                      <Text style={[typography.label, { color: colors.onSurfaceVariant }]}>
                        {category?.name || "Uncategorized"}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={[typography.bodyLarge, { color: colors.onSurface, fontWeight: "700" }]}>
                  {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount || 0)}
                </Text>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(index)}>
                  <Ionicons name="pencil" size={14} color={colors.primary} />
                  <Text style={[typography.label, { color: colors.primary, marginLeft: 4 }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleRemove(index)}>
                  <Ionicons name="trash-outline" size={14} color={colors.error} />
                  <Text style={[typography.label, { color: colors.error, marginLeft: 4 }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        })}

        {/* Add Another Button */}
        {source === "voice" ? (
          <TouchableOpacity
            style={[styles.addAnotherBtn, { borderColor: colors.outlineVariant }]}
            onPress={handleAddAnotherVoice}>
            <Ionicons name="mic" size={18} color={colors.onSurfaceVariant} />
            <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginLeft: 8 }]}>
              Add Another Transaction
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.addAnotherBtn, { borderColor: colors.outlineVariant }]}
            onPress={() => {
              setEditData({ amount: "", description: "", categoryId: "", budgetId: undefined });
              setEditingIndex(parsedTransactions.length);
            }}>
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={[typography.bodyMedium, { color: colors.primary, marginLeft: 8, fontWeight: "600" }]}>
              Add Item Manually
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Footer Actions */}
      <View
        style={[
          styles.footer,
          { backgroundColor: colors.background, borderTopColor: colors.outlineVariant },
        ]}>
        {source === "ocr" && parsedTransactions.length > 1 ? (
          <View style={styles.ocrFooterActions}>
            <TouchableOpacity
              style={[styles.singleCombinedBtn, { borderColor: colors.primary, backgroundColor: colors.surface }]}
              onPress={handleSaveAsSingle}>
              <Ionicons name="receipt-outline" size={18} color={colors.primary} />
              <Text
                style={[typography.bodyMedium, { color: colors.primary, fontWeight: "700", marginLeft: 6 }]}>
                Save as 1 Total ({formatCurrency(receiptSummary?.totalAmount || totalAmount)})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={handleConfirmAll}>
              <Ionicons name="checkmark-done" size={20} color={colors.onPrimary} />
              <Text
                style={[typography.bodyMedium, { color: colors.onPrimary, fontWeight: "700", marginLeft: 6 }]}>
                Save {parsedTransactions.length} Items Separately
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
            onPress={handleConfirmAll}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.onPrimary} />
            <Text style={[typography.bodyLarge, { color: colors.onPrimary, fontWeight: "700", marginLeft: 8 }]}>
              Confirm All ({formatCurrency(totalAmount)})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Inline Quick Edit Modal */}
      <Modal
        visible={editingIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingIndex(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setEditingIndex(null)}>
            <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} />
          </TouchableWithoutFeedback>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[typography.h3, { color: colors.onBackground, marginBottom: 16 }]}>
              {editingIndex !== null && editingIndex >= parsedTransactions.length
                ? "Add Item"
                : "Quick Edit"}
            </Text>

            <Text style={[typography.label, { color: colors.onSurfaceVariant, marginBottom: 8 }]}>
              Description
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.onBackground }]}
              value={editData.description}
              onChangeText={(t) => setEditData((prev) => ({ ...prev, description: t }))}
              placeholder="What did you buy?"
              placeholderTextColor={colors.onSurfaceVariant + "88"}
            />

            <Text style={[typography.label, { color: colors.onSurfaceVariant, marginBottom: 8 }]}>
              Amount
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.onBackground }]}
              value={editData.amount}
              onChangeText={(t) => setEditData((prev) => ({ ...prev, amount: t }))}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor={colors.onSurfaceVariant + "88"}
            />

            <Text style={[typography.label, { color: colors.onSurfaceVariant, marginBottom: 8 }]}>
              Category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16, paddingBottom: 8 }}>
              {categoryIds.map((id) => {
                const c = categoriesMap[id];
                const isSelected = editData.categoryId === id;
                const resolved = resolveCategoryColor(c.color, isDark);
                return (
                  <TouchableOpacity
                    key={id}
                    onPress={() => setEditData((prev) => ({ ...prev, categoryId: id }))}
                    style={[
                      styles.modalCatPill,
                      { backgroundColor: isSelected ? resolved.fg : colors.surfaceVariant },
                    ]}>
                    <Ionicons
                      name={(c as any).icon || "pricetag"}
                      size={14}
                      color={isSelected ? "#0C0E12" : resolved.fg}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[typography.label, { color: isSelected ? "#0C0E12" : colors.onSurfaceVariant }]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={[typography.label, { color: colors.onSurfaceVariant, marginBottom: 8 }]}>
              Budget (Optional)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 24, paddingBottom: 8 }}>
              <TouchableOpacity
                onPress={() => setEditData((prev) => ({ ...prev, budgetId: undefined }))}
                style={[
                  styles.modalCatPill,
                  { backgroundColor: !editData.budgetId ? colors.primary : colors.surfaceVariant },
                ]}>
                <Text style={[typography.label, { color: !editData.budgetId ? colors.onPrimary : colors.onSurfaceVariant }]}>
                  None
                </Text>
              </TouchableOpacity>
              {budgetIds.map((id) => {
                const b = budgetsMap[id];
                const isSelected = editData.budgetId === id;
                return (
                  <TouchableOpacity
                    key={id}
                    onPress={() => setEditData((prev) => ({ ...prev, budgetId: id }))}
                    style={[
                      styles.modalCatPill,
                      { backgroundColor: isSelected ? colors.primary : colors.surfaceVariant },
                    ]}>
                    <Ionicons
                      name="wallet-outline"
                      size={14}
                      color={isSelected ? colors.onPrimary : colors.onSurfaceVariant}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[typography.label, { color: isSelected ? colors.onPrimary : colors.onSurfaceVariant }]}>
                      {b.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={saveEdit}>
              <Text style={[typography.bodyLarge, { color: colors.onPrimary, fontWeight: "700" }]}>
                Save Changes
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Scan Details & Debug Inspector Modal ──────────────────────────── */}
      <Modal
        visible={showDebugModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDebugModal(false)}>
        <View style={styles.debugModalOverlay}>
          <View style={[styles.debugModalSheet, { backgroundColor: colors.surface }]}>
            {/* Header */}
            <View style={styles.debugModalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="scan" size={22} color={colors.primary} />
                <Text style={[typography.h3, { color: colors.onSurface, marginLeft: 8 }]}>
                  Scan & OCR Debug Details
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowDebugModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  debugTab === "items" && [styles.tabBtnActive, { borderBottomColor: colors.primary }],
                ]}
                onPress={() => setDebugTab("items")}>
                <Text
                  style={[
                    typography.label,
                    {
                      color: debugTab === "items" ? colors.primary : colors.onSurfaceVariant,
                      fontWeight: debugTab === "items" ? "700" : "500",
                    },
                  ]}>
                  Detected ({parsedTransactions.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  debugTab === "unrecognized" && [styles.tabBtnActive, { borderBottomColor: colors.primary }],
                ]}
                onPress={() => setDebugTab("unrecognized")}>
                <Text
                  style={[
                    typography.label,
                    {
                      color: debugTab === "unrecognized" ? colors.primary : colors.onSurfaceVariant,
                      fontWeight: debugTab === "unrecognized" ? "700" : "500",
                    },
                  ]}>
                  Skipped / Non-Items ({nonItemLines.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  debugTab === "raw" && [styles.tabBtnActive, { borderBottomColor: colors.primary }],
                ]}
                onPress={() => setDebugTab("raw")}>
                <Text
                  style={[
                    typography.label,
                    {
                      color: debugTab === "raw" ? colors.primary : colors.onSurfaceVariant,
                      fontWeight: debugTab === "raw" ? "700" : "500",
                    },
                  ]}>
                  Raw OCR Text
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab 1: Detected Items */}
            {debugTab === "items" && (
              <ScrollView style={styles.debugList} contentContainerStyle={{ paddingBottom: 24 }}>
                {parsedTransactions.map((tx, idx) => (
                  <View
                    key={idx}
                    style={[styles.debugItemCard, { backgroundColor: colors.surfaceVariant }]}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={[typography.bodyMedium, { color: colors.onSurface, fontWeight: "700", flex: 1 }]}>
                        {idx + 1}. {tx.description}
                      </Text>
                      <Text style={[typography.bodyLarge, { color: colors.primary, fontWeight: "700" }]}>
                        {formatCurrency(tx.amount || 0)}
                      </Text>
                    </View>
                    {tx.quantity && tx.quantity > 1 ? (
                      <Text style={[typography.label, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                        Quantity: {tx.quantity} • Unit Price: {formatCurrency(tx.unitPrice || 0)}
                      </Text>
                    ) : null}
                    <View style={{ flexDirection: "row", marginTop: 6, gap: 8 }}>
                      <View style={[styles.miniBadge, { backgroundColor: colors.primary + "20" }]}>
                        <Text style={[typography.label, { color: colors.primary, fontSize: 10 }]}>
                          Category: {categoriesMap[tx.categoryId || ""]?.name || "Auto-detected"}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Tab 2: What was NOT detected as items */}
            {debugTab === "unrecognized" && (
              <ScrollView style={styles.debugList} contentContainerStyle={{ paddingBottom: 24 }}>
                {nonItemLines.length === 0 ? (
                  <View style={{ padding: 24, alignItems: "center" }}>
                    <Ionicons name="checkmark-circle" size={36} color={colors.primary} />
                    <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginTop: 8 }]}>
                      All lines from the document were matched as items!
                    </Text>
                  </View>
                ) : (
                  nonItemLines.map((l, idx) => {
                    const badgeColor =
                      l.type === "header"
                        ? "#3B82F6"
                        : l.type === "total"
                        ? "#10B981"
                        : l.type === "date"
                        ? "#F59E0B"
                        : l.type === "tax_discount"
                        ? "#EC4899"
                        : l.type === "merchant"
                        ? "#8B5CF6"
                        : colors.onSurfaceVariant;

                    return (
                      <View
                        key={idx}
                        style={[styles.debugItemCard, { backgroundColor: colors.surfaceVariant }]}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <Text style={[typography.bodyMedium, { color: colors.onSurface, fontWeight: "600", flex: 1 }]}>
                            "{l.line}"
                          </Text>
                          <View style={[styles.miniBadge, { backgroundColor: badgeColor + "25" }]}>
                            <Text style={[typography.label, { color: badgeColor, fontSize: 11, fontWeight: "700" }]}>
                              {l.type.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        {l.reason && (
                          <Text style={[typography.label, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                            Reason: {l.reason}
                          </Text>
                        )}
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}

            {/* Tab 3: Raw OCR Text */}
            {debugTab === "raw" && (
              <View style={{ flex: 1 }}>
                <ScrollView style={styles.rawTextContainer}>
                  <Text style={[typography.bodySmall, { color: colors.onSurface, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" }]}>
                    {rawText || "No text extracted."}
                  </Text>
                </ScrollView>
                <TouchableOpacity
                  style={[styles.shareBtn, { backgroundColor: colors.primary }]}
                  onPress={handleShareRawText}>
                  <Ionicons name="share-outline" size={18} color={colors.onPrimary} />
                  <Text style={[typography.bodyMedium, { color: colors.onPrimary, fontWeight: "700", marginLeft: 8 }]}>
                    Share / Copy Raw Text
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  backBtn: {
    padding: 6,
  },
  debugIconBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 140,
  },
  summaryBanner: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 8,
  },
  statBox: {
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  inspectBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  subtitle: {
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    padding: 16,
    marginBottom: 14,
    borderRadius: 20,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
    paddingTop: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  addAnotherBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 6,
    marginBottom: 16,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  ocrFooterActions: {
    gap: 10,
  },
  singleCombinedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 100,
    borderWidth: 1.5,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "90%",
    borderRadius: 24,
    padding: 24,
    elevation: 10,
  },
  input: {
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  modalCatPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  saveBtn: {
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  // Debug Inspector Modal
  debugModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  debugModalSheet: {
    height: "85%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 18,
  },
  debugModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: {
    borderBottomWidth: 2,
  },
  debugList: {
    flex: 1,
  },
  debugItemCard: {
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rawTextContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 24,
    marginBottom: 16,
  },
});
