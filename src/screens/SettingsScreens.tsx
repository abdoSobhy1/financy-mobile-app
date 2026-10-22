import { AlertService } from "../services/AlertService";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StatusBar,
  Share,
  Alert,
  DeviceEventEmitter,
  TextInput,
} from "react-native";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import {
  RecurringFrequency,
  RecurringTransaction,
  SettingsStackParamList,
  TransactionType,
} from "../types";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch, store } from "../store";
import {
  useCustomAlert,
  useToast,
  CategoryCreationModal,
  FirebaseCleanupModal,
  SyncStatus,
  useTabBarHeight,
  ListRow,
  Card,
  AppHeader,
} from "../components/ui";
import { runSyncApplyTest, runAllSyncApplyTests } from "../debug/runSyncTest";
import { UI } from "../constants";
import NotificationService, {
  NotificationSettings,
} from "../services/notificationService";
import { securityService, LocalUserProfile } from "../services/securityService";
import { recurringService } from "../services/recurringService";
import { formatCurrency } from "../utils";
import {
  fetchSettings,
  updateBillingPeriodStartDay,
  updateCurrency,
  updateTheme,
} from "../store/slices/settingsSlice";
import { CURRENCY_METADATA, formatRelativeTime } from "../utils";
import {
  fetchCategories,
  addCategory,
  deleteCategory,
} from "../store/slices/categoriesSlice";
import { fetchBudgets } from "../store/slices/budgetsSlice";
import { fetchTransactions } from "../store/slices/transactionsSlice";
import { Category } from "../types";
import { exportToExcel, exportToCSV, ExportData } from "../utils/exportUtils";
import { exportDatabaseToJSON } from "../utils/databaseExport";
import { db } from "../database/queries";
import { useAuth } from "../contexts/AuthContext";
import { useSync } from "../contexts/SyncProvider";
import { setDebugMode, getDebugMode } from "../utils/logger";
import { getDeviceId } from "../utils/deviceId";
import { signOut } from "../store/slices/authSlice";
import {
  getSmsDetectionEnabled,
  setSmsDetectionEnabled,
  smsService,
} from "../services/smsService";
import { Platform } from "react-native";

type SettingsScreenNavigationProp = StackNavigationProp<SettingsStackParamList>;

// ── Reusable sub-components ──────────────────────────────────────────

const SectionLabel = ({ text }: { text: string }) => {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  return <Text style={styles.sectionLabel}>{text}</Text>;
};

