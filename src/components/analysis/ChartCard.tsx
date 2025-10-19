import React from "react";
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PieChart, LineChart, BarChart } from "react-native-chart-kit";
import Card from "../ui/Card";
import { UI } from "../../constants";

const { width } = Dimensions.get("window");

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
  // Pie chart using react-native-chart-kit with improved Arabic support
  const renderPieChart = () => {
    if (!data || data.length === 0) return null;

    // Process data with absolute values and proper text handling
    const chartData = data.slice(0, 6).map((item, index) => {
      let name = item.name || item.label || item.category?.name || `Item ${index + 1}`;
      // Ensure name is properly formatted for display
      if (typeof name === "string" && name.length > 15) {
        name = name.substring(0, 15) + "...";
      }
      const amount = Math.abs(item.amount || 0); // Always use absolute values

      return {
        name: String(name), // Ensure it's a string
        population: amount,
        color: item.color || `hsl(${index * 60}, 70%, 60%)`,
        legendFontColor: UI.COLORS.TEXT_PRIMARY,
        legendFontSize: 12, // Good size for Arabic text
      };
    });

    const chartConfig = {
      backgroundColor: UI.COLORS.BACKGROUND,
      backgroundGradientFrom: UI.COLORS.BACKGROUND,
      backgroundGradientTo: UI.COLORS.BACKGROUND,
      decimalPlaces: 0,
      color: (opacity = 1) => UI.COLORS.TEXT_PRIMARY,
      labelColor: (opacity = 1) => UI.COLORS.TEXT_PRIMARY,
      // Better text rendering for RTL languages
      propsForLabels: {
        fontSize: 12,
        fontWeight: "400" as const,
        fontFamily: "System" as const, // Use system font for better Arabic support
      },
    };

    return (
      <View style={styles.pieContainer}>
        <PieChart
          data={chartData}
          width={150}
          height={180}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[22, 0]}
          hasLegend={false} // Disable built-in legend to use custom one
          absolute={false}
        />
      </View>
    );
  };

  // Line chart using react-native-chart-kit
  const renderLineChart = () => {
    if (!data) return null;

    let chartData;

    if (isMultiCategory && data.labels && data.datasets) {
      // Multi-category data with proper structure
      chartData = {
        labels: data.labels.map((label: string) => {
          // If it's a date or day, extract day number only
          const dayMatch = label.match(/\d+/);
          if (dayMatch) {
            return dayMatch[0]; // Return just the day number
          }
          // Otherwise, truncate as before
          return label.length > 4 ? label.substring(0, 4) + "..." : label;
        }),
        datasets: data.datasets.map((dataset: any, index: number) => ({
          data: dataset.data,
          color:
            dataset.color ||
            ((opacity = 1) =>
              [UI.COLORS.PRIMARY, UI.COLORS.SUCCESS, UI.COLORS.WARNING, UI.COLORS.ERROR, UI.COLORS.ACCENT, "#8B5CF6", "#10B981", "#06B6D4"][
                index % 8
              ]),
          strokeWidth: dataset.strokeWidth || 2,
        })),
      };
    } else if (Array.isArray(data) && data.length > 0) {
      // Single line data (monthly trends)
      chartData = {
        labels: data.map((item) => {
          const label = item.month || item.name || item.label || item.category?.name || "";
          // If it looks like a day number only (for daily charts), keep as is
          if (label.match(/^\d{1,2}$/)) {
            return label;
          }
          // If it's a month/year format like "Oct 2025", keep the month part
          if (label.match(/^[A-Za-z]{3}\s\d{4}$/)) {
            return label.split(" ")[0]; // Return just "Oct"
          }
          // If it's MM/DD format, keep as is
          if (label.match(/^\d{1,2}\/\d{1,2}$/)) {
            return label;
          }
          // Otherwise, truncate as before
          return label.length > 6 ? label.substring(0, 6) + "..." : label;
        }),
        datasets: [
          {
            data: data.map((item) => Math.abs(item.balance || item.value || item.amount || 0)), // Use absolute values
            color: (opacity = 1) => UI.COLORS.PRIMARY,
            strokeWidth: 2,
          },
        ],
      };
    } else {
      return null;
    }

    const chartConfig = {
      backgroundColor: UI.COLORS.BACKGROUND,
      backgroundGradientFrom: UI.COLORS.BACKGROUND,
      backgroundGradientTo: UI.COLORS.BACKGROUND,
      decimalPlaces: 0,
      color: (opacity = 1) => UI.COLORS.PRIMARY,
      labelColor: (opacity = 1) => UI.COLORS.TEXT_PRIMARY,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: "3",
        strokeWidth: "1",
        stroke: UI.COLORS.PRIMARY,
      },
      propsForBackgroundLines: {
        strokeOpacity: 0.1, // Subtle grid lines
        stroke: UI.COLORS.TEXT_MUTED,
      },
      withHorizontalLines: true,
      withVerticalLines: false,
    };

    return (
      <View style={styles.lineContainer}>
        <LineChart
          data={chartData}
          width={width - 40}
          height={220}
          chartConfig={chartConfig}
          bezier
          fromZero={true}
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
        />
      </View>
    );
  };

  // Custom period comparison renderer
  const renderPeriodComparison = () => {
    if (!data || !data.datasets || !isMultiCategory) return null;

    const { labels, datasets, legend } = data;
    const maxValue = Math.max(...datasets.flatMap((d) => d.data));

    return (
      <View style={styles.comparisonMainContainer}>
        {/* Grid background */}
        <View style={styles.comparisonGridContainer}>
          {[...Array(5)].map((_, i) => (
            <View key={i} style={styles.comparisonGridLine} />
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.comparisonScrollContent}
          style={styles.comparisonScroll}
          nestedScrollEnabled={true}>
          {labels.map((categoryName: string, categoryIndex: number) => (
            <View key={categoryIndex} style={styles.categoryComparison}>
              <View style={styles.barsGroup}>
                {datasets.map((dataset, datasetIndex) => {
                  const value = dataset.data[categoryIndex] || 0;
                  const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                  const colors = [UI.COLORS.PRIMARY, UI.COLORS.SUCCESS, UI.COLORS.WARNING];

                  return (
                    <View key={datasetIndex} style={styles.barWrapper}>
                      <Text style={styles.barValue}>${Math.round(value)}</Text>
                      <View
                        style={[
                          styles.comparisonBar,
                          {
                            height: Math.max(height, 2),
                            backgroundColor: colors[datasetIndex % colors.length],
                          },
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

  // Bar chart renderer using react-native-chart-kit
  const renderBarChart = () => {
    if (!data) return null;

    // If it's a multi-category period comparison, use custom renderer
    if (isMultiCategory && data.labels && data.datasets && data.legend) {
      return renderPeriodComparison();
    }

    let chartData;

    if (Array.isArray(data) && data.length > 0) {
      // Single dataset
      chartData = {
        labels: data.slice(0, 8).map((item) => {
          const label = item.month || item.name || item.label || item.category?.name || "";
          return label.length > 8 ? label.substring(0, 8) + "..." : label;
        }),
        datasets: [
          {
            data: data.slice(0, 8).map((item) => Math.abs(item.balance || item.value || item.amount || 0)),
          },
        ],
      };
    } else {
      return null;
    }

    const chartConfig = {
      backgroundColor: UI.COLORS.BACKGROUND,
      backgroundGradientFrom: UI.COLORS.BACKGROUND,
      backgroundGradientTo: UI.COLORS.BACKGROUND,
      decimalPlaces: 0,
      color: (opacity = 1) => UI.COLORS.PRIMARY,
      labelColor: (opacity = 1) => UI.COLORS.TEXT_PRIMARY,
      style: {
        borderRadius: 16,
      },
      propsForBackgroundLines: {
        strokeOpacity: 0.1, // Subtle grid lines
        stroke: UI.COLORS.TEXT_MUTED,
      },
      withHorizontalLines: true,
      withVerticalLines: false,
      fromZero: true, // Start Y-axis from zero
    };

    return (
      <View style={styles.barContainer}>
        <BarChart
          data={chartData}
          width={width - 40}
          height={220}
          chartConfig={chartConfig}
          verticalLabelRotation={30}
          fromZero
          showBarTops={false}
          yAxisLabel=""
          yAxisSuffix=""
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
        />
      </View>
    );
  };

  const renderChart = () => {
    if (loading) {
      return (
        <View style={[styles.centerContainer, { height }]}>
          <Ionicons name="reload" size={24} color={UI.COLORS.TEXT_SECONDARY} />
          <Text style={[styles.centerText, { color: UI.COLORS.TEXT_SECONDARY }]}>Loading...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={[styles.centerContainer, { height }]}>
          <Ionicons name="warning" size={24} color={UI.COLORS.ERROR} />
          <Text style={[styles.centerText, { color: UI.COLORS.ERROR }]}>{error}</Text>
        </View>
      );
    }

    if (!data || data.length === 0) {
      return (
        <View style={[styles.centerContainer, { height }]}>
          <Ionicons name="bar-chart-outline" size={24} color={UI.COLORS.TEXT_MUTED} />
          <Text style={[styles.centerText, { color: UI.COLORS.TEXT_MUTED }]}>{emptyMessage}</Text>
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
            <Text style={[styles.centerText, { color: UI.COLORS.TEXT_MUTED }]}>Chart type not supported</Text>
          </View>
        );
    }
  };

  const renderLegend = () => {
    if (!data) return null;

    if (type === "pie" && Array.isArray(data) && data.length > 0) {
      return (
        <View style={styles.legendContainer}>
          {data.slice(0, 6).map((item, index) => {
            const amount = Math.abs(item.amount || 0); // Use absolute values
            return (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: item.color || UI.COLORS.PRIMARY }]} />
                <View style={styles.legendTextContainer}>
                  <Text style={styles.legendName} numberOfLines={1} allowFontScaling={false}>
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
          {data.length > 6 && <Text style={[styles.moreText, { color: UI.COLORS.TEXT_MUTED }]}>+{data.length - 6} more categories</Text>}
        </View>
      );
    }

    // Multi-category line or bar chart legend
    if ((type === "line" || type === "bar") && isMultiCategory && data.legend && Array.isArray(data.legend)) {
      return (
        <View style={styles.legendContainer}>
          {data.legend.map((categoryName: string, index: number) => {
            // Get color from dataset if available, otherwise use extended color palette
            const colors = [
              UI.COLORS.PRIMARY,
              UI.COLORS.SUCCESS,
              UI.COLORS.WARNING,
              UI.COLORS.ERROR,
              UI.COLORS.ACCENT,
              "#8B5CF6",
              "#10B981",
              "#06B6D4",
            ];
            const datasetColor =
              data.datasets && data.datasets[index] && data.datasets[index].color
                ? typeof data.datasets[index].color === "function"
                  ? data.datasets[index].color()
                  : data.datasets[index].color
                : colors[index % colors.length];

            return (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: datasetColor }]} />
                <View style={styles.legendTextContainer}>
                  <Text style={styles.legendName} numberOfLines={1} allowFontScaling={false}>
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

  return (
    <Card onPress={onPress} style={styles.card} padding="none">
      <View style={styles.cardContent}>
        <View style={styles.header}>
          <Text style={[styles.titleText, { color: UI.COLORS.TEXT_PRIMARY }]}>{title}</Text>
          <View style={styles.headerActions}>
            {onCompare && (
              <TouchableOpacity onPress={onCompare} style={styles.compareButton}>
                <Ionicons name="bar-chart" size={18} color={UI.COLORS.PRIMARY} />
              </TouchableOpacity>
            )}
            {onPress && <Ionicons name="chevron-forward" size={20} color={UI.COLORS.TEXT_SECONDARY} />}
          </View>
        </View>

        <View style={styles.chartContainer}>{renderChart()}</View>

        {renderLegend()}
      </View>
    </Card>
  );
};

export interface PieChartSectionProps {
  title: string;
  data: {
    name: string;
    amount: number;
    color: string;
  }[];
  onPress?: () => void;
  onCompare?: () => void;
}

export const PieChartSection: React.FC<PieChartSectionProps> = ({ title, data, onPress, onCompare }) => {
  return <ChartCard title={title} data={data} type="pie" onPress={onPress} onCompare={onCompare} emptyMessage="No spending data available" />;
};

export interface LineChartSectionProps {
  title: string;
  data: any[] | any; // Make it flexible to accept both monthly and category data
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
  const chartData = comparisonMode === "category" && comparisonData ? comparisonData : data;

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
  const chartData = comparisonMode === "category" && comparisonData ? comparisonData : data;

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

export const CustomChartCard: React.FC<CustomChartCardProps> = ({ chart, data, onPress, onEdit, onDelete, onDuplicate }) => {
  return (
    <Card onPress={onPress} style={styles.card} padding="none">
      <View style={styles.cardContent}>
        <View style={styles.customHeader}>
          <View style={styles.chartInfo}>
            <Text style={[styles.titleText, { color: UI.COLORS.TEXT_PRIMARY }]}>{chart.title}</Text>
            <Text style={styles.chartMeta}>
              {chart.chartType} • {chart.dataSource}
            </Text>
          </View>
          <View style={styles.customActions}>
            {onDuplicate && (
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: UI.COLORS.SURFACE }]} onPress={onDuplicate}>
                <Ionicons name="copy" size={16} color={UI.COLORS.TEXT_SECONDARY} />
              </TouchableOpacity>
            )}
            {onEdit && (
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: UI.COLORS.PRIMARY }]} onPress={onEdit}>
                <Ionicons name="pencil" size={16} color={UI.COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: UI.COLORS.ERROR }]} onPress={onDelete}>
                <Ionicons name="trash" size={16} color={UI.COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.chartContainer}>
          <ChartCard title="" data={data} type={chart.chartType} showLegend={false} height={180} emptyMessage="No data for this chart" />
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: UI.SPACING.MD,
    marginBottom: UI.SPACING.LG,
  },
  cardContent: {
    paddingHorizontal: UI.SPACING.LG,
    paddingVertical: UI.SPACING.MD,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: UI.SPACING.SM,
  },
  customHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: UI.SPACING.SM,
  },
  chartInfo: {
    flex: 1,
  },
  chartMeta: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
    marginTop: 2,
    textTransform: "capitalize",
  },
  customActions: {
    flexDirection: "row",
    gap: UI.SPACING.SM,
  },
  actionButton: {
    padding: UI.SPACING.SM,
    borderRadius: 20,
  },
  chartContainer: {
    alignItems: "center",
  },
  pieContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  pieChart: {
    width: "100%",
    minHeight: 200,
    borderRadius: 8,
    padding: 16,
  },
  pieSlice: {
    position: "absolute",
    width: "50%",
    height: "50%",
    top: "50%",
    left: "50%",
    transformOrigin: "0 0",
  },
  pieCenter: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 16,
    padding: 12,
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: 8,
  },
  pieCenterText: {
    color: UI.COLORS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "bold",
  },
  lineContainer: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: UI.SPACING.SM,
  },
  barContainer: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: UI.SPACING.SM,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  centerContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: UI.SPACING.SM,
  },
  centerText: {
    textAlign: "center",
    fontSize: 14,
  },
  legendContainer: {
    marginTop: UI.SPACING.MD,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: UI.SPACING.SM,
    justifyContent: "flex-start",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: UI.SPACING.XS,
    flex: 1,
    minWidth: 100,
    // maxWidth: "48%",
    marginBottom: UI.SPACING.XS,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    // Better support for Arabic and RTL text
    fontFamily: "System",
    textAlign: "left",
    lineHeight: 18,
    letterSpacing: 0, // Prevent letter spacing issues in Arabic
  },
  legendTextContainer: {
    flex: 1,
    marginLeft: UI.SPACING.XS,
  },
  legendName: {
    fontSize: 13,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    fontFamily: "System", // Better Arabic support
    lineHeight: 16,
    marginBottom: 2,
  },
  legendAmount: {
    fontSize: 11,
    fontWeight: "400",
    color: UI.COLORS.TEXT_SECONDARY,
    fontFamily: "System",
    lineHeight: 14,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: UI.SPACING.SM,
  },
  compareButton: {
    padding: UI.SPACING.XS,
    borderRadius: 4,
    backgroundColor: UI.COLORS.SURFACE,
  },

  // Pie chart styles (updated)
  pieSegmentContainer: {
    marginBottom: 12,
  },
  pieSegmentInfo: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 4,
  },
  segmentLabel: {
    fontSize: 14,
    color: UI.COLORS.TEXT_PRIMARY,
    fontWeight: "500" as const,
    flex: 1,
  },
  segmentAmount: {
    fontSize: 14,
    color: UI.COLORS.TEXT_PRIMARY,
    fontWeight: "600" as const,
  },
  pieSegmentBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  pieSegmentFill: {
    height: 8,
    borderRadius: 4,
    minWidth: 20,
    flex: 1,
  },
  segmentPercentage: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
    fontWeight: "500" as const,
    minWidth: 40,
    textAlign: "right" as const,
  },
  pieSegment: {
    padding: 8,
    marginVertical: 2,
    borderRadius: 4,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  segmentValue: {
    fontSize: 11,
    color: UI.COLORS.BACKGROUND,
    fontWeight: "600" as const,
  },
  pieCenterSubtext: {
    fontSize: 10,
    color: UI.COLORS.TEXT_MUTED,
    textAlign: "center" as const,
  },
  // Simple bar chart styles
  simpleBarContainer: {
    alignItems: "center" as const,
    paddingVertical: 10,
  },
  simpleBarChart: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    paddingHorizontal: 10,
    minHeight: 220,
  },
  simpleBarColumn: {
    alignItems: "center" as const,
    marginHorizontal: 8,
    minWidth: 50,
  },
  simpleBarValue: {
    fontSize: 10,
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center" as const,
    marginBottom: 4,
    fontWeight: "500" as const,
  },
  simpleBarSpace: {
    height: 200,
    justifyContent: "flex-end" as const,
    alignItems: "center" as const,
  },
  simpleBar: {
    width: 30,
    borderRadius: 4,
    minHeight: 4,
  },
  simpleBarLabel: {
    fontSize: 10,
    color: UI.COLORS.TEXT_SECONDARY,
    textAlign: "center" as const,
    marginTop: 6,
    lineHeight: 12,
  },
  moreText: {
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 4,
  },
  // Period comparison styles
  comparisonContainer: {
    paddingVertical: 16,
    height: 180,
  },
  comparisonMainContainer: {
    position: "relative" as const,
    paddingVertical: 16,
    height: 200,
  },
  comparisonGridContainer: {
    position: "absolute" as const,
    top: 16,
    left: 0,
    right: 0,
    height: 120,
    justifyContent: "space-between" as const,
  },
  comparisonGridLine: {
    height: 1,
    backgroundColor: UI.COLORS.TEXT_MUTED,
    opacity: 0.1,
    marginHorizontal: 16,
  },
  comparisonScroll: {
    flex: 1,
    zIndex: 1,
  },
  comparisonScrollContent: {
    paddingHorizontal: 16,
    gap: 24,
    flexDirection: "row" as const,
    minWidth: 400, // Ensure minimum width for scrolling
  },
  categoryComparison: {
    alignItems: "center" as const,
    minWidth: 80,
    maxWidth: 100,
  },
  categoryLabel: {
    fontSize: 12,
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center" as const,
    marginBottom: 8,
    height: 32,
    minWidth: 80,
  },
  categoryLabelBottom: {
    fontSize: 11,
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center" as const,
    marginTop: 8,
    minWidth: 80,
    lineHeight: 14,
  },
  barsGroup: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    height: 120,
    gap: 3,
    justifyContent: "center" as const,
  },
  barWrapper: {
    alignItems: "center" as const,
    width: 22,
  },
  barValue: {
    fontSize: 8,
    color: UI.COLORS.TEXT_SECONDARY,
    textAlign: "center" as const,
    marginBottom: 2,
    height: 10,
  },
  comparisonBar: {
    width: 18,
    borderRadius: 2,
    minHeight: 2,
  },
});
