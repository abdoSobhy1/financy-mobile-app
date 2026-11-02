import React from "react";

import { ChartCard } from "./ChartCard";
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
export interface BarChartSectionProps {
  title: string;
  data: any[] | any;
  onPress?: () => void;
  onCompare?: () => void;
  comparisonData?: any[];
  comparisonMode?: "budget" | "category";
  isMultiCategory?: boolean;
}
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
