export interface CategoryColorPair {
  light: string;
  dark: string;
  textLight: string;
  textDark: string;
}

export const CATEGORY_PALETTE: Record<string, CategoryColorPair> = {
  amber: { light: "#FEF3C7", dark: "#451A03", textLight: "#B45309", textDark: "#FCD34D" }, // food / dining / grocery
  blue: { light: "#DBEAFE", dark: "#1E3A8A", textLight: "#1D4ED8", textDark: "#93C5FD" }, // transport / car
  pink: { light: "#FCE7F3", dark: "#500724", textLight: "#BE185D", textDark: "#F472B6" }, // bills / electricity
  green: { light: "#D1FAE5", dark: "#064E3B", textLight: "#047857", textDark: "#6EE7B7" }, // income / salary / savings
  purple: { light: "#E9D5FF", dark: "#3B0764", textLight: "#7E22CE", textDark: "#C084FC" }, // entertainment / fun
  rose: { light: "#FFE4E6", dark: "#4C0519", textLight: "#BE123C", textDark: "#FDA4AF" }, // health / medical
  teal: { light: "#CCFBF1", dark: "#042F2E", textLight: "#0F766E", textDark: "#5EEAD4" }, // utilities / subscriptions
  orange: { light: "#FFEDD5", dark: "#431407", textLight: "#C2410C", textDark: "#FDBA74" }, // shopping / retail
  indigo: { light: "#E0E7FF", dark: "#1E1B4B", textLight: "#4338CA", textDark: "#A5B4FC" }, // education / tech
  neutral: { light: "#F3F4F6", dark: "#1F2937", textLight: "#4B5563", textDark: "#9CA3AF" }, // default / misc
};

export const TYPOGRAPHY = {
  displayLarge: { fontSize: 32, fontWeight: "500" as const, lineHeight: 40 },
  displayMedium: { fontSize: 28, fontWeight: "500" as const, lineHeight: 36 },
  displaySmall: { fontSize: 24, fontWeight: "500" as const, lineHeight: 32 },
  headlineLarge: { fontSize: 22, fontWeight: "600" as const, lineHeight: 28 },
  headlineMedium: { fontSize: 20, fontWeight: "600" as const, lineHeight: 26 },
  headlineSmall: { fontSize: 18, fontWeight: "600" as const, lineHeight: 24 },
  titleLarge: { fontSize: 18, fontWeight: "500" as const, lineHeight: 24 },
  titleMedium: { fontSize: 16, fontWeight: "500" as const, lineHeight: 22 },
  titleSmall: { fontSize: 14, fontWeight: "500" as const, lineHeight: 20 },
  bodyLarge: { fontSize: 16, fontWeight: "400" as const, lineHeight: 24 },
  bodyMedium: { fontSize: 14, fontWeight: "400" as const, lineHeight: 20 },
  bodySmall: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
  labelLarge: { fontSize: 14, fontWeight: "500" as const, lineHeight: 20 },
  labelMedium: { fontSize: 12, fontWeight: "500" as const, lineHeight: 16 },
  labelSmall: { fontSize: 11, fontWeight: "400" as const, lineHeight: 14 },
  caption: { fontSize: 11, fontWeight: "400" as const, lineHeight: 14 },
};

export const SPACING = {
  s4: 4,
  s8: 8,
  s12: 12,
  s16: 16,
  s20: 20,
  s24: 24,
  s32: 32,
};

export const RADIUS = {
  small: 10,
  medium: 16,
  large: 20,
  pill: 999,
};
