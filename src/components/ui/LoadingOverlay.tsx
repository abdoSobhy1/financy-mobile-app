import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { UI } from "../../constants";

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible, message = "Loading..." }) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color={UI.COLORS.PRIMARY} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  container: {
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: UI.CARD_RADIUS,
    padding: UI.SPACING.LG,
    alignItems: "center",
    minWidth: 150,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  message: {
    marginTop: UI.SPACING.MD,
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center",
  },
});
