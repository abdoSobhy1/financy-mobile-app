import { styles } from "./ChartCard.styles";

import { View, Text } from "react-native";

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
interface ChartLegendProps {
  data: any;
  type: "pie" | "line" | "bar";
  isMultiCategory: boolean;
}
export function ChartLegend({ data, type, isMultiCategory }: ChartLegendProps) {

  if (!data) return null;

  if (type === "pie" && Array.isArray(data) && data.length > 0) {
    return (
      <View style={styles.legendContainer}>
        {data.slice(0, 6).map((item: any, index: number) => {
          const amount = Math.abs(item.amount || 0);
          return (
            <View key={index} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: item.color || UI.COLORS.PRIMARY },
                ]}
              />
              <View style={styles.legendTextContainer}>
                <Text
                  style={styles.legendName}
                  numberOfLines={1}
                  allowFontScaling={false}>
                  {item.name || `Item ${index + 1}`}
                </Text>
                <Text style={styles.legendAmount}>
                  ${amount.toFixed(0)}
                  {item.percentage ? ` (${item.percentage.toFixed(1)}%)` : ""}
                </Text>
              </View>
            </View>
          );
        })}
        {data.length > 6 && (
          <Text style={styles.moreText}>
            +{data.length - 6} more categories
          </Text>
        )}
      </View>
    );
  }

  // Multi-category legend
  if (
    (type === "line" || type === "bar") &&
    isMultiCategory &&
    data.legend &&
    Array.isArray(data.legend)
  ) {
    const defaultColors = [
      UI.COLORS.PRIMARY,
      UI.COLORS.SUCCESS,
      UI.COLORS.WARNING,
      UI.COLORS.ERROR,
      UI.COLORS.ACCENT,
      "#8B5CF6",
      "#10B981",
      "#06B6D4",
    ];

    return (
      <View style={styles.legendContainer}>
        {data.legend.map((categoryName: string, index: number) => {
          const datasetColor = data.datasets?.[index]?.color
            ? typeof data.datasets[index].color === "function"
              ? data.datasets[index].color()
              : data.datasets[index].color
            : defaultColors[index % defaultColors.length];

          return (
            <View key={index} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: datasetColor }]}
              />
              <View style={styles.legendTextContainer}>
                <Text
                  style={styles.legendName}
                  numberOfLines={1}
                  allowFontScaling={false}>
                  {categoryName}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  return null;

}
