import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../constants";
import { CategoryCreationModal, CategoryData } from "./CategoryCreationModal";
import {
  getLastUsedCategoryId,
  setLastUsedCategoryId,
} from "../../utils/userPreferences";

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

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}>
        <View style={styles.categoryContainer}>
          {/* None chip */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              onCategorySelect(undefined);
              if (rememberLastUsed) setLastUsedCategoryId(null);
            }}>
            {!selectedCategoryId ? (
              <LinearGradient
                colors={[UI.COLORS.PRIMARY, UI.COLORS.PRIMARY_DARK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.chip, styles.chipActive]}>
                <Text style={styles.chipTextActive}>None</Text>
              </LinearGradient>
            ) : (
              <View style={styles.chip}>
                <Text style={styles.chipText}>None</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Category chips */}
          {filteredCategories.map((category) => {
            const isActive = selectedCategoryId === category.id;
            return (
              <TouchableOpacity
                key={category.id}
                activeOpacity={0.7}
                onPress={() => handleCategorySelect(category.id)}>
                {isActive ? (
                  <LinearGradient
                    colors={[UI.COLORS.PRIMARY, UI.COLORS.PRIMARY_DARK]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.chip, styles.chipActive]}>
                    {category.icon ? (
                      <Ionicons
                        name={category.icon as any}
                        size={14}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                    ) : category.color ? (
                      <View
                        style={[
                          styles.colorDot,
                          styles.colorDotActive,
                          { backgroundColor: category.color },
                        ]}
                      />
                    ) : null}
                    <Text style={styles.chipTextActive}>{category.name}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.chip}>
                    {category.icon ? (
                      <Ionicons
                        name={category.icon as any}
                        size={14}
                        color={category.color || UI.COLORS.TEXT_PRIMARY}
                        style={{ marginRight: 6 }}
                      />
                    ) : category.color ? (
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: category.color },
                        ]}
                      />
                    ) : null}
                    <Text style={styles.chipText}>{category.name}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Add button */}
          {showAddButton && onCategoryAdd && (
            <TouchableOpacity
              style={styles.addButton}
              activeOpacity={0.7}
              onPress={() => setShowAddModal(true)}>
              <Ionicons name="add" size={16} color={UI.COLORS.PRIMARY_LIGHT} />
              <Text style={styles.addButtonText}>Add</Text>
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
    fontSize: 13,
    fontWeight: "600",
    color: UI.COLORS.PRIMARY_LIGHT,
    marginBottom: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  categoryScroll: {
    marginHorizontal: -UI.SPACING.MD,
  },
  categoryContainer: {
    flexDirection: "row",
    paddingHorizontal: UI.SPACING.MD,
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 25,
    backgroundColor: "rgba(20,20,50,0.65)",
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.18)",
    gap: 6,
  },
  chipActive: {
    borderWidth: 0,
    shadowColor: UI.COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
    color: UI.COLORS.TEXT_SECONDARY,
  },
  chipTextActive: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  colorDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.35)",
    borderStyle: "dashed",
    gap: 4,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: UI.COLORS.PRIMARY_LIGHT,
  },
  errorText: {
    fontSize: 12,
    color: UI.COLORS.ERROR,
    marginTop: 6,
  },
});
