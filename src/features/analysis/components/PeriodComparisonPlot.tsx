import { styles } from "./ChartCard.styles";

import { View, Text, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { UI } from "../../../shared/constants";
export interface ChartCardProps {
  title: string;
  data: any[] | any;
  type: "pie" | "line" | "bar";
  height?: number;
  showLegend?: boolean;
  onPress?: () => void;
  onCompare?: () => void;
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  isMultiCategory?: boolean;
}
interface PeriodComparisonPlotProps {
  data: any;
  isMultiCategory: boolean;
}
export function PeriodComparisonPlot({ data, isMultiCategory }: PeriodComparisonPlotProps) {

  if (!data || !data.datasets || !isMultiCategory) return null;

  const { labels, datasets, legend } = data;
  const maxValue = Math.max(...datasets.flatMap((d: any) => d.data));

  const barColors = [UI.COLORS.PRIMARY, UI.COLORS.SUCCESS, UI.COLORS.WARNING];

  return (
    <View style={styles.comparisonMainContainer}>
      <View style={styles.comparisonGridContainer}>
        {[...Array(5)].map((_, i) => (
          <View key={i} style={styles.comparisonGridLine} />
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.comparisonScrollContent}
        style={styles.comparisonScroll}
        nestedScrollEnabled>
        {labels.map((categoryName: string, categoryIndex: number) => (
          <View key={categoryIndex} style={styles.categoryComparison}>
            <View style={styles.barsGroup}>
              {datasets.map((dataset: any, datasetIndex: number) => {
                const value = dataset.data[categoryIndex] || 0;
                const barHeight = maxValue > 0 ? (value / maxValue) * 100 : 0;

                return (
                  <View key={datasetIndex} style={styles.barWrapper}>
                    <Text style={styles.barValue}>${Math.round(value)}</Text>
                    <LinearGradient
                      colors={[
                        barColors[datasetIndex % barColors.length],
                        barColors[datasetIndex % barColors.length] + "80",
                      ]}
                      style={[
                        styles.comparisonBar,
                        { height: Math.max(barHeight, 2) },
                      ]}
                    />
                  </View>
                );
              })}
            </View>
            <Text style={styles.categoryLabelBottom} numberOfLines={2}>
              {categoryName}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

}
