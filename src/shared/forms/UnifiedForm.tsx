import React, { ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../constants";
import { useAppTheme } from "../theme/ThemeProvider";
import Button from "../ui/Button";

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
  const { colors } = useAppTheme();

  return (
    <View style={[styles.gradient, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />

        {/* ── Nav bar ───────────────────────────── */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.surfaceVariant }]}
            onPress={onCancel}
            disabled={loading}>
            <Ionicons name="close" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>

          <Text style={[styles.navTitle, { color: colors.onBackground }]}>{title}</Text>

          {showDeleteButton && onDelete ? (
            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: colors.errorContainer, borderColor: colors.errorContainer }]}
              onPress={onDelete}
              disabled={loading}>
              <Ionicons name="trash-outline" size={18} color={colors.onErrorContainer} />
            </TouchableOpacity>
          ) : (
            <View style={styles.navPlaceholder} />
          )}
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── Bottom action bar ───────────────────── */}
        <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.surfaceVariant }]}>
          <View style={{ flex: 1, paddingRight: 6 }}>
            <Button
              title={cancelLabel}
              onPress={onCancel}
              variant="secondary"
              disabled={loading}
              style={{ flex: 1 }}
            />
          </View>
          <View style={{ flex: 1.5, paddingLeft: 6 }}>
            <Button
              title={submitLabel}
              onPress={onSubmit}
              variant="primary"
              disabled={loading || !isValid}
              loading={loading}
              icon="checkmark-circle"
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },

  // ── Nav ────────────────────────────────────────────
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(108,92,231,0.1)",
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    backgroundColor: "rgba(255,107,107,0.08)",
    borderColor: "rgba(255,107,107,0.2)",
  },
  navTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center",
  },
  navPlaceholder: { width: 38 },

  // ── Scroll ─────────────────────────────────────────
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },

  // ── Bottom bar ─────────────────────────────────────
  bottomBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(108,92,231,0.1)",
    backgroundColor: "rgba(15,15,45,0.8)",
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: UI.COLORS.TEXT_MUTED,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    paddingHorizontal: 28,
    borderRadius: 14,
    gap: 8,
    shadowColor: UI.COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});

export default UnifiedForm;
