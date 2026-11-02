import { View, Text, TouchableOpacity } from "react-native";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import type { Dispatch, SetStateAction } from "react";
import type { AIProvider } from "../../../infrastructure/ai/aiConfigService";
import type { GeminiDailyUsage } from "../../../infrastructure/ai/geminiQuotaService";
import { Ionicons } from "@expo/vector-icons";
interface GeminiQuotaPanelProps {
  isOwner: boolean;
  selectedAiProvider: AIProvider;
  colors: ReturnType<typeof useAppTheme>["colors"];
  setShowModelChain: Dispatch<SetStateAction<boolean>>;
  showModelChain: boolean;
  aiStatus: { provider: AIProvider; hasCustomKey: boolean; hasHostedKey: boolean; activeModel: string; isFallbackModel?: boolean | undefined; availableGeminiModelsCount?: number | undefined; totalGeminiModelsCount?: number | undefined; rateLimitedModels?: string[] | undefined; };
  geminiUsage: GeminiDailyUsage | null;
  geminiFallbackModels: readonly string[];
  geminiModelMetadata: Record<string, { name: string; label: string; rpm: number; rpd: number; tpm: string; isGenerous: boolean }>;
  handleResetGeminiQuota: () => Promise<void>;
}
export function GeminiQuotaPanel({ isOwner, selectedAiProvider, colors, setShowModelChain, showModelChain, aiStatus, geminiUsage, geminiFallbackModels, geminiModelMetadata, handleResetGeminiQuota }: GeminiQuotaPanelProps) {
  return (<>{isOwner && selectedAiProvider === "gemini" && (
    <View
      style={{
        backgroundColor: colors.surfaceVariant,
        borderRadius: 12,
        padding: 10,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
      }}>
      <TouchableOpacity
        onPress={() => setShowModelChain(!showModelChain)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="git-network-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.onSurface }}>
            Multi-Model Fallback Chain ({aiStatus.availableGeminiModelsCount ?? 7}/7) [Owner]
          </Text>
        </View>
        <Ionicons
          name={showModelChain ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.onSurfaceVariant}
        />
      </TouchableOpacity>

      <Text style={{ fontSize: 11, color: colors.onSurfaceVariant, marginTop: 4 }}>
        Auto-routes across active models from AI Studio if rate-limited (HTTP 429).
      </Text>

      {showModelChain && (
        <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: 6 }}>
          {geminiFallbackModels.map((modelName, index) => {
            const meta = geminiModelMetadata[modelName];
            const isLimited = Boolean(geminiUsage?.models?.[modelName]?.isRateLimited);
            const isActive = modelName === aiStatus.activeModel;
            const count = geminiUsage?.models?.[modelName]?.requestCount || 0;

            return (
              <View
                key={modelName}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 4,
                }}>
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1, flexWrap: "wrap" }}>
                  <Text style={{ fontSize: 11, color: colors.onSurfaceVariant, width: 18 }}>
                    {index + 1}.
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: isActive ? "700" : "500",
                      color: isLimited ? colors.error : colors.onSurface,
                    }}>
                    {meta?.label || modelName}
                  </Text>
                  <View
                    style={{
                      marginLeft: 6,
                      paddingHorizontal: 4,
                      paddingVertical: 1,
                      borderRadius: 4,
                      backgroundColor: meta?.isGenerous ? colors.primaryContainer : colors.surface,
                    }}>
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: "700",
                        color: meta?.isGenerous ? colors.primary : colors.onSurfaceVariant,
                      }}>
                      {meta?.rpd} RPD
                    </Text>
                  </View>
                  {count > 0 ? (
                    <Text style={{ fontSize: 10, color: colors.onSurfaceVariant, marginLeft: 4 }}>
                      ({count} used)
                    </Text>
                  ) : null}
                </View>
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 6,
                    backgroundColor: isLimited
                      ? colors.errorContainer
                      : isActive
                        ? colors.primaryContainer
                        : "transparent",
                  }}>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "600",
                      color: isLimited
                        ? colors.onErrorContainer
                        : isActive
                          ? colors.onPrimaryContainer
                          : colors.onSurfaceVariant,
                    }}>
                    {isLimited ? "Limited Today" : isActive ? "Active" : "Standby"}
                  </Text>
                </View>
              </View>
            );
          })}
          <Text style={{ fontSize: 10, color: colors.onSurfaceVariant, marginTop: 6, fontStyle: "italic" }}>
            Usage & rate-limit flags are stored per-day in AsyncStorage and automatically reset on the next day.
          </Text>
          {aiStatus.rateLimitedModels && aiStatus.rateLimitedModels.length > 0 ? (
            <TouchableOpacity
              onPress={handleResetGeminiQuota}
              style={{
                marginTop: 8,
                alignSelf: "flex-start",
                backgroundColor: colors.surfaceVariant,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: colors.outlineVariant,
              }}>
              <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "600" }}>
                Reset All Flags Today
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  )}</>);
}
