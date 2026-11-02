import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../constants";

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  action?: {
    text: string;
    onPress: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, action }) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon as any} size={64} color={UI.COLORS.TEXT_MUTED} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {action && (
        <TouchableOpacity style={styles.actionButton} onPress={action.onPress}>
          <Text style={styles.actionText}>{action.text}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: UI.SPACING.XL,
    paddingVertical: UI.SPACING.XL,
  },
  iconContainer: {
    marginBottom: UI.SPACING.LG,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center",
    marginBottom: UI.SPACING.SM,
  },
  message: {
    fontSize: 16,
    color: UI.COLORS.TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: UI.SPACING.LG,
  },
  actionButton: {
    paddingHorizontal: UI.SPACING.LG,
    paddingVertical: UI.SPACING.MD,
    backgroundColor: UI.COLORS.PRIMARY,
    borderRadius: UI.CARD_RADIUS,
  },
  actionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "white",
  },
});
