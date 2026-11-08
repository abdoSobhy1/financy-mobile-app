import React from "react";
import { View, Text, StyleSheet, Animated, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ImportProgress } from "../types/import";
import { Card, Badge, useAppTheme } from "../../../shared/ui";

interface ImportProgressStepProps {
  progress: ImportProgress | null;
}

export const ImportProgressStep: React.FC<ImportProgressStepProps> = ({ progress }) => {
  const { colors, typography, spacing } = useAppTheme();

  if (!progress) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Card variant="elevated" padding="large" style={styles.card}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.h3, { color: colors.onSurface, marginTop: spacing.md }]}>
            Preparing Import...
          </Text>
        </Card>
      </View>
    );
  }

  const getStatusIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (progress.status) {
      case "preparing":
        return "construct-outline";
      case "validating":
        return "shield-checkmark-outline";
      case "importing":
        return "cloud-download-outline";
      case "complete":
        return "checkmark-done-circle-outline";
      case "error":
        return "alert-circle-outline";
      default:
        return "hourglass-outline";
    }
  };

  const isError = progress.status === "error";
  const accentColor = isError ? colors.error : colors.primary;
  const accentContainer = isError ? colors.errorContainer : colors.primaryContainer;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Card variant="elevated" padding="large" style={styles.card}>
        <View style={[styles.iconContainer, { backgroundColor: accentContainer }]}>
          <Ionicons name={getStatusIcon()} size={42} color={accentColor} />
        </View>

        <Text style={[typography.h2, { color: colors.onSurface, textAlign: "center" }]}>
          {progress.status === "preparing" && "Preparing Import"}
          {progress.status === "validating" && "Validating Data"}
          {progress.status === "importing" && "Importing Transactions"}
          {progress.status === "complete" && "Import Complete"}
          {progress.status === "error" && "Import Failed"}
        </Text>

        <Text
          style={[
            typography.bodyMedium,
            {
              color: colors.onSurfaceVariant,
              textAlign: "center",
              marginTop: spacing.xs,
              marginBottom: spacing.lg,
            },
          ]}>
          {progress.message}
        </Text>

        {progress.status !== "complete" && progress.status !== "error" && (
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: colors.surfaceVariant },
              ]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, Math.max(0, progress.percentage))}%`,
                    backgroundColor: accentColor,
                  },
                ]}
              />
            </View>
            <View style={styles.progressMetaRow}>
              <Badge
                label={`${progress.percentage.toFixed(0)}%`}
                role="primary"
                size="small"
              />
              {progress.total > 0 && progress.status === "importing" && (
                <Text style={[typography.caption, { color: colors.onSurfaceVariant }]}>
                  {progress.current.toLocaleString()} / {progress.total.toLocaleString()} rows
                </Text>
              )}
            </View>
          </View>
        )}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    borderRadius: 24,
  },
  iconContainer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  progressBarContainer: {
    width: "100%",
  },
  progressBar: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    minWidth: 8,
  },
  progressMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
