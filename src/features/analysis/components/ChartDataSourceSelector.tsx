import { getStyles } from "../screens/CreateCustomChartScreen.styles";
import type { useCreateCustomChartScreen } from "../hooks/useCreateCustomChartScreen";

import { Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

import Card from "../../../shared/ui/Card";

import type { DataSource } from "../store/analysisSlice";

interface ChartDataSourceSelectorProps {
  styles: ReturnType<typeof getStyles>;
  dataSources: { source: DataSource; label: string; description: string; }[];
  selectedDataSource: ReturnType<typeof useCreateCustomChartScreen>["selectedDataSource"];
  setSelectedDataSource: ReturnType<typeof useCreateCustomChartScreen>["setSelectedDataSource"];
  colors: ReturnType<typeof useAppTheme>["colors"];
}
export function ChartDataSourceSelector({ styles, dataSources, selectedDataSource, setSelectedDataSource, colors }: ChartDataSourceSelectorProps) {
  return ((
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>Data Source</Text>
      <View style={styles.optionsList}>
        {dataSources.map((dataSource) => (
          <TouchableOpacity
            key={dataSource.source}
            style={[styles.optionItem, selectedDataSource === dataSource.source && styles.selectedOption]}
            onPress={() => setSelectedDataSource(dataSource.source)}>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, selectedDataSource === dataSource.source && styles.selectedOptionText]}>{dataSource.label}</Text>
              <Text style={styles.optionDescription}>{dataSource.description}</Text>
            </View>
            {selectedDataSource === dataSource.source && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  ));
}
