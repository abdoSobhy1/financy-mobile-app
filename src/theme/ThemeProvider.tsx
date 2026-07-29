import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { useMaterial3Theme } from "@pchmn/expo-material3-theme";
import { CATEGORY_PALETTE, TYPOGRAPHY, SPACING, RADIUS } from "./tokens";

export interface ThemeColors {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  outline: string;
  error: string;
  onError: string;
  success: string;
  onSuccess: string;
  background: string;
  onBackground: string;
  card: string;
}

export interface AppThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  typography: typeof TYPOGRAPHY;
  spacing: typeof SPACING;
  radius: typeof RADIUS;
  categoryPalette: typeof CATEGORY_PALETTE;
}

const ThemeContext = createContext<AppThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Muted olive/sage fallback seed color (#6B8E23) for iOS and older Android
  const { theme } = useMaterial3Theme({ fallbackSourceColor: "#6B8E23" });

  const colors: ThemeColors = useMemo(() => {
    const scheme = isDark ? theme.dark : theme.light;
    return {
      primary: scheme.primary || (isDark ? "#82A36E" : "#4A6E35"),
      onPrimary: scheme.onPrimary || "#FFFFFF",
      primaryContainer: scheme.primaryContainer || (isDark ? "#354E25" : "#DDEED3"),
      onPrimaryContainer: scheme.onPrimaryContainer || (isDark ? "#DDEED3" : "#1A2E0F"),
      surface: scheme.surface || (isDark ? "#121312" : "#FBFDF8"),
      onSurface: scheme.onSurface || (isDark ? "#E2E3DF" : "#1B1C1A"),
      surfaceVariant: scheme.surfaceVariant || (isDark ? "#434840" : "#E0E4DB"),
      onSurfaceVariant: scheme.onSurfaceVariant || (isDark ? "#C3C8BD" : "#434840"),
      outline: scheme.outline || (isDark ? "#8D9287" : "#73786E"),
      error: scheme.error || (isDark ? "#FFB4AB" : "#BA1A1A"),
      onError: scheme.onError || "#FFFFFF",
      success: isDark ? "#34D399" : "#10B981",
      onSuccess: isDark ? "#064E3B" : "#FFFFFF",
      background: scheme.background || (isDark ? "#121312" : "#FBFDF8"),
      onBackground: scheme.onBackground || (isDark ? "#E2E3DF" : "#1B1C1A"),
      card: scheme.surface || (isDark ? "#1C1D1C" : "#FFFFFF"),
    };
  }, [isDark, theme]);

  const value = useMemo(
    () => ({
      colors,
      isDark,
      typography: TYPOGRAPHY,
      spacing: SPACING,
      radius: RADIUS,
      categoryPalette: CATEGORY_PALETTE,
    }),
    [colors, isDark],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useAppTheme = (): AppThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within a ThemeProvider");
  }
  return context;
};
