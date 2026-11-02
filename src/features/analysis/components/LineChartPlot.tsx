import { width, makeChartConfig } from "./chartTokens";
import { styles } from "./ChartCard.styles";

import { View } from "react-native";

import { LineChart } from "react-native-chart-kit";
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
interface LineChartPlotProps {
  data: any;
  isMultiCategory: boolean;
}
export function LineChartPlot({ data, isMultiCategory }: LineChartPlotProps) {

  if (!data) return null;

  let chartData;

  if (isMultiCategory && data.labels && data.datasets) {
    chartData = {
      labels: data.labels.map((label: string) => {
        const dayMatch = label.match(/\d+/);
        if (dayMatch) return dayMatch[0];
        return label.length > 4 ? label.substring(0, 4) + "..." : label;
      }),
      datasets: data.datasets.map((dataset: any, index: number) => ({
        data: dataset.data,
        color:
          dataset.color ||
          ((opacity = 1) =>
            [
              UI.COLORS.PRIMARY,
              UI.COLORS.SUCCESS,
              UI.COLORS.WARNING,
              UI.COLORS.ERROR,
              UI.COLORS.ACCENT,
              "#8B5CF6",
              "#10B981",
              "#06B6D4",
            ][index % 8]),
        strokeWidth: dataset.strokeWidth || 2,
      })),
    };
  } else if (Array.isArray(data) && data.length > 0) {
    chartData = {
      labels: data.map((item) => {
        const label =
          item.month || item.name || item.label || item.category?.name || "";
        if (label.match(/^\d{1,2}$/)) return label;
        if (label.match(/^[A-Za-z]{3}\s\d{4}$/)) return label.split(" ")[0];
        if (label.match(/^\d{1,2}\/\d{1,2}$/)) return label;
        return label.length > 6 ? label.substring(0, 6) + "..." : label;
      }),
      datasets: [
        {
          data: data.map((item) =>
            Math.abs(item.balance || item.value || item.amount || 0),
          ),
          color: (opacity = 1) => UI.COLORS.PRIMARY,
          strokeWidth: 2,
        },
      ],
    };
  } else {
    return null;
  }

  return (
    <View style={styles.lineContainer}>
      <LineChart
        data={chartData}
        width={width - 56}
        height={220}
        chartConfig={makeChartConfig({
          propsForDots: {
            r: "3",
            strokeWidth: "1",
            stroke: UI.COLORS.PRIMARY,
          },
        })}
        bezier
        fromZero
        style={{ marginVertical: 8, borderRadius: 16 }}
      />
    </View>
  );

}
