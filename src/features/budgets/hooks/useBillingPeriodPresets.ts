import { useState, useEffect } from "react";
import { getCurrentBillingPeriod, getPreviousBillingPeriod } from "../utils/billingPeriod";
import { QuickDatePreset } from "../../transactions/components/filters/QuickDatePresets";

/**
 * Hook that provides quick date presets with billing period support
 */
export const useBillingPeriodPresets = (): QuickDatePreset[] => {
  const [billingPresets, setBillingPresets] = useState<QuickDatePreset[]>([]);

  useEffect(() => {
    const loadBillingPresets = async () => {
      try {
        const currentBilling = await getCurrentBillingPeriod();
        const previousBilling = await getPreviousBillingPeriod();

        const now = new Date();

        const presets: QuickDatePreset[] = [
          {
            id: "today",
            label: "Today",
            startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
            icon: "today",
          },
          {
            id: "yesterday",
            label: "Yesterday",
            startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
            endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59),
            icon: "arrow-back",
          },
          {
            id: "last7days",
            label: "Last 7 Days",
            startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6),
            endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
            icon: "calendar-outline",
          },
          {
            id: "last30days",
            label: "Last 30 Days",
            startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29),
            endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
            icon: "calendar",
          },
          {
            id: "thisMonth",
            label: "This Billing Period",
            startDate: currentBilling.start,
            endDate: currentBilling.end,
            icon: "calendar-sharp",
          },
          {
            id: "lastMonth",
            label: "Last Billing Period",
            startDate: previousBilling.start,
            endDate: previousBilling.end,
            icon: "arrow-back-circle",
          },
          {
            id: "thisYear",
            label: "This Year",
            startDate: new Date(now.getFullYear(), 0, 1),
            endDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
            icon: "calendar-number",
          },
        ];

        setBillingPresets(presets);
      } catch (error) {
        console.error("Failed to load billing period presets:", error);

        // Fallback to calendar month presets
        const now = new Date();
        const fallbackPresets: QuickDatePreset[] = [
          {
            id: "today",
            label: "Today",
            startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
            icon: "today",
          },
          {
            id: "yesterday",
            label: "Yesterday",
            startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
            endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59),
            icon: "arrow-back",
          },
          {
            id: "last7days",
            label: "Last 7 Days",
            startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6),
            endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
            icon: "calendar-outline",
          },
          {
            id: "last30days",
            label: "Last 30 Days",
            startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29),
            endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
            icon: "calendar",
          },
          {
            id: "thisMonth",
            label: "This Month",
            startDate: new Date(now.getFullYear(), now.getMonth(), 1),
            endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
            icon: "calendar-sharp",
          },
          {
            id: "lastMonth",
            label: "Last Month",
            startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            endDate: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
            icon: "arrow-back-circle",
          },
          {
            id: "thisYear",
            label: "This Year",
            startDate: new Date(now.getFullYear(), 0, 1),
            endDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
            icon: "calendar-number",
          },
        ];

        setBillingPresets(fallbackPresets);
      }
    };

    loadBillingPresets();
  }, []);

  return billingPresets;
};
