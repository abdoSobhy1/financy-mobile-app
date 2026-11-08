import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import {
  SectionHeading,
  SectionCard,
  ListRow,
  IconChip,
  Badge,
  useAppTheme,
} from "../../../shared/ui";

export interface ImportSectionItem {
  key: string;
  icon: string;
  iconColor?: string;
  iconShape?: "circle" | "rounded-square";
  iconSize?: "sm" | "md" | "lg";
  title: string;
  subtitle?: string;
  badge?: {
    label: string;
    role?: "primary" | "secondary" | "tertiary" | "error" | "success" | "warning" | "surfaceVariant";
  };
  trailing?: React.ReactNode;
  onPress?: () => void;
  expandedContent?: React.ReactNode;
}

interface ImportSectionListProps {
  heading?: string;
  items: ImportSectionItem[];
  cardStyle?: ViewStyle;
}

export const ImportSectionList: React.FC<ImportSectionListProps> = ({
  heading,
  items,
  cardStyle,
}) => {
  const { colors } = useAppTheme();

  if (items.length === 0) return null;

  return (
    <>
      {heading && <SectionHeading text={heading} />}
      <SectionCard style={cardStyle}>
        {items.map((item, index) => (
          <React.Fragment key={item.key}>
            {index > 0 && (
              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.outlineVariant },
                ]}
              />
            )}
            <ListRow
              onPress={item.onPress}
              leading={
                <IconChip
                  iconName={item.icon}
                  colorName={item.iconColor || "indigo"}
                  size={item.iconSize || "sm"}
                  shape={item.iconShape || "circle"}
                />
              }
              title={item.title}
              subtitle={item.subtitle}
              trailing={
                item.trailing ??
                (item.badge ? (
                  <Badge
                    label={item.badge.label}
                    role={item.badge.role || "surfaceVariant"}
                    size="small"
                  />
                ) : undefined)
              }
            />
            {item.expandedContent && (
              <View
                style={[
                  styles.expandedContainer,
                  {
                    backgroundColor: colors.background,
                    borderTopColor: colors.outlineVariant,
                  },
                ]}>
                {item.expandedContent}
              </View>
            )}
          </React.Fragment>
        ))}
      </SectionCard>
    </>
  );
};

const styles = StyleSheet.create({
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  expandedContainer: {
    borderTopWidth: 1,
    padding: 12,
    gap: 8,
  },
});
