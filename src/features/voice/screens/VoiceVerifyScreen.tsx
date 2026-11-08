import { VoiceReviewEntries } from "../components/VoiceReviewEntries";
import { VoiceEntryEditorModal } from "../components/VoiceEntryEditorModal";
import { styles } from "../components/VoiceVerifySection.styles";
import { useVoiceVerifyScreen } from "../hooks/useVoiceVerifyScreen";
import React from "react";
import { View, Text, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { formatCurrency } from "../../../shared/utils";

import { CategoryCreationModal } from "../../categories/components/CategoryCreationModal";

export const VoiceVerifyScreen: React.FC = () => {
  const { colors, typography, isDark } = useAppTheme();
  const {
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
  } = useVoiceVerifyScreen();

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
          {source === "ocr" && summary?.merchant && (
            <Text style={[typography.label, { color: colors.primary, marginTop: 2 }]}>
              {summary.merchant}
            </Text>
          )}
        </View>
        <View style={{ width: 36 }} />
      </View>

      <VoiceReviewEntries source={source} parsedTransactions={parsedTransactions} summary={summary} totalAmount={totalAmount} itemsSum={itemsSum} discount={discount} rawText={rawText} handleEnhanceWithAI={handleEnhanceWithAI} isEnhancingAI={isEnhancingAI} categoriesMap={categoriesMap} handleEdit={handleEdit} handleRemove={handleRemove} handleAddAnotherVoice={handleAddAnotherVoice} setEditData={setEditData} setEditingIndex={setEditingIndex} />

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
                Save as 1 Total ({formatCurrency(totalAmount)})
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
      <VoiceEntryEditorModal editingIndex={editingIndex} setEditingIndex={setEditingIndex} parsedTransactions={parsedTransactions} editData={editData} setEditData={setEditData} categoryIds={categoryIds} categoriesMap={categoriesMap} setShowCreateCategoryModal={setShowCreateCategoryModal} budgetIds={budgetIds} budgetsMap={budgetsMap} saveEdit={saveEdit} />

      <CategoryCreationModal
        visible={showCreateCategoryModal}
        onClose={() => setShowCreateCategoryModal(false)}
        onCreateCategory={handleQuickCreateCategory}
        initialData={{ name: "", type: editData.type }}
      />
    </SafeAreaView>
  );
};
