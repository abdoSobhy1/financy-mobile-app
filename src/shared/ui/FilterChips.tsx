import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet, ViewStyle, View } from "react-native";
import { useAppTheme } from "../theme/ThemeProvider";

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
      {options.map((f) => {
        const isSelected = selected === f;
        return (
          <TouchableOpacity
            key={f}
            onPress={() => onSelect(f)}
            activeOpacity={0.75}
            style={[
              styles.filterChip,
              {
                borderColor: isSelected ? colors.primaryContainer : colors.outlineVariant,
                backgroundColor: isSelected ? colors.primaryContainer : colors.surface,
              },
            ]}
          >
            <Text
              style={[
                typography.bodyMedium,
                {
                  color: isSelected ? colors.onPrimaryContainer : colors.onSurfaceVariant,
                  fontWeight: isSelected ? "700" : "500",
                },
              ]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        );
      })}
      <View style={{ width: spacing.lg }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
