import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { UI } from "../../constants";
import { useAppTheme } from "./ThemeProvider";

interface ScreenHeroHeaderProps {
  /** Small uppercase label above the hero value (e.g. "Total Remaining") */
  heroLabel?: string;
  /** Large prominent value displayed center-stage */
  heroValue: string;
  /** Color override for the hero value text */
  heroValueColor?: string;
  /** Any content rendered below the hero value (mini stats, action pills, etc.) */
  children?: React.ReactNode;
  /** Optional style override for the outer container */
  style?: ViewStyle;
  /** Gradient color stops — defaults to the purple TransactionStatsHeader palette */
  gradientColors?: readonly [string, string, string];
}

export const ScreenHeroHeader: React.FC<ScreenHeroHeaderProps> = ({
  heroLabel,
  heroValue,
  heroValueColor = "#fff",
  children,
  style,
  gradientColors,
}) => {
  const { colors } = useAppTheme();
  const actualGradientColors = gradientColors || [colors.primary, colors.tertiary, colors.primaryContainer];
  
  return (
  <View style={style}>
    <LinearGradient
      colors={actualGradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}>
      {/* Decorative circles */}
      <View style={[styles.decorCircle, styles.circle1]} />
      <View style={[styles.decorCircle, styles.circle2]} />

      {heroLabel && <Text style={styles.heroLabel}>{heroLabel}</Text>}
      <Text style={[styles.heroValue, { color: heroValueColor }]}>
        {heroValue}
      </Text>

      {children}
    </LinearGradient>
  </View>
);
};

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 20,
    padding: UI.SPACING.LG,
    paddingBottom: 24,
    overflow: "hidden",
    position: "relative",
  },
  decorCircle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  circle1: {
    width: 180,
    height: 180,
    top: -60,
    right: -40,
  },
  circle2: {
    width: 120,
    height: 120,
    bottom: -30,
    left: -20,
  },
  heroLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroValue: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: UI.SPACING.MD,
  },
});
