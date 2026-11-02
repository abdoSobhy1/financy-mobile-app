import { width, GLASS, makeChartConfig } from "./chartTokens";
import { styles } from "./ChartCard.styles";

import { View } from "react-native";

import { PieChart } from "react-native-chart-kit";

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
interface PieChartPlotProps {
  data: any;
}
export function PieChartPlot({ data }: PieChartPlotProps) {

  if (!data || data.length === 0) return null;

  const chartData = data.slice(0, 6).map((item: any, index: number) => {
    let name =
      item.name || item.label || item.category?.name || `Item ${index + 1}`;
    if (typeof name === "string" && name.length > 15)
      name = name.substring(0, 15) + "...";

    return {
      name: String(name),
      population: Math.abs(item.amount || 0),
      color: item.color || `hsl(${index * 60}, 70%, 60%)`,
      legendFontColor: GLASS.labelColor,
      legendFontSize: 12,
    };
  });

  return (
    <View style={styles.pieContainer}>
      <PieChart
        data={chartData}
        width={150}
        height={180}
        chartConfig={makeChartConfig()}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        center={[22, 0]}
        hasLegend={false}
        absolute={false}
      />
    </View>
  );

}
