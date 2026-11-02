import { PeriodComparisonPlot } from "./PeriodComparisonPlot";
import { width, makeChartConfig } from "./chartTokens";
import { styles } from "./ChartCard.styles";

import { View } from "react-native";

import { BarChart } from "react-native-chart-kit";

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
interface BarChartPlotProps {
  data: any;
  isMultiCategory: boolean;
}
export function BarChartPlot({ data, isMultiCategory }: BarChartPlotProps) {

  if (!data) return null;

  if (isMultiCategory && data.labels && data.datasets && data.legend) {
    return <PeriodComparisonPlot data={data} isMultiCategory={isMultiCategory} />;
  }

  let chartData;
  if (Array.isArray(data) && data.length > 0) {
    chartData = {
      labels: data.slice(0, 8).map((item) => {
        const label =
          item.month || item.name || item.label || item.category?.name || "";
        return label.length > 8 ? label.substring(0, 8) + "..." : label;
      }),
      datasets: [
        {
          data: data
            .slice(0, 8)
            .map((item) =>
              Math.abs(item.balance || item.value || item.amount || 0),
            ),
        },
      ],
    };
  } else {
    return null;
  }

  return (
    <View style={styles.barContainer}>
      <BarChart
        data={chartData}
        width={width - 56}
        height={220}
        chartConfig={makeChartConfig({ fromZero: true })}
        verticalLabelRotation={30}
        fromZero
        showBarTops={false}
        yAxisLabel=""
        yAxisSuffix=""
        style={{ marginVertical: 8, borderRadius: 16 }}
      />
    </View>
  );

}
