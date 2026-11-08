import React, { useEffect, useState } from "react";
import { Platform } from "react-native";

import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SettingsStackParamList } from "../../../shared/types";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch, store } from "../../../app/store";
import { useCustomAlert, useToast } from "../../../shared/ui";

import NotificationService, { NotificationSettings } from "../../../infrastructure/notifications/notificationService";

import { fetchSettings, updateBillingPeriodStartDay, updateCurrency, updateTheme } from "../store/settingsSlice";
import { formatRelativeTime, getDateRangeForBillingPeriod } from "../../../shared/utils";
import { fetchCategories } from "../../categories/store/categoriesSlice";
import { fetchTransactions } from "../../transactions/store/transactionsSlice";
import { syncWithFirebase } from "../../../infrastructure/sync/store/syncSlice";

import { exportToExcel, exportToCSV, ExportData } from "../../import/utils/exportUtils";
import { exportDatabaseToJSON } from "../../import/utils/databaseExport";
import { useAuth } from "../../auth/providers/AuthContext";
import { useSync } from "../../../infrastructure/sync/providers/SyncProvider";
import { signOut, setUser } from "../../auth/store/authSlice";
import { authService } from "../../auth/services/authService";
import { getSmsDetectionEnabled, setSmsDetectionEnabled, smsService } from "../../sms/services/smsService";
import { subscribeSmsConfig } from "../../sms/services/smsConfigService";
import { useAiSettings } from "./useAiSettings";

type SettingsScreenNavigationProp = StackNavigationProp<SettingsStackParamList>;

