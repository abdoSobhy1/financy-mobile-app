import { styles } from "../screens/VoiceVerifyScreen.styles";
import { useVoiceVerifyScreen } from "../hooks/useVoiceVerifyScreen";

import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { formatCurrency } from "../../../shared/utils";
import { Card, IconChip } from "../../../shared/ui";

interface VoiceReviewEntriesProps {
  source: ReturnType<typeof useVoiceVerifyScreen>["source"];
  parsedTransactions: ReturnType<typeof useVoiceVerifyScreen>["parsedTransactions"];
  summary: ReturnType<typeof useVoiceVerifyScreen>["summary"];
  totalAmount: ReturnType<typeof useVoiceVerifyScreen>["totalAmount"];
  itemsSum: ReturnType<typeof useVoiceVerifyScreen>["itemsSum"];
  discount: ReturnType<typeof useVoiceVerifyScreen>["discount"];
  rawText: ReturnType<typeof useVoiceVerifyScreen>["rawText"];
  handleEnhanceWithAI: ReturnType<typeof useVoiceVerifyScreen>["handleEnhanceWithAI"];
  isEnhancingAI: ReturnType<typeof useVoiceVerifyScreen>["isEnhancingAI"];
  categoriesMap: ReturnType<typeof useVoiceVerifyScreen>["categoriesMap"];
  handleEdit: ReturnType<typeof useVoiceVerifyScreen>["handleEdit"];
  handleRemove: ReturnType<typeof useVoiceVerifyScreen>["handleRemove"];
  handleAddAnotherVoice: ReturnType<typeof useVoiceVerifyScreen>["handleAddAnotherVoice"];
  setEditData: ReturnType<typeof useVoiceVerifyScreen>["setEditData"];
  setEditingIndex: ReturnType<typeof useVoiceVerifyScreen>["setEditingIndex"];

}
export function VoiceReviewEntries({ source, parsedTransactions, summary, totalAmount, itemsSum, discount, rawText, handleEnhanceWithAI, isEnhancingAI, categoriesMap, handleEdit, handleRemove, handleAddAnotherVoice, setEditData, setEditingIndex }: VoiceReviewEntriesProps) {
  const { colors, typography } = useAppTheme();

  return (<ScrollView contentContainerStyle={styles.scrollContent}>
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
          {summary?.date && (
            <View style={styles.dateBadge}>
              <Ionicons name="calendar-outline" size={14} color={colors.onSurfaceVariant} />
              <Text style={[typography.label, { color: colors.onSurfaceVariant, marginLeft: 4 }]}>
                {new Date(summary.date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.summaryStatsRow}>
          <View style={styles.statBox}>
            <Text style={[typography.label, { color: colors.onSurfaceVariant }]}>Receipt Total</Text>
            <Text style={[typography.bodyLarge, { color: colors.onSurface, fontWeight: "700" }]}>
              {formatCurrency(totalAmount)}
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <Text style={[typography.label, { color: colors.onSurfaceVariant }]}>Items Sum</Text>
            <Text style={[typography.bodyLarge, { color: colors.onSurface, fontWeight: "700" }]}>
              {formatCurrency(itemsSum)}
            </Text>
          </View>

          {discount > 0 ? (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[typography.label, { color: colors.error }]}>Discount</Text>
                <Text style={[typography.bodyLarge, { color: colors.error, fontWeight: "700" }]}>
                  -{formatCurrency(discount)}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Re-parse with AI Action */}
        {rawText ? (
          <TouchableOpacity
            style={[
              styles.inspectBtn,
              {
                backgroundColor: colors.primaryContainer,
                marginTop: 8,
                justifyContent: "center",
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
      </Card>
    )}

    {/* Voice Spoken Transcript & AI Re-parse Banner */}
    {source === "voice" && (rawText || parsedTransactions.length > 0) && (
      <Card
        variant="elevated"
        style={StyleSheet.flatten([
          styles.summaryBanner,
          { backgroundColor: colors.surface, borderColor: colors.outlineVariant, marginBottom: 16 },
        ])}>
        <View style={styles.summaryTopRow}>
          <View style={styles.summaryBadge}>
            <Ionicons name="mic" size={16} color={colors.primary} />
            <Text style={[typography.label, { color: colors.primary, marginLeft: 6, fontWeight: "700" }]}>
              Spoken Audio Transcript
            </Text>
          </View>
          <View style={styles.dateBadge}>
            <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
            <Text style={[typography.label, { color: colors.primary, marginLeft: 4, fontWeight: "600" }]}>
              Gemini AI
            </Text>
          </View>
        </View>

        {rawText ? (
          <Text
            style={[
              typography.bodyMedium,
              { color: colors.onSurface, marginTop: 10, marginBottom: 12, lineHeight: 22, fontStyle: "italic" },
            ]}>
            "{rawText}"
          </Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.inspectBtn,
            {
              backgroundColor: colors.primaryContainer,
              marginTop: rawText ? 0 : 8,
              justifyContent: "center",
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 10,
            },
          ]}
          onPress={handleEnhanceWithAI}
          disabled={isEnhancingAI}>
          {isEnhancingAI ? (
            <ActivityIndicator size="small" color={colors.onPrimaryContainer} />
          ) : (
            <Ionicons name="sparkles" size={18} color={colors.onPrimaryContainer} />
          )}
          <Text
            style={[
              typography.label,
              { color: colors.onPrimaryContainer, fontWeight: "700", marginLeft: 8 },
            ]}>
            {isEnhancingAI ? "Analyzing with Gemini AI..." : "Re-parse with AI"}
          </Text>
        </TouchableOpacity>
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
      const transactionType = tx.type || "expense";
      const isIncome = transactionType === "income";
      const typeLabel = isIncome
        ? "Income"
        : transactionType === "transfer"
          ? "Transfer"
          : "Expense";
      const typeBackground = isIncome
        ? colors.primaryContainer
        : transactionType === "transfer"
          ? colors.secondaryContainer
          : colors.errorContainer;
      const typeForeground = isIncome
        ? colors.onPrimaryContainer
        : transactionType === "transfer"
          ? colors.onSecondaryContainer
          : colors.onErrorContainer;

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

                <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                  <View style={[styles.transactionTypePill, { backgroundColor: typeBackground }]}>
                    <Text style={[typography.label, { color: typeForeground, fontWeight: "700" }]}>
                      {typeLabel}
                    </Text>
                  </View>
                  <View style={[styles.categoryPill, { backgroundColor: colors.surfaceVariant }]}>
                    <Text style={[typography.label, { color: colors.onSurfaceVariant }]}>
                      {category?.name || "Uncategorized"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={[typography.bodyLarge, { color: isIncome ? colors.primary : colors.error, fontWeight: "700" }]}>
              {isIncome ? "+" : "-"}{formatCurrency(tx.amount || 0)}
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
          setEditData({
            amount: "",
            description: "",
            categoryId: "",
            type: summary?.type || (parsedTransactions[0]?.type === "income" ? "income" : "expense"),
            budgetId: undefined,
          });
          setEditingIndex(parsedTransactions.length);
        }}>
        <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
        <Text style={[typography.bodyMedium, { color: colors.primary, marginLeft: 8, fontWeight: "600" }]}>
          Add Item Manually
        </Text>
      </TouchableOpacity>
    )}
  </ScrollView>);
}
