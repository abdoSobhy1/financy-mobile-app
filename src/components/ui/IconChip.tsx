import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme, CATEGORY_PALETTE } from './ThemeProvider';

type PaletteColor = keyof typeof CATEGORY_PALETTE | string;

interface IconChipProps {
  iconName?: keyof typeof Ionicons.glyphMap | string;
  icon?: keyof typeof Ionicons.glyphMap | string;
  colorName?: PaletteColor;
  color?: PaletteColor;
  size?: number | 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'rounded-square';
  style?: ViewStyle;
}

export const IconChip: React.FC<IconChipProps> = ({ 
  iconName, 
  icon,
  colorName, 
  color,
  size = 40,
  shape = 'circle',
  style 
}) => {
  const { radius, resolveCategoryColor } = useAppTheme();
  const resolvedColorKey = colorName || color || 'bluegrey';
  const resolvedIcon = iconName || icon || 'receipt-outline';
  const numericSize =
    typeof size === 'number'
      ? size
      : size === 'sm'
      ? 32
      : size === 'lg'
      ? 52
      : 44;
  const { bgColor, iconColor } = resolveCategoryColor(resolvedColorKey);

  const borderRadius = shape === 'circle' ? radius.pill : radius.md;

  return (
    <View 
      style={[
        styles.container, 
        { 
          width: numericSize,
          height: numericSize,
          backgroundColor: bgColor, 
          borderRadius,
        },
        style
      ]}
    >
      <Ionicons name={resolvedIcon as any} size={Math.round(numericSize * 0.52)} color={iconColor} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
