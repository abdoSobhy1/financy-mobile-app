import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../constants";
import { useAppTheme } from "../ui/ThemeProvider";

// ─── Data ─────────────────────────────────────────────────────────────────────

const PREDEFINED_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308",
  "#84CC16", "#22C55E", "#10B981", "#14B8A6",
  "#06B6D4", "#0EA5E9", "#3B82F6", "#6366F1",
  "#8B5CF6", "#A855F7", "#D946EF", "#EC4899",
  "#F43F5E", "#64748B",
];

// Curated subset of Ionicons that make sense for finance categories
const CATEGORY_ICONS: string[] = [
  // Food & Shopping
  "fast-food", "restaurant", "cafe", "wine", "cart", "bag-handle", "basket",
  // Transport
  "car", "bus", "train", "airplane", "bicycle", "boat",
  // Home & Utilities
  "home", "business", "flash", "water", "wifi", "desktop", "laptop",
  // Health & Personal
  "medkit", "fitness", "heart", "body", "glasses", "cut",
  // Entertainment
  "game-controller", "musical-notes", "film", "tv", "book", "camera",
  // Finance
  "cash", "card", "wallet", "trending-up", "trending-down", "calculator", "stats-chart",
  // Education
  "school", "library", "journal", "newspaper",
  // Other
  "gift", "star", "pricetag", "people", "person", "briefcase", "build", "leaf", "paw", "planet",
];

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
  const { colors, typography, spacing } = useAppTheme();

  const [name, setName] = useState("");
  const [color, setColor] = useState(PREDEFINED_COLORS[0]);
  const [icon, setIcon] = useState<string>("pricetag");
  const [catType, setCatType] = useState<"income" | "expense">(type || "expense");

  // Pre-fill when initialData changes (edit mode) or modal opens
  useEffect(() => {
    if (visible) {
      setName(initialData?.name ?? "");
      setColor(initialData?.color ?? PREDEFINED_COLORS[0]);
      setIcon((initialData as any)?.icon ?? "pricetag");
      setCatType(initialData?.type ?? type ?? "expense");
    }
  }, [visible, initialData, type]);

  const isEdit = !!initialData;
  const modalTitle = title ?? (isEdit ? "Edit Category" : "New Category");

  const handleSave = () => {
    if (!name.trim()) return;
    onCreateCategory({ name: name.trim(), type: catType, color, icon });
    handleClose();
  };

  const handleClose = () => {
    onClose();
  };

  const previewBg = color + "25";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
      presentationStyle="overFullScreen">
      <View style={[styles.overlay]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>

          {/* ── Header ── */}
          <View style={[styles.header, { borderBottomColor: colors.outlineVariant }]}>
            <TouchableOpacity onPress={handleClose} style={styles.headerBtn}>
              <Ionicons name="close" size={22} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
            <Text style={[typography.h3, { color: colors.onBackground }]}>{modalTitle}</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!name.trim()}
              style={styles.headerBtn}>
              <Text
                style={[
                  styles.saveText,
                  { color: name.trim() ? colors.primary : colors.onSurfaceVariant },
                ]}>
                {isEdit ? "Save" : "Add"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">

            {/* ── Preview ── */}
            <View style={[styles.preview, { backgroundColor: previewBg, borderColor: color + "55" }]}>
              <View style={[styles.previewIcon, { backgroundColor: color + "33" }]}>
                <Ionicons name={icon as any} size={32} color={color} />
              </View>
              <Text style={[typography.h3, { color: colors.onBackground, marginTop: 8 }]} numberOfLines={1}>
                {name || "Category name"}
              </Text>
              <Text style={[typography.bodySmall, { color: color, marginTop: 2, fontWeight: "600" }]}>
                {catType === "expense" ? "Expense" : "Income"}
              </Text>
            </View>

            {/* ── Name ── */}
            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Category name"
              placeholderTextColor={colors.onSurfaceVariant + "88"}
              style={[styles.input, { backgroundColor: colors.surfaceVariant, borderColor: colors.outlineVariant, color: colors.onBackground }]}
              maxLength={50}
              autoFocus={!isEdit}
              returnKeyType="done"
            />

            {/* ── Type (only when not locked) ── */}
            {!type && (
              <>
                <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>TYPE</Text>
                <View style={styles.typeRow}>
                  {(["expense", "income"] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.typePill,
                        {
                          backgroundColor: catType === t ? colors.primaryContainer : colors.surfaceVariant,
                          borderColor: catType === t ? colors.primary : colors.outlineVariant,
                        },
                      ]}
                      onPress={() => setCatType(t)}>
                      <Text
                        style={[
                          typography.label,
                          { color: catType === t ? colors.onPrimaryContainer : colors.onSurfaceVariant },
                        ]}>
                        {t === "expense" ? "Expense" : "Income"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* ── Colour ── */}
            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>COLOUR</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
              {PREDEFINED_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    color === c && styles.colorDotSelected,
                  ]}
                  onPress={() => setColor(c)}>
                  {color === c && <Ionicons name="checkmark" size={14} color="#fff" />}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* ── Icon ── */}
            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>ICON</Text>
            <View style={styles.iconGrid}>
              {CATEGORY_ICONS.map((ic) => {
                const isSelected = icon === ic;
                return (
                  <TouchableOpacity
                    key={ic}
                    style={[
                      styles.iconCell,
                      {
                        backgroundColor: isSelected ? color + "33" : colors.surfaceVariant,
                        borderColor: isSelected ? color : "transparent",
                      },
                    ]}
                    onPress={() => setIcon(ic)}>
                    <Ionicons
                      name={ic as any}
                      size={22}
                      color={isSelected ? color : colors.onSurfaceVariant}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: "90%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    fontSize: 16,
    fontWeight: "700",
  },
  preview: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  previewIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 24,
  },
  typeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  typePill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.8)",
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  iconCell: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
});
