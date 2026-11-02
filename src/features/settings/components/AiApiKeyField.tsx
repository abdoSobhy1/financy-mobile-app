import { View, TouchableOpacity, TextInput } from "react-native";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import type { Dispatch, SetStateAction } from "react";
import type { AIProvider } from "../../../infrastructure/ai/aiConfigService";
interface AiApiKeyFieldProps {
  colors: ReturnType<typeof useAppTheme>["colors"];
  aiKeyInput: string;
  setAiKeyInput: Dispatch<SetStateAction<string>>;
  selectedAiProvider: AIProvider;
  showAiKeySecret: boolean;
  setShowAiKeySecret: Dispatch<SetStateAction<boolean>>;
}
export function AiApiKeyField({ colors, aiKeyInput, setAiKeyInput, selectedAiProvider, showAiKeySecret, setShowAiKeySecret }: AiApiKeyFieldProps) {
  return (<View
    style={{
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surfaceVariant,
      borderRadius: 12,
      paddingHorizontal: 12,
      marginBottom: 10,
    }}>
    <TextInput
      style={{
        flex: 1,
        paddingVertical: 12,
        color: colors.onSurface,
        fontSize: 14,
      }}
      value={aiKeyInput}
      onChangeText={setAiKeyInput}
      placeholder={
        selectedAiProvider === "gemini"
          ? "AIzaSy..."
          : selectedAiProvider === "groq"
            ? "gsk_..."
            : "sk-..."
      }
      placeholderTextColor={colors.onSurfaceVariant}
      secureTextEntry={!showAiKeySecret}
      autoCapitalize="none"
      autoCorrect={false}
    />
    <TouchableOpacity
      onPress={() => setShowAiKeySecret(!showAiKeySecret)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons
        name={showAiKeySecret ? "eye-off-outline" : "eye-outline"}
        size={20}
        color={colors.onSurfaceVariant}
      />
    </TouchableOpacity>
  </View>);
}
