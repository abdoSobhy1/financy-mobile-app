/** Append an alpha channel to a six-digit hex color. */
export function getAlphaColor(color: string, hexAlpha = "1F"): string {
  return color && /^#[\da-f]{6}$/i.test(color) ? `${color}${hexAlpha}` : color;
}
