import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { AppHeader } from "../components/ui/AppHeader";
import { CategoryCreationModal } from "../components/ui/CategoryCreationModal";
import { RootState, AppDispatch } from "../store";
import {
  fetchCategories,
  addCategory,
  deleteCategory,
  updateCategory,
} from "../store/slices/categoriesSlice";
import { formatCurrency } from "../utils";
import { AlertService } from "../services/AlertService";
import { Category } from "../types";

const { width } = Dimensions.get("window");
const CARD_MARGIN = 8;
const CARD_WIDTH = (width - 40 - CARD_MARGIN * 2) / 2;

// Colour palette for auto-assigning to new categories
const COLOUR_PALETTE = [
  "#6C5CE7", "#00B894", "#0984E3", "#E17055",
  "#FDCB6E", "#A29BFE", "#55EFC4", "#FD79A8",
  "#636E72", "#2D3436",
];

export const CategoriesScreen: React.FC = () => {
  const { colors, typography, spacing } = useAppTheme();
  const dispatch = useDispatch<AppDispatch>();

  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [activeType, setActiveType] = useState<"all" | "expense" | "income">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { items, ids } = useSelector((state: RootState) => state.categories);
  const allCategories = ids.map((id) => items[id]).filter(Boolean);
  const { topSpendingCategories } = useSelector((state: RootState) => state.categories);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const filtered = allCategories.filter((c) => {
    if (activeType === "all") return true;
    return c.type === activeType;
  });

  // ── Handlers ────────────────────────────────────────────────────────

  const handleAdd = useCallback(
    async (data: { name: string; type: "income" | "expense"; color?: string }) => {
      const colour = data.color || COLOUR_PALETTE[allCategories.length % COLOUR_PALETTE.length];
      await dispatch(addCategory({ ...data, color: colour })).unwrap();
      setShowAddModal(false);
    },
    [dispatch, allCategories.length],
  );

  const handleEdit = useCallback(
    async (data: { name: string; type: "income" | "expense"; color?: string }) => {
      if (!editingCategory) return;
      await dispatch(
        updateCategory({ id: editingCategory.id, updates: { name: data.name, color: data.color, type: data.type } }),
      ).unwrap();
      setEditingCategory(null);
    },
    [dispatch, editingCategory],
  );

  const handleDeleteConfirm = useCallback(
    (cat: Category) => {
      AlertService.alert(
        `Delete "${cat.name}"?`,
        "This will remove the category. Transactions linked to it will keep their data.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => dispatch(deleteCategory(cat.id)),
          },
        ],
      );
    },
    [dispatch],
  );

  const handleCardPress = (cat: Category) => {
    AlertService.alert(
      cat.name,
      `Type: ${cat.type === "expense" ? "Expense" : "Income"}\nTransactions: ${cat.entryCount || 0}`,
      [
        { text: "Edit", onPress: () => setEditingCategory(cat) },
        { text: "Delete", style: "destructive", onPress: () => handleDeleteConfirm(cat) },
        { text: "Close", style: "cancel" },
      ],
    );
  };

  // ── Render ──────────────────────────────────────────────────────────

  const renderGridCard = (cat: Category) => {
    const spendingData = topSpendingCategories.find((t) => t.category.id === cat.id);
    const spent = spendingData ? spendingData.totalSpent : 0;
    const bgColor = cat.color ? cat.color + "22" : "rgba(255,255,255,0.05)";
    const iconColor = cat.color || colors.primary;

    return (
      <TouchableOpacity
        key={cat.id}
        style={[
          styles.categoryCard,
          { backgroundColor: colors.surfaceVariant, borderColor: cat.color ? cat.color + "44" : colors.outlineVariant },
        ]}
        onPress={() => handleCardPress(cat)}
        activeOpacity={0.7}>
        <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
          <Ionicons name={(cat as any).icon || "pricetag"} size={24} color={iconColor} />
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
          <Text style={[typography.bodySmall, { color: iconColor, fontWeight: "600", marginTop: 4 }]}>
            {formatCurrency(spent)}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderListRow = (cat: Category) => {
    const spendingData = topSpendingCategories.find((t) => t.category.id === cat.id);
    const spent = spendingData ? spendingData.totalSpent : 0;
    const iconColor = cat.color || colors.primary;
    const bgColor = cat.color ? cat.color + "22" : "rgba(255,255,255,0.08)";

    return (
      <TouchableOpacity
        key={cat.id}
        style={[styles.listRow, { backgroundColor: colors.surfaceVariant, borderColor: colors.outlineVariant }]}
        onPress={() => handleCardPress(cat)}
        activeOpacity={0.7}>
        <View style={[styles.listIconBox, { backgroundColor: bgColor }]}>
          <Ionicons name={(cat as any).icon || "pricetag"} size={20} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.label, { color: colors.onBackground }]}>{cat.name}</Text>
          <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
            {cat.type === "expense" ? "Expense" : "Income"} · {cat.entryCount || 0} transactions
          </Text>
        </View>
        {spent > 0 && (
          <Text style={[typography.label, { color: iconColor }]}>{formatCurrency(spent)}</Text>
        )}
        <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <AppHeader title="Categories" />

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
          type={editingCategory.type}
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
