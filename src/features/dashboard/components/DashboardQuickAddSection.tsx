import { styles } from "./DashboardSections.styles";
import type { DashboardScreenController } from "../hooks/useDashboardScreen";

import { View, Text, ScrollView, TouchableOpacity } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";

import { IconChip } from "../../../shared/ui/IconChip";

interface DashboardQuickAddSectionProps {
  quickAddSlots: DashboardScreenController["quickAddSlots"];
  handleQuickAddPress: DashboardScreenController["handleQuickAddPress"];
  navigation: DashboardScreenController["navigation"];
  setShowScanModal: DashboardScreenController["setShowScanModal"];

}
export function DashboardQuickAddSection({ quickAddSlots, handleQuickAddPress, navigation, setShowScanModal }: DashboardQuickAddSectionProps) {
  const { spacing, typography, colors } = useAppTheme();

  return (<View style={{ marginBottom: spacing.xl, paddingHorizontal: spacing.lg }}>
    <Text
      style={[
        typography.h3,
        {
          color: colors.onBackground,
          marginBottom: spacing.md,
          fontSize: 14,
          textTransform: "uppercase",
        },
      ]}>
      QUICK ADD
    </Text>
    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 8, paddingRight: spacing.md }}>
        {quickAddSlots.map((slot) => (
          <TouchableOpacity
            key={slot.id}
            style={{ alignItems: "center", width: 64 }}
            onPress={() => handleQuickAddPress(slot)}>
            <View
              style={[
                styles.circleIcon,
                { backgroundColor: colors.surface },
              ]}>
              <IconChip
                iconName={slot.iconName as any}
                colorName={(slot.colorName as any) || "bluegrey"}
                size={56}
              />
            </View>
            <Text
              style={[
                typography.bodySmall,
                {
                  color: colors.onBackground,
                  marginTop: spacing.xs,
                  textAlign: "center",
                  fontWeight: "600",
                },
              ]}
              numberOfLines={1}>
              {slot.name}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Quick Create Category -> Opens New Transaction Screen + Create Category Modal */}
        <TouchableOpacity
          style={{ alignItems: "center", width: 64 }}
          onPress={() =>
            navigation.navigate("AddTransaction", {
              openCreateCategory: true,
            })
          }>
          <View
            style={[
              styles.moreChip,
              {
                backgroundColor: colors.surface,
                borderRadius: 28,
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: colors.primary,
              },
            ]}>
            <Ionicons name="add" size={26} color={colors.primary} />
          </View>
          <Text
            style={[
              typography.bodySmall,
              {
                color: colors.primary,
                marginTop: spacing.xs,
                textAlign: "center",
                fontWeight: "700",
              },
            ]}
            numberOfLines={1}>
            + Category
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Vertical Separator between categories and AI/Scan actions */}
      <View
        style={[
          styles.quickAddDivider,
          { backgroundColor: colors.outlineVariant },
        ]}
      />

      {/* Scan Receipt / OCR chip */}
      <TouchableOpacity
        style={{ alignItems: "center", width: 60 }}
        onPress={() => setShowScanModal(true)}>
        <View
          style={[
            styles.moreChip,
            {
              backgroundColor: colors.surfaceVariant,
              borderRadius: 28,
            },
          ]}>
          <Ionicons
            name="scan-outline"
            size={26}
            color={colors.primary}
          />
        </View>
        <Text
          style={[
            typography.bodySmall,
            {
              color: colors.onBackground,
              marginTop: spacing.xs,
              textAlign: "center",
              fontWeight: "600",
            },
          ]}
          numberOfLines={1}>
          Scan
        </Text>
      </TouchableOpacity>

      {/* Voice / More chip */}
      <TouchableOpacity
        style={{ alignItems: "center", width: 60, marginLeft: 4 }}
        onPress={() => navigation.navigate("VoiceInput")}>
        <View
          style={[
            styles.moreChip,
            {
              backgroundColor: colors.primaryContainer,
              borderRadius: 28,
            },
          ]}>
          <Ionicons
            name="mic-outline"
            size={28}
            color={colors.onPrimaryContainer}
          />
        </View>
        <Text
          style={[
            typography.bodySmall,
            {
              color: colors.onBackground,
              marginTop: spacing.xs,
              textAlign: "center",
              fontWeight: "600",
            },
          ]}
          numberOfLines={1}>
          Voice
        </Text>
      </TouchableOpacity>
    </View>
  </View>);
}
