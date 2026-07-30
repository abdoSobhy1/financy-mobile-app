import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../../constants";

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
}) => (
  <View style={styles.headerWrapper}>
    <LinearGradient
      colors={["#6c5ce726", "rgba(108,92,231,0.03)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}>
      {/* Cancel */}
      <TouchableOpacity
        onPress={onCancel}
        style={styles.cancelButton}
        activeOpacity={0.7}>
        <View style={styles.iconCircle}>
          <Ionicons name="close" size={20} color={UI.COLORS.TEXT_SECONDARY} />
        </View>
      </TouchableOpacity>

      {/* Title */}
      <Text style={styles.title}>
        {isEditing ? "Edit Transaction" : "New Transaction"}
      </Text>

      {/* Save */}
      <TouchableOpacity
        onPress={onSave}
        disabled={loading}
        activeOpacity={0.8}
        style={styles.saveWrapper}>
        <LinearGradient
          colors={
            loading
              ? ["rgba(108,92,231,0.4)", "rgba(72,52,212,0.4)"]
              : [UI.COLORS.PRIMARY, UI.COLORS.PRIMARY_DARK]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.saveButton}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.saveButtonText}>Save</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  </View>
);

const styles = StyleSheet.create({
  headerWrapper: {
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(108,92,231,0.12)",
  },
  cancelButton: {
    padding: 4,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
    letterSpacing: 0.3,
  },
  saveWrapper: {
    borderRadius: 20,
    // purple glow
    shadowColor: UI.COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
