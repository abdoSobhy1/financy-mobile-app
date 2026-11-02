import { View, Text, TouchableOpacity } from "react-native";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import type { Dispatch, SetStateAction } from "react";
import type { AIProvider } from "../../../infrastructure/ai/aiConfigService";

interface AiProviderPickerProps {
  selectedAiProvider: AIProvider;
  setSelectedAiProvider: Dispatch<SetStateAction<AIProvider>>;
  colors: ReturnType<typeof useAppTheme>["colors"];
}
export function AiProviderPicker({ selectedAiProvider, setSelectedAiProvider, colors }: AiProviderPickerProps) {
  return (<View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
    {[
      { id: "gemini" as const, label: "Google Gemini", tag: "Free" },
      { id: "groq" as const, label: "Groq Llama", tag: "Fast" },
      { id: "openai" as const, label: "OpenAI", tag: "" },
    ].map((p) => {
      const isSelected = selectedAiProvider === p.id;
      return (
        <TouchableOpacity
          key={p.id}
          onPress={() => setSelectedAiProvider(p.id)}
          style={{
            flex: 1,
            paddingVertical: 10,
            paddingHorizontal: 8,
            borderRadius: 12,
            backgroundColor: isSelected ? colors.primaryContainer : colors.surfaceVariant,
            borderWidth: 1.5,
            borderColor: isSelected ? colors.primary : "transparent",
            alignItems: "center",
          }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: isSelected ? "700" : "500",
              color: isSelected ? colors.onPrimaryContainer : colors.onSurfaceVariant,
            }}>
            {p.label}
          </Text>
          {p.tag ? (
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: colors.primary,
                marginTop: 2,
              }}>
              {p.tag}
            </Text>
          ) : null}
        </TouchableOpacity>
      );
    })}
  </View>);
}
