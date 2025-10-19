import React, { ReactNode } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../ui";
import { UI } from "../../constants";

interface UnifiedFormProps {
  title: string;
  children: ReactNode;
  onSubmit: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  isValid?: boolean;
  showDeleteButton?: boolean;
}

export const UnifiedForm: React.FC<UnifiedFormProps> = ({
  title,
  children,
  onSubmit,
  onCancel,
  onDelete,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  loading = false,
  isValid = true,
  showDeleteButton = false,
}) => {
  return (
    <Screen>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {showDeleteButton && onDelete && (
              <TouchableOpacity onPress={onDelete} style={styles.deleteButton} disabled={loading}>
                <Ionicons name="trash-outline" size={20} color={UI.COLORS.ERROR} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.form}>
          {children}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel} disabled={loading}>
              <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton, (!isValid || loading) && styles.disabledButton]}
              onPress={onSubmit}
              disabled={loading || !isValid}>
              {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.submitButtonText}>{submitLabel}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.COLORS.BACKGROUND,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
  },
  headerLeft: {
    width: 40,
    alignItems: "flex-start",
  },
  headerRight: {
    width: 40,
  },
  deleteButton: {
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center",
    flex: 1,
  },
  form: {
    flex: 1,
    padding: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 32,
    marginBottom: 40,
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  submitButton: {
    backgroundColor: UI.COLORS.PRIMARY,
  },
  disabledButton: {
    opacity: 0.7,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_SECONDARY,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default UnifiedForm;
