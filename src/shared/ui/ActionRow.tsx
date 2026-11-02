import type { ComponentProps, ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../theme/ThemeProvider";
import { ListRow } from "./ListRow";

interface ActionRowProps {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: ReactNode;
  destructive?: boolean;
}

export function ActionRow({ icon, title, subtitle, onPress, rightElement, destructive }: ActionRowProps) {
  const { colors } = useAppTheme();
  return (
    <ListRow
      title={title} subtitle={subtitle} onPress={onPress}
      leading={<View style={[styles.icon, { backgroundColor: destructive ? colors.errorContainer : colors.primaryContainer }]}>
        <Ionicons name={icon} size={16} color={destructive ? colors.error : colors.primary} />
      </View>}
      trailing={rightElement || <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} />}
    />
  );
}

const styles = StyleSheet.create({ icon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" } });
