import { getStyles } from "./SettingsModals.styles";
import { useMemo } from "react";
import type { SettingsScreenController } from "../hooks/useSettingsScreen";

import { View, Text, TouchableOpacity, Modal, ActivityIndicator, TextInput } from "react-native";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";

interface ProfileEditorModalProps {
  showProfileModal: SettingsScreenController["showProfileModal"];
  setShowProfileModal: SettingsScreenController["setShowProfileModal"];
  isGuest: SettingsScreenController["isGuest"];
  profileNameInput: SettingsScreenController["profileNameInput"];
  setProfileNameInput: SettingsScreenController["setProfileNameInput"];
  user: SettingsScreenController["user"];
  savingProfile: SettingsScreenController["savingProfile"];
  handleSaveProfile: SettingsScreenController["handleSaveProfile"];

}
export function ProfileEditorModal({ showProfileModal, setShowProfileModal, isGuest, profileNameInput, setProfileNameInput, user, savingProfile, handleSaveProfile }: ProfileEditorModalProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (<Modal
    visible={showProfileModal}
    transparent
    animationType="fade"
    onRequestClose={() => setShowProfileModal(false)}>
    <View style={styles.modalOverlay}>
      <View
        style={[
          styles.modalCard,
          { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
        ]}>
        <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
          Profile Information
        </Text>
        <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant }]}>
          {isGuest
            ? "Update your local guest display name."
            : "Update your account display name."}
        </Text>

        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: colors.onSurfaceVariant,
            marginBottom: 6,
          }}>
          DISPLAY NAME
        </Text>
        <TextInput
          style={{
            backgroundColor: colors.surfaceVariant,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: colors.onSurface,
            fontSize: 15,
            marginBottom: 14,
          }}
          value={profileNameInput}
          onChangeText={setProfileNameInput}
          placeholder="Your Name"
          placeholderTextColor={colors.onSurfaceVariant}
        />

        {!isGuest && user?.email ? (
          <>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: colors.onSurfaceVariant,
                marginBottom: 6,
              }}>
              ACCOUNT EMAIL
            </Text>
            <View
              style={{
                backgroundColor: colors.surfaceVariant,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 8,
                opacity: 0.7,
              }}>
              <Text style={{ color: colors.onSurfaceVariant, fontSize: 15 }}>
                {user.email}
              </Text>
            </View>
          </>
        ) : null}

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={styles.modalCancelBtn}
            disabled={savingProfile}
            onPress={() => setShowProfileModal(false)}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
            disabled={savingProfile}
            onPress={handleSaveProfile}>
            {savingProfile ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={[styles.modalSaveText, { color: colors.onPrimary }]}>
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>);
}
