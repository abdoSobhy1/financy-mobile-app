import { styles } from "./ChartCard.styles";
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

import { Ionicons } from "@expo/vector-icons";

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
