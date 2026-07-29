import React from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PieChart, LineChart, BarChart } from "react-native-chart-kit";
import { UI } from "../../constants";

const { width } = Dimensions.get("window");

/* ─── glass / gradient tokens ─── */
const GLASS = {
  bg: "rgba(255,255,255,0.04)",
  border: "rgba(108,92,231,0.18)",
  borderLight: "rgba(108,92,231,0.10)",
  grid: "rgba(108,92,231,0.10)",
  labelColor: "rgba(255,255,255,0.6)",
};

/* ─── shared transparent chart config ─── */
const makeChartConfig = (overrides: Record<string, any> = {}) => ({
  backgroundColor: "transparent",
  backgroundGradientFrom: "transparent",
  backgroundGradientTo: "transparent",
  backgroundGradientFromOpacity: 0,
  backgroundGradientToOpacity: 0,
  decimalPlaces: 0,
  color: (opacity = 1) => UI.COLORS.PRIMARY,
  labelColor: () => GLASS.labelColor,
  style: { borderRadius: 16 },
  propsForBackgroundLines: {
    strokeOpacity: 0.08,
    stroke: GLASS.grid,
  },
  propsForLabels: {
    fontSize: 11,
    fontFamily: "System",
  },
  withHorizontalLines: true,
  withVerticalLines: false,
  ...overrides,
});

/* ════════════════════════════════════════════
   ChartCard
   ════════════════════════════════════════════ */

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

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  data,
  type,
  height = 220,
  showLegend = true,
  onPress,
  onCompare,
  loading = false,
  error,
  emptyMessage = "No data available",
  isMultiCategory = false,
}) => {
  /* ──── pie ──── */
  const renderPieChart = () => {
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
  };

  /* ──── line ──── */
  const renderLineChart = () => {
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
  };

  /* ──── period comparison (custom bar groups) ──── */
  const renderPeriodComparison = () => {
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
  };

  /* ──── bar ──── */
  const renderBarChart = () => {
    if (!data) return null;

    if (isMultiCategory && data.labels && data.datasets && data.legend) {
      return renderPeriodComparison();
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
  };

  /* ──── render switch ──── */
  const renderChart = () => {
    if (loading) {
      return (
        <View style={[styles.centerContainer, { height }]}>
          <Ionicons name="reload" size={24} color="rgba(255,255,255,0.3)" />
          <Text style={styles.centerText}>Loading...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={[styles.centerContainer, { height }]}>
          <Ionicons name="warning" size={24} color={UI.COLORS.ERROR} />
          <Text style={[styles.centerText, { color: UI.COLORS.ERROR }]}>
            {error}
          </Text>
        </View>
      );
    }

    if (!data || data.length === 0) {
      return (
        <View style={[styles.centerContainer, { height }]}>
          <Ionicons
            name="bar-chart-outline"
            size={24}
            color="rgba(255,255,255,0.2)"
          />
          <Text style={styles.centerText}>{emptyMessage}</Text>
        </View>
      );
    }

    switch (type) {
      case "pie":
        return renderPieChart();
      case "line":
        return renderLineChart();
      case "bar":
        return renderBarChart();
      default:
        return (
          <View style={[styles.centerContainer, { height }]}>
            <Text style={styles.centerText}>Chart type not supported</Text>
          </View>
        );
    }
  };

  /* ──── legend ──── */
  const renderLegend = () => {
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
  };

  /* ──── card shell ──── */
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      style={styles.card}>
      <View style={styles.cardContent}>
        {/* header */}
        {title ? (
          <View style={styles.header}>
            <Text style={styles.titleText}>{title}</Text>
            <View style={styles.headerActions}>
              {onCompare && (
                <TouchableOpacity
                  onPress={onCompare}
                  style={styles.compareButton}>
                  <Ionicons
                    name="bar-chart"
                    size={16}
                    color={UI.COLORS.PRIMARY}
                  />
                </TouchableOpacity>
              )}
              {onPress && (
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="rgba(255,255,255,0.25)"
                />
              )}
            </View>
          </View>
        ) : null}

        {/* chart */}
        <View style={styles.chartContainer}>{renderChart()}</View>

        {/* legend */}
        {showLegend && renderLegend()}
      </View>
    </TouchableOpacity>
  );
};

/* ════════════════════════════════════════════
   Section wrappers
   ════════════════════════════════════════════ */

export interface PieChartSectionProps {
  title: string;
  data: { name: string; amount: number; color: string }[];
  onPress?: () => void;
  onCompare?: () => void;
}

export const PieChartSection: React.FC<PieChartSectionProps> = ({
  title,
  data,
  onPress,
  onCompare,
}) => (
  <ChartCard
    title={title}
    data={data}
    type="pie"
    onPress={onPress}
    onCompare={onCompare}
    emptyMessage="No spending data available"
  />
);

export interface LineChartSectionProps {
  title: string;
  data: any[] | any;
  onPress?: () => void;
  onCompare?: () => void;
  comparisonData?: any[];
  comparisonMode?: "monthly" | "category";
  isMultiCategory?: boolean;
}

export const LineChartSection: React.FC<LineChartSectionProps> = ({
  title,
  data,
  onPress,
  onCompare,
  comparisonData,
  comparisonMode = "monthly",
  isMultiCategory = false,
}) => {
  const chartData =
    comparisonMode === "category" && comparisonData ? comparisonData : data;

  return (
    <ChartCard
      title={title}
      data={chartData}
      type="line"
      onPress={onPress}
      onCompare={onCompare}
      emptyMessage="No trend data available"
      isMultiCategory={isMultiCategory}
    />
  );
};

