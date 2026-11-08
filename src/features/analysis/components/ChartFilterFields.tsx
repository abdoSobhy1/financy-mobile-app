import { getStyles } from "./CustomChartBuilder.styles";
import type { CreateCustomChartScreenController } from "../hooks/useCreateCustomChartScreen";

import { Text, TouchableOpacity, View } from "react-native";
import { useAppTheme, type AppTheme } from "../../../shared/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

import Card from "../../../shared/ui/Card";

interface ChartFilterFieldsProps {
  selectedDataSource: CreateCustomChartScreenController["selectedDataSource"];
  styles: ReturnType<typeof getStyles>;
  handleDateRangeFilter: () => void;
  filters: CreateCustomChartScreenController["filters"];
  colors: AppTheme["colors"];
  handleCategoryFilter: () => void;
  setFilters: CreateCustomChartScreenController["setFilters"];
}
export function ChartFilterFields({ selectedDataSource, styles, handleDateRangeFilter, filters, colors, handleCategoryFilter, setFilters }: ChartFilterFieldsProps) {

  if (selectedDataSource !== "transactions") {
    return null; // For now, only support transaction filters
  }

  return (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>Filters (Optional)</Text>
      <View style={styles.filtersList}>
        <TouchableOpacity style={styles.filterItem} onPress={() => handleDateRangeFilter()}>
          <Text style={styles.filterLabel}>Date Range</Text>
          <View style={styles.filterValue}>
            <Text style={styles.filterValueText}>
              {filters.startDate && filters.endDate
                ? `${new Date(filters.startDate).toLocaleDateString()} - ${new Date(filters.endDate).toLocaleDateString()}`
                : "All time"}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterItem} onPress={() => handleCategoryFilter()}>
          <Text style={styles.filterLabel}>Categories</Text>
          <View style={styles.filterValue}>
            <Text style={styles.filterValueText}>
              {filters.categoryIds && filters.categoryIds.length > 0 ? `${filters.categoryIds.length} selected` : "All categories"}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} />
          </View>
        </TouchableOpacity>

        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Transaction Type</Text>
          <View style={styles.transactionTypeButtons}>
            {["both", "income", "expense"].map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeButton, (filters.transactionType || "both") === type && styles.typeButtonActive]}
                onPress={() => setFilters({ ...filters, transactionType: type as any })}>
                <Text style={[styles.typeButtonText, (filters.transactionType || "both") === type && styles.typeButtonTextActive]}>
                  {type === "both" ? "Both" : type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Card>
  );

}
