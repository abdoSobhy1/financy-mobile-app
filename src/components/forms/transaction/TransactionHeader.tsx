import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../theme";

interface TransactionHeaderProps {
  isEditing: boolean;
  loading: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export const TransactionHeader: React.FC<TransactionHeaderProps> = ({
  isEditing,
  loading,
  onCancel,
  onSave,
}) => {
  const { colors, typography, spacing, radius } = useAppTheme();

  return (
    <View style={[styles.headerWrapper, { borderColor: colors.outline }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.s20,
            paddingVertical: spacing.s16,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.outline,
          },
        ]}>
        {/* Cancel Button */}
        <TouchableOpacity
          onPress={onCancel}
          style={styles.cancelButton}
          activeOpacity={0.7}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: colors.surfaceVariant,
                borderRadius: radius.full,
              },
            ]}>
            <Ionicons
              name="close"
              size={20}
              color={colors.onSurfaceVariant}
            />
          </View>
        </TouchableOpacity>

        {/* Title */}
        <Text style={[typography.titleMedium, { color: colors.onSurface }]}>
          {isEditing ? "Edit Transaction" : "New Transaction"}
        </Text>

        {/* Save Button */}
        <TouchableOpacity
          onPress={onSave}
          disabled={loading}
          activeOpacity={0.8}
          style={[
            styles.saveButton,
            {
              backgroundColor: loading
                ? colors.primaryContainer
                : colors.primary,
              borderRadius: radius.full, // Pill button
              paddingHorizontal: spacing.s16,
              paddingVertical: spacing.s8,
            },
          ]}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <>
              <Ionicons
                name="checkmark"
                size={18}
                color={colors.onPrimary}
              />
              <Text
                style={[
                  typography.labelLarge,
                  { color: colors.onPrimary, marginLeft: 4 },
                ]}>
                Save
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cancelButton: {
    padding: 4,
  },
  iconCircle: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});

