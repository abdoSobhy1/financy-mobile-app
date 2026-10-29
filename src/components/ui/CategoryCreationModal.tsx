import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../ui/ThemeProvider";
import { DEFAULT_ICONS } from "./IconPicker";

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
      setIcon((initialData as any)?.icon ?? CATEGORY_ICONS[0]);
      setCatType(initialData?.type ?? type ?? "expense");
      setNameError("");
    }
  }, [visible, initialData, type]);

  const isEdit = !!initialData;
  const modalTitle = title ?? (isEdit ? "Edit Category" : "Create New Category");

  const handleSave = () => {
    if (!name.trim()) {
      setNameError("Category name is required");
      nameInputRef.current?.focus();
      return;
    }
    onCreateCategory({ name: name.trim(), type: catType, color, icon });
    handleClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
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
            onSubmitEditing={handleSave}
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

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  card: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 36,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E4E4E7",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  input: {
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 24,
  },
  scrollWrapper: {
    marginBottom: 24,
    marginHorizontal: -24,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 12,
  },
  iconScrollContent: {
    paddingHorizontal: 24,
    gap: 12,
    flexDirection: "column",
    flexWrap: "wrap",
    height: 200,
    alignContent: "flex-start",
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  colorOuter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  colorInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  saveBtn: {
    flexDirection: "row",
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    gap: 8,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  typeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  typePill: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  typeText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
