import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../constants";

interface FilterButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  count?: number;
  color?: string;
  icon?: string;
  disabled?: boolean;
  size?: "small" | "medium" | "large";
}

export const FilterButton: React.FC<FilterButtonProps> = ({ label, isActive, onPress, count, color, icon, disabled = false, size = "medium" }) => {
  const getButtonSize = () => {
    switch (size) {
      case "small":
        return {
          paddingHorizontal: UI.SPACING.SM,
          paddingVertical: UI.SPACING.XS,
          fontSize: 12,
          iconSize: 12,
        };
      case "large":
        return {
          paddingHorizontal: UI.SPACING.LG,
          paddingVertical: UI.SPACING.MD,
          fontSize: 16,
          iconSize: 18,
        };
      default:
        return {
          paddingHorizontal: UI.SPACING.MD,
          paddingVertical: UI.SPACING.SM,
          fontSize: 14,
          iconSize: 16,
        };
    }
  };

  const buttonSize = getButtonSize();

  const getBackgroundColor = () => {
    if (disabled) return UI.COLORS.SURFACE;
    if (isActive) {
      return color || UI.COLORS.PRIMARY;
    }
    return UI.COLORS.SURFACE;
  };

  const getTextColor = () => {
    if (disabled) return UI.COLORS.TEXT_MUTED;
    if (isActive) {
      return color ? UI.COLORS.BACKGROUND : UI.COLORS.BACKGROUND;
    }
    return UI.COLORS.TEXT_SECONDARY;
  };

  const getBorderColor = () => {
    if (disabled) return UI.COLORS.BORDER;
    if (isActive) {
      return color || UI.COLORS.PRIMARY;
    }
    return UI.COLORS.BORDER;
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          paddingHorizontal: buttonSize.paddingHorizontal,
          paddingVertical: buttonSize.paddingVertical,
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          opacity: disabled ? 0.6 : 1,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}>
      <View style={styles.content}>
        {icon && <Ionicons name={icon as any} size={buttonSize.iconSize} color={getTextColor()} style={styles.icon} />}

        <Text
          style={[
            styles.label,
            {
              fontSize: buttonSize.fontSize,
              color: getTextColor(),
              fontWeight: isActive ? "600" : "500",
            },
          ]}
          numberOfLines={1}>
          {label}
        </Text>

        {count !== undefined && count >= 0 && (
          <View style={[styles.countBadge, isActive && styles.activeBadge]}>
            <Text style={[styles.countText, isActive && styles.activeCountText]}>{count}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: UI.CARD_RADIUS,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: UI.SPACING.XS,
  },
  label: {
    flexShrink: 1,
  },
  countBadge: {
    marginLeft: UI.SPACING.XS,
    paddingHorizontal: UI.SPACING.XS,
    paddingVertical: 2,
    backgroundColor: UI.COLORS.TEXT_MUTED + "40",
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  activeBadge: {
    backgroundColor: UI.COLORS.BACKGROUND + "40",
  },
  countText: {
    fontSize: 10,
    fontWeight: "600",
    color: UI.COLORS.TEXT_MUTED,
  },
  activeCountText: {
    color: UI.COLORS.BACKGROUND,
  },
});
