import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { useMaterial3Theme } from "@pchmn/expo-material3-theme";

// Fixed category-icon color palette
export const CATEGORY_PALETTE = {
  red: {
    light: "#FFCDD2",
    dark: "#B71C1C",
    iconLight: "#D32F2F",
    iconDark: "#FFEBEE",
  },
  pink: {
    light: "#F8BBD0",
    dark: "#880E4F",
    iconLight: "#C2185B",
    iconDark: "#FCE4EC",
  },
  purple: {
    light: "#E1BEE7",
    dark: "#4A148C",
    iconLight: "#7B1FA2",
    iconDark: "#F3E5F5",
  },
  indigo: {
    light: "#C5CAE9",
    dark: "#1A237E",
    iconLight: "#303F9F",
    iconDark: "#E8EAF6",
  },
  blue: {
    light: "#BBDEFB",
    dark: "#0D47A1",
    iconLight: "#1976D2",
    iconDark: "#E3F2FD",
  },
  teal: {
    light: "#B2DFDB",
    dark: "#004D40",
    iconLight: "#00796B",
    iconDark: "#E0F2F1",
  },
  green: {
    light: "#C8E6C9",
    dark: "#1B5E20",
    iconLight: "#388E3C",
    iconDark: "#E8F5E9",
  },
  orange: {
    light: "#FFE0B2",
    dark: "#E65100",
    iconLight: "#F57C00",
    iconDark: "#FFF3E0",
  },
  brown: {
    light: "#D7CCC8",
    dark: "#3E2723",
    iconLight: "#5D4037",
    iconDark: "#EFEBE9",
  },
  bluegrey: {
    light: "#CFD8DC",
    dark: "#263238",
    iconLight: "#455A64",
    iconDark: "#ECEFF1",
  },
};

// Design tokens
export const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: "700" as const, lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: "700" as const, lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: "600" as const, lineHeight: 28 },
  bodyLarge: { fontSize: 16, fontWeight: "400" as const, lineHeight: 24 },
  bodyMedium: { fontSize: 14, fontWeight: "400" as const, lineHeight: 20 },
  bodySmall: { fontSize: 12, fontWeight: "400" as const, lineHeight: 16 },
  label: { fontSize: 14, fontWeight: "600" as const, lineHeight: 20 },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const RADIUS = {
  sm: 10,
  md: 16,
  lg: 20,
  pill: 999,
};

// Muted olive/sage fallback seed color
const FALLBACK_SOURCE_COLOR = "#6B705C";

/** Darken a hex colour by multiplying each channel by `factor` (0–1). */
function darkenHex(hex: string, factor: number): string {
  const clean = hex.replace("#", "");
  const r = Math.round(parseInt(clean.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(clean.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(clean.slice(4, 6), 16) * factor);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

type ThemeContextType = {
  colors: {
    primary: string;
    onPrimary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    secondary: string;
    onSecondary: string;
    secondaryContainer: string;
    onSecondaryContainer: string;
    tertiary: string;
    onTertiary: string;
    tertiaryContainer: string;
    onTertiaryContainer: string;
    error: string;
    onError: string;
    errorContainer: string;
    onErrorContainer: string;
    background: string;
    onBackground: string;
    surface: string;
    onSurface: string;
    surfaceVariant: string;
    onSurfaceVariant: string;
    outline: string;
    outlineVariant: string;
    shadow: string;
    scrim: string;
    inverseSurface: string;
    inverseOnSurface: string;
    inversePrimary: string;
    elevation: {
      level0: string;
      level1: string;
      level2: string;
      level3: string;
      level4: string;
      level5: string;
    };
    surfaceDisabled: string;
    onSurfaceDisabled: string;
    backdrop: string;
  };
  isDark: boolean;
  typography: typeof TYPOGRAPHY;
  spacing: typeof SPACING;
  radius: typeof RADIUS;
  categoryPalette: typeof CATEGORY_PALETTE;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { theme } = useMaterial3Theme({
    fallbackSourceColor: FALLBACK_SOURCE_COLOR,
  });

  const activeColors = { ...(isDark ? theme.dark : theme.light) };

  if (isDark) {
    // Darken the Material3 colours proportionally so the seed hue is preserved.
    activeColors.background    = darkenHex(activeColors.background, 0.30);
    activeColors.surface       = darkenHex(activeColors.surface, 0.38);
    activeColors.surfaceVariant = darkenHex(activeColors.surfaceVariant, 0.45);
  }

  const value = useMemo(
    () => ({
      colors: activeColors,
      isDark,
      typography: TYPOGRAPHY,
      spacing: SPACING,
      radius: RADIUS,
      categoryPalette: CATEGORY_PALETTE,
    }),
    [activeColors, isDark],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within a ThemeProvider");
  }
  return context;
};
