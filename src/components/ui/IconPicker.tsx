import React from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme";

export const DEFAULT_ICONS = [
  "wallet",
  "card",
  "cash",
  "business",
  "logo-usd",
  "cart",
  "restaurant",
  "car",
  "bus",
  "bolt",
  "film",
  "heart",
  "medkit",
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
              borderRadius: radius.medium,
              borderColor: colors.outline,
              backgroundColor: !selectedIcon
                ? colors.surfaceVariant
                : "transparent",
            },
          ]}
          onPress={onClearIcon}>
          <Ionicons name="close" size={16} color={colors.textSecondary} />
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
                borderRadius: radius.medium,
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
