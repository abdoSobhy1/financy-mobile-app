import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Alert, Modal, FlatList } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";

import Screen from "../../components/ui/Screen";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { UI } from "../../constants";
import { RootState } from "../../store";
import {
  ChartType,
  DataSource,
  ColorTheme,
  ChartFilter,
  addCustomChart,
  updateCustomChart,
  deleteCustomChart,
} from "../../store/slices/analysisSlice";

interface RouteParams {
  chartId?: string;
}

export const CreateCustomChartScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  const { chartId } = (route.params as RouteParams) || {};
  const isEditing = !!chartId;

  const existingChart = useSelector((state: RootState) => (chartId ? state.analysis.customCharts[chartId] : null));

  const categories = useSelector((state: RootState) => Object.values((state.categories ? state.categories.items : {}) as any) as any[]);
  const budgets = useSelector((state: RootState) => Object.values((state.budgets ? state.budgets.items : {}) as any) as any[]);
  const debts = useSelector((state: RootState) => Object.values((state.debts ? state.debts.items : {}) as any) as any[]);

  // Form state
  const [chartTitle, setChartTitle] = useState("");
  const [selectedChartType, setSelectedChartType] = useState<ChartType>("pie");

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource>("transactions");
  const [selectedColorTheme, setSelectedColorTheme] = useState<ColorTheme>("default");
  const [filters, setFilters] = useState<ChartFilter>({});
  const [saving, setSaving] = useState(false);

  // Initialize form with existing chart data
  useEffect(() => {
    if (existingChart) {
      setChartTitle(existingChart.title);
      setSelectedChartType(existingChart.chartType);
      setSelectedDataSource(existingChart.dataSource);
      setSelectedColorTheme(existingChart.colorTheme);
      setFilters(existingChart.filters);
    }
  }, [existingChart]);

  const handleSave = async () => {
    if (!chartTitle.trim()) {
      Alert.alert("Error", "Please enter a chart title");
      return;
    }

    setSaving(true);
    try {
      const chartData = {
        title: chartTitle.trim(),
        chartType: selectedChartType,
        dataSource: selectedDataSource,
        colorTheme: selectedColorTheme,
        filters,
      };

      if (isEditing && chartId) {
        dispatch(
          updateCustomChart({
            id: chartId,
            updates: chartData,
          })
        );
      } else {
        const newChart = {
          id: Date.now().toString(),
          ...chartData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        dispatch(addCustomChart(newChart));
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to save chart");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!chartId) return;

    Alert.alert("Delete Chart", "Are you sure you want to delete this chart?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          dispatch(deleteCustomChart(chartId));
          navigation.goBack();
        },
      },
    ]);
  };

  const chartTypes: { type: ChartType; label: string; icon: string; description: string }[] = [
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

  const dataSources: { source: DataSource; label: string; description: string }[] = [
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
      source: "bills",
      label: "Bills",
      description: "Recurring bill payments",
    },
    {
      source: "debts",
      label: "Debts",
      description: "Debt balances and payments",
    },
  ];

  const colorThemes: { theme: ColorTheme; label: string; colors: string[] }[] = [
    {
      theme: "default",
      label: "Default",
      colors: [UI.COLORS.PRIMARY, UI.COLORS.SUCCESS, UI.COLORS.WARNING, UI.COLORS.ERROR],
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

  const renderChartTypeSelector = () => (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>Chart Type</Text>
      <View style={styles.optionsList}>
        {chartTypes.map((chartType) => (
          <TouchableOpacity
            key={chartType.type}
            style={[styles.optionItem, selectedChartType === chartType.type && styles.selectedOption]}
            onPress={() => setSelectedChartType(chartType.type)}>
            <View style={styles.optionContent}>
              <View style={styles.optionHeader}>
                <Ionicons
                  name={chartType.icon as any}
                  size={24}
                  color={selectedChartType === chartType.type ? UI.COLORS.PRIMARY : UI.COLORS.TEXT_SECONDARY}
                />
                <Text style={[styles.optionTitle, selectedChartType === chartType.type && styles.selectedOptionText]}>{chartType.label}</Text>
              </View>
              <Text style={styles.optionDescription}>{chartType.description}</Text>
            </View>
            {selectedChartType === chartType.type && <Ionicons name="checkmark-circle" size={20} color={UI.COLORS.PRIMARY} />}
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );

  const renderDataSourceSelector = () => (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>Data Source</Text>
      <View style={styles.optionsList}>
        {dataSources.map((dataSource) => (
          <TouchableOpacity
            key={dataSource.source}
            style={[styles.optionItem, selectedDataSource === dataSource.source && styles.selectedOption]}
            onPress={() => setSelectedDataSource(dataSource.source)}>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, selectedDataSource === dataSource.source && styles.selectedOptionText]}>{dataSource.label}</Text>
              <Text style={styles.optionDescription}>{dataSource.description}</Text>
            </View>
            {selectedDataSource === dataSource.source && <Ionicons name="checkmark-circle" size={20} color={UI.COLORS.PRIMARY} />}
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );

  const renderColorThemeSelector = () => (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>Color Theme</Text>
      <View style={styles.colorThemeGrid}>
        {colorThemes.map((theme) => (
          <TouchableOpacity
            key={theme.theme}
            style={[styles.colorThemeItem, selectedColorTheme === theme.theme && styles.selectedColorTheme]}
            onPress={() => setSelectedColorTheme(theme.theme)}>
            <View style={styles.colorPreview}>
              {theme.colors.map((color, index) => (
                <View key={index} style={[styles.colorSample, { backgroundColor: color }]} />
              ))}
            </View>
            <Text style={styles.colorThemeLabel}>{theme.label}</Text>
            {selectedColorTheme === theme.theme && (
              <View style={styles.colorThemeCheck}>
                <Ionicons name="checkmark" size={16} color={UI.COLORS.TEXT_PRIMARY} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );

  const renderFilters = () => {
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
              <Ionicons name="chevron-forward" size={16} color={UI.COLORS.TEXT_MUTED} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterItem} onPress={() => handleCategoryFilter()}>
            <Text style={styles.filterLabel}>Categories</Text>
            <View style={styles.filterValue}>
              <Text style={styles.filterValueText}>
                {filters.categoryIds && filters.categoryIds.length > 0 ? `${filters.categoryIds.length} selected` : "All categories"}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={UI.COLORS.TEXT_MUTED} />
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
  };

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

  const renderHeader = () => {
    return (
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={UI.COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.title}>{isEditing ? "Edit Chart" : "Create Chart"}</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <ScrollView style={styles.container}>
        {renderHeader()}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Chart Details</Text>
          <Input label="Chart Title" value={chartTitle} onChangeText={setChartTitle} placeholder="Enter chart title" />
        </Card>

        {renderChartTypeSelector()}
        {renderDataSourceSelector()}
        {renderColorThemeSelector()}
        {renderFilters()}

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
              <Ionicons name="close" size={24} color={UI.COLORS.TEXT_PRIMARY} />
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
                  {isSelected && <Ionicons name="checkmark" size={20} color={UI.COLORS.PRIMARY} />}
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
              <Ionicons name="close" size={24} color={UI.COLORS.TEXT_PRIMARY} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: UI.SPACING.MD,
    paddingBottom: UI.SPACING.SM,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: UI.SPACING.SM,
    marginLeft: -UI.SPACING.SM,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40, // Same width as back button to center title
  },
  section: {
    margin: UI.SPACING.MD,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.MD,
  },
  optionsList: {
    gap: UI.SPACING.SM,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: UI.SPACING.MD,
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: UI.CARD_RADIUS,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  selectedOption: {
    borderColor: UI.COLORS.PRIMARY,
    backgroundColor: `${UI.COLORS.PRIMARY}10`,
  },
  optionContent: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: UI.SPACING.SM,
    marginBottom: UI.SPACING.XS,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  selectedOptionText: {
    color: UI.COLORS.PRIMARY,
  },
  optionDescription: {
    fontSize: 14,
    color: UI.COLORS.TEXT_MUTED,
  },
  colorThemeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: UI.SPACING.MD,
  },
  colorThemeItem: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    padding: UI.SPACING.MD,
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: UI.CARD_RADIUS,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    position: "relative",
  },
  selectedColorTheme: {
    borderColor: UI.COLORS.PRIMARY,
    backgroundColor: `${UI.COLORS.PRIMARY}10`,
  },
  colorPreview: {
    flexDirection: "row",
    marginBottom: UI.SPACING.SM,
  },
  colorSample: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  colorThemeLabel: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
    textAlign: "center",
  },
  colorThemeCheck: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: UI.COLORS.PRIMARY,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  filtersList: {
    gap: UI.SPACING.SM,
  },
  filterItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: UI.SPACING.MD,
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: UI.CARD_RADIUS,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  filterLabel: {
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
  },
  filterValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: UI.SPACING.SM,
  },
  filterValueText: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
  },
  actions: {
    margin: UI.SPACING.MD,
    gap: UI.SPACING.MD,
  },
  saveButton: {
    backgroundColor: UI.COLORS.PRIMARY,
  },
  deleteButton: {
    marginTop: UI.SPACING.SM,
  },
  transactionTypeButtons: {
    flexDirection: "row" as const,
    gap: 8,
    marginTop: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    alignItems: "center" as const,
  },
  typeButtonActive: {
    backgroundColor: UI.COLORS.PRIMARY,
    borderColor: UI.COLORS.PRIMARY,
  },
  typeButtonText: {
    fontSize: 14,
    color: UI.COLORS.TEXT_PRIMARY,
    fontWeight: "500" as const,
  },
  typeButtonTextActive: {
    color: UI.COLORS.BACKGROUND,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: UI.COLORS.BACKGROUND,
  },
  modalHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: UI.COLORS.TEXT_PRIMARY,
  },
  modalClearButton: {
    padding: 8,
  },
  modalClearText: {
    fontSize: 16,
    color: UI.COLORS.PRIMARY,
  },
  modalList: {
    flex: 1,
  },
  categoryItem: {
    padding: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
  },
  selectedCategoryItem: {
    backgroundColor: UI.COLORS.SURFACE,
  },
  categoryInfo: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flex: 1,
  },
  categoryColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  selectedCategoryName: {
    fontWeight: "600" as const,
  },
  categoryType: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    marginLeft: 8,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
  },
  modalDoneButton: {
    backgroundColor: UI.COLORS.PRIMARY,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  dateRangeLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: 8,
    marginTop: 16,
  },
  quickDateOptions: {
    gap: 8,
  },
  quickDateOption: {
    padding: 12,
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  quickDateOptionText: {
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center" as const,
  },
  currentDateRange: {
    padding: 12,
    backgroundColor: UI.COLORS.CARD,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  currentDateText: {
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center" as const,
  },
});
