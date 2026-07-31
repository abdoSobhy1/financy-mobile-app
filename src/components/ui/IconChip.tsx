import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme, CATEGORY_PALETTE } from './ThemeProvider';

type PaletteColor = keyof typeof CATEGORY_PALETTE;

interface IconChipProps {
  iconName: keyof typeof Ionicons.glyphMap;
  colorName?: PaletteColor;
  size?: number;
  shape?: 'circle' | 'rounded-square';
  style?: ViewStyle;
}

export const IconChip: React.FC<IconChipProps> = ({ 
  iconName, 
  colorName = 'bluegrey', 
  size = 40,
  shape = 'circle',
  style 
}) => {
  const { isDark, radius } = useAppTheme();

  const palette = CATEGORY_PALETTE[colorName];
  const bgColor = isDark ? palette.dark : palette.light;
  const iconColor = isDark ? palette.iconDark : palette.iconLight;

  const borderRadius = shape === 'circle' ? radius.pill : radius.md;

  return (
    <View 
      style={[
        styles.container, 
        { 
          width: size,
          height: size,
          backgroundColor: bgColor, 
          borderRadius,
        },
        style
      ]}
    >
      <Ionicons name={iconName} size={size * 0.55} color={iconColor} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
