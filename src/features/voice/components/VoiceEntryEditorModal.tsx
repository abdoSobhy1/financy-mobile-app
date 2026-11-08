import { useAppTheme, resolveCategoryColor } from "../../../shared/theme/ThemeProvider";
import { styles } from "./VoiceVerifySection.styles";
import type { VoiceVerifyScreenController } from "../hooks/useVoiceVerifyScreen";

import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from "react-native";

import { Ionicons } from "@expo/vector-icons";

interface VoiceEntryEditorModalProps {
  editingIndex: VoiceVerifyScreenController["editingIndex"];
  setEditingIndex: VoiceVerifyScreenController["setEditingIndex"];
  parsedTransactions: VoiceVerifyScreenController["parsedTransactions"];
  editData: VoiceVerifyScreenController["editData"];
  setEditData: VoiceVerifyScreenController["setEditData"];
  categoryIds: VoiceVerifyScreenController["categoryIds"];
  categoriesMap: VoiceVerifyScreenController["categoriesMap"];
  setShowCreateCategoryModal: VoiceVerifyScreenController["setShowCreateCategoryModal"];
  budgetIds: VoiceVerifyScreenController["budgetIds"];
  budgetsMap: VoiceVerifyScreenController["budgetsMap"];
  saveEdit: VoiceVerifyScreenController["saveEdit"];

}
export function VoiceEntryEditorModal({ editingIndex, setEditingIndex, parsedTransactions, editData, setEditData, categoryIds, categoriesMap, setShowCreateCategoryModal, budgetIds, budgetsMap, saveEdit }: VoiceEntryEditorModalProps) {
  const { colors, typography, isDark } = useAppTheme();

  return (<Modal
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
          Transaction type
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {(["expense", "income"] as const).map((type) => {
            const selected = editData.type === type;
            const label = type === "income" ? "Income" : "Expense";
            const selectedBackground = type === "income" ? colors.primary : colors.error;
            return (
              <TouchableOpacity
                key={type}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setEditData((prev) => ({
                  ...prev,
                  type,
                  categoryId: "",
                  budgetId: undefined,
                }))}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 10,
                  borderRadius: 18,
                  backgroundColor: selected ? selectedBackground : colors.surfaceVariant,
                  borderWidth: 1,
                  borderColor: selected ? selectedBackground : colors.outlineVariant,
                }}>
                <Text style={[typography.label, {
                  color: selected ? colors.onPrimary : colors.onSurfaceVariant,
                  fontWeight: "700",
                }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[typography.label, { color: colors.onSurfaceVariant, marginBottom: 8 }]}>
          Category
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16, paddingBottom: 8 }}>
          {categoryIds.map((id) => {
            const c = categoriesMap[id];
            if (!c || c.deleted || c.type !== editData.type) return null;
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
                  name={(c.icon || "pricetag") as React.ComponentProps<typeof Ionicons>["name"]}
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

          {/* Quick "+ New Category" Pill */}
          <TouchableOpacity
            onPress={() => setShowCreateCategoryModal(true)}
            style={[
              styles.modalCatPill,
              {
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: colors.primary,
              },
            ]}>
            <Ionicons
              name="add-circle-outline"
              size={15}
              color={colors.primary}
              style={{ marginRight: 4 }}
            />
            <Text style={[typography.label, { color: colors.primary, fontWeight: "700" }]}>
              New Category
            </Text>
          </TouchableOpacity>
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
  </Modal>);
}
