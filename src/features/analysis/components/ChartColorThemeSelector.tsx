import { getStyles } from "../screens/CreateCustomChartScreen.styles";
import type { useCreateCustomChartScreen } from "../hooks/useCreateCustomChartScreen";

import { Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

import Card from "../../../shared/ui/Card";

import type { ColorTheme } from "../store/analysisSlice";

interface ChartColorThemeSelectorProps {
  styles: ReturnType<typeof getStyles>;
  colorThemes: { theme: ColorTheme; label: string; colors: string[]; }[];
  selectedColorTheme: ReturnType<typeof useCreateCustomChartScreen>["selectedColorTheme"];
  setSelectedColorTheme: ReturnType<typeof useCreateCustomChartScreen>["setSelectedColorTheme"];
  colors: ReturnType<typeof useAppTheme>["colors"];
}
export function ChartColorThemeSelector({ styles, colorThemes, selectedColorTheme, setSelectedColorTheme, colors }: ChartColorThemeSelectorProps) {
  return ((
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>Color Theme</Text>
      <View style={styles.colorThemeGrid}>
        {colorThemes.map((theme) => (
          <TouchableOpacity
            key={theme.theme}
            style={[styles.colorThemeItem, selectedColorTheme === theme.theme && styles.selectedColorTheme]}
            onPress={() => setSelectedColorTheme(theme.theme)}>
            <View style={styles.colorPreview}>
              {theme.colors.map((color, index) => (
                <View key={index} style={[styles.colorSample, { backgroundColor: color }]} />
              ))}
            </View>
            <Text style={styles.colorThemeLabel}>{theme.label}</Text>
            {selectedColorTheme === theme.theme && (
              <View style={styles.colorThemeCheck}>
                <Ionicons name="checkmark" size={16} color={colors.onBackground} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  ));
}
