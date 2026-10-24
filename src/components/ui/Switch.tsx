import React from "react";
import { Switch as RNSwitch, SwitchProps } from "react-native";
import { useAppTheme } from "./ThemeProvider";

export interface AppSwitchProps extends Omit<SwitchProps, "trackColor" | "thumbColor"> {
  trackColor?: { false?: string; true?: string };
  thumbColor?: string;
}

export const Switch: React.FC<AppSwitchProps> = ({
  value = false,
  onValueChange,
  trackColor,
  thumbColor,
  disabled,
  style,
  ...rest
}) => {
  const { colors, isDark } = useAppTheme();

  // Active (ON):
  // - Vibrant, luminous emerald track (#10B981 in dark mode, brand primary in light mode)
  // - Crisp, brilliant pure white thumb (#FFFFFF) so it never looks dark, muddy, or dull
  // Inactive (OFF):
  // - Dark mode: slate track (#334155) with soft slate thumb (#94A3B8)
  // - Light mode: soft cool-slate track (#E2E8F0) with pure white thumb (#FFFFFF)
  const defaultTrackColor = {
    false: isDark ? "#334155" : (colors.surfaceVariant || "#E2E8F0"),
    true: isDark ? "#10B981" : colors.primary,
  };

  const defaultThumbColor = value
    ? "#FFFFFF"
    : isDark
      ? "#94A3B8"
      : "#FFFFFF";

  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={trackColor || defaultTrackColor}
      thumbColor={thumbColor || defaultThumbColor}
      ios_backgroundColor={isDark ? "#334155" : (colors.surfaceVariant || "#E2E8F0")}
      style={style}
      {...rest}
    />
  );
};

export default Switch;
