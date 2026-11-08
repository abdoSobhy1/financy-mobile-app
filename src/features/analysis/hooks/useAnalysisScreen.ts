import { useNavigation } from "@react-navigation/native";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { useState } from "react";

import { useAnalysisData } from "./useAnalysisData";

export function useAnalysisScreen() {

  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"This Month" | "Last Month" | "3 Months">("This Month");
  const [selectedSliceIndex, setSelectedSliceIndex] = useState<number | null>(null);

  const getDateRange = () => {
    const now = new Date();
    if (filter === "This Month") {
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    }
    if (filter === "Last Month") {
      const lastMonth = subMonths(now, 1);
      return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) };
    }
    if (filter === "3 Months") {
      return { startDate: startOfMonth(subMonths(now, 2)), endDate: endOfMonth(now) };
    }
    return {};
  };

  const { data: analyticsData } = useAnalysisData(getDateRange());

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const { summary, categoryBreakdown, monthlyTrends, budgetUsage } = analyticsData;
  return { navigation, refreshing, filter, setFilter, selectedSliceIndex, setSelectedSliceIndex, onRefresh, summary, categoryBreakdown, monthlyTrends, budgetUsage };
}

export type AnalysisScreenController = ReturnType<typeof useAnalysisScreen>;
