import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Card, IconChip, ListRow, useAppTheme } from "../../../shared/ui";

export interface ImportStatItem {
  label: string;
  value: string | number;
  color?: string;
}

interface ImportSummaryCardProps {
  title: string;
  subtitle?: string;
  iconName: string;
  iconColor?: string;
  iconShape?: "circle" | "rounded-square";
  iconSize?: "sm" | "md" | "lg";
  trailing?: React.ReactNode;
  borderColor?: string;
  stats?: ImportStatItem[];
  style?: ViewStyle;
}

export const ImportSummaryCard: React.FC<ImportSummaryCardProps> = ({
  title,
  subtitle,
  iconName,
  iconColor = "teal",
  iconShape = "circle",
  iconSize = "md",
  trailing,
  borderColor,
  stats,
  style,
}) => {
  const { colors, typography } = useAppTheme();

  return (
    <Card
      variant="outlined"
      padding="none"
      style={StyleSheet.flatten([
        styles.card,
        borderColor ? { borderColor, borderWidth: 1.5 } : undefined,
        style,
      ])}>
      <ListRow
        leading={
          <IconChip
            iconName={iconName}
            colorName={iconColor}
            size={iconSize}
            shape={iconShape}
          />
        }
        title={title}
        subtitle={subtitle}
        trailing={trailing}
      />

      {stats && stats.length > 0 && (
        <View
          style={[
            styles.statsRow,
            {
              borderTopColor: colors.outlineVariant,
              backgroundColor: colors.surfaceVariant + "44",
            },
          ]}>
          {stats.map((stat, index) => (
            <React.Fragment key={stat.label}>
              {index > 0 && (
                <View
                  style={[
                    styles.statDivider,
                    { backgroundColor: colors.outlineVariant },
                  ]}
                />
              )}
              <View style={styles.statBox}>
                <Text
                  style={[
                    typography.h3,
                    { color: stat.color || colors.onSurface },
                  ]}>
                  {typeof stat.value === "number"
                    ? stat.value.toLocaleString()
                    : stat.value}
                </Text>
                <Text
                  style={[
                    typography.caption,
                    { color: colors.onSurfaceVariant, marginTop: 2 },
                  ]}>
                  {stat.label}
                </Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    overflow: "hidden",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
});