export interface BarChartSectionProps {
  title: string;
  data: any[] | any;
  onPress?: () => void;
  onCompare?: () => void;
  comparisonData?: any[];
  comparisonMode?: "budget" | "category";
  isMultiCategory?: boolean;
}

export const BarChartSection: React.FC<BarChartSectionProps> = ({
  title,
  data,
  onPress,
  onCompare,
  comparisonData,
  comparisonMode = "budget",
  isMultiCategory = false,
}) => {
  const chartData =
    comparisonMode === "category" && comparisonData ? comparisonData : data;

  return (
    <ChartCard
      title={title}
      data={chartData}
      type="bar"
      onPress={onPress}
      onCompare={onCompare}
      emptyMessage="No data available"
      isMultiCategory={isMultiCategory}
    />
  );
};

/* ════════════════════════════════════════════
   CustomChartCard
   ════════════════════════════════════════════ */

export interface CustomChartCardProps {
  chart: {
    id: string;
    title: string;
    chartType: "pie" | "line" | "bar";
    dataSource: string;
    filters: any;
    colorTheme: string;
  };
  data: any[];
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

export const CustomChartCard: React.FC<CustomChartCardProps> = ({
  chart,
  data,
  onPress,
  onEdit,
  onDelete,
  onDuplicate,
}) => (
  <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.card}>
    <View style={styles.cardContent}>
      {/* header */}
      <View style={styles.customHeader}>
        <View style={styles.chartInfo}>
          <Text style={styles.titleText}>{chart.title}</Text>
          <Text style={styles.chartMeta}>
            {chart.chartType} • {chart.dataSource}
          </Text>
        </View>
        <View style={styles.customActions}>
          {onDuplicate && (
            <TouchableOpacity style={styles.actionBtn} onPress={onDuplicate}>
              <Ionicons name="copy" size={14} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
          {onEdit && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={onEdit}>
              <Ionicons name="pencil" size={14} color="#fff" />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              onPress={onDelete}>
              <Ionicons name="trash" size={14} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* embedded chart */}
      <View style={styles.chartContainer}>
        <ChartCard
          title=""
          data={data}
          type={chart.chartType}
          showLegend={false}
          height={180}
          emptyMessage="No data for this chart"
        />
      </View>
    </View>
  </TouchableOpacity>
);

/* ════════════════════════════════════════════
   Styles
   ════════════════════════════════════════════ */

const styles = StyleSheet.create({
  /* ── card shell ── */
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: GLASS.bg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GLASS.border,
    overflow: "hidden",
  },
  cardContent: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },

  /* ── header ── */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  titleText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  compareButton: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: "rgba(108,92,231,0.15)",
  },

  /* ── chart area ── */
  chartContainer: {
    alignItems: "center",
  },
  pieContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  lineContainer: {
    width: "100%",
    alignItems: "center",
  },
  barContainer: {
    width: "100%",
    alignItems: "center",
  },

  /* ── center states ── */
  centerContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  centerText: {
    textAlign: "center",
    fontSize: 13,
    color: "rgba(255,255,255,0.3)",
  },

  /* ── legend ── */
  legendContainer: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 100,
    marginBottom: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendName: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    fontFamily: "System",
    lineHeight: 16,
    marginBottom: 1,
  },
  legendAmount: {
    fontSize: 11,
    fontWeight: "400",
    color: "rgba(255,255,255,0.45)",
    fontFamily: "System",
    lineHeight: 14,
  },
  moreText: {
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 4,
    color: "rgba(255,255,255,0.3)",
    width: "100%",
  },

  /* ── custom chart card ── */
  customHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  chartInfo: {
    flex: 1,
  },
  chartMeta: {
    fontSize: 11,
    color: "rgba(108,92,231,0.6)",
    marginTop: 2,
    textTransform: "capitalize",
  },
  customActions: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    padding: 7,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  actionBtnPrimary: {
    backgroundColor: "rgba(108,92,231,0.3)",
  },
  actionBtnDanger: {
    backgroundColor: "rgba(255,107,107,0.25)",
  },

  /* ── period comparison bars ── */
  comparisonMainContainer: {
    position: "relative",
    paddingVertical: 16,
    height: 200,
  },
  comparisonGridContainer: {
    position: "absolute",
    top: 16,
    left: 0,
    right: 0,
    height: 120,
    justifyContent: "space-between",
  },
  comparisonGridLine: {
    height: 1,
    backgroundColor: GLASS.grid,
    marginHorizontal: 16,
  },
  comparisonScroll: {
    flex: 1,
    zIndex: 1,
  },
  comparisonScrollContent: {
    paddingHorizontal: 16,
    gap: 24,
    flexDirection: "row",
    minWidth: 400,
  },
  categoryComparison: {
    alignItems: "center",
    minWidth: 80,
    maxWidth: 100,
  },
  categoryLabelBottom: {
    fontSize: 10,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    marginTop: 8,
    minWidth: 80,
    lineHeight: 13,
  },
  barsGroup: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 120,
    gap: 3,
    justifyContent: "center",
  },
  barWrapper: {
    alignItems: "center",
    width: 22,
  },
  barValue: {
    fontSize: 8,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    marginBottom: 2,
    height: 10,
  },
  comparisonBar: {
    width: 18,
    borderRadius: 4,
    minHeight: 2,
  },
});