/** Owns screen state and actions; rendering stays in SettingsScreen. */
export function useSettingsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { items: categories } = useSelector((state: RootState) => state.categories);
  const { items: transactions } = useSelector((state: RootState) => state.transactions);
  const { items: budgets } = useSelector((state: RootState) => state.budgets);
  const settings = useSelector((state: RootState) => state.settings);
  const syncState = useSelector((state: RootState) => state.sync);
  const { user, isAuthenticated } = useAuth();
  const { syncState: newSyncState } = useSync();

  const [showBillingDayPicker, setShowBillingDayPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [billingDayInput, setBillingDayInput] = useState<string>("1");
  const [showFirebaseCleanup, setShowFirebaseCleanup] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { showAlert, AlertComponent } = useCustomAlert();
  const { showSuccess, showError } = useToast();
  const [smsEnabled, setSmsEnabled] = useState(true);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    transactionReminders: true,
    morningReminderTime: "09:00",
    eveningReminderTime: "20:00",
  });

  const aiSettings = useAiSettings();

  const isGuest = Boolean(user?.isGuest || user?.uid === "guest");
  const currentBillingDay = settings.data?.billingPeriodStartDay || 1;

  useEffect(
    () =>
      subscribeSmsConfig(() => {
        getSmsDetectionEnabled().then(setSmsEnabled);
      }),
    [],
  );

  useEffect(() => {
    if (settings.data) {
      setBillingDayInput(String(settings.data.billingPeriodStartDay));
    }
  }, [settings.data]);

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchSettings());
    dispatch(fetchTransactions());
    if (Platform.OS === "android") {
      getSmsDetectionEnabled().then(setSmsEnabled);
    }
    NotificationService.getInstance()
      .getNotificationSettings()
      .then(setNotifSettings)
      .catch(() => {});
  }, [dispatch]);

  const handleSaveProfile = async () => {
    const trimmedName = profileNameInput.trim();
    if (!trimmedName) {
      showError("Please enter a display name");
      return;
    }
    try {
      setSavingProfile(true);
      const updatedUser = await authService.updateUserProfile(trimmedName);
      dispatch(setUser(updatedUser));
      setShowProfileModal(false);
      showSuccess("Profile updated");
    } catch {
      showError("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleReminderToggle = async (value: boolean) => {
    try {
      setNotifSettings((prev) => ({
        ...prev,
        transactionReminders: value,
      }));
      await NotificationService.getInstance().saveSettings({
        transactionReminders: value,
      });
      showSuccess(
        value ? "Daily reminders enabled" : "Daily reminders disabled",
        3500,
        undefined,
        "settings-reminders",
      );
    } catch {
      showError("Failed to update reminder settings");
    }
  };

  const handleSmsToggle = async (value: boolean) => {
    setSmsEnabled(value);
    await setSmsDetectionEnabled(value);
    if (value) {
      const state = (store as any).getState();
      const cats = Object.values(state.categories?.items || {}) as any[];
      const currentBudgets = state.budgets?.items || {};
      const granted =
        (await smsService.hasPermissions()) ||
        (await smsService.requestPermissions());
      if (granted) {
        smsService.stopListening();
        smsService.startListening(
          cats.map((c: any) => ({ id: c.id, name: c.name })),
          currentBudgets,
        );
      }
      showSuccess("SMS detection enabled");
    } else {
      smsService.stopListening();
      showSuccess("SMS detection disabled");
    }
  };

  const parsedBillingDay = parseInt(billingDayInput.trim(), 10);
  const isBillingDayNumeric = /^\d+$/.test(billingDayInput.trim());
  const isBillingDayValid =
    isBillingDayNumeric && parsedBillingDay >= 1 && parsedBillingDay <= 30;

  const getBillingDayError = (): string | null => {
    const trimmed = billingDayInput.trim();
    if (!trimmed) return "Please enter a day number.";
    if (!isBillingDayNumeric) return "Day must be a whole number.";
    if (parsedBillingDay < 1) return "Day must be at least 1 (valid range: 1–30).";
    if (parsedBillingDay > 30) return "Day cannot exceed 30 (valid range: 1–30).";
    return null;
  };

  const saveBillingDay = async () => {
    const error = getBillingDayError();
    if (error) {
      showError(error);
      return;
    }
    try {
      await dispatch(updateBillingPeriodStartDay(parsedBillingDay)).unwrap();
      setShowBillingDayPicker(false);
      showSuccess(`Billing cycle starts on day ${parsedBillingDay}`);
    } catch {
      showError("Failed to update billing period");
    }
  };

  const handleSelectCurrency = async (code: string) => {
    try {
      await dispatch(updateCurrency(code)).unwrap();
      setShowCurrencyPicker(false);
      showSuccess(`Currency updated to ${code}`);
    } catch {
      showError("Failed to update currency");
    }
  };

  const handleToggleTheme = async (enableDark: boolean) => {
    const themeMode = enableDark ? "dark" : "light";
    try {
      await dispatch(updateTheme(themeMode)).unwrap();
      showSuccess(`Switched to ${themeMode === "dark" ? "Dark" : "Light"} mode`);
    } catch {
      showError("Failed to update theme");
    }
  };

  const lastSyncSubtitle = React.useMemo(() => {
    if (isGuest) return "Disabled in Guest Mode — Sign in to enable cloud sync";
    if (syncing || newSyncState?.isSyncing) return "Syncing with cloud…";
    if (!isAuthenticated) return "Sign in to enable cloud backup";
    if (syncState.lastSync) {
      return `Last synced: ${formatRelativeTime(new Date(syncState.lastSync).toISOString())}`;
    }
    return "Tap to sync your data with cloud";
  }, [isGuest, syncing, newSyncState?.isSyncing, isAuthenticated, syncState.lastSync]);

  const handleSyncNow = async () => {
    if (!isAuthenticated || isGuest) {
      showAlert(
        "Cloud Sync Unavailable",
        "Guest Mode stores your data locally on this device only. Sign in with an account to enable Firebase cloud backup and sync.",
        [
          { text: "Stay as Guest", style: "cancel" },
          {
            text: "Sign In",
            onPress: () => dispatch(signOut()),
          },
        ],
      );
      return;
    }
    if (syncing || newSyncState.isSyncing) {
      showError("Sync already in progress");
      return;
    }
    setSyncing(true);
    try {
      showSuccess("Syncing…");
      await dispatch(syncWithFirebase({ showToast: false })).unwrap();
      showSuccess("Synced with cloud!");
    } catch (e: any) {
      showError(
        e?.message?.includes("authenticated")
          ? "Please sign in first"
          : `Sync failed: ${e?.message || "Unknown"}`,
      );
    } finally {
      setSyncing(false);
    }
  };

  const doExport = async (period: string, format: "excel" | "csv") => {
    try {
      const list = Object.values(transactions || {});
      const cats = categories || {};
      const buds = budgets || {};
      const now = new Date();

      let filtered = list;
      if (period === "month") {
        const { start, end } = getDateRangeForBillingPeriod(currentBillingDay, now);
        filtered = list.filter((t) => {
          const d = new Date(t.date);
          return d >= start && d <= end;
        });
      } else if (period === "quarter") {
        const { start: currentStart, end: currentEnd } = getDateRangeForBillingPeriod(
          currentBillingDay,
          now,
        );
        const quarterStart = new Date(currentStart);
        quarterStart.setMonth(quarterStart.getMonth() - 2);
        filtered = list.filter((t) => {
          const d = new Date(t.date);
          return d >= quarterStart && d <= currentEnd;
        });
      }

      const data: ExportData = {
        exportDate: new Date().toISOString(),
        period,
        transactions: filtered,
        categories: cats,
        budgets: buds,
        summary: {
          totalTransactions: filtered.length,
          totalIncome: filtered
            .filter((t) => t.type === "income")
            .reduce((s, t) => s + t.amount, 0),
          totalExpenses: filtered
            .filter((t) => t.type === "expense")
            .reduce((s, t) => s + t.amount, 0),
        },
      };

      if (format === "excel") {
        await exportToExcel(data);
      } else {
        await exportToCSV(data);
      }
      showSuccess(
        `Exported ${filtered.length} transactions as ${format.toUpperCase()}`,
      );
    } catch (e: any) {
      showError(`Export failed: ${e?.message || "Unknown"}`);
    }
  };

  const pickFormat = (period: string) => {
    setTimeout(() => {
      showAlert("Export Format", "Choose file format:", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Excel (.xlsx)",
          onPress: () => doExport(period, "excel"),
        },
        {
          text: "CSV (.csv)",
          onPress: () => doExport(period, "csv"),
        },
        {
          text: "JSON Backup",
          onPress: async () => {
            try {
              await exportDatabaseToJSON();
              showSuccess("Database exported to console as JSON");
            } catch {
              showError("Export failed");
            }
          },
        },
      ]);
    }, 500);
  };

  const handleExportData = () => {
    showAlert("Export Data", "Choose export period:", [
      { text: "Cancel", style: "cancel" },
      { text: "Current Month", onPress: () => pickFormat("month") },
      { text: "Last 3 Months", onPress: () => pickFormat("quarter") },
      { text: "All Time", onPress: () => pickFormat("all") },
    ]);
  };

  const handleSignOut = () => dispatch(signOut());

  return {
    ...aiSettings,
    handleSignOut,
    navigation,
    user,
    showBillingDayPicker,
    setShowBillingDayPicker,
    showCurrencyPicker,
    setShowCurrencyPicker,
    billingDayInput,
    setBillingDayInput,
    showFirebaseCleanup,
    setShowFirebaseCleanup,
    AlertComponent,
    smsEnabled,
    showProfileModal,
    setShowProfileModal,
    profileNameInput,
    setProfileNameInput,
    savingProfile,
    notifSettings,
    isGuest,
    currentBillingDay,
    handleSaveProfile,
    handleReminderToggle,
    handleSmsToggle,
    parsedBillingDay,
    isBillingDayValid,
    getBillingDayError,
    saveBillingDay,
    handleSelectCurrency,
    handleToggleTheme,
    lastSyncSubtitle,
    handleSyncNow,
    handleExportData,
  };
}
