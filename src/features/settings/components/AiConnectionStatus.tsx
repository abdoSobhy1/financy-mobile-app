import { View, Text, TouchableOpacity } from "react-native";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import type { AIProvider } from "../../../infrastructure/ai/aiConfigService";
interface AiConnectionStatusProps {
  isOwner: boolean;
  aiStatus: { provider: AIProvider; hasCustomKey: boolean; hasHostedKey: boolean; activeModel: string; isFallbackModel?: boolean | undefined; availableGeminiModelsCount?: number | undefined; totalGeminiModelsCount?: number | undefined; rateLimitedModels?: string[] | undefined; };
  colors: ReturnType<typeof useAppTheme>["colors"];
  selectedAiProvider: AIProvider;
  handleResetGeminiQuota: () => Promise<void>;
}
export function AiConnectionStatus({ isOwner, aiStatus, colors, selectedAiProvider, handleResetGeminiQuota }: AiConnectionStatusProps) {
  return (<>{!isOwner ? (
    aiStatus.hasHostedKey || aiStatus.hasCustomKey ? (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.primaryContainer,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 10,
          marginBottom: 12,
        }}>
        <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={{ marginRight: 8 }} />
        <Text style={{ fontSize: 13, color: colors.onPrimaryContainer, flex: 1, fontWeight: "500" }}>
          {aiStatus.hasCustomKey ? "Your AI provider key is saved on this device." : "Hosted Gemini keeps the app key on a secure server; sign in to use it."}
        </Text>
      </View>
    ) : (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surfaceVariant,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 10,
          marginBottom: 12,
        }}>
        <Ionicons name="information-circle-outline" size={16} color={colors.onSurfaceVariant} style={{ marginRight: 8 }} />
        <Text style={{ fontSize: 13, color: colors.onSurfaceVariant, flex: 1 }}>
          Hosted Gemini is not configured. Enter your own provider key or deploy the server gateway.
        </Text>
      </View>
    )
  ) : selectedAiProvider === "gemini" && aiStatus.rateLimitedModels && aiStatus.rateLimitedModels.length > 0 ? (
    <View
      style={{
        backgroundColor: colors.errorContainer,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginBottom: 12,
      }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
        <Ionicons name="warning-outline" size={16} color={colors.error} style={{ marginRight: 6 }} />
        <Text style={{ fontSize: 12, color: colors.onErrorContainer, fontWeight: "700" }}>
          Daily Quota Reached Today (Owner View)
        </Text>
      </View>
      <Text style={{ fontSize: 11, color: colors.onErrorContainer, lineHeight: 16 }}>
        Exceeded: {aiStatus.rateLimitedModels.join(", ")}
        {"\n"}Auto-routed to next available model:{" "}
        <Text style={{ fontWeight: "700" }}>{aiStatus.activeModel}</Text>
      </Text>
      <TouchableOpacity
        onPress={handleResetGeminiQuota}
        style={{
          marginTop: 8,
          alignSelf: "flex-start",
          backgroundColor: colors.error,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 6,
        }}>
        <Text style={{ fontSize: 11, color: "#fff", fontWeight: "600" }}>Reset Flags Today</Text>
      </TouchableOpacity>
    </View>
  ) : aiStatus.hasHostedKey && !aiStatus.hasCustomKey ? (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.primaryContainer,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginBottom: 10,
      }}>
      <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={{ marginRight: 6 }} />
      <Text style={{ fontSize: 12, color: colors.onPrimaryContainer, flex: 1, fontWeight: "500" }}>
        Hosted Gemini uses a server-side secret. Sign in and test the connection to confirm availability.
      </Text>
    </View>
  ) : aiStatus.hasCustomKey ? (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.secondaryContainer,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginBottom: 10,
      }}>
      <Ionicons name="key" size={16} color={colors.secondary} style={{ marginRight: 6 }} />
      <Text style={{ fontSize: 12, color: colors.onSecondaryContainer, flex: 1, fontWeight: "500" }}>
        Active: Custom key saved ({aiStatus.activeModel} • auto-fallback enabled).
      </Text>
    </View>
  ) : (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surfaceVariant,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginBottom: 10,
      }}>
      <Ionicons name="information-circle-outline" size={16} color={colors.onSurfaceVariant} style={{ marginRight: 6 }} />
      <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, flex: 1 }}>
        Hosted Gemini requires a signed-in account. You can also save your own provider key securely on this device.
      </Text>
    </View>
  )}</>);
}
