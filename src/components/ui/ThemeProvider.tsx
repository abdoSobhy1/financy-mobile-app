import React, { createContext, useContext, useMemo, useEffect } from "react";
import { useColorScheme, StatusBar } from "react-native";
import { useMaterial3Theme } from "@pchmn/expo-material3-theme";
import { useSelector } from "react-redux";
import { setActiveCurrency, getCurrencySymbol } from "../../utils";

// Fixed category-icon color palette from last synced github version
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

export const resolveCategoryColor = (
  colorName?: string | null,
  isDark: boolean = true
): {
  bgColor: string;
  iconColor: string;
  borderColor: string;
  bg: string;
  fg: string;
} => {
  const key = (colorName || "bluegrey").toLowerCase().trim();
  if (key.startsWith("#")) {
    const cleanHex = key.length === 7 ? key : "#7AD7A8";
    const bgColor = cleanHex + (isDark ? "24" : "1A");
    const borderColor = cleanHex + (isDark ? "4D" : "38");
    return {
      iconColor: cleanHex,
      bgColor,
      borderColor,
      fg: cleanHex,
      bg: bgColor,
    };
  }
  const palette =
    CATEGORY_PALETTE[key as keyof typeof CATEGORY_PALETTE] ||
    CATEGORY_PALETTE.bluegrey;
  const iconColor = isDark ? palette.iconDark : palette.iconLight;
  const bgColor = isDark ? palette.dark : palette.light;
  return {
    bgColor,
    iconColor,
    borderColor: iconColor + (isDark ? "44" : "33"),
    fg: iconColor,
    bg: bgColor,
  };
};

// Design tokens
export const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: "700" as const, lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: "700" as const, lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: "600" as const, lineHeight: 28 },
  bodyLarge: { fontSize: 16, fontWeight: "400" as const, lineHeight: 24 },
  bodyMedium: { fontSize: 14, fontWeight: "400" as const, lineHeight: 20 },
  bodySmall: { fontSize: 12, fontWeight: "400" as const, lineHeight: 16 },
  caption: { fontSize: 12, fontWeight: "400" as const, lineHeight: 16 },
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
  currency: string;
  currencyCode: string;
  currencySymbol: string;
  typography: typeof TYPOGRAPHY;
  spacing: typeof SPACING;
  radius: typeof RADIUS;
  categoryPalette: typeof CATEGORY_PALETTE;
  resolveCategoryColor: (colorName?: string | null) => {
    bgColor: string;
    iconColor: string;
    borderColor: string;
    bg: string;
    fg: string;
  };
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();
  const settingsData = useSelector((state: any) => state?.settings?.data);
  const preferredTheme = settingsData?.theme as "dark" | "light" | undefined;
  const currency = settingsData?.currency || "USD";

  useEffect(() => {
    if (currency) {
      setActiveCurrency(currency);
    }
  }, [currency]);

  const isDark = preferredTheme
    ? preferredTheme === "dark"
    : systemColorScheme !== "light";

  const { theme } = useMaterial3Theme({
    fallbackSourceColor: FALLBACK_SOURCE_COLOR,
  });

  const activeColors = useMemo(() => {
    const colors = { ...(isDark ? theme.dark : theme.light) };

    if (isDark) {
      // Darken the Material3 colours proportionally so the seed hue is preserved (from git commit 8a29225)
      colors.background = darkenHex(colors.background, 0.3);
      colors.surface = darkenHex(colors.surface, 0.38);
      colors.surfaceVariant = darkenHex(colors.surfaceVariant, 0.45);
    }

    return {
      ...colors,
      elevation: (colors as any).elevation || {
        level0: "transparent",
        level1: colors.surfaceVariant,
        level2: colors.surfaceVariant,
        level3: colors.surfaceVariant,
        level4: colors.surfaceVariant,
        level5: colors.surfaceVariant,
      },
      surfaceDisabled:
        (colors as any).surfaceDisabled ||
        (isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)"),
      onSurfaceDisabled:
        (colors as any).onSurfaceDisabled ||
        (isDark ? "rgba(255, 255, 255, 0.38)" : "rgba(0, 0, 0, 0.38)"),
      backdrop:
        (colors as any).backdrop ||
        (isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0.4)"),
    };
  }, [isDark, theme]);

  const value = useMemo(
    () => ({
      colors: activeColors,
      isDark,
      currency,
      currencyCode: currency,
      currencySymbol: getCurrencySymbol(currency),
      typography: TYPOGRAPHY,
      spacing: SPACING,
      radius: RADIUS,
      categoryPalette: CATEGORY_PALETTE,
      resolveCategoryColor: (colorName?: string | null) =>
        resolveCategoryColor(colorName, isDark),
    }),
    [activeColors, isDark, currency]
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within a ThemeProvider");
  }
  return context;
};
