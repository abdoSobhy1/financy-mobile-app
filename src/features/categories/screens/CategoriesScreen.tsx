import { useCategoriesScreen } from "../hooks/useCategoriesScreen";
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme, resolveCategoryColor } from "../../../shared/theme/ThemeProvider";
import { AppHeader } from "../../../shared/ui/AppHeader";
import { CategoryCreationModal } from "../components/CategoryCreationModal";

import { formatCurrency } from "../../../shared/utils";

import { Category } from "../../../shared/types";

const { width } = Dimensions.get("window");
const CARD_MARGIN = 8;
const CARD_WIDTH = (width - 40 - CARD_MARGIN * 2) / 2;

export const CategoriesScreen: React.FC = () => {
  const { colors, typography, spacing, isDark } = useAppTheme();
  const {
    viewMode,
    setViewMode,
    activeType,
    setActiveType,
    showAddModal,
    setShowAddModal,
    editingCategory,
    setEditingCategory,
    topSpendingCategories,
    filtered,
    handleAdd,
    handleEdit,
    handleCardPress
  } = useCategoriesScreen();

  // ── Render ──────────────────────────────────────────────────────────

  const renderGridCard = (cat: Category) => {
    const spendingData = topSpendingCategories.find((t) => t.category.id === cat.id);
    const spent = spendingData ? spendingData.totalSpent : 0;
    const resolved = resolveCategoryColor(cat.color, isDark);

    return (
      <TouchableOpacity
        key={cat.id}
        style={[
          styles.categoryCard,
          { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
        ]}
        onPress={() => handleCardPress(cat)}
        activeOpacity={0.7}>
        <View style={[styles.iconBox, { backgroundColor: resolved.bg }]}>
          <Ionicons name={(cat.icon || "pricetag") as React.ComponentProps<typeof Ionicons>["name"]} size={24} color={resolved.fg} />
        </View>
        <Text
          style={[typography.label, { color: colors.onBackground, textAlign: "center", marginBottom: 4 }]}
          numberOfLines={1}>
          {cat.name}
        </Text>
        <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
          {cat.type === "expense" ? "Expense" : "Income"}
        </Text>
        {spent > 0 && (
          <Text style={[typography.bodySmall, { color: resolved.fg, fontWeight: "600", marginTop: 4 }]}>
            {formatCurrency(spent)}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderListRow = (cat: Category) => {
    const spendingData = topSpendingCategories.find((t) => t.category.id === cat.id);
    const spent = spendingData ? spendingData.totalSpent : 0;
    const resolved = resolveCategoryColor(cat.color, isDark);

    return (
      <TouchableOpacity
        key={cat.id}
        style={[styles.listRow, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
        onPress={() => handleCardPress(cat)}
        activeOpacity={0.7}>
        <View style={[styles.listIconBox, { backgroundColor: resolved.bg }]}>
          <Ionicons name={(cat.icon || "pricetag") as React.ComponentProps<typeof Ionicons>["name"]} size={20} color={resolved.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.label, { color: colors.onBackground }]}>{cat.name}</Text>
          <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
            {cat.type === "expense" ? "Expense" : "Income"} · {cat.entryCount || 0} transactions
          </Text>
        </View>
        {spent > 0 && (
          <Text style={[typography.label, { color: resolved.fg }]}>{formatCurrency(spent)}</Text>
        )}
        <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      <AppHeader title="Categories" showBack={true} showSettings={false} />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>

        {/* Type filter pills */}
        <View style={styles.filterRow}>
          {(["all", "expense", "income"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.filterPill,
                { backgroundColor: activeType === t ? colors.primaryContainer : colors.surfaceVariant },
              ]}
              onPress={() => setActiveType(t)}>
              <Text
                style={[
                  typography.bodySmall,
                  {
                    color: activeType === t ? colors.onPrimaryContainer : colors.onSurfaceVariant,
                    fontWeight: "600",
                    textTransform: "capitalize",
                  },
                ]}>
                {t === "all" ? "All" : t === "expense" ? "Expenses" : "Income"}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* View toggle */}
          <TouchableOpacity
            style={[styles.viewToggle, { backgroundColor: colors.surfaceVariant }]}
            onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
            <Ionicons
              name={viewMode === "grid" ? "list-outline" : "grid-outline"}
              size={18}
              color={colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginBottom: spacing.lg }]}>
          {filtered.length} {activeType === "all" ? "total" : activeType} categories
        </Text>

        {/* Grid or List */}
        {viewMode === "grid" ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -CARD_MARGIN }}>
            {filtered.map(renderGridCard)}

            {/* Add New */}
            <TouchableOpacity
              style={[styles.addCard, { borderColor: colors.outlineVariant }]}
              onPress={() => setShowAddModal(true)}
              activeOpacity={0.7}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryContainer + "44" }]}>
                <Ionicons name="add" size={28} color={colors.primary} />
              </View>
              <Text style={[typography.label, { color: colors.primary }]}>Add New</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filtered.map(renderListRow)}
            <TouchableOpacity
              style={[styles.listAddRow, { backgroundColor: colors.primaryContainer + "22", borderColor: colors.primary + "44" }]}
              onPress={() => setShowAddModal(true)}
              activeOpacity={0.7}>
              <View style={[styles.listIconBox, { backgroundColor: colors.primaryContainer + "44" }]}>
                <Ionicons name="add" size={20} color={colors.primary} />
              </View>
              <Text style={[typography.label, { color: colors.primary }]}>Add New Category</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <CategoryCreationModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreateCategory={handleAdd}
      />

      {editingCategory && (
        <CategoryCreationModal
          visible={!!editingCategory}
          onClose={() => setEditingCategory(null)}
          onCreateCategory={handleEdit}
          initialData={{
            name: editingCategory.name,
            type: editingCategory.type,
            color: editingCategory.color,
            icon: editingCategory.icon,
          }}
          title={`Edit "${editingCategory.name}"`}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  viewToggle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryCard: {
    width: CARD_WIDTH,
    margin: CARD_MARGIN,
    padding: 20,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  addCard: {
    width: CARD_WIDTH,
    margin: CARD_MARGIN,
    padding: 20,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  listAddRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 12,
  },
  listIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default CategoriesScreen;
