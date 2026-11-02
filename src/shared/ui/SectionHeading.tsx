import { StyleSheet, Text } from "react-native";
import { useAppTheme } from "../theme/ThemeProvider";

export function SectionHeading({ text }: { text: string }) {
  const { colors } = useAppTheme();
  return <Text style={[styles.label, { color: colors.primaryContainer }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginTop: 8, paddingHorizontal: 4 },
});
