import { styles } from "./CategoryCreationModal.styles";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { DEFAULT_ICONS } from "../../../shared/ui/IconPicker";
import { useUnsavedChanges } from "../../../shared/hooks";

// ─── Data ─────────────────────────────────────────────────────────────────────

const PREDEFINED_COLORS = [
  "#B5EAEA",
  "#206385",
  "#FCD1B6",
  "#A31A1A",
  "#F59E0B",
  "#22C55E",
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#64748B",
  "#14B8A6",
  "#EAB308",
  "#F43F5E",
  "#0EA5E9",
  "#84CC16",
  "#D946EF",
  "#F97316",
  "#3B82F6",
  "#10B981",
];

const CATEGORY_ICONS = DEFAULT_ICONS;

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CategoryData {
  id?: string;
  name: string;
  type: "income" | "expense";
  color?: string;
  icon?: string;
}

interface CategoryCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateCategory: (category: CategoryData) => void;
  /** Pre-fill values for edit mode */
  initialData?: CategoryData;
  type?: "income" | "expense";
  title?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const CategoryCreationModal: React.FC<CategoryCreationModalProps> = ({
  visible,
  onClose,
  onCreateCategory,
  initialData,
  type,
  title,
}) => {
  const { colors, typography } = useAppTheme();

  const [name, setName] = useState("");
  const [color, setColor] = useState(PREDEFINED_COLORS[0]);
  const [icon, setIcon] = useState<string>(CATEGORY_ICONS[0]);
  const [catType, setCatType] = useState<"income" | "expense">(
    type || "expense"
  );
  const [nameError, setNameError] = useState("");
  const nameInputRef = useRef<TextInput>(null);

  // Pre-fill when initialData changes (edit mode) or modal opens
  useEffect(() => {
    if (visible) {
      setName(initialData?.name ?? "");
      setColor(initialData?.color ?? PREDEFINED_COLORS[0]);
      setIcon(initialData?.icon ?? CATEGORY_ICONS[0]);
      setCatType(initialData?.type ?? type ?? "expense");
      setNameError("");
    }
  }, [visible, initialData, type]);

  const isEdit = !!initialData && !!(initialData.name?.trim() || initialData.id);
  const modalTitle = title ?? (isEdit ? "Edit Category" : "Create New Category");

  const hasChanges = useMemo(() => {
    if (!visible) return false;
    if (isEdit && initialData) {
      const origName = initialData.name || "";
      const origColor = initialData.color || PREDEFINED_COLORS[0];
      const origIcon = initialData.icon || CATEGORY_ICONS[0];
      const origType = initialData.type || type || "expense";
      return (
        name !== origName ||
        color !== origColor ||
        icon !== origIcon ||
        catType !== origType
      );
    } else {
      return name.trim() !== "";
    }
  }, [visible, isEdit, initialData, name, color, icon, catType, type]);

  const { confirmExit } = useUnsavedChanges({
    hasChanges,
    isEditing: isEdit,
    isModal: true,
    enabled: visible,
  });

  const handleSave = () => {
    if (!name.trim()) {
      setNameError("Category name is required");
      nameInputRef.current?.focus();
      return;
    }
    onCreateCategory({ name: name.trim(), type: catType, color, icon });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={() => confirmExit(onClose)}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <TouchableWithoutFeedback onPress={() => confirmExit(onClose)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={[styles.card, { backgroundColor: "#18181B" }]}>
          <Text style={[styles.title, { color: colors.onBackground }]}>
            {modalTitle}
          </Text>

          {/* ── Type Toggle (Only if type not forced) ── */}
          {!type && (
            <View style={styles.typeRow}>
              {(["expense", "income"] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typePill,
                    {
                      backgroundColor:
                        catType === t ? color : colors.surfaceVariant,
                    },
                  ]}
                  onPress={() => setCatType(t)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.typeText,
                      { color: catType === t ? "#111" : colors.onSurfaceVariant },
                    ]}
                  >
                    {t === "expense" ? "Expense" : "Income"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Name Input ── */}
          <Text style={styles.label}>Category Name</Text>
          <TextInput
            ref={nameInputRef}
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (nameError) setNameError("");
            }}
            placeholder="e.g. Subscriptions"
            placeholderTextColor="#666"
            style={[
              styles.input,
              {
                backgroundColor: "#27272A",
                color: "#FFF",
                borderWidth: 1,
                borderColor: nameError ? colors.error : "transparent",
              },
            ]}
            maxLength={50}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {nameError ? (
            <Text
              style={{
                color: colors.error,
                fontSize: 12,
                fontWeight: "600",
                marginTop: 4,
                marginBottom: 8,
              }}>
              {nameError}
            </Text>
          ) : null}

          {/* ── Icon Picker ── */}
          <Text style={styles.label}>Select Icon</Text>
          <View style={styles.scrollWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.iconScrollContent}
            >
              {CATEGORY_ICONS.map((ic) => {
                const isSelected = icon === ic;
                return (
                  <TouchableOpacity
                    key={ic}
                    style={[
                      styles.iconCircle,
                      { backgroundColor: isSelected ? color : "#27272A" },
                    ]}
                    onPress={() => setIcon(ic)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={ic as any}
                      size={24}
                      color={isSelected ? "#111" : "#A1A1AA"}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Color Picker ── */}
          <Text style={styles.label}>Select Color</Text>
          <View style={styles.scrollWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {PREDEFINED_COLORS.map((c) => {
                const isSelected = color === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorOuter,
                      { borderColor: isSelected ? c : "transparent" },
                    ]}
                    onPress={() => setColor(c)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.colorInner, { backgroundColor: c }]} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Add/Save Button ── */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: color, opacity: name.trim() ? 1 : 0.5 },
            ]}
            onPress={handleSave}
            disabled={!name.trim()}
            activeOpacity={0.8}
          >
            <Ionicons name={isEdit ? "checkmark" : "add"} size={22} color="#111" />
            <Text style={styles.saveBtnText}>
              {isEdit ? "Save Category" : "Add New Category"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
