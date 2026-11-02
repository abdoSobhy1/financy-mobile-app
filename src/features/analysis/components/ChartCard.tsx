import { PieChartPlot } from "./PieChartPlot";
import { LineChartPlot } from "./LineChartPlot";
import { BarChartPlot } from "./BarChartPlot";
import { ChartLegend } from "./ChartLegend";

import { styles } from "./ChartCard.styles";
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { UI } from "../../../shared/constants";

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
        return <PieChartPlot data={data} />;
      case "line":
        return <LineChartPlot data={data} isMultiCategory={isMultiCategory} />;
      case "bar":
        return <BarChartPlot data={data} isMultiCategory={isMultiCategory} />;
      default:
        return (
          <View style={[styles.centerContainer, { height }]}>
            <Text style={styles.centerText}>Chart type not supported</Text>
          </View>
        );
    }
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
        {showLegend && <ChartLegend data={data} type={type} isMultiCategory={isMultiCategory} />}
      </View>
    </TouchableOpacity>
  );
};

export { PieChartSection } from "./PieChartSection";
export type { PieChartSectionProps } from "./PieChartSection";

export { LineChartSection } from "./LineChartSection";
export type { LineChartSectionProps } from "./LineChartSection";

export { BarChartSection } from "./BarChartSection";
export type { BarChartSectionProps } from "./BarChartSection";

export { CustomChartCard } from "./CustomChartCard";
export type { CustomChartCardProps } from "./CustomChartCard";
