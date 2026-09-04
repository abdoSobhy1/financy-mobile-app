import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet, ViewStyle, View } from "react-native";
import { useAppTheme } from "./ThemeProvider";

interface FilterChipsProps {
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
  style?: ViewStyle;
}

export const FilterChips: React.FC<FilterChipsProps> = ({ options, selected, onSelect, style }) => {
  const { colors, typography, spacing } = useAppTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={style}>
      {options.map((f) => (
        <TouchableOpacity
          key={f}
          onPress={() => onSelect(f)}
          style={[
            styles.filterChip,
            {
              borderColor: selected === f ? colors.primary : colors.outlineVariant,
              backgroundColor: selected === f ? "rgba(128, 203, 196, 0.15)" : "transparent",
            },
          ]}
        >
          <Text
            style={[
              typography.bodyMedium,
              {
                color: selected === f ? colors.primary : colors.onSurfaceVariant,
                fontWeight: selected === f ? "600" : "400",
              },
            ]}
          >
            {f}
          </Text>
        </TouchableOpacity>
      ))}
      <View style={{ width: spacing.lg }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
