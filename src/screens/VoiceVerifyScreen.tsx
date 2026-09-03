import React, { useMemo, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { TransactionStackParamList, ParsedTransaction } from "../types";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { formatCurrency } from "../utils";
import { useToast, Card } from "../components/ui";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store";
import { addTransaction } from "../store/slices/transactionsSlice";

type NavigationProp = StackNavigationProp<TransactionStackParamList>;
type VoiceVerifyRouteProp = RouteProp<TransactionStackParamList, "VoiceVerify">;

export const VoiceVerifyScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<VoiceVerifyRouteProp>();
  const { colors, typography } = useAppTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { showSuccess, showError } = useToast();

  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>(
    route.params.parsedTransactions || []
  );

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<{
    amount: string;
    description: string;
    categoryId: string;
    budgetId?: string;
  }>({ amount: "", description: "", categoryId: "", budgetId: undefined });

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

  // ── Confirm all ──────────────────────────────────────────────────────
  const handleConfirmAll = async () => {
    try {
      const promises = parsedTransactions.map((t) =>
        dispatch(
          addTransaction({
            amount: (t.amount || 0).toString(),
            type: t.type || "expense",
            description: t.description || "",
            date: t.date || new Date(),
            categoryId: t.categoryId || "",
            budgetId: t.budgetId,
            note: t.note || "",
          })
        ).unwrap()
      );
      await Promise.all(promises);
      showSuccess(`Saved ${parsedTransactions.length} transactions`);
      navigation.navigate("TransactionList");
    } catch (e: any) {
      showError(e?.message || "Failed to save transactions");
    }
  };

  // ── Add another — navigate back to VoiceInput with current list ───────
  const handleAddAnother = () => {
    navigation.navigate("VoiceInput", {
      existingTransactions: parsedTransactions,
    });
  };

  // ── Edit helpers ──────────────────────────────────────────────────────
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
    const updated = [...parsedTransactions];
    const amountVal = parseFloat(editData.amount);
    updated[editingIndex] = {
      ...updated[editingIndex],
      amount: isNaN(amountVal) ? updated[editingIndex].amount : amountVal,
      description: editData.description,
      categoryId: editData.categoryId,
      budgetId: editData.budgetId,
    };
    setParsedTransactions(updated);
    setEditingIndex(null);
  };

  const handleRemove = (index: number) => {
    setParsedTransactions((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.onBackground} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.onBackground }]}>
          Verify Transactions
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text
          style={[typography.bodyLarge, styles.subtitle, { color: colors.onSurfaceVariant }]}>
          {parsedTransactions.length} transaction{parsedTransactions.length !== 1 && "s"} detected. Review before saving.
        </Text>

        {parsedTransactions.map((tx, index) => {
          const category = tx.categoryId ? categoriesMap[tx.categoryId] : null;
          const iconColor = category?.color || colors.primaryContainer;

          return (
            <Card key={index} variant="elevated" style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <View style={[styles.iconBox, { backgroundColor: "rgba(255,255,255,0.05)" }]}>
                    <Ionicons
                      name={(category as any)?.icon || "help-outline"}
                      size={20}
                      color={iconColor}
                    />
                  </View>
                  <View>
                    <Text style={[typography.bodyLarge, { color: colors.onSurface, fontWeight: "600" }]}>
                      {tx.description || "Unknown"}
                    </Text>
                    <View style={[styles.categoryPill, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
                      <Text style={[typography.label, { color: colors.onSurfaceVariant }]}>
                        {category?.name || "Uncategorized"}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={[typography.bodyLarge, { color: colors.onSurface, fontWeight: "700" }]}>
                  {tx.type === "expense" ? "-" : "+"}{formatCurrency(tx.amount || 0)}
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

        {/* Add Another — navigate back to VoiceInput */}
        <TouchableOpacity
          style={[
            styles.addAnotherBtn,
            { borderColor: "rgba(255,255,255,0.15)" },
          ]}
          onPress={handleAddAnother}>
          <Ionicons name="mic" size={18} color={colors.onSurfaceVariant} />
          <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginLeft: 8 }]}>
            Add Another Transaction
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          { backgroundColor: colors.background, borderTopColor: colors.outlineVariant },
        ]}>
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
          onPress={handleConfirmAll}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.onPrimary} />
          <Text style={[typography.bodyLarge, { color: colors.onPrimary, fontWeight: "700", marginLeft: 8 }]}>
            Confirm All ({formatCurrency(totalAmount)})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Inline Edit Modal */}
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
              Quick Edit
            </Text>

            <Text style={[typography.label, { color: colors.onSurfaceVariant, marginBottom: 8 }]}>
              Description
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.onBackground }]}
              value={editData.description}
              onChangeText={(t) => setEditData((prev) => ({ ...prev, description: t }))}
              placeholder="What did you spend on?"
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
                return (
                  <TouchableOpacity
                    key={id}
                    onPress={() => setEditData((prev) => ({ ...prev, categoryId: id }))}
                    style={[
                      styles.modalCatPill,
                      { backgroundColor: isSelected ? c.color : colors.surfaceVariant },
                    ]}>
                    <Ionicons
                      name={(c as any).icon || "pricetag"}
                      size={14}
                      color={isSelected ? "#111" : colors.onSurfaceVariant}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[typography.label, { color: isSelected ? "#111" : colors.onSurfaceVariant }]}>
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
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backBtn: {
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  subtitle: {
    marginBottom: 24,
    lineHeight: 22,
  },
  card: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: "#18181B",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addAnotherBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 8,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
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
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
});
