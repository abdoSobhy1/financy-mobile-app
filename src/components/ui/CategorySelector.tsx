import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../constants";
import { CategoryCreationModal, CategoryData } from "./CategoryCreationModal";
import { getLastUsedCategoryId, setLastUsedCategoryId } from "../../utils/userPreferences";

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
  rememberLastUsed?: boolean; // New prop to enable last used functionality
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategoryId,
  onCategorySelect,
  onCategoryAdd,
  type,
  label = "Category",
  error,
  showAddButton = true,
  rememberLastUsed = false,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredCategories = categories.filter((category) => category.type === type);

  // Load last used category on component mount if enabled
  useEffect(() => {
    if (rememberLastUsed && !selectedCategoryId && filteredCategories.length > 0) {
      loadLastUsedCategory();
    }
  }, [rememberLastUsed, selectedCategoryId, filteredCategories.length]);

  const loadLastUsedCategory = async () => {
    try {
      const lastUsedId = await getLastUsedCategoryId();
      if (lastUsedId && filteredCategories.some((cat) => cat.id === lastUsedId)) {
        onCategorySelect(lastUsedId);
      }
    } catch (error) {
      console.warn("Failed to load last used category:", error);
    }
  };

  const handleCategorySelect = async (categoryId: string) => {
    // Toggle behavior: if already selected, unselect it
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

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label} *</Text>}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        <View style={styles.categoryContainer}>
          {/* None option for deselecting */}
          <TouchableOpacity
            style={[styles.categoryChip, !selectedCategoryId && styles.categoryChipActive]}
            onPress={() => {
              onCategorySelect(undefined);
              if (rememberLastUsed) {
                setLastUsedCategoryId(null);
              }
            }}>
            <Text style={[styles.categoryChipText, !selectedCategoryId && styles.categoryChipTextActive]}>None</Text>
          </TouchableOpacity>

          {filteredCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryChip, selectedCategoryId === category.id && styles.categoryChipActive]}
              onPress={() => handleCategorySelect(category.id)}>
              {category.color && <View style={[styles.categoryColorDot, { backgroundColor: category.color }]} />}
              <Text style={[styles.categoryChipText, selectedCategoryId === category.id && styles.categoryChipTextActive]}>{category.name}</Text>
            </TouchableOpacity>
          ))}

          {/* Add Category Button */}
          {showAddButton && onCategoryAdd && (
            <TouchableOpacity style={styles.addCategoryButton} onPress={() => setShowAddModal(true)}>
              <Ionicons name="add" size={16} color={UI.COLORS.PRIMARY} />
              <Text style={styles.addCategoryText}>Add New</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <CategoryCreationModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreateCategory={handleAddCategory}
        type={type}
        title="Add New Category"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: UI.SPACING.MD,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.SM,
  },
  categoryScroll: {
    marginHorizontal: -UI.SPACING.MD,
  },
  categoryContainer: {
    flexDirection: "row",
    paddingHorizontal: UI.SPACING.MD,
    gap: UI.SPACING.SM,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: UI.SPACING.SM,
    paddingHorizontal: UI.SPACING.MD,
    borderRadius: 25,
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    gap: UI.SPACING.XS,
  },
  categoryChipActive: {
    backgroundColor: UI.COLORS.PRIMARY,
    borderColor: UI.COLORS.PRIMARY,
  },
  categoryColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  addCategoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: UI.SPACING.SM,
    paddingHorizontal: UI.SPACING.MD,
    borderRadius: 25,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: UI.COLORS.PRIMARY,
    borderStyle: "dashed",
    gap: UI.SPACING.XS,
  },
  addCategoryText: {
    fontSize: 14,
    fontWeight: "500",
    color: UI.COLORS.PRIMARY,
  },
  errorText: {
    fontSize: 14,
    color: UI.COLORS.ERROR,
    marginTop: UI.SPACING.XS,
  },
});
