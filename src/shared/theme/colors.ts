/**
 * Design Tokens — Color Palette
 * Derived from the premium dark UI aesthetic reference.
 */
export const colors = {
  // Canvas & Backgrounds
  background: {
    primary: "#0C0E12",   // Main screen background (deep dark matte slate)
    secondary: "#14171F", // Card surface background
    tertiary: "#1C202B",  // Inset card / input field background
    elevated: "#252B38",  // Floating modal / sheet surface
  },

  // Borders & Outlines
  border: {
    subtle: "#1F2430",
    default: "#2B3242",
    focused: "#3E475E",
  },

  // Accent Colors (Pastel Palette from UI mock)
  accent: {
    // Mint / Sage Green (Sales, Profit, Income)
    mint: "#7AD7A8",
    mintLight: "#B3EED0",
    mintDark: "#3DA771",
    mintContainer: "rgba(122, 215, 168, 0.15)",

    // Ice Blue / Sky Blue (Account profile hero banner)
    iceBlue: "#D0E3FF",
    iceBlueText: "#0F2038",
    iceBlueSubtext: "#3B5275",

    // Soft Peach / Coral Pink (Expenses, Donut segments)
    peach: "#F8C8C8",
    peachLight: "#FDE6E6",
    peachDark: "#E08B8B",
    peachContainer: "rgba(248, 200, 200, 0.15)",

    // Soft Amber / Yellow (Badges, Secondary actions)
    yellow: "#F8E4A0",
    yellowDark: "#CFA035",
    yellowContainer: "rgba(248, 228, 160, 0.15)",

    // Secondary Neutral Accents
    darkPill: "#181B22",
    darkPillBorder: "#272C38",
  },

  // Text Colors
  text: {
    primary: "#F5F7FA",    // High contrast primary text
    secondary: "#9EA6B5",  // Medium contrast labels & captions
    tertiary: "#636C7D",   // Low contrast metadata & placeholders
    inverse: "#0C0E12",    // Text on light pastel cards
    mint: "#7AD7A8",
    peach: "#F8C8C8",
  },

  // Semantic Status Colors
  status: {
    success: "#7AD7A8",
    danger: "#F88C8C",
    warning: "#F8E4A0",
    info: "#80B3FF",
  },

  // Translucent Overlays
  overlay: {
    backdrop: "rgba(0, 0, 0, 0.75)",
    glassDark: "rgba(20, 23, 31, 0.85)",
  },
} as const;

export type ColorTokens = typeof colors;
