import { AiConnectionStatus } from "./AiConnectionStatus";
import { AiProviderPicker } from "./AiProviderPicker";
import { GeminiQuotaPanel } from "./GeminiQuotaPanel";
import { AiApiKeyField } from "./AiApiKeyField";
import { getStyles } from "../screens/SettingsScreen.styles";
import { useMemo } from "react";
import { useSettingsScreen } from "../hooks/useSettingsScreen";

import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator, KeyboardAvoidingView, Platform, Linking } from "react-native";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";

import { Ionicons } from "@expo/vector-icons";

interface AiSettingsModalProps {
  showAiModal: ReturnType<typeof useSettingsScreen>["showAiModal"];
  setShowAiModal: ReturnType<typeof useSettingsScreen>["setShowAiModal"];
  isOwner: ReturnType<typeof useSettingsScreen>["isOwner"];
  aiStatus: ReturnType<typeof useSettingsScreen>["aiStatus"];
  selectedAiProvider: ReturnType<typeof useSettingsScreen>["selectedAiProvider"];
  handleResetGeminiQuota: ReturnType<typeof useSettingsScreen>["handleResetGeminiQuota"];
  setSelectedAiProvider: ReturnType<typeof useSettingsScreen>["setSelectedAiProvider"];
  setShowModelChain: ReturnType<typeof useSettingsScreen>["setShowModelChain"];
  showModelChain: ReturnType<typeof useSettingsScreen>["showModelChain"];
  geminiUsage: ReturnType<typeof useSettingsScreen>["geminiUsage"];
  geminiFallbackModels: ReturnType<typeof useSettingsScreen>["geminiFallbackModels"];
  geminiModelMetadata: ReturnType<typeof useSettingsScreen>["geminiModelMetadata"];
  aiKeyInput: ReturnType<typeof useSettingsScreen>["aiKeyInput"];
  setAiKeyInput: ReturnType<typeof useSettingsScreen>["setAiKeyInput"];
  showAiKeySecret: ReturnType<typeof useSettingsScreen>["showAiKeySecret"];
  setShowAiKeySecret: ReturnType<typeof useSettingsScreen>["setShowAiKeySecret"];
  handleTestAi: ReturnType<typeof useSettingsScreen>["handleTestAi"];
  isTestingAi: ReturnType<typeof useSettingsScreen>["isTestingAi"];
  handleSaveAiConfig: ReturnType<typeof useSettingsScreen>["handleSaveAiConfig"];

}
export function AiSettingsModal({ showAiModal, setShowAiModal, isOwner, aiStatus, selectedAiProvider, handleResetGeminiQuota, setSelectedAiProvider, setShowModelChain, showModelChain, geminiUsage, geminiFallbackModels, geminiModelMetadata, aiKeyInput, setAiKeyInput, showAiKeySecret, setShowAiKeySecret, handleTestAi, isTestingAi, handleSaveAiConfig }: AiSettingsModalProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (<Modal
    visible={showAiModal}
    transparent
    animationType="fade"
    onRequestClose={() => setShowAiModal(false)}>
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.modalOverlay}>
      <View
        style={[
          styles.modalCard,
          { backgroundColor: colors.surface, borderColor: colors.outlineVariant, maxWidth: 440 },
        ]}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.primaryContainer,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}>
            <Ionicons name="sparkles" size={20} color={colors.onPrimaryContainer} />
          </View>
          <View>
            <Text style={[styles.modalTitle, { color: colors.onSurface, marginBottom: 2 }]}>
              Cloud AI Assistant
            </Text>
            <Text style={{ fontSize: 13, color: colors.onSurfaceVariant }}>
              Intelligent receipt & voice understanding
            </Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
          {/* Active Status Banner */}
          {<AiConnectionStatus isOwner={isOwner} aiStatus={aiStatus} colors={colors} selectedAiProvider={selectedAiProvider} handleResetGeminiQuota={handleResetGeminiQuota} />}

          {/* Provider Selection */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: colors.onSurfaceVariant,
              marginBottom: 8,
              marginTop: 6,
              letterSpacing: 0.5,
            }}>
            SELECT PROVIDER
          </Text>

          <AiProviderPicker selectedAiProvider={selectedAiProvider} setSelectedAiProvider={setSelectedAiProvider} colors={colors} />

          {/* Gemini Multi-Model Fallback Cascade Details (Owner Only) */}
          {<GeminiQuotaPanel isOwner={isOwner} selectedAiProvider={selectedAiProvider} colors={colors} setShowModelChain={setShowModelChain} showModelChain={showModelChain} aiStatus={aiStatus} geminiUsage={geminiUsage} geminiFallbackModels={geminiFallbackModels} geminiModelMetadata={geminiModelMetadata} handleResetGeminiQuota={handleResetGeminiQuota} />}

          {/* API Key Input (Never pre-populated with stored or bundled keys) */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: colors.onSurfaceVariant,
              marginBottom: 6,
              letterSpacing: 0.5,
            }}>
            {selectedAiProvider.toUpperCase()} API KEY
          </Text>
          <AiApiKeyField colors={colors} aiKeyInput={aiKeyInput} setAiKeyInput={setAiKeyInput} selectedAiProvider={selectedAiProvider} showAiKeySecret={showAiKeySecret} setShowAiKeySecret={setShowAiKeySecret} />

          {/* Helpful link to get key */}
          <TouchableOpacity
            onPress={() => {
              if (selectedAiProvider === "gemini") {
                Linking.openURL("https://aistudio.google.com/app/apikey");
              } else if (selectedAiProvider === "groq") {
                Linking.openURL("https://console.groq.com/keys");
              } else {
                Linking.openURL("https://platform.openai.com/api-keys");
              }
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 6,
              marginBottom: 16,
            }}>
            <Ionicons name="open-outline" size={14} color={colors.primary} />
            <Text
              style={{
                fontSize: 12,
                color: colors.primary,
                fontWeight: "600",
                marginLeft: 6,
                textDecorationLine: "underline",
              }}>
              {selectedAiProvider === "gemini"
                ? "Get 100% Free Gemini API Key (No card required)"
                : selectedAiProvider === "groq"
                  ? "Get Free Groq API Key (console.groq.com)"
                  : "Get OpenAI API Key"}
            </Text>
          </TouchableOpacity>

          {/* Test Connection Button */}
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: colors.surfaceVariant,
              borderWidth: 1,
              borderColor: colors.outlineVariant,
              marginBottom: 16,
            }}
            onPress={handleTestAi}
            disabled={isTestingAi}>
            {isTestingAi ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="flash-outline" size={16} color={colors.primary} />
            )}
            <Text
              style={{
                color: colors.primary,
                fontWeight: "600",
                fontSize: 13,
                marginLeft: 6,
              }}>
              {isTestingAi ? "Testing Connection..." : "Test API Key"}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.modalActions}>
          <TouchableOpacity
            style={styles.modalCancelBtn}
            onPress={() => setShowAiModal(false)}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSaveAiConfig}>
            <Text style={[styles.modalSaveText, { color: colors.onPrimary }]}>
              Save Key
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>);
}
