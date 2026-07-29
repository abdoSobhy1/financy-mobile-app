/**
 * ParsedTransactionReview — Multi-transaction review with select/edit
 *
 * Features:
 * - Checkbox to select/deselect individual transactions
 * - Tap to edit amount, description, type inline
 * - Auto-loads last-used category & budget
 * - Auto-enhances with AI when online
 * - Uses @gorhom/bottom-sheet for native-feeling bottom sheet
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { UI } from "../../constants";
import { ParsedTransaction, TransactionType } from "../../types";
import { parseWithAI, isOnline } from "../../services/aiService";
import {
  getLastUsedCategoryId,
  getLastUsedBudgetId,
} from "../../utils/userPreferences";
import { guessCategoryId } from "../../utils/categoryDictionary";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";

interface ParsedTransactionReviewProps {
  parsed: ParsedTransaction[];
  visible: boolean;
  onAccept: (parsed: ParsedTransaction[]) => void;
  onDismiss: () => void;
}

export const ParsedTransactionReview: React.FC<
  ParsedTransactionReviewProps
> = ({ parsed, visible, onAccept, onDismiss }) => {
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [txCategories, setTxCategories] = useState<Record<number, string>>({});
  const [txBudgets, setTxBudgets] = useState<Record<number, string>>({});
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["55%", "85%"], []);

  // Redux data for selectors
  const { items: allCategories } = useSelector(
    (state: RootState) => state.categories,
  );
  const { items: allBudgets } = useSelector(
    (state: RootState) => state.budgets,
  );

  useEffect(() => {
    if (visible && parsed.length > 0) {
      setTransactions([...parsed]);
      setSelected(new Set(parsed.map((_, i) => i)));
      setEditingIndex(null);
      bottomSheetRef.current?.present();

      getLastUsedCategoryId().then((fallbackId) => {
        const defaults: Record<number, string> = {};
        parsed.forEach((tx, i) => {
          if (tx.categoryId) {
            // 1. Parser-detected categoryId (highest priority)
            defaults[i] = tx.categoryId;
          } else if (tx.description) {
            // 2. Dictionary guess based on description
            const guessedId = guessCategoryId(tx.description, allCategories);
            if (guessedId) {
              defaults[i] = guessedId;
              return;
            }
          }
          // 3. Last-used fallback (lowest priority)
          if (!defaults[i] && fallbackId) {
            defaults[i] = fallbackId;
          }
        });
        setTxCategories(defaults);
      });
      getLastUsedBudgetId().then((id) => {
        if (id) {
          const defaults: Record<number, string> = {};
          parsed.forEach((_, i) => {
            defaults[i] = id;
          });
          setTxBudgets(defaults);
        }
      });

      tryAIEnhancement(parsed);
    } else if (!visible) {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const tryAIEnhancement = async (txs: ParsedTransaction[]) => {
    const connected = await isOnline();
    if (!connected) return;
    setIsLoadingAI(true);
    try {
      const combinedText = txs.map((p) => p.rawText).join(" و ");
      const result = await parseWithAI(combinedText);
      if (result.confidence > 0) {
        setTransactions([result]);
        setSelected(new Set([0]));
      }
    } catch (error) {
      console.error("[Review] AI enhancement failed:", error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(transactions.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const updateTransaction = (
    index: number,
    updates: Partial<ParsedTransaction>,
  ) => {
    setTransactions((prev) =>
      prev.map((tx, i) => (i === index ? { ...tx, ...updates } : tx)),
    );
  };

  const handleAccept = () => {
    const selectedTxs = transactions
      .map((tx, i) => ({ tx, originalIndex: i }))
      .filter(({ originalIndex }) => selected.has(originalIndex))
      .map(({ tx, originalIndex }) => ({
        ...tx,
        categoryId: txCategories[originalIndex] || tx.categoryId || undefined,
        budgetId: txBudgets[originalIndex] || undefined,
      }));
    if (selectedTxs.length > 0) {
      onAccept(selectedTxs);
    }
  };

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onDismiss();
      }
    },
    [onDismiss],
  );

  const getTypeColor = (type?: TransactionType) =>
    type === "income" ? UI.COLORS.SUCCESS : UI.COLORS.ERROR;

  const getTypeIcon = (
    type?: TransactionType,
  ): keyof typeof Ionicons.glyphMap =>
    type === "income" ? "trending-up" : "trending-down";

  const selectedCount = selected.size;

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.7}
      />
    ),
    [],
  );

  if (!visible || parsed.length === 0) return null;

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={handleSheetChange}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.sheetHandle}
      style={styles.sheet}>
      <BottomSheetScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Ionicons
                name="receipt-outline"
                size={18}
                color={UI.COLORS.PRIMARY}
              />
            </View>
            <Text style={styles.title}>
              {isLoadingAI
                ? "Analyzing with AI..."
                : `${transactions.length} Transaction${transactions.length > 1 ? "s" : ""} Found`}
            </Text>
          </View>
          <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={UI.COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>

        {/* Select all / Deselect all */}
        {transactions.length > 1 && (
          <View style={styles.selectRow}>
            <TouchableOpacity
              onPress={
                selectedCount === transactions.length ? deselectAll : selectAll
              }
              style={styles.selectAllBtn}>
              <Ionicons
                name={
                  selectedCount === transactions.length
                    ? "checkbox"
                    : "square-outline"
                }
                size={18}
                color={UI.COLORS.PRIMARY}
              />
              <Text style={styles.selectAllText}>
                {selectedCount === transactions.length
                  ? "Deselect All"
                  : "Select All"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.selectedCount}>
              {selectedCount}/{transactions.length} selected
            </Text>
          </View>
        )}

        {isLoadingAI && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={UI.COLORS.PRIMARY} />
            <Text style={styles.loadingText}>Enhancing with AI...</Text>
          </View>
        )}

        {/* Transaction list */}
        {transactions.map((tx, i) => (
          <View
            key={i}
            style={[
              styles.txCard,
              !selected.has(i) && styles.txCardDeselected,
            ]}>
            {/* Checkbox + Type */}
            <View style={styles.txTopRow}>
              <TouchableOpacity
                onPress={() => toggleSelect(i)}
                style={styles.checkbox}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons
                  name={selected.has(i) ? "checkbox" : "square-outline"}
                  size={22}
                  color={
                    selected.has(i) ? UI.COLORS.PRIMARY : UI.COLORS.TEXT_MUTED
                  }
                />
              </TouchableOpacity>

              {/* Type toggle */}
              <TouchableOpacity
                onPress={() =>
                  updateTransaction(i, {
                    type: tx.type === "income" ? "expense" : "income",
                  })
                }
                style={[
                  styles.typePill,
                  { backgroundColor: getTypeColor(tx.type) + "20" },
                ]}>
                <Ionicons
                  name={getTypeIcon(tx.type)}
                  size={14}
                  color={getTypeColor(tx.type)}
                />
                <Text
                  style={[styles.typeText, { color: getTypeColor(tx.type) }]}>
                  {tx.type === "income" ? "Income" : "Expense"}
                </Text>
              </TouchableOpacity>

              {/* Edit / collapse */}
              <TouchableOpacity
                onPress={() => setEditingIndex(editingIndex === i ? null : i)}
                style={styles.editBtn}>
                <Ionicons
                  name={editingIndex === i ? "chevron-up" : "create-outline"}
                  size={18}
                  color={UI.COLORS.TEXT_MUTED}
                />
              </TouchableOpacity>
            </View>

            {/* Main row: amount + description */}
            <View style={styles.txBody}>
              <Text style={styles.txAmount}>
                {tx.amount?.toFixed(2) ?? "—"}
              </Text>
              {tx.description && (
                <Text style={styles.txDesc} numberOfLines={1}>
                  {tx.description}
                </Text>
              )}
            </View>

            {/* Inline edit (expanded) */}
            {editingIndex === i && (
              <View style={styles.editSection}>
                <View style={styles.editRow}>
                  <Text style={styles.editLabel}>Amount</Text>
                  <TextInput
                    style={styles.editInput}
                    value={tx.amount?.toString() ?? ""}
                    onChangeText={(v) =>
                      updateTransaction(i, {
                        amount: parseFloat(v) || 0,
                      })
                    }
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={UI.COLORS.TEXT_MUTED}
                  />
                </View>
                <View style={styles.editRow}>
                  <Text style={styles.editLabel}>Description</Text>
                  <TextInput
                    style={styles.editInput}
                    value={tx.description ?? ""}
                    onChangeText={(v) =>
                      updateTransaction(i, { description: v })
                    }
                    placeholder="Description"
                    placeholderTextColor={UI.COLORS.TEXT_MUTED}
                  />
                </View>

                {/* Category selector */}
                <View style={styles.editRow}>
                  <Text style={styles.editLabel}>Category</Text>
                </View>
                <View style={styles.chipRow}>
                  {Object.values(allCategories)
                    .filter((c) => c && c.type === (tx.type || "expense"))
                    .map(
                      (cat) =>
                        cat && (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.chip,
                              txCategories[i] === cat.id && styles.chipActive,
                            ]}
                            onPress={() =>
                              setTxCategories((prev) => ({
                                ...prev,
                                [i]: prev[i] === cat.id ? "" : cat.id,
                              }))
                            }>
                            {cat.color && (
                              <View
                                style={[
                                  styles.chipDot,
                                  { backgroundColor: cat.color },
                                ]}
                              />
                            )}
                            <Text
                              style={[
                                styles.chipText,
                                txCategories[i] === cat.id &&
                                  styles.chipTextActive,
                              ]}>
                              {cat.name}
                            </Text>
                          </TouchableOpacity>
                        ),
                    )}
                </View>

                {/* Budget selector */}
                {Object.values(allBudgets).filter(Boolean).length > 0 && (
                  <>
                    <View style={styles.editRow}>
                      <Text style={styles.editLabel}>Budget</Text>
                    </View>
                    <View style={styles.chipRow}>
                      <TouchableOpacity
                        style={[
                          styles.chip,
                          !txBudgets[i] && styles.chipActive,
                        ]}
                        onPress={() =>
                          setTxBudgets((prev) => ({ ...prev, [i]: "" }))
                        }>
                        <Text
                          style={[
                            styles.chipText,
                            !txBudgets[i] && styles.chipTextActive,
                          ]}>
                          None
                        </Text>
                      </TouchableOpacity>
                      {Object.values(allBudgets)
                        .filter(Boolean)
                        .map(
                          (b) =>
                            b && (
                              <TouchableOpacity
                                key={b.id}
                                style={[
                                  styles.chip,
                                  txBudgets[i] === b.id && styles.chipActive,
                                ]}
                                onPress={() =>
                                  setTxBudgets((prev) => ({
                                    ...prev,
                                    [i]: prev[i] === b.id ? "" : b.id,
                                  }))
                                }>
                                <Text
                                  style={[
                                    styles.chipText,
                                    txBudgets[i] === b.id &&
                                      styles.chipTextActive,
                                  ]}>
                                  {b.name}
                                </Text>
                              </TouchableOpacity>
                            ),
                        )}
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        ))}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Text style={styles.dismissText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.acceptButton,
              selectedCount === 0 && styles.acceptButtonDisabled,
            ]}
            onPress={handleAccept}
            disabled={selectedCount === 0}>
            <LinearGradient
              colors={
                selectedCount > 0
                  ? [UI.COLORS.PRIMARY_LIGHT, UI.COLORS.PRIMARY]
                  : ["transparent", "transparent"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.acceptGradient}>
              <Ionicons
                name="checkmark-done"
                size={20}
                color={selectedCount > 0 ? "#fff" : UI.COLORS.TEXT_MUTED}
              />
              <Text
                style={[
                  styles.acceptText,
                  selectedCount === 0 && styles.acceptTextDisabled,
                ]}>
                Add {selectedCount > 0 ? selectedCount : ""} Transaction
                {selectedCount !== 1 ? "s" : ""}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    zIndex: 9999,
  },
  sheetBackground: {
    backgroundColor: "#12122E",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.15)",
  },
  sheetHandle: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: UI.COLORS.PRIMARY + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  selectRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: "500",
    color: UI.COLORS.PRIMARY,
  },
  selectedCount: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    backgroundColor: UI.COLORS.PRIMARY + "15",
    borderRadius: 12,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: UI.COLORS.PRIMARY,
    fontWeight: "500",
  },
  txCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  txCardDeselected: {
    opacity: 0.4,
  },
  txTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  checkbox: {
    marginRight: 2,
  },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  editBtn: {
    marginLeft: "auto",
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  txBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: 30,
  },
  txAmount: {
    fontSize: 22,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  txDesc: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    flex: 1,
    textAlign: "right",
    marginLeft: 12,
  },
  editSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
    gap: 10,
    paddingLeft: 30,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editLabel: {
    fontSize: 13,
    color: UI.COLORS.TEXT_MUTED,
    width: 80,
  },
  editInput: {
    flex: 1,
    fontSize: 14,
    color: UI.COLORS.TEXT_PRIMARY,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    gap: 4,
  },
  chipActive: {
    backgroundColor: UI.COLORS.PRIMARY,
    borderColor: UI.COLORS.PRIMARY,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
    color: UI.COLORS.TEXT_SECONDARY,
  },
  chipTextActive: {
    color: "#fff",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  dismissButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  dismissText: {
    fontSize: 15,
    fontWeight: "600",
    color: UI.COLORS.TEXT_SECONDARY,
  },
  acceptButton: {
    flex: 2,
    borderRadius: 14,
    overflow: "hidden",
  },
  acceptButtonDisabled: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  acceptGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  acceptText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  acceptTextDisabled: {
    color: UI.COLORS.TEXT_MUTED,
  },
});
