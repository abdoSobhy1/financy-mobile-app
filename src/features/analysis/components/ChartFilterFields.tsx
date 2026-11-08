import { getStyles } from "../screens/CreateCustomChartScreen.styles";
import type { useCreateCustomChartScreen } from "../hooks/useCreateCustomChartScreen";

import { Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

import Card from "../../../shared/ui/Card";

interface ChartFilterFieldsProps {
  selectedDataSource: ReturnType<typeof useCreateCustomChartScreen>["selectedDataSource"];
  styles: ReturnType<typeof getStyles>;
  handleDateRangeFilter: () => void;
  filters: ReturnType<typeof useCreateCustomChartScreen>["filters"];
  colors: ReturnType<typeof useAppTheme>["colors"];
  handleCategoryFilter: () => void;
  setFilters: ReturnType<typeof useCreateCustomChartScreen>["setFilters"];
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
