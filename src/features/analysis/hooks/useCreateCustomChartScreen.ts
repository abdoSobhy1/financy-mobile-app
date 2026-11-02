import { AlertService } from "../../../shared/services/AlertService";

import { useEffect, useState } from "react";

import { useNavigation, useRoute } from "@react-navigation/native";

import { useDispatch, useSelector } from "react-redux";

import { RootState } from "../../../app/store";
import { ChartFilter, ChartType, ColorTheme, DataSource, addCustomChart, deleteCustomChart, updateCustomChart } from "../store/analysisSlice";

interface RouteParams {
  chartId?: string;
}

/** Owns screen state and actions; rendering stays in CreateCustomChartScreen. */
export function useCreateCustomChartScreen() {

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
      AlertService.alert("Error", "Please enter a chart title");
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
      AlertService.alert("Error", "Failed to save chart");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!chartId) return;

    AlertService.alert("Delete Chart", "Are you sure you want to delete this chart?", [
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
  return {
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
  };
}
