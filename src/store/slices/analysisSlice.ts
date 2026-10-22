import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ChartType = "pie" | "line" | "bar";
export type DataSource = "transactions" | "budgets" | "debts";
export type ColorTheme = "default" | "blue" | "green" | "purple" | "orange" | "red";

export interface ChartFilter {
  categoryIds?: string[];
  startDate?: string;
  endDate?: string;
  transactionType?: "income" | "expense" | "both";
  budgetIds?: string[];
  debtIds?: string[];
}

export interface CustomChart {
  id: string;
  title: string;
  chartType: ChartType;
  dataSource: DataSource;
  filters: ChartFilter;
  colorTheme: ColorTheme;
  createdAt: string;
  updatedAt: string;
  // Sync fields
  deleted?: boolean;
  syncStatus?: "pending" | "synced" | "error";
}

export interface AnalysisState {
  customCharts: Record<string, CustomChart>;
  isLoading: boolean;
  error: string | null;
  lastSyncTime: number | null;
}

const initialState: AnalysisState = {
  customCharts: {},
  isLoading: false,
  error: null,
  lastSyncTime: null,
};

const analysisSlice = createSlice({
  name: "analysis",
  initialState,
  reducers: {
    // Loading states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Custom chart operations
    addCustomChart: (state, action: PayloadAction<CustomChart>) => {
      const chart = action.payload;
      state.customCharts[chart.id] = {
        ...chart,
        syncStatus: "pending",
        updatedAt: new Date().toISOString(),
      };
    },

    updateCustomChart: (state, action: PayloadAction<{ id: string; updates: Partial<CustomChart> }>) => {
      const { id, updates } = action.payload;
      if (state.customCharts[id]) {
        state.customCharts[id] = {
          ...state.customCharts[id],
          ...updates,
          syncStatus: "pending",
          updatedAt: new Date().toISOString(),
        };
      }
    },

    deleteCustomChart: (state, action: PayloadAction<string>) => {
      const chartId = action.payload;
      if (state.customCharts[chartId]) {
        state.customCharts[chartId] = {
          ...state.customCharts[chartId],
          deleted: true,
          syncStatus: "pending",
          updatedAt: new Date().toISOString(),
        };
      }
    },

    // Bulk operations for sync
    setCustomCharts: (state, action: PayloadAction<Record<string, CustomChart>>) => {
      state.customCharts = action.payload;
    },

    // Sync operations
    markChartAsSynced: (state, action: PayloadAction<string>) => {
      const chartId = action.payload;
      if (state.customCharts[chartId]) {
        state.customCharts[chartId].syncStatus = "synced";
      }
    },

    markChartAsSyncError: (state, action: PayloadAction<string>) => {
      const chartId = action.payload;
      if (state.customCharts[chartId]) {
        state.customCharts[chartId].syncStatus = "error";
      }
    },

    setSyncTime: (state, action: PayloadAction<number>) => {
      state.lastSyncTime = action.payload;
    },

    // Clear operations
    clearAnalysisData: (state) => {
      state.customCharts = {};
      state.error = null;
      state.lastSyncTime = null;
    },
  },
});

export const {
  setLoading,
  setError,
  addCustomChart,
  updateCustomChart,
  deleteCustomChart,
  setCustomCharts,
  markChartAsSynced,
  markChartAsSyncError,
  setSyncTime,
  clearAnalysisData,
} = analysisSlice.actions;

// Selectors
export const selectCustomCharts = (state: { analysis: AnalysisState }) =>
  Object.values(state.analysis.customCharts).filter((chart) => !chart.deleted);

export const selectCustomChartById = (state: { analysis: AnalysisState }, chartId: string) => state.analysis.customCharts[chartId];

export const selectAnalysisLoading = (state: { analysis: AnalysisState }) => state.analysis.isLoading;

export const selectAnalysisError = (state: { analysis: AnalysisState }) => state.analysis.error;

export const selectPendingCharts = (state: { analysis: AnalysisState }) =>
  Object.values(state.analysis.customCharts).filter((chart) => chart.syncStatus === "pending");

export default analysisSlice.reducer;