const SettingRow = ({
  icon,
  iconGradient,
  title,
  subtitle,
  onPress,
  rightElement,
  destructive,
}: {
  icon: string;
  iconGradient?: [string, string];
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
}) => {
  const { colors } = useAppTheme();
  return (
    <ListRow
      title={title}
      subtitle={subtitle}
      onPress={onPress}
      leading={
        <View style={[{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" }, { backgroundColor: destructive ? colors.errorContainer : colors.primaryContainer }]}>
          <Ionicons name={icon as any} size={16} color={destructive ? colors.error : colors.primary} />
        </View>
      }
      trailing={rightElement || <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} />}
    />
  );
};

const GlassCard = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) => {
  const { colors } = useAppTheme();
  return <Card variant="outlined" style={StyleSheet.flatten([{ padding: 0, overflow: "hidden", marginBottom: 16 }, style])}>{children}</Card>;
};

// ═══════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════
export const SettingsScreen: React.FC = () => {
  const { colors, typography, spacing, radius, isDark, currencyCode, currencySymbol } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const tabBarHeight = useTabBarHeight();
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { items: categories } = useSelector(
    (state: RootState) => state.categories,
  );
  const { items: transactions } = useSelector(
    (state: RootState) => state.transactions,
  );
  const { items: budgets } = useSelector((state: RootState) => state.budgets);
  const settings = useSelector((state: RootState) => state.settings);
  const syncState = useSelector((state: RootState) => state.sync);
  const { user, isAuthenticated } = useAuth();
  const { syncState: newSyncState, fullRefresh } = useSync();

  // ── UI state ────────────────────────────────────────────────────
  const [showBillingDayPicker, setShowBillingDayPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [selectedBillingDay, setSelectedBillingDay] = useState(1);
  const [debugClickCount, setDebugClickCount] = useState(0);
  const [showDebugSection, setShowDebugSection] = useState(false);
  const [debugLoggingEnabled, setDebugLoggingEnabled] =
    useState(getDebugMode());
  const [addCategoryModalVisible, setAddCategoryModalVisible] = useState(false);
  const [showFirebaseCleanup, setShowFirebaseCleanup] = useState(false);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deviceId, setDeviceId] = useState<string>("");
  const { showAlert, AlertComponent } = useCustomAlert();
  const { showSuccess, showError } = useToast();
  const [smsEnabled, setSmsEnabled] = useState(true);

  // ── Profile, Security, Notifications & Recurring State ──────────
  const [localProfile, setLocalProfile] = useState<LocalUserProfile>({
    displayName: "Financy User",
    email: "",
    avatarColor: "#10B981",
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profileEmailInput, setProfileEmailInput] = useState("");

  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");

  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    transactionReminders: true,
    morningReminderTime: "09:00",
    eveningReminderTime: "20:00",
  });

  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringList, setRecurringList] = useState<RecurringTransaction[]>([]);
  const [newRecTitle, setNewRecTitle] = useState("");
  const [newRecAmount, setNewRecAmount] = useState("");
  const [newRecType, setNewRecType] = useState<TransactionType>("expense");
  const [newRecFreq, setNewRecFreq] = useState<RecurringFrequency>("monthly");

  const currentBillingDay = settings.data?.billingPeriodStartDay || 28;

  // ── Effects ─────────────────────────────────────────────────────
  useEffect(() => {
    if (settings.data)
      setSelectedBillingDay(settings.data.billingPeriodStartDay);
  }, [settings.data]);

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchSettings());
    dispatch(fetchTransactions());
    getDeviceId().then(setDeviceId);
    // Load SMS detection toggle state
    if (Platform.OS === "android") {
      getSmsDetectionEnabled().then(setSmsEnabled);
    }
    // Load local profile, PIN security, notifications & recurring rules
    securityService.getProfile().then((prof) => {
      setLocalProfile(prof);
      setProfileNameInput(prof.displayName);
      setProfileEmailInput(prof.email);
    });
    securityService.isAppLockEnabled().then(setAppLockEnabled);
    NotificationService.getInstance()
      .getNotificationSettings()
      .then(setNotifSettings)
      .catch(() => {});
    recurringService.getRecurringList().then(setRecurringList).catch(() => {});
  }, [dispatch]);

  const handleSaveProfile = async () => {
    try {
      const updated = await securityService.saveProfile({
        displayName: profileNameInput.trim() || "Financy User",
        email: profileEmailInput.trim(),
      });
      setLocalProfile(updated);
      setShowProfileModal(false);
      showSuccess("Profile updated");
    } catch {
      showError("Failed to update profile");
    }
  };

  const handleSavePinLock = async () => {
    const cleanPin = pinInput.trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      showError("Please enter a 4-digit numeric PIN");
      return;
    }
    if (cleanPin !== confirmPinInput.trim()) {
      showError("PIN codes do not match");
      return;
    }
    try {
      await securityService.setAppLockPin(cleanPin);
      setAppLockEnabled(true);
      setPinInput("");
      setConfirmPinInput("");
      setShowSecurityModal(false);
      showSuccess("4-digit App Lock PIN enabled");
    } catch {
      showError("Failed to set App Lock PIN");
    }
  };

  const handleDisablePinLock = async () => {
    try {
      await securityService.disableAppLock();
      setAppLockEnabled(false);
      setPinInput("");
      setConfirmPinInput("");
      setShowSecurityModal(false);
      showSuccess("App Lock disabled");
    } catch {
      showError("Failed to disable App Lock");
    }
  };

  const handleSaveNotifications = async () => {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (
      !timeRegex.test(notifSettings.morningReminderTime) ||
      !timeRegex.test(notifSettings.eveningReminderTime)
    ) {
      showError("Please enter valid times in HH:MM format (e.g. 09:00, 20:00)");
      return;
    }
    try {
      await NotificationService.getInstance().saveSettings(
        notifSettings,
      );
      setShowNotificationsModal(false);
      showSuccess("Daily reminder settings saved");
    } catch {
      showError("Failed to save notification settings");
    }
  };

  const handleTestNotification = async () => {
    try {
      await NotificationService.getInstance().scheduleTestNotification();
      showSuccess("Test notification sent!");
    } catch {
      showError("Could not send test notification");
    }
  };

  const handleAddRecurringRule = async () => {
    const amt = parseFloat(newRecAmount);
    if (!newRecTitle.trim() || !amt || amt <= 0) {
      showError("Please enter a title and valid amount");
      return;
    }
    const matchingCat =
      Object.values(categories).find(
        (c) => c && !c.deleted && c.type === newRecType,
      )?.id || "default";

    const updated = await recurringService.addRecurring({
      title: newRecTitle.trim(),
      amount: amt,
      type: newRecType,
      categoryId: matchingCat,
      frequency: newRecFreq,
      autoLog: true,
    });
    setRecurringList(updated);
    setNewRecTitle("");
    setNewRecAmount("");
    showSuccess("Recurring rule added");
  };

  const handleToggleRecurringRule = async (id: string) => {
    const updated = await recurringService.toggleRecurring(id);
    setRecurringList(updated);
  };

  const handleDeleteRecurringRule = async (id: string) => {
    const updated = await recurringService.deleteRecurring(id);
    setRecurringList(updated);
  };

  const handleSmsToggle = async (value: boolean) => {
    setSmsEnabled(value);
    await setSmsDetectionEnabled(value);
    if (value) {
      // Restart listener with current categories & budgets
      const state = (store as any).getState();
      const cats = Object.values(state.categories?.items || {}) as any[];
      const budgets = state.budgets?.items || {};
      const granted = await smsService.hasPermissions() || await smsService.requestPermissions();
      if (granted) {
        smsService.stopListening();
        smsService.startListening(
          cats.map((c: any) => ({ id: c.id, name: c.name })),
          budgets
        );
      }
      showSuccess("SMS detection enabled");
    } else {
      smsService.stopListening();
      showSuccess("SMS detection disabled");
    }
  };


  // ── Handlers ────────────────────────────────────────────────────

  const saveBillingDay = async () => {
    try {
      await dispatch(updateBillingPeriodStartDay(selectedBillingDay)).unwrap();
      setShowBillingDayPicker(false);
      showSuccess(`Billing period starts on day ${selectedBillingDay}`);
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

  const handleSelectTheme = async (themeMode: "dark" | "light") => {
    try {
      await dispatch(updateTheme(themeMode)).unwrap();
      setShowThemePicker(false);
      showSuccess(`Switched to ${themeMode === "dark" ? "Dark" : "Light"} theme`);
    } catch {
      showError("Failed to update theme");
    }
  };

  const lastSyncSubtitle = React.useMemo(() => {
    if (syncing || newSyncState?.isSyncing) return "Syncing with cloud…";
    if (!isAuthenticated) return "Sign in to enable cloud backup";
    if (syncState.lastSync) {
      return `Last synced: ${formatRelativeTime(new Date(syncState.lastSync).toISOString())}`;
    }
    return "Tap to sync your data with cloud";
  }, [syncing, newSyncState?.isSyncing, isAuthenticated, syncState.lastSync]);

  const handleComingSoon = (feature: string) => {
    AlertService.alert("Coming Soon", `The ${feature} feature is not yet available. Stay tuned!`, [{ text: "OK" }]);
  };

  const handleVersionClick = () => {
    const n = debugClickCount + 1;
    setDebugClickCount(n);
    if (n >= 6) {
      setShowDebugSection(true);
      showSuccess("Debug section enabled!");
    } else if (n >= 3) {
      showSuccess(`${6 - n} more taps to enable debug`);
    }
  };

  // ── Sync Now (bidirectional) ────────────────────────────────────
  const handleSyncNow = async () => {
    if (!isAuthenticated) {
      showError("Please sign in first");
      return;
    }
    if (syncing || newSyncState.isSyncing) {
      showError("Sync already in progress");
      return;
    }
    setSyncing(true);
    try {
      showSuccess("Syncing…");
      const { offlineFirstSync } = await import("../services/OfflineFirstSync");
      const push = await offlineFirstSync.pushAllDataToCloud();
      const pull = await offlineFirstSync.performComprehensiveCloudRestore();
      const msg = `Synced! ${push.totalUploaded} pushed, ${pull.itemsCreated + pull.itemsUpdated} pulled.`;
      showSuccess(msg);
      dispatch(fetchTransactions());
      dispatch(fetchCategories());
      dispatch(fetchBudgets());
      const errors = [...push.errors, ...pull.errors];
      if (errors.length)
        showError(`Completed with ${errors.length} warnings (see console)`);
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

  // ── Restore from Cloud ──────────────────────────────────────────
  const handleRestore = async () => {
    if (!isAuthenticated) {
      showError("Please sign in first");
      return;
    }
    if (syncing) return;
    setSyncing(true);
    try {
      showSuccess("Restoring cloud data…");
      const { offlineFirstSync } = await import("../services/OfflineFirstSync");
      const r = await offlineFirstSync.performComprehensiveCloudRestore();
      const total = r.itemsCreated + r.itemsUpdated;
      showSuccess(
        total > 0
          ? `Restored! ${r.itemsCreated} created, ${r.itemsUpdated} updated.`
          : "Already up to date.",
      );
      dispatch(fetchTransactions());
      dispatch(fetchCategories());
      dispatch(fetchBudgets());
      if (r.errors.length)
        showError(`Completed with ${r.errors.length} warnings`);
    } catch (e: any) {
      showError(
        e?.message?.includes("authenticated")
          ? "Please sign in first"
          : `Restore failed: ${e?.message || "Unknown"}`,
      );
    } finally {
      setSyncing(false);
    }
  };

  // ── Export ──────────────────────────────────────────────────────
  const handleExportData = () => {
    showAlert("Export Data", "Choose export period:", [
      { text: "Cancel", style: "cancel" },
      { text: "Current Month", onPress: () => pickFormat("month") },
      { text: "Last 3 Months", onPress: () => pickFormat("quarter") },
      { text: "All Time", onPress: () => pickFormat("all") },
    ]);
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

  const doExport = async (period: string, format: "excel" | "csv") => {
    try {
      const list = Object.values(transactions || {});
      const cats = categories || {};
      const buds = budgets || {};
      const now = new Date();

      const getBillingStart = (ref: Date, day: number) => {
        const c = new Date(ref.getFullYear(), ref.getMonth(), day);
        return ref >= c
          ? c
          : new Date(ref.getFullYear(), ref.getMonth() - 1, day);
      };

      let filtered = list;
      if (period === "month") {
        const s = getBillingStart(now, currentBillingDay);
        const e = new Date(
          s.getFullYear(),
          s.getMonth() + 1,
          currentBillingDay,
        );
        filtered = list.filter((t) => {
          const d = new Date(t.date);
          return d >= s && d < e;
        });
      } else if (period === "quarter") {
        const cs = getBillingStart(now, currentBillingDay);
        const s = new Date(
          cs.getFullYear(),
          cs.getMonth() - 2,
          currentBillingDay,
        );
        const e = new Date(
          cs.getFullYear(),
          cs.getMonth() + 1,
          currentBillingDay,
        );
        filtered = list.filter((t) => {
          const d = new Date(t.date);
          return d >= s && d < e;
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

  // ── Clear data ─────────────────────────────────────────────────
  const handleClearAllData = () => {
    showAlert(
      "Clear All Data",
      "This will delete all transactions, budgets, debts and reset settings. Categories will be preserved. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              await db.clearAllData();
              dispatch(fetchCategories());
              dispatch(fetchBudgets());
              dispatch(fetchTransactions());
              showSuccess("All data cleared (categories preserved)");
            } catch {
              showError("Failed to clear data");
            }
          },
        },
      ],
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

      {/* Top Header */}
      <AppHeader title="Settings" showSettings={false} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: tabBarHeight + 100 }} showsVerticalScrollIndicator={false}>
        <SectionLabel text="ACCOUNT" />
        <GlassCard>
          <SettingRow
            icon="person-outline"
            title={user?.displayName || localProfile.displayName || "Profile Information"}
            subtitle={
              user?.email
                ? `Signed in as ${user.email}`
                : localProfile.email
                  ? localProfile.email
                  : "Tap to customize your profile"
            }
            onPress={() => {
              setProfileNameInput(user?.displayName || localProfile.displayName);
              setProfileEmailInput(user?.email || localProfile.email);
              setShowProfileModal(true);
            }}
          />
          <SettingRow
            icon="shield-checkmark-outline"
            title="Security & App Lock"
            subtitle={
              appLockEnabled
                ? "4-digit PIN lock is active on startup & resume"
                : "Protect Financy with a 4-digit PIN lock"
            }
            rightElement={
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: appLockEnabled ? colors.primary : colors.onSurfaceVariant,
                  }}>
                  {appLockEnabled ? "Enabled" : "Off"}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} />
              </View>
            }
            onPress={() => setShowSecurityModal(true)}
          />
        </GlassCard>

        <SectionLabel text="PREFERENCES" />
        <GlassCard>
          <SettingRow
            icon="cash-outline"
            title="Currency"
            subtitle={`Base currency for display (${currencyCode} • ${currencySymbol})`}
            rightElement={
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={[typography.bodyLarge, { color: colors.primary, fontWeight: "700", marginRight: 8 }]}>
                  {currencyCode}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} />
              </View>
            }
            onPress={() => setShowCurrencyPicker(true)}
          />
          <SettingRow icon="calendar-outline" title="Billing Cycle" subtitle={`Starts on day ${currentBillingDay}`} onPress={() => setShowBillingDayPicker(true)} />
          <SettingRow
            icon={isDark ? "moon-outline" : "sunny-outline"}
            title="Theme"
            subtitle={isDark ? "Dark mode (Matte Slate)" : "Light mode (Crisp Alabaster)"}
            rightElement={
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginRight: 8 }]}>
                  {isDark ? "Dark" : "Light"}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} />
              </View>
            }
            onPress={() => setShowThemePicker(true)}
          />
          <SettingRow icon="apps-outline" title="Categories" subtitle="Manage transaction categories and icons" onPress={() => navigation.navigate("CategoryManagement")} />
          <SettingRow
            icon="wallet-outline"
            title="Wallets & Accounts"
            subtitle="Manage accounts, custom icons, and balances"
            onPress={() => navigation.navigate("WalletManagement")}
          />
          <SettingRow
            icon="repeat-outline"
            title="Recurring & Subscriptions"
            subtitle={
              recurringList.length > 0
                ? `${recurringList.filter((r) => r.active).length} active recurring rules`
                : "Auto-log recurring bills, subscriptions & salary"
            }
            onPress={() => {
              recurringService.getRecurringList().then(setRecurringList).catch(() => {});
              setShowRecurringModal(true);
            }}
          />
          <SettingRow
            icon="notifications-outline"
            title="Daily Reminders & Alerts"
            subtitle={
              notifSettings.transactionReminders
                ? `Active at ${notifSettings.morningReminderTime} & ${notifSettings.eveningReminderTime}`
                : "Reminders paused"
            }
            onPress={() => setShowNotificationsModal(true)}
          />
          {Platform.OS === "android" && (
            <>
              <SettingRow
                icon="chatbubble-outline"
                title="SMS Transaction Detection"
                subtitle={smsEnabled ? "Detects bank SMS and notifies you" : "Disabled — tap to enable"}
                rightElement={
                  <Switch
                    value={smsEnabled}
                    onValueChange={handleSmsToggle}
                    trackColor={{ false: colors.surfaceVariant, true: colors.primaryContainer }}
                    thumbColor={smsEnabled ? colors.primary : colors.onSurfaceVariant}
                  />
                }
                onPress={() => handleSmsToggle(!smsEnabled)}
              />
            </>
          )}
        </GlassCard>

        <SectionLabel text="DATA" />
        <GlassCard>
          <SettingRow icon="download-outline" title="Export Data" subtitle="Download your transaction history (CSV/Excel)" onPress={handleExportData} />
          <SettingRow icon="document-attach-outline" title="Import Data" subtitle="Import transactions from CSV or Excel" onPress={() => navigation.navigate("Import")} />
          <SettingRow icon="cloud-upload-outline" title="Backup & Sync" subtitle={lastSyncSubtitle} onPress={handleSyncNow} />
          <SettingRow icon="trash-outline" title="Cleanup Database" subtitle="Remove orphaned or invalid records" destructive onPress={() => setShowFirebaseCleanup(true)} />
        </GlassCard>

        <SectionLabel text="ABOUT" />
        <GlassCard>
          <SettingRow icon="information-circle-outline" title="About Financy" subtitle="Version 2.4.1 (Build 492)" onPress={handleVersionClick} />
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16 }}
            onPress={() => dispatch(signOut())}
          >
            <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.errorContainer, marginRight: 16 }}>
              <Ionicons name="log-out-outline" size={16} color={colors.error} />
            </View>
            <Text style={[typography.bodyLarge, { color: colors.error, fontWeight: "600" }]}>Sign Out</Text>
          </TouchableOpacity>
        </GlassCard>

      </ScrollView>

      {/* Currency Picker Modal */}
      <Modal visible={showCurrencyPicker} transparent animationType="fade" onRequestClose={() => setShowCurrencyPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Select Currency</Text>
            <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant }]}>
              Choose your primary display currency across all screens.
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {Object.entries(CURRENCY_METADATA).map(([code, meta]) => {
                const isSelected = currencyCode === code;
                return (
                  <TouchableOpacity
                    key={code}
                    style={[
                      styles.dayOption,
                      isSelected && styles.dayOptionActive,
                    ]}
                    onPress={() => handleSelectCurrency(code)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: isSelected ? colors.primary : colors.surfaceVariant,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: isSelected ? colors.onPrimary : colors.onSurface,
                            fontWeight: "700",
                            fontSize: 13,
                          }}
                        >
                          {meta.symbol}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>
                          {code}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.onSurfaceVariant }}>
                          {code === "EGP"
                            ? "Egyptian Pound"
                            : code === "USD"
                            ? "US Dollar"
                            : code === "EUR"
                            ? "Euro"
                            : code === "GBP"
                            ? "British Pound"
                            : code === "SAR"
                            ? "Saudi Riyal"
                            : "UAE Dirham"}
                        </Text>
                      </View>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCurrencyPicker(false)}>
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Theme Picker Modal */}
      <Modal visible={showThemePicker} transparent animationType="fade" onRequestClose={() => setShowThemePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Appearance</Text>
            <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant }]}>
              Choose your preferred color theme.
            </Text>
            {(
              [
                { key: "dark", label: "Dark Mode", desc: "Matte Slate with pastel emerald accents", icon: "moon" },
                { key: "light", label: "Light Mode", desc: "Crisp Alabaster with high-contrast text", icon: "sunny" },
              ] as const
            ).map((opt) => {
              const selected = (isDark ? "dark" : "light") === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.dayOption, selected && styles.dayOptionActive]}
                  onPress={() => handleSelectTheme(opt.key)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: selected ? colors.primary : colors.surfaceVariant,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name={opt.icon as any}
                        size={18}
                        color={selected ? colors.onPrimary : colors.onSurface}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dayText, selected && styles.dayTextActive]}>{opt.label}</Text>
                      <Text style={{ fontSize: 12, color: colors.onSurfaceVariant }}>{opt.desc}</Text>
                    </View>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowThemePicker(false)}>
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showBillingDayPicker} transparent animationType="fade" onRequestClose={() => setShowBillingDayPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Billing Cycle Start</Text>
            <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant }]}>Select the day of the month your billing cycle starts.</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayOption,
                    selectedBillingDay === day && styles.dayOptionActive,
                  ]}
                  onPress={() => setSelectedBillingDay(day)}>
                  <Text style={[styles.dayText, selectedBillingDay === day && styles.dayTextActive]}>Day {day}</Text>
                  {selectedBillingDay === day && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowBillingDayPicker(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]} onPress={saveBillingDay}>
                <Text style={[styles.modalSaveText, { color: colors.onPrimary }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile Information Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
            ]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
              Profile Information
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant }]}>
              Customize your display name and contact info.
            </Text>

            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: colors.onSurfaceVariant,
                marginBottom: 6,
              }}>
              DISPLAY NAME
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.surfaceVariant,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: colors.onSurface,
                fontSize: 15,
                marginBottom: 14,
              }}
              value={profileNameInput}
              onChangeText={setProfileNameInput}
              placeholder="Your Name"
              placeholderTextColor={colors.onSurfaceVariant}
            />

            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: colors.onSurfaceVariant,
                marginBottom: 6,
              }}>
              EMAIL ADDRESS (OPTIONAL)
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.surfaceVariant,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: colors.onSurface,
                fontSize: 15,
                marginBottom: 8,
              }}
              value={profileEmailInput}
              onChangeText={setProfileEmailInput}
              placeholder="name@example.com"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowProfileModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveProfile}>
                <Text style={[styles.modalSaveText, { color: colors.onPrimary }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Security & App Lock Modal */}
      <Modal
        visible={showSecurityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSecurityModal(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
            ]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
              App Lock (PIN Security)
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant }]}>
              {appLockEnabled
                ? "Enter a new 4-digit PIN to update your lock code, or disable App Lock below."
                : "Set a 4-digit numeric PIN to lock Financy when launched or resumed."}
            </Text>

            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: colors.onSurfaceVariant,
                marginBottom: 6,
              }}>
              4-DIGIT PIN
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.surfaceVariant,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: colors.onSurface,
                fontSize: 18,
                fontWeight: "700",
                letterSpacing: 8,
                textAlign: "center",
                marginBottom: 14,
              }}
              value={pinInput}
              onChangeText={(t) => setPinInput(t.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />

            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: colors.onSurfaceVariant,
                marginBottom: 6,
              }}>
              CONFIRM 4-DIGIT PIN
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.surfaceVariant,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: colors.onSurface,
                fontSize: 18,
                fontWeight: "700",
                letterSpacing: 8,
                textAlign: "center",
                marginBottom: 10,
              }}
              value={confirmPinInput}
              onChangeText={(t) =>
                setConfirmPinInput(t.replace(/\D/g, "").slice(0, 4))
              }
              placeholder="••••"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />

            {appLockEnabled && (
              <TouchableOpacity
                onPress={handleDisablePinLock}
                style={{
                  paddingVertical: 10,
                  alignItems: "center",
                  marginBottom: 4,
                }}>
                <Text
                  style={{
                    color: colors.error,
                    fontWeight: "700",
                    fontSize: 14,
                  }}>
                  Disable App Lock
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowSecurityModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSavePinLock}>
                <Text style={[styles.modalSaveText, { color: colors.onPrimary }]}>
                  {appLockEnabled ? "Update PIN" : "Enable Lock"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Daily Notifications & Reminders Modal */}
      <Modal
        visible={showNotificationsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotificationsModal(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
            ]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
              Daily Reminders
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant }]}>
              Schedule morning & evening reminders to log your daily expenses.
            </Text>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                backgroundColor: colors.surfaceVariant,
                padding: 12,
                borderRadius: 12,
              }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: colors.onSurface,
                }}>
                Enable Daily Reminders
              </Text>
              <Switch
                value={notifSettings.transactionReminders}
                onValueChange={(v) =>
                  setNotifSettings((prev) => ({
                    ...prev,
                    transactionReminders: v,
                  }))
                }
                trackColor={{
                  false: colors.outlineVariant,
                  true: colors.primaryContainer,
                }}
                thumbColor={
                  notifSettings.transactionReminders
                    ? colors.primary
                    : colors.onSurfaceVariant
                }
              />
            </View>

            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: colors.onSurfaceVariant,
                marginBottom: 6,
              }}>
              MORNING REMINDER (24H HH:MM)
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.surfaceVariant,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                color: colors.onSurface,
                fontSize: 15,
                marginBottom: 14,
              }}
              value={notifSettings.morningReminderTime}
              onChangeText={(t) =>
                setNotifSettings((prev) => ({
                  ...prev,
                  morningReminderTime: t,
                }))
              }
              placeholder="09:00"
              placeholderTextColor={colors.onSurfaceVariant}
            />

            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: colors.onSurfaceVariant,
                marginBottom: 6,
              }}>
              EVENING REMINDER (24H HH:MM)
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.surfaceVariant,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                color: colors.onSurface,
                fontSize: 15,
                marginBottom: 14,
              }}
              value={notifSettings.eveningReminderTime}
              onChangeText={(t) =>
                setNotifSettings((prev) => ({
                  ...prev,
                  eveningReminderTime: t,
                }))
              }
              placeholder="20:00"
              placeholderTextColor={colors.onSurfaceVariant}
            />

            <TouchableOpacity
              onPress={handleTestNotification}
              style={{
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: colors.secondaryContainer,
                alignItems: "center",
                marginBottom: 4,
              }}>
              <Text
                style={{
                  color: colors.onSecondaryContainer,
                  fontWeight: "700",
                  fontSize: 13,
                }}>
                Send Test Notification
              </Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowNotificationsModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveNotifications}>
                <Text style={[styles.modalSaveText, { color: colors.onPrimary }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Recurring & Subscriptions Modal */}
      <Modal
        visible={showRecurringModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRecurringModal(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.outlineVariant,
                maxHeight: "86%",
              },
            ]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
              Recurring & Subscriptions
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant }]}>
              Automatically log recurring bills, subscriptions, or salary.
            </Text>

            {/* Quick Add Recurring Rule */}
            <View
              style={{
                backgroundColor: colors.surfaceVariant,
                borderRadius: 14,
                padding: 12,
                marginBottom: 14,
              }}>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                <TextInput
                  style={{
                    flex: 1.4,
                    backgroundColor: colors.surface,
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    color: colors.onSurface,
                    fontSize: 13,
                  }}
                  value={newRecTitle}
                  onChangeText={setNewRecTitle}
                  placeholder="Title (e.g. Netflix, Rent)"
                  placeholderTextColor={colors.onSurfaceVariant}
                />
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: colors.surface,
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    color: colors.onSurface,
                    fontSize: 13,
                  }}
                  value={newRecAmount}
                  onChangeText={setNewRecAmount}
                  placeholder="Amount"
                  placeholderTextColor={colors.onSurfaceVariant}
                  keyboardType="decimal-pad"
                />
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 6,
                }}>
                {(["monthly", "weekly", "yearly"] as RecurringFrequency[]).map(
                  (freq) => {
                    const active = newRecFreq === freq;
                    return (
                      <TouchableOpacity
                        key={freq}
                        onPress={() => setNewRecFreq(freq)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: active
                            ? colors.primary
                            : colors.surface,
                        }}>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            textTransform: "capitalize",
                            color: active ? "#FFFFFF" : colors.onSurface,
                          }}>
                          {freq}
                        </Text>
                      </TouchableOpacity>
                    );
                  },
                )}
                <TouchableOpacity
                  onPress={() =>
                    setNewRecType(
                      newRecType === "expense" ? "income" : "expense",
                    )
                  }
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: colors.surface,
                  }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      textTransform: "capitalize",
                      color:
                        newRecType === "income" ? colors.primary : colors.error,
                    }}>
                    {newRecType}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddRecurringRule}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: colors.primary,
                  }}>
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={{ maxHeight: 260 }}>
              {recurringList.length === 0 ? (
                <Text
                  style={{
                    textAlign: "center",
                    color: colors.onSurfaceVariant,
                    paddingVertical: 20,
                    fontSize: 13,
                  }}>
                  No recurring transactions yet. Add one above or when creating a
                  transaction.
                </Text>
              ) : (
                recurringList.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor: colors.surfaceVariant,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                      opacity: item.active ? 1 : 0.55,
                    }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: colors.onSurface,
                        }}
                        numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.onSurfaceVariant,
                          marginTop: 2,
                        }}>
                        {formatCurrency(item.amount)} • {item.frequency} • Next:{" "}
                        {new Date(item.nextDueDate).toLocaleDateString()}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}>
                      <TouchableOpacity
                        onPress={() => handleToggleRecurringRule(item.id)}>
                        <Ionicons
                          name={
                            item.active
                              ? "pause-circle-outline"
                              : "play-circle-outline"
                          }
                          size={22}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteRecurringRule(item.id)}>
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color={colors.error}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowRecurringModal(false)}>
                <Text style={styles.modalCancelText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FirebaseCleanupModal
        visible={showFirebaseCleanup}
        onClose={() => setShowFirebaseCleanup(false)}
      />

      <AlertComponent />
    </SafeAreaView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.onBackground,
    letterSpacing: 0.3,
    marginBottom: 24,
  },

  // ── Section label ───────────────────────────────────
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryContainer,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 8,
    paddingHorizontal: 4,
  },

  // ── Glass Card ──────────────────────────────────────
  card: {
    backgroundColor: "rgba(20,20,50,0.55)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.15)",
    marginBottom: 20,
    overflow: "hidden",
  },
  dangerCard: {
    borderColor: "rgba(255,107,107,0.2)",
    backgroundColor: "rgba(255,107,107,0.04)",
  },

  // ── Row ─────────────────────────────────────────────
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.onBackground,
  },
  rowSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 16,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(108,92,231,0.08)",
    marginHorizontal: 16,
  },

  // ── Account ─────────────────────────────────────────
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "rgba(255,107,107,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.25)",
  },
  signOutText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FF6B6B",
  },

  // ── Category management ─────────────────────────────
  catGroupTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 10,
    marginBottom: 4,
  },
  catLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catName: {
    fontSize: 14,
    color: colors.onBackground,
  },
  addCatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.2)",
    borderStyle: "dashed",
  },
  addCatText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primaryContainer,
  },

  // ── Modal ───────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "88%",
    maxWidth: 380,
    maxHeight: "80%",
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.onBackground,
    textAlign: "center",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    marginBottom: 18,
  },
  dayOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: "transparent",
  },
  dayOptionActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 15,
    color: colors.onBackground,
  },
  dayTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  modalSaveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
