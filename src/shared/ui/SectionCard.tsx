import type { PropsWithChildren } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Card from "./Card";

export function SectionCard({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <Card variant="outlined" style={StyleSheet.flatten([styles.card, style])}>{children}</Card>;
}

const styles = StyleSheet.create({ card: { padding: 0, overflow: "hidden", marginBottom: 16 } });
