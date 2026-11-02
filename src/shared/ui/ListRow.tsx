import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

interface ListRowProps {
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export const ListRow: React.FC<ListRowProps> = ({ 
  leading, 
  title, 
  subtitle, 
  trailing, 
  onPress,
  style 
}) => {
  const { colors, typography, spacing } = useAppTheme();

  const Container = onPress ? TouchableOpacity : View;
  
  return (
    <Container 
      style={[
        styles.container, 
        { 
          paddingVertical: spacing.md, 
          paddingHorizontal: spacing.md,
          backgroundColor: colors.surface,
        },
        style
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {leading && (
        <View style={[styles.leading, { marginRight: spacing.md }]}>
          {leading}
        </View>
      )}
      
      <View style={styles.content}>
        <Text style={[typography.bodyLarge, { color: colors.onSurface }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: 2 }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      
      {trailing && (
        <View style={[styles.trailing, { marginLeft: spacing.md }]}>
          {trailing}
        </View>
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  trailing: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
});
