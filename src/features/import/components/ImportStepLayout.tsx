import React from "react";
import { View, ScrollView, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, useAppTheme } from "../../../shared/ui";

export interface StepActionConfig {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: "left" | "right";
  variant?: "primary" | "secondary" | "danger" | "ghost";
  flex?: number;
}

interface ImportStepLayoutProps {
  children: React.ReactNode;
  secondaryAction?: StepActionConfig;
  primaryAction?: StepActionConfig;
  contentContainerStyle?: ViewStyle;
}

export const ImportStepLayout: React.FC<ImportStepLayoutProps> = ({
  children,
  secondaryAction,
  primaryAction,
  contentContainerStyle,
}) => {
  const { colors, spacing } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          { padding: spacing.lg, paddingBottom: spacing.xxl },
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>

      {(secondaryAction || primaryAction) && (
        <View
          style={[
            styles.actions,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.outlineVariant,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
            },
          ]}>
          {secondaryAction && (
            <Button
              title={secondaryAction.title}
              onPress={secondaryAction.onPress}
              variant={secondaryAction.variant || "secondary"}
              disabled={secondaryAction.disabled}
              loading={secondaryAction.loading}
              icon={secondaryAction.icon}
              iconPosition={secondaryAction.iconPosition}
              style={{ flex: secondaryAction.flex ?? 1 }}
            />
          )}
          {primaryAction && (
            <Button
              title={primaryAction.title}
              onPress={primaryAction.onPress}
              variant={primaryAction.variant || "primary"}
              disabled={primaryAction.disabled}
              loading={primaryAction.loading}
              icon={primaryAction.icon}
              iconPosition={primaryAction.iconPosition}
              style={{ flex: primaryAction.flex ?? (secondaryAction ? 1.4 : 1) }}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
  },
});
