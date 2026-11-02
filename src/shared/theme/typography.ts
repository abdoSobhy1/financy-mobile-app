/**
 * Design Tokens — Typography
 */
export const typography = {
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    display: 36,
    hero: 44,
  },

  fontWeight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    heavy: "800" as const,
  },

  lineHeight: {
    tight: 1.1,
    heading: 1.25,
    body: 1.45,
    relaxed: 1.6,
  },

  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1.0,
  },
} as const;

export type TypographyTokens = typeof typography;
