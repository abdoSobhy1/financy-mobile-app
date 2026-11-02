import { useEffect, useState, useCallback } from "react";

import { useDispatch, useSelector } from "react-redux";

import { RootState, AppDispatch } from "../../../app/store";
import { fetchCategories, addCategory, deleteCategory, updateCategory } from "../store/categoriesSlice";

import { AlertService } from "../../../shared/services/AlertService";
import { Category } from "../../../shared/types";

const COLOUR_PALETTE = [
  "#6C5CE7", "#00B894", "#0984E3", "#E17055",
  "#FDCB6E", "#A29BFE", "#55EFC4", "#FD79A8",
  "#636E72", "#2D3436",
];

/** Owns screen state and actions; rendering stays in CategoriesScreen. */
export function useCategoriesScreen() {

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
    async (data: { name: string; type: "income" | "expense"; color?: string; icon?: string; }) => {
      const colour = data.color || COLOUR_PALETTE[allCategories.length % COLOUR_PALETTE.length];
      await dispatch(addCategory({ ...data, color: colour })).unwrap();
      setShowAddModal(false);
    },
    [dispatch, allCategories.length],
  );

  const handleEdit = useCallback(
    async (data: { name: string; type: "income" | "expense"; color?: string; icon?: string; }) => {
      if (!editingCategory) return;
      await dispatch(
        updateCategory({ id: editingCategory.id, updates: { name: data.name, color: data.color, type: data.type, icon: data.icon } }),
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
  return {
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
  };
}
