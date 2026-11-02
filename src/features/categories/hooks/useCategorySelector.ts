import { useState, useEffect } from "react";

import { CategoryData } from "../components/CategoryCreationModal";
import { getLastUsedCategoryId, setLastUsedCategoryId } from "../../settings/utils/userPreferences";
interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color?: string;
}
interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryId?: string;
  onCategorySelect: (categoryId: string | undefined) => void;
  onCategoryAdd?: (category: Omit<Category, "id">) => void;
  type: "income" | "expense";
  label?: string;
  error?: string;
  showAddButton?: boolean;
  rememberLastUsed?: boolean;
}
export function useCategorySelector({
  categories,
  selectedCategoryId,
  onCategorySelect,
  onCategoryAdd,
  type,
  label = "Category",
  error,
  showAddButton = true,
  rememberLastUsed = false,
}: CategorySelectorProps) {

  const [showAddModal, setShowAddModal] = useState(false);

  const filteredCategories = categories.filter(
    (category) => category.type === type,
  );

  useEffect(() => {
    if (
      rememberLastUsed &&
      !selectedCategoryId &&
      filteredCategories.length > 0
    ) {
      loadLastUsedCategory();
    }
  }, [rememberLastUsed, selectedCategoryId, filteredCategories.length]);

  const loadLastUsedCategory = async () => {
    try {
      const lastUsedId = await getLastUsedCategoryId();
      if (
        lastUsedId &&
        filteredCategories.some((cat) => cat.id === lastUsedId)
      ) {
        onCategorySelect(lastUsedId);
      }
    } catch (error) {
      console.warn("Failed to load last used category:", error);
    }
  };

  const handleCategorySelect = async (categoryId: string) => {
    if (selectedCategoryId === categoryId) {
      onCategorySelect(undefined);
      if (rememberLastUsed) {
        await setLastUsedCategoryId(null);
      }
    } else {
      onCategorySelect(categoryId);
      if (rememberLastUsed) {
        await setLastUsedCategoryId(categoryId);
      }
    }
  };

  const handleAddCategory = (categoryData: CategoryData) => {
    onCategoryAdd?.(categoryData);
    setShowAddModal(false);
  };
  return { showAddModal, setShowAddModal, filteredCategories, handleCategorySelect, handleAddCategory };
}
