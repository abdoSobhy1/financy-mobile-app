import type { GroupConfig } from "../model/settingsOptions";
import { styles } from "../screens/SmsDetectorSettingsScreen.styles";
import { useSmsDetectorSettingsScreen } from "../hooks/useSmsDetectorSettingsScreen";

import { View, Text, TouchableOpacity } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";

import { Card } from "../../../shared/ui";

interface SmsKeywordGroupsProps {
  group: GroupConfig;
  list: string[];
  openAddModal: ReturnType<typeof useSmsDetectorSettingsScreen>["openAddModal"];
  handleRemoveKeyword: ReturnType<typeof useSmsDetectorSettingsScreen>["handleRemoveKeyword"];

}
export function SmsKeywordGroups({ group, list, openAddModal, handleRemoveKeyword }: SmsKeywordGroupsProps) {
  const { colors, spacing } = useAppTheme();

  return (<Card key={group.key} variant="outlined" style={styles.sectionCard}>
    <View style={styles.groupHeader}>
      <View style={styles.groupTitleRow}>
        <View
          style={[
            styles.iconBadgeSmall,
            { backgroundColor: colors.secondaryContainer },
          ]}
        >
          <Ionicons
            name={group.icon}
            size={16}
            color={colors.onSecondaryContainer}
          />
        </View>
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <View style={styles.groupTitleWithCount}>
            <Text
              style={[
                styles.groupTitle,
                { color: colors.onSurface },
              ]}
            >
              {group.title}
            </Text>
            <View
              style={[
                styles.countBadge,
                { backgroundColor: colors.surfaceVariant },
              ]}
            >
              <Text
                style={[
                  styles.countText,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                {list.length}
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.groupSubtitle,
              { color: colors.onSurfaceVariant },
            ]}
          >
            {group.subtitle}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.addBtn,
          { backgroundColor: colors.primaryContainer },
        ]}
        onPress={() => openAddModal(group)}
      >
        <Ionicons name="add" size={16} color={colors.onPrimaryContainer} />
        <Text
          style={[
            styles.addBtnText,
            { color: colors.onPrimaryContainer },
          ]}
        >
          Add
        </Text>
      </TouchableOpacity>
    </View>

    {/* Chips container */}
    <View style={styles.chipsContainer}>
      {list.map((kw, idx) => {
        const isDefault = group.defaultValues.includes(kw);
        return (
          <View
            key={`${kw}-${idx}`}
            style={[
              styles.chip,
              {
                backgroundColor: isDefault
                  ? colors.surfaceVariant
                  : colors.tertiaryContainer,
                borderColor: isDefault
                  ? colors.outlineVariant
                  : colors.tertiary,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: isDefault
                    ? colors.onSurfaceVariant
                    : colors.onTertiaryContainer,
                },
              ]}
              numberOfLines={1}
            >
              {kw}
            </Text>
            <TouchableOpacity
              onPress={() => handleRemoveKeyword(group.key, kw)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.chipCloseBtn}
            >
              <Ionicons
                name="close-circle"
                size={16}
                color={
                  isDefault
                    ? colors.onSurfaceVariant
                    : colors.onTertiaryContainer
                }
              />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  </Card>);
}
