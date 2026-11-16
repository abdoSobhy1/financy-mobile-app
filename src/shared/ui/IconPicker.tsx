import React from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../theme/ThemeProvider";

export const DEFAULT_ICONS = [
  // ── Finance ──────────────────────────────────────
  "wallet",
  "card",
  "cash",
  "logo-usd",
  "trending-up",
  "trending-down",
  "bar-chart",
  "pie-chart",
  "diamond",
  "ribbon",
  "logo-bitcoin",
  "swap-horizontal",
  // ── Food & Drink ─────────────────────────────────
  "restaurant",
  "fast-food",
  "cafe",
  "pizza",
  "wine",
  "beer",
  "ice-cream",
  "nutrition",
  "leaf",
  "fish",
  // ── Transport ────────────────────────────────────
  "car",
  "car-sport",
  "bus",
  "train",
  "airplane",
  "boat",
  "bicycle",
  "subway",
  "walk",
  "navigate",
  // ── Shopping ─────────────────────────────────────
  "cart",
  "bag",
  "bag-handle",
  "storefront",
  "pricetags",
  "receipt",
  "barcode",
  "shirt",
  "glasses",
  "watch",
  // ── Home & Utilities ─────────────────────────────
  "home",
  "bed",
  "tv",
  "construct",
  "hammer",
  "water",
  "flame",
  "snow",
  "power",
  "key",
  // ── Health & Fitness ─────────────────────────────
  "heart",
  "medkit",
  "fitness",
  "bandage",
  "thermometer",
  "body",
  "barbell",
  "pulse",
  // ── Entertainment ────────────────────────────────
  "film",
  "game-controller",
  "musical-notes",
  "headset",
  "camera",
  "book",
  "library",
  "school",
  "ticket",
  "color-palette",
  // ── Technology ───────────────────────────────────
  "phone-portrait",
  "laptop",
  "desktop",
  "wifi",
  "bluetooth",
  "cloud",
  "flash",
  "globe",
  "code-slash",
  // ── Work & Business ──────────────────────────────
  "briefcase",
  "business",
  "people",
  "person",
  "call",
  "mail",
  "print",
  "documents",
  // ── Miscellaneous ─────────────────────────────────
  "gift",
  "star",
  "sparkles",
  "umbrella",
  "paw",
  "flower",
  "planet",
  "balloon",
  "trophy",
  "shield",
  "settings",
  "help-circle",
];

export interface IconPickerProps {
  selectedIcon: string;
  onSelectIcon: (iconName: string) => void;
  selectedColor?: string;
  onClearIcon?: () => void;
  icons?: string[];
}

export const IconPicker: React.FC<IconPickerProps> = ({
  selectedIcon,
  onSelectIcon,
  selectedColor,
  onClearIcon,
  icons = DEFAULT_ICONS,
}) => {
  const { colors, radius, spacing } = useAppTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}>
      {onClearIcon && (
        <TouchableOpacity
          style={[
            styles.iconOption,
            {
              borderRadius: radius.md,
              borderColor: colors.outline,
              backgroundColor: !selectedIcon
                ? colors.surfaceVariant
                : "transparent",
            },
          ]}
          onPress={onClearIcon}>
          <Ionicons name="close" size={16} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      )}

      {icons.map((iconName) => {
        const isSelected = selectedIcon === iconName;
        const bgColor = isSelected
          ? selectedColor || colors.primary
          : colors.surfaceVariant;
        const iconColor = isSelected ? "#FFFFFF" : colors.onSurface;

        return (
          <TouchableOpacity
            key={iconName}
            style={[
              styles.iconOption,
              {
                borderRadius: radius.md,
                backgroundColor: bgColor,
                borderColor: isSelected ? "transparent" : colors.outline,
              },
            ]}
            onPress={() => onSelectIcon(iconName)}>
            <Ionicons
              name={iconName as any}
              size={20}
              color={iconColor}
            />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  iconOption: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
