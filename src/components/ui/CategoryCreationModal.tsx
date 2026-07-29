import React, { useState, useEffect } from "react";
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../constants";
import { Category } from "../../types";
import { useAppTheme } from "../../theme";

const PREDEFINED_COLORS = [
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#EAB308",
  "#84CC16",
  "#22C55E",
  "#10B981",
  "#14B8A6",
  "#06B6D4",
  "#0EA5E9",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#D946EF",
  "#EC4899",
  "#F43F5E",
  "#64748B",
];

const PREDEFINED_ICONS = [
  "cart",
  "restaurant",
  "car",
  "bus",
  "bolt",
  "film",
  "heart",
  "medkit",
  "cash",
  "wallet",
  "card",
  "home",
  "shirt",
  "bag-handle",
  "sparkles",
  "gift",
  "book",
  "fitness",
  "phone-portrait",
  "wifi",
  "pricetags",
  "nutrition",
  "airplane",
  "briefcase",
];

const KEYWORD_ICON_MAP: Array<{ keywords: string[]; icon: string }> = [
  { keywords: ["food", "groceries", "grocery", "supermarket", "اكل", "طعام", "سوبرماركت", "خضار", "فاكهة", "لحوم", "بهارات", "بقالة"], icon: "cart" },
  { keywords: ["restaurant", "dining", "eating", "coffee", "cafe", "فطار", "غداء", "عشاء", "قهوة", "مطعم"], icon: "restaurant" },
  { keywords: ["transport", "commute", "car", "gas", "fuel", "uber", "taxi", "bus", "train", "مواصلات", "بنزين", "عربية", "سيارة", "مواصلات الشغل", "تكاتك"], icon: "car" },
  { keywords: ["bills", "utility", "utilities", "electricity", "water", "gas", "power", "كهرباء", "مياه", "فاتورة", "فواتير", "غاز"], icon: "bolt" },
  { keywords: ["internet", "wifi", "net", "telecom", "phone", "mobile", "نت", "اتصالات", "فودافون", "اورنج", "شحن"], icon: "wifi" },
  { keywords: ["rent", "home", "housing", "mortgage", "ايجار", "سكن", "بيت", "شقة", "عمارة"], icon: "home" },
  { keywords: ["entertainment", "leisure", "fun", "movies", "cinema", "game", "games", "ترفيه", "رفاهية", "رفاهيات", "سينما", "العاب", "خروجة"], icon: "film" },
  { keywords: ["health", "doctor", "medicine", "pharmacy", "medical", "hospital", "gym", "fitness", "علاج", "دكتور", "صيدلية", "كشف", "تحليل", "برشام", "مستشفى"], icon: "heart" },
  { keywords: ["salary", "income", "wage", "paycheck", "freelance", "work", "job", "مرتب", "قبض", "عمل", "شغل", "راتب", "امباور"], icon: "cash" },
  { keywords: ["clothes", "shopping", "apparel", "fashion", "shoes", "shirt", "ملابس", "هدوم", "شراء", "تسوق"], icon: "shirt" },
  { keywords: ["cleaning", "detergents", "soap", "maintenance", "منظفات", "نظافة", "غسيل"], icon: "sparkles" },
  { keywords: ["education", "school", "course", "books", "university", "تعليم", "مدرسة", "كورس", "كتب", "جامعة"], icon: "book" },
  { keywords: ["gift", "gifts", "donation", "charity", "هدايا", "هدية", "تبرع"], icon: "gift" },
  { keywords: ["other", "misc", "miscellaneous", "اخرى", "أخرى", "متفرقة", "عام"], icon: "pricetags" },
];

export function suggestIconForCategory(name: string): string | undefined {
  if (!name || !name.trim()) return undefined;
  const lower = name.trim().toLowerCase();
  for (const item of KEYWORD_ICON_MAP) {
    for (const kw of item.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return item.icon;
      }
    }
  }
  return undefined;
}

