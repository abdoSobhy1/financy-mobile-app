import { getStyles } from "../screens/CreateCustomChartScreen.styles";
import type { useCreateCustomChartScreen } from "../hooks/useCreateCustomChartScreen";

import { Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

import Card from "../../../shared/ui/Card";

import type { ChartType } from "../store/analysisSlice";

interface ChartTypeSelectorProps {
  styles: ReturnType<typeof getStyles>;
  chartTypes: { type: ChartType; label: string; icon: string; description: string; }[];
  selectedChartType: ReturnType<typeof useCreateCustomChartScreen>["selectedChartType"];
  setSelectedChartType: ReturnType<typeof useCreateCustomChartScreen>["setSelectedChartType"];
  colors: ReturnType<typeof useAppTheme>["colors"];
}
export function ChartTypeSelector({ styles, chartTypes, selectedChartType, setSelectedChartType, colors }: ChartTypeSelectorProps) {
  return ((
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>Chart Type</Text>
      <View style={styles.optionsList}>
        {chartTypes.map((chartType) => (
          <TouchableOpacity
            key={chartType.type}
            style={[styles.optionItem, selectedChartType === chartType.type && styles.selectedOption]}
            onPress={() => setSelectedChartType(chartType.type)}>
            <View style={styles.optionContent}>
              <View style={styles.optionHeader}>
                <Ionicons
                  name={chartType.icon as any}
                  size={24}
                  color={selectedChartType === chartType.type ? colors.primary : colors.onSurfaceVariant}
                />
                <Text style={[styles.optionTitle, selectedChartType === chartType.type && styles.selectedOptionText]}>{chartType.label}</Text>
              </View>
              <Text style={styles.optionDescription}>{chartType.description}</Text>
            </View>
            {selectedChartType === chartType.type && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  ));
}
