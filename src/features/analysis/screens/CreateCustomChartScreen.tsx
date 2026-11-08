import { ChartTypeSelector } from "../components/ChartTypeSelector";
import { ChartDataSourceSelector } from "../components/ChartDataSourceSelector";
import { ChartColorThemeSelector } from "../components/ChartColorThemeSelector";
import { ChartFilterFields } from "../components/ChartFilterFields";
import { CustomChartHeader } from "../components/CustomChartHeader";
import { getStyles } from "../components/CustomChartBuilder.styles";
import { useCreateCustomChartScreen } from "../hooks/useCreateCustomChartScreen";

import React from "react";
import { FlatList, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";

import { Ionicons } from "@expo/vector-icons";

import Button from "../../../shared/ui/Button";
import Card from "../../../shared/ui/Card";
import Input from "../../../shared/ui/Input";
import Screen from "../../../shared/ui/Screen";

import type { ChartType, ColorTheme, DataSource } from "../store/analysisSlice";

export const CreateCustomChartScreen: React.FC = () => {
  const {
    navigation,
    isEditing,
    categories,
    chartTitle,
    setChartTitle,
    selectedChartType,
    setSelectedChartType,
    showCategoryModal,
    setShowCategoryModal,
    showDateRangeModal,
    setShowDateRangeModal,
    selectedDataSource,
    setSelectedDataSource,
    selectedColorTheme,
    setSelectedColorTheme,
    filters,
    setFilters,
    saving,
    handleSave,
    handleDelete
  } = useCreateCustomChartScreen();
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const chartTypes: { type: ChartType; label: string; icon: string; description: string; }[] = [
    {
      type: "pie",
      label: "Pie Chart",
      icon: "pie-chart",
      description: "Shows category breakdown as percentages",
    },
    {
      type: "line",
      label: "Line Chart",
      icon: "trending-up",
      description: "Shows trends over time",
    },
    {
      type: "bar",
      label: "Bar Chart",
      icon: "bar-chart",
      description: "Compare values across categories",
    },
  ];
  const dataSources: { source: DataSource; label: string; description: string; }[] = [
    {
      source: "transactions",
      label: "Transactions",
      description: "Income and expense data",
    },
    {
      source: "budgets",
      label: "Budgets",
      description: "Budget usage and remaining amounts",
    },
    {
      source: "debts",
      label: "Debts",
      description: "Debt balances and payments",
    },
  ];
  const colorThemes: { theme: ColorTheme; label: string; colors: string[]; }[] = [
    {
      theme: "default",
      label: "Default",
      colors: [colors.primary, colors.primary, colors.tertiary, colors.error],
    },
    {
      theme: "blue",
      label: "Blue Tones",
      colors: ["#3B82F6", "#06B6D4", "#8B5CF6", "#1E40AF"],
    },
    {
      theme: "green",
      label: "Green Tones",
      colors: ["#10B981", "#059669", "#34D399", "#047857"],
    },
    {
      theme: "purple",
      label: "Purple Tones",
      colors: ["#8B5CF6", "#7C3AED", "#A855F7", "#6D28D9"],
    },
    {
      theme: "orange",
      label: "Orange Tones",
      colors: ["#F59E0B", "#D97706", "#F97316", "#EA580C"],
    },
    {
      theme: "red",
      label: "Red Tones",
      colors: ["#EF4444", "#DC2626", "#F87171", "#B91C1C"],
    },
  ];

  const handleDateRangeFilter = () => {
    setShowDateRangeModal(true);
  };

  const handleCategoryFilter = () => {
    setShowCategoryModal(true);
  };

  const toggleCategory = (categoryId: string) => {
    const currentIds = filters.categoryIds || [];
    const isSelected = currentIds.includes(categoryId);

    if (isSelected) {
      setFilters({
        ...filters,
        categoryIds: currentIds.filter((id) => id !== categoryId),
      });
    } else {
      setFilters({
        ...filters,
        categoryIds: [...currentIds, categoryId],
      });
    }
  };

  const setDateRange = (startDate: Date, endDate: Date) => {
    setFilters({
      ...filters,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    });
  };

  const clearDateRange = () => {
    setFilters({
      ...filters,
      startDate: undefined,
      endDate: undefined,
    });
  };

  const clearCategories = () => {
    setFilters({
      ...filters,
      categoryIds: undefined,
    });
  };

  return (
    <Screen>
      <ScrollView style={styles.container}>
        {<CustomChartHeader styles={styles} navigation={navigation} colors={colors} isEditing={isEditing} />}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Chart Details</Text>
          <Input label="Chart Title" value={chartTitle} onChangeText={setChartTitle} placeholder="Enter chart title" />
        </Card>

        {<ChartTypeSelector styles={styles} chartTypes={chartTypes} selectedChartType={selectedChartType} setSelectedChartType={setSelectedChartType} colors={colors} />}
        {<ChartDataSourceSelector styles={styles} dataSources={dataSources} selectedDataSource={selectedDataSource} setSelectedDataSource={setSelectedDataSource} colors={colors} />}
        {<ChartColorThemeSelector styles={styles} colorThemes={colorThemes} selectedColorTheme={selectedColorTheme} setSelectedColorTheme={setSelectedColorTheme} colors={colors} />}
        {<ChartFilterFields selectedDataSource={selectedDataSource} styles={styles} handleDateRangeFilter={handleDateRangeFilter} filters={filters} colors={colors} handleCategoryFilter={handleCategoryFilter} setFilters={setFilters} />}

        <View style={styles.actions}>
          <Button title={isEditing ? "Update Chart" : "Create Chart"} onPress={handleSave} loading={saving} style={styles.saveButton} />

          {isEditing && <Button title="Delete Chart" onPress={handleDelete} variant="danger" style={styles.deleteButton} />}
        </View>
      </ScrollView>

      {/* Category Selection Modal */}
      <Modal visible={showCategoryModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowCategoryModal(false)}>
              <Ionicons name="close" size={24} color={colors.onBackground} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Categories</Text>
            <TouchableOpacity style={styles.modalClearButton} onPress={clearCategories}>
              <Text style={styles.modalClearText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={categories}
            style={styles.modalList}
            keyExtractor={(item) => item.id}
            renderItem={({ item: category }) => {
              const isSelected = (filters.categoryIds || []).includes(category.id);
              return (
                <TouchableOpacity
                  style={[styles.categoryItem, isSelected && styles.selectedCategoryItem]}
                  onPress={() => toggleCategory(category.id)}>
                  <View style={styles.categoryInfo}>
                    <View style={[styles.categoryColor, { backgroundColor: category.color }]} />
                    <Text style={[styles.categoryName, isSelected && styles.selectedCategoryName]}>{category.name}</Text>
                    <Text style={styles.categoryType}>{category.type === "income" ? "Income" : "Expense"}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            }}
          />

          <View style={styles.modalFooter}>
            <Button title="Done" onPress={() => setShowCategoryModal(false)} style={styles.modalDoneButton} />
          </View>
        </View>
      </Modal>

      {/* Date Range Selection Modal */}
      <Modal visible={showDateRangeModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowDateRangeModal(false)}>
              <Ionicons name="close" size={24} color={colors.onBackground} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Date Range</Text>
            <TouchableOpacity style={styles.modalClearButton} onPress={clearDateRange}>
              <Text style={styles.modalClearText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.dateRangeLabel}>Quick Select</Text>
            <View style={styles.quickDateOptions}>
              {[
                { label: "Last 7 days", days: 7 },
                { label: "Last 30 days", days: 30 },
                { label: "Last 3 months", days: 90 },
                { label: "Last 6 months", days: 180 },
                { label: "Last year", days: 365 },
              ].map((option) => (
                <TouchableOpacity
                  key={option.days}
                  style={styles.quickDateOption}
                  onPress={() => {
                    const endDate = new Date();
                    const startDate = new Date();
                    startDate.setDate(startDate.getDate() - option.days);
                    setDateRange(startDate, endDate);
                  }}>
                  <Text style={styles.quickDateOptionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.dateRangeLabel}>Current Selection</Text>
            <View style={styles.currentDateRange}>
              <Text style={styles.currentDateText}>
                {filters.startDate && filters.endDate
                  ? `${new Date(filters.startDate).toLocaleDateString()} - ${new Date(filters.endDate).toLocaleDateString()}`
                  : "No date range selected"}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button title="Done" onPress={() => setShowDateRangeModal(false)} style={styles.modalDoneButton} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
};
