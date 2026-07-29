import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme";
import {
  getCategoryColorKey,
  getCategoryIconName,
} from "../../utils/categoryDictionary";
import { CategoryCreationModal, CategoryData } from "./CategoryCreationModal";
import {
  getLastUsedCategoryId,
  setLastUsedCategoryId,
} from "../../utils/userPreferences";

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  icon?: string;
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
  const { colors, isDark, typography, spacing, radius, categoryPalette } =
    useAppTheme();
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
    <View style={[styles.container, { marginBottom: spacing.s16 }]}>
      {label && (
        <Text
          style={[
            styles.label,
            typography.labelMedium,
            { color: colors.primary },
          ]}>
          {label}
        </Text>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={{ paddingHorizontal: spacing.s16, gap: 10 }}>
        <View style={styles.categoryContainer}>
          {/* None chip */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              onCategorySelect(undefined);
              if (rememberLastUsed) setLastUsedCategoryId(null);
            }}
            style={[
              styles.chip,
              {
                backgroundColor: !selectedCategoryId
                  ? colors.primaryContainer
                  : colors.surface,
                borderRadius: radius.medium, // 16px radius matching quick-add
                borderColor: !selectedCategoryId
                  ? colors.primary
                  : colors.outline,
                borderWidth: 1,
                paddingHorizontal: spacing.s16,
                paddingVertical: spacing.s8,
              },
            ]}>
            <Text
              style={[
                typography.labelMedium,
                {
                  color: !selectedCategoryId
                    ? colors.onPrimaryContainer
                    : colors.onSurfaceVariant,
                },
              ]}>
              None
            </Text>
          </TouchableOpacity>

          {/* Category chips with fixed categoryPalette colors */}
          {filteredCategories.map((category) => {
            const isActive = selectedCategoryId === category.id;
            const colorKey = getCategoryColorKey(category.name);
            const colorPair =
              categoryPalette[colorKey] || categoryPalette.neutral;

            const chipBg = isActive
              ? colors.primaryContainer
              : isDark
                ? colorPair.dark
                : colorPair.light;
            const chipText = isActive
              ? colors.onPrimaryContainer
              : isDark
                ? colorPair.textDark
                : colorPair.textLight;
            const iconName = getCategoryIconName(category, category.name);

            return (
              <TouchableOpacity
                key={category.id}
                activeOpacity={0.7}
                onPress={() => handleCategorySelect(category.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: chipBg,
                    borderRadius: radius.medium, // 16px radius matching quick-add
                    borderColor: isActive ? colors.primary : colors.outline,
                    borderWidth: isActive ? 1.5 : StyleSheet.hairlineWidth,
                    paddingHorizontal: spacing.s16,
                    paddingVertical: spacing.s8,
                  },
                ]}>
                <View
                  style={[
                    styles.iconCircle28,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(0,0,0,0.06)",
                      marginRight: 6,
                    },
                  ]}>
                  <Ionicons name={iconName} size={14} color={chipText} />
                </View>
                <Text style={[typography.labelMedium, { color: chipText }]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Add button */}
          {showAddButton && onCategoryAdd && (
            <TouchableOpacity
              style={[
                styles.addButton,
                {
                  backgroundColor: colors.surface,
                  borderRadius: radius.medium, // 16px radius
                  borderColor: colors.primary,
                  paddingHorizontal: spacing.s16,
                  paddingVertical: spacing.s8,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => setShowAddModal(true)}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text
                style={[
                  typography.labelMedium,
                  { color: colors.primary, marginLeft: 4 },
                ]}>
                Add
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {error && (
        <Text
          style={[
            styles.errorText,
            typography.caption,
            { color: colors.error, marginTop: spacing.s4 },
          ]}>
          {error}
        </Text>
      )}

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
    width: "100%",
  },
  label: {
    marginBottom: 8,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  categoryScroll: {
    width: "100%",
  },
  categoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle28: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  errorText: {
    marginLeft: 4,
  },
});

