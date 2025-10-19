import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ImportProgress } from "../../types/import";
import { UI } from "../../constants";

interface ImportProgressStepProps {
  progress: ImportProgress | null;
}

export const ImportProgressStep: React.FC<ImportProgressStepProps> = ({ progress }) => {
  if (!progress) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass" size={48} color={UI.COLORS.PRIMARY} />
          <Text style={styles.title}>Preparing Import...</Text>
        </View>
      </View>
    );
  }

  const getStatusIcon = () => {
    switch (progress.status) {
      case "preparing":
        return "construct";
      case "validating":
        return "checkmark-circle";
      case "importing":
        return "download";
      case "complete":
        return "checkmark-done-circle";
      case "error":
        return "alert-circle";
      default:
        return "hourglass";
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case "complete":
        return UI.COLORS.SUCCESS;
      case "error":
        return UI.COLORS.ERROR;
      default:
        return UI.COLORS.PRIMARY;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        {/* Status Icon */}
        <View style={[styles.iconContainer, { backgroundColor: getStatusColor() + "20" }]}>
          <Ionicons name={getStatusIcon()} size={48} color={getStatusColor()} />
        </View>

        {/* Progress Info */}
        <Text style={styles.title}>
          {progress.status === "preparing" && "Preparing Import"}
          {progress.status === "validating" && "Validating Data"}
          {progress.status === "importing" && "Importing Transactions"}
          {progress.status === "complete" && "Import Complete"}
          {progress.status === "error" && "Import Failed"}
        </Text>

        <Text style={styles.message}>{progress.message}</Text>

        {/* Progress Bar */}
        {progress.status !== "complete" && progress.status !== "error" && (
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress.percentage}%`,
                    backgroundColor: getStatusColor(),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{progress.percentage.toFixed(1)}%</Text>
          </View>
        )}

        {/* Current Progress Details */}
        {progress.total > 0 && progress.status === "importing" && (
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Progress:</Text>
              <Text style={styles.detailValue}>
                {progress.current} / {progress.total} transactions
              </Text>
            </View>
          </View>
        )}

        {/* Loading Animation for Active States */}
        {["preparing", "validating", "importing"].includes(progress.status) && (
          <View style={styles.loadingAnimation}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: UI.SPACING.XL,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  progressContainer: {
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 300,
    width: "100%",
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: UI.SPACING.LG,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center",
    marginBottom: UI.SPACING.SM,
  },
  message: {
    fontSize: 16,
    color: UI.COLORS.TEXT_SECONDARY,
    textAlign: "center",
    marginBottom: UI.SPACING.LG,
    lineHeight: 22,
  },
  progressBarContainer: {
    width: "100%",
    marginBottom: UI.SPACING.LG,
  },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: UI.SPACING.SM,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    minWidth: 8,
  },
  progressText: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    textAlign: "center",
    fontWeight: "600",
  },
  detailsContainer: {
    width: "100%",
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: UI.CARD_RADIUS,
    padding: UI.SPACING.MD,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: UI.COLORS.TEXT_PRIMARY,
    fontWeight: "600",
  },
  loadingAnimation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: UI.SPACING.XS,
    marginTop: UI.SPACING.LG,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: UI.COLORS.PRIMARY,
    opacity: 0.4,
    // Note: React Native doesn't support CSS animations
    // We would use Animated API for this in a real implementation
  },
});
