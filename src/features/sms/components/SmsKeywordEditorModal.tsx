import { styles } from "./SmsDetectorSections.styles";
import type { SmsDetectorSettingsScreenController } from "../hooks/useSmsDetectorSettingsScreen";

import { View, Text, TouchableOpacity, TextInput, Modal, Platform, KeyboardAvoidingView } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";

interface SmsKeywordEditorModalProps {
  activeGroup: SmsDetectorSettingsScreenController["activeGroup"];
  setActiveGroup: SmsDetectorSettingsScreenController["setActiveGroup"];
  newKeywordInput: SmsDetectorSettingsScreenController["newKeywordInput"];
  setNewKeywordInput: SmsDetectorSettingsScreenController["setNewKeywordInput"];
  handleAddKeyword: SmsDetectorSettingsScreenController["handleAddKeyword"];

}
export function SmsKeywordEditorModal({ activeGroup, setActiveGroup, newKeywordInput, setNewKeywordInput, handleAddKeyword }: SmsKeywordEditorModalProps) {
  const { colors } = useAppTheme();

  return (<Modal
    visible={activeGroup !== null}
    transparent
    animationType="fade"
    onRequestClose={() => setActiveGroup(null)}
  >
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.modalOverlay}
    >
      <View
        style={[
          styles.modalCard,
          { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
        ]}
      >
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleContainer}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
              Add to {activeGroup?.title}
            </Text>
            <Text
              style={[
                styles.modalSubtitle,
                { color: colors.onSurfaceVariant },
              ]}
            >
              {activeGroup?.subtitle}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setActiveGroup(null)}
            style={styles.modalCloseBtn}
          >
            <Ionicons
              name="close"
              size={20}
              color={colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>

        <TextInput
          style={[
            styles.modalInput,
            {
              backgroundColor: colors.surfaceVariant,
              color: colors.onSurface,
              borderColor: colors.outlineVariant,
            },
          ]}
          value={newKeywordInput}
          onChangeText={setNewKeywordInput}
          placeholder={activeGroup?.placeholder}
          placeholderTextColor={colors.onSurfaceVariant}
          autoFocus
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={handleAddKeyword}
        />

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[
              styles.modalCancelBtn,
              { backgroundColor: colors.surfaceVariant },
            ]}
            onPress={() => setActiveGroup(null)}
          >
            <Text
              style={[
                styles.modalCancelText,
                { color: colors.onSurfaceVariant },
              ]}
            >
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modalConfirmBtn,
              {
                backgroundColor: newKeywordInput.trim()
                  ? colors.primary
                  : colors.surfaceVariant,
              },
            ]}
            disabled={!newKeywordInput.trim()}
            onPress={handleAddKeyword}
          >
            <Text
              style={[
                styles.modalConfirmText,
                {
                  color: newKeywordInput.trim()
                    ? colors.onPrimary
                    : colors.onSurfaceVariant,
                },
              ]}
            >
              Add Keyword
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>);
}
