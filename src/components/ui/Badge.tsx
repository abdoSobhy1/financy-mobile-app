import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useAppTheme } from './ThemeProvider';

type ColorRole = 'primary' | 'secondary' | 'tertiary' | 'error' | 'success' | 'warning' | 'surfaceVariant';

interface BadgeProps {
  label: string;
  role?: ColorRole;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ 
  label, 
  role = 'primary',
  size = 'small',
  style 
}) => {
  const { colors, typography, radius, spacing } = useAppTheme();

  let bgColor = colors.primary;
  let textColor = colors.onPrimary;

  switch (role) {
    case 'primary':
      bgColor = colors.primaryContainer;
      textColor = colors.onPrimaryContainer;
      break;
    case 'secondary':
      bgColor = colors.secondaryContainer;
      textColor = colors.onSecondaryContainer;
      break;
    case 'error':
      bgColor = colors.errorContainer;
      textColor = colors.onErrorContainer;
      break;
    case 'success':
      // Map success to tertiary since M3 doesn't have a default success role
      bgColor = colors.tertiaryContainer;
      textColor = colors.onTertiaryContainer;
      break;
    case 'surfaceVariant':
      bgColor = colors.surfaceVariant;
      textColor = colors.onSurfaceVariant;
      break;
    default:
      bgColor = colors.primaryContainer;
      textColor = colors.onPrimaryContainer;
  }

  let textStyle: TextStyle = typography.bodySmall;
  let paddingHorizontal = spacing.sm;
  let paddingVertical = 2;

  if (size === 'medium') {
    textStyle = typography.bodyMedium;
    paddingHorizontal = spacing.md;
    paddingVertical = spacing.xs;
  } else if (size === 'large') {
    textStyle = typography.bodyLarge;
    paddingHorizontal = spacing.lg;
    paddingVertical = spacing.sm;
  }

  return (
    <View 
      style={[
        styles.container, 
        { 
          backgroundColor: bgColor, 
          borderRadius: radius.pill,
          paddingHorizontal,
          paddingVertical,
        },
        style
      ]}
    >
      <Text style={[textStyle, { color: textColor }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