export interface CategoryData {
  name: string;
  type: "income" | "expense";
  color?: string;
  icon?: string;
}

interface CategoryCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateCategory: (category: CategoryData) => void;
  onUpdateCategory?: (id: string, category: CategoryData) => void;
  category?: Category | null;
  type?: "income" | "expense";
  title?: string;
}

export const CategoryCreationModal: React.FC<CategoryCreationModalProps> = ({
  visible,
  onClose,
  onCreateCategory,
  onUpdateCategory,
  category,
  type,
  title = "Add New Category",
}) => {
  const { colors, typography, spacing, radius } = useAppTheme();
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("");
  const [isManualIcon, setIsManualIcon] = useState(false);
  const [categoryType, setCategoryType] = useState<"income" | "expense">(type || "expense");

  useEffect(() => {
    if (visible) {
      if (category) {
        setCategoryName(category.name || "");
        setCategoryColor(category.color || "");
        setCategoryIcon(category.icon || "");
        setIsManualIcon(true);
        setCategoryType(category.type || type || "expense");
      } else {
        setCategoryName("");
        setCategoryColor("");
        setCategoryIcon("");
        setIsManualIcon(false);
        setCategoryType(type || "expense");
      }
    }
  }, [visible, category, type]);

  const handleNameChange = (text: string) => {
    setCategoryName(text);
    if (!isManualIcon) {
      const suggested = suggestIconForCategory(text);
      setCategoryIcon(suggested || "");
    }
  };

  const handleCreate = () => {
    if (!categoryName.trim()) return;

    const data: CategoryData = {
      name: categoryName.trim(),
      type: categoryType,
      color: categoryColor || undefined,
      icon: categoryIcon || undefined,
    };

    if (category && onUpdateCategory) {
      onUpdateCategory(category.id, data);
    } else {
      onCreateCategory(data);
    }

    // Reset form
    setCategoryName("");
    setCategoryColor("");
    setCategoryIcon("");
    setIsManualIcon(false);
    setCategoryType(type || "expense");
  };

  const handleClose = () => {
    // Reset form when closing
    setCategoryName("");
    setCategoryColor("");
    setCategoryIcon("");
    setIsManualIcon(false);
    setCategoryType(type || "expense");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent={true}
      presentationStyle="overFullScreen">
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{category ? "Edit Category" : title}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={UI.COLORS.TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category Name</Text>
              <TextInput
                placeholder="Enter category name"
                value={categoryName}
                onChangeText={handleNameChange}
                style={styles.modalInput}
                placeholderTextColor={UI.COLORS.TEXT_MUTED}
                autoFocus={true}
                maxLength={50}
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />
            </View>

            {!type && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Type</Text>
                <View style={styles.typeContainer}>
                  <TouchableOpacity
                    style={[styles.typeChip, categoryType === "expense" && styles.typeChipActive]}
                    onPress={() => setCategoryType("expense")}>
                    <Text style={[styles.typeChipText, categoryType === "expense" && styles.typeChipTextActive]}>Expense</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeChip, categoryType === "income" && styles.typeChipActive]}
                    onPress={() => setCategoryType("income")}>
                    <Text style={[styles.typeChipText, categoryType === "income" && styles.typeChipTextActive]}>Income</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Icon (Optional)</Text>
                {!isManualIcon && categoryIcon ? (
                  <Text style={styles.suggestedBadge}>Auto-suggested</Text>
                ) : null}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
                <TouchableOpacity
                  style={[styles.iconOption, styles.colorOptionClear, !categoryIcon && styles.iconOptionSelected]}
                  onPress={() => {
                    setCategoryIcon("");
                    setIsManualIcon(true);
                  }}>
                  <Ionicons name="close" size={16} color={UI.COLORS.TEXT_SECONDARY} />
                </TouchableOpacity>
                {PREDEFINED_ICONS.map((iconName) => (
                  <TouchableOpacity
                    key={iconName}
                    style={[
                      styles.iconOption,
                      categoryIcon === iconName && styles.iconOptionSelected,
                      categoryIcon === iconName && { backgroundColor: categoryColor || UI.COLORS.PRIMARY },
                    ]}
                    onPress={() => {
                      setCategoryIcon(iconName);
                      setIsManualIcon(true);
                    }}>
                    <Ionicons
                      name={iconName as any}
                      size={20}
                      color={categoryIcon === iconName ? "#FFFFFF" : UI.COLORS.TEXT_PRIMARY}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Color (Optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
                <TouchableOpacity
                  style={[styles.colorOption, styles.colorOptionClear, !categoryColor && styles.colorOptionSelected]}
                  onPress={() => setCategoryColor("")}>
                  <Ionicons name={!categoryColor ? "checkmark" : "close"} size={16} color={UI.COLORS.TEXT_SECONDARY} />
                </TouchableOpacity>
                {PREDEFINED_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorOption, { backgroundColor: color }, categoryColor === color && styles.colorOptionSelected]}
                    onPress={() => setCategoryColor(color)}>
                    {categoryColor === color && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={handleClose} style={[styles.cancelButton, styles.modalButton]}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreate}
              style={[styles.addButton, styles.modalButton, !categoryName.trim() && styles.addButtonDisabled]}
              disabled={!categoryName.trim()}>
              <Text style={[styles.addButtonText, !categoryName.trim() && styles.addButtonTextDisabled]}>
                {category ? "Save changes" : "Add Category"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: UI.SPACING.LG,
  },
  modal: {
    backgroundColor: UI.COLORS.CARD,
    borderRadius: UI.SPACING.LG,
    padding: UI.SPACING.XL,
    width: "100%",
    maxWidth: 400,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: UI.SPACING.LG,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  closeButton: {
    padding: UI.SPACING.SM,
  },
  modalContent: {
    marginBottom: UI.SPACING.LG,
  },
  inputGroup: {
    marginBottom: UI.SPACING.LG,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.SM,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    borderRadius: UI.SPACING.SM,
    paddingHorizontal: UI.SPACING.MD,
    paddingVertical: UI.SPACING.SM + 2,
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    backgroundColor: UI.COLORS.SURFACE,
  },
  typeContainer: {
    flexDirection: "row",
    gap: UI.SPACING.SM,
  },
  typeChip: {
    paddingVertical: UI.SPACING.SM,
    paddingHorizontal: UI.SPACING.MD,
    borderRadius: 8,
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  typeChipActive: {
    backgroundColor: UI.COLORS.PRIMARY,
    borderColor: UI.COLORS.PRIMARY,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  typeChipTextActive: {
    color: "#FFFFFF",
  },
  colorScroll: {
    marginHorizontal: -UI.SPACING.SM,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: UI.SPACING.XS,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorOptionClear: {
    backgroundColor: UI.COLORS.SURFACE,
    borderColor: UI.COLORS.BORDER,
  },
  colorOptionSelected: {
    borderColor: UI.COLORS.TEXT_PRIMARY,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: UI.SPACING.SM,
  },
  suggestedBadge: {
    fontSize: 12,
    color: UI.COLORS.PRIMARY_LIGHT,
    fontWeight: "500",
  },
  iconOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginHorizontal: UI.SPACING.XS,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 2,
    borderColor: "transparent",
  },
  iconOptionSelected: {
    borderColor: UI.COLORS.TEXT_PRIMARY,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  modalActions: {
    flexDirection: "row",
    gap: UI.SPACING.MD,
  },
  modalButton: {
    flex: 1,
    paddingVertical: UI.SPACING.MD,
    paddingHorizontal: UI.SPACING.LG,
    borderRadius: UI.SPACING.SM,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_SECONDARY,
  },
  addButton: {
    backgroundColor: UI.COLORS.PRIMARY,
  },
  addButtonDisabled: {
    backgroundColor: UI.COLORS.SURFACE,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  addButtonTextDisabled: {
    color: UI.COLORS.TEXT_MUTED,
  },
});
