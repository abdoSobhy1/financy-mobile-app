import { AlertService } from "../services/AlertService";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StatusBar,
  Share,
  Alert,
  DeviceEventEmitter,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import {
  getAIConfig,
  saveAIConfig,
  testAIConnection,
  AIConfig,
  AIProvider,
} from "../services/aiConfigService";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import {
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
  Switch,
} from "../components/ui";
import { runSyncApplyTest, runAllSyncApplyTests } from "../debug/runSyncTest";
import { UI } from "../constants";
import NotificationService, {
  NotificationSettings,
} from "../services/notificationService";
import { securityService, LocalUserProfile } from "../services/securityService";
import { formatCurrency } from "../utils";
import {
  fetchSettings,
  updateBillingPeriodStartDay,
  updateCurrency,
  updateTheme,
} from "../store/slices/settingsSlice";
import { CURRENCY_METADATA, formatRelativeTime, getDateRangeForBillingPeriod } from "../utils";
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
  const [selectedBillingDay, setSelectedBillingDay] = useState(28);
  const [billingDayInput, setBillingDayInput] = useState<string>("28");
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

  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    transactionReminders: true,
    morningReminderTime: "09:00",
    eveningReminderTime: "20:00",
  });

  // ── AI Configuration State ──────────────────────────────────────
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig>({ provider: "gemini", apiKey: "" });
  const [aiKeyInput, setAiKeyInput] = useState("");
  const [selectedAiProvider, setSelectedAiProvider] = useState<AIProvider>("gemini");
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [showAiKeySecret, setShowAiKeySecret] = useState(false);

  const currentBillingDay = settings.data?.billingPeriodStartDay || 28;

  // ── Effects ─────────────────────────────────────────────────────
  useEffect(() => {
    if (settings.data) {
      setSelectedBillingDay(settings.data.billingPeriodStartDay);
      setBillingDayInput(String(settings.data.billingPeriodStartDay));
    }
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
    // Load local profile, notifications & recurring rules
    securityService.getProfile().then((prof) => {
      setLocalProfile(prof);
      setProfileNameInput(prof.displayName);
      setProfileEmailInput(prof.email);
    });
    NotificationService.getInstance()
      .getNotificationSettings()
      .then(setNotifSettings)
      .catch(() => {});
    getAIConfig().then((cfg) => {
      setAiConfig(cfg);
      setAiKeyInput(cfg.apiKey || "");
      setSelectedAiProvider(cfg.provider);
    });
  }, [dispatch]);

  const handleSaveAiConfig = async () => {
    const updated: AIConfig = {
      provider: selectedAiProvider,
      apiKey: aiKeyInput.trim(),
    };
    await saveAIConfig(updated);
    setAiConfig(updated);
    setShowAiModal(false);
    showSuccess("AI configuration saved!");
  };

  const handleTestAi = async () => {
    setIsTestingAi(true);
    const res = await testAIConnection({
      provider: selectedAiProvider,
      apiKey: aiKeyInput.trim(),
    });
    setIsTestingAi(false);
    if (res.success) {
      showSuccess(res.message);
    } else {
      showError(res.message);
    }
  };

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

  const handleReminderToggle = async (value: boolean) => {
    try {
      setNotifSettings((prev) => ({
        ...prev,
        transactionReminders: value,
      }));
      await NotificationService.getInstance().saveSettings({
        transactionReminders: value,
      });
      showSuccess(value ? "Daily reminders enabled" : "Daily reminders disabled");
    } catch {
      showError("Failed to update reminder settings");
    }
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

  const parsedBillingDay = parseInt(billingDayInput.trim(), 10);
  const isBillingDayNumeric = /^\d+$/.test(billingDayInput.trim());
  const isBillingDayValid = isBillingDayNumeric && parsedBillingDay >= 1 && parsedBillingDay <= 30;

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
      setSelectedBillingDay(parsedBillingDay);
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

      let filtered = list;
      if (period === "month") {
        const { start, end } = getDateRangeForBillingPeriod(currentBillingDay, now);
        filtered = list.filter((t) => {
          const d = new Date(t.date);
          return d >= start && d <= end;
        });
      } else if (period === "quarter") {
        const { start: currentStart, end: currentEnd } = getDateRangeForBillingPeriod(currentBillingDay, now);
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
          <SettingRow
            icon="calendar-outline"
            title="Billing Cycle"
            subtitle={`Starts on day ${currentBillingDay} of each month`}
            onPress={() => {
              setBillingDayInput(String(currentBillingDay));
              setShowBillingDayPicker(true);
            }}
          />
          <SettingRow
            icon={isDark ? "moon-outline" : "sunny-outline"}
            title="Dark Mode"
            subtitle={isDark ? "Active — Matte Slate dark theme" : "Disabled — Crisp Alabaster light theme"}
            rightElement={
              <Switch
                value={isDark}
                onValueChange={handleToggleTheme}
              />
            }
            onPress={() => handleToggleTheme(!isDark)}
          />
          <SettingRow icon="apps-outline" title="Categories" subtitle="Manage transaction categories and icons" onPress={() => navigation.navigate("CategoryManagement")} />
          <SettingRow
            icon="wallet-outline"
            title="Wallets & Accounts"
            subtitle="Manage accounts, custom icons, and balances"
            onPress={() => navigation.navigate("WalletManagement")}
          />
          <SettingRow
            icon="notifications-outline"
            title="Daily Reminders"
            subtitle={
              notifSettings.transactionReminders
                ? "Active — morning & evening reminders"
                : "Disabled — tap to enable"
            }
            rightElement={
              <Switch
                value={notifSettings.transactionReminders}
                onValueChange={handleReminderToggle}
              />
            }
            onPress={() => handleReminderToggle(!notifSettings.transactionReminders)}
          />
          {Platform.OS === "android" && (
            <>
              <SettingRow
                icon="chatbubble-outline"
                title="SMS Transaction Detection"
                subtitle={smsEnabled ? "Active — listening for bank SMS" : "Disabled — tap to enable"}
                rightElement={
                  <Switch
                    value={smsEnabled}
                    onValueChange={handleSmsToggle}
                  />
                }
                onPress={() => handleSmsToggle(!smsEnabled)}
              />
              {smsEnabled && (
                <SettingRow
                  icon="code-working-outline"
                  title="SMS Detector Customization"
                  subtitle="Customize bank senders, keywords & parsing rules"
                  onPress={() => navigation.navigate("SmsSettings")}
                />
              )}
            </>
          )}
        </GlassCard>

        <SectionLabel text="AI ASSISTANT" />
        <GlassCard>
          <SettingRow
            icon="sparkles-outline"
            title="Cloud AI Assistant"
            subtitle={
              aiConfig?.apiKey
                ? `${aiConfig.provider === "gemini" ? "Google Gemini" : aiConfig.provider === "groq" ? "Groq Llama 3.3" : "OpenAI"} Active`
                : "Configure free Google Gemini or Groq key"
            }
            onPress={() => setShowAiModal(true)}
          />
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

      <Modal visible={showBillingDayPicker} transparent animationType="fade" onRequestClose={() => setShowBillingDayPicker(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Billing Cycle Start</Text>
            <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant }]}>
              Enter the day of the month your billing cycle starts (1 to 30 inclusive).
            </Text>

            <View style={{ marginBottom: 14 }}>
              <Text style={[styles.inputLabel, { color: colors.onSurfaceVariant, marginBottom: 8 }]}>
                Start Day of Month (1–30)
              </Text>
              <TextInput
                style={[
                  styles.billingNumberInput,
                  {
                    backgroundColor: colors.surfaceVariant,
                    color: colors.onSurface,
                    borderColor: !isBillingDayValid && billingDayInput.length > 0 ? colors.error : colors.outlineVariant,
                  },
                ]}
                value={billingDayInput}
                onChangeText={(text) => setBillingDayInput(text.replace(/[^0-9]/g, ""))}
                placeholder="e.g. 28"
                placeholderTextColor={colors.onSurfaceVariant}
                keyboardType="number-pad"
                maxLength={2}
                autoFocus
              />

              {/* Quick Presets */}
              <View style={styles.quickPresetRow}>
                <Text style={[styles.quickPresetLabel, { color: colors.onSurfaceVariant }]}>Common:</Text>
                {[1, 5, 15, 25, 28, 30].map((presetDay) => (
                  <TouchableOpacity
                    key={presetDay}
                    style={[
                      styles.quickPresetChip,
                      {
                        backgroundColor:
                          parsedBillingDay === presetDay
                            ? colors.primary
                            : colors.surfaceVariant,
                      },
                    ]}
                    onPress={() => setBillingDayInput(String(presetDay))}
                  >
                    <Text
                      style={[
                        styles.quickPresetChipText,
                        {
                          color:
                            parsedBillingDay === presetDay
                              ? colors.onPrimary
                              : colors.onSurfaceVariant,
                        },
                      ]}
                    >
                      {presetDay}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Validation Feedback & February Handling Note */}
            {!isBillingDayValid && billingDayInput.length > 0 && (
              <View style={[styles.billingNoticeCard, { backgroundColor: colors.errorContainer, borderColor: colors.error }]}>
                <Ionicons name="alert-circle" size={18} color={colors.onErrorContainer} />
                <Text style={[styles.billingNoticeText, { color: colors.onErrorContainer, marginLeft: 8, flex: 1 }]}>
                  {getBillingDayError()}
                </Text>
              </View>
            )}

            {isBillingDayValid && parsedBillingDay >= 29 && (
              <View style={[styles.billingNoticeCard, { backgroundColor: colors.secondaryContainer, borderColor: colors.secondary }]}>
                <Ionicons name="information-circle" size={18} color={colors.onSecondaryContainer} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.billingNoticeTitle, { color: colors.onSecondaryContainer }]}>
                    February Handling
                  </Text>
                  <Text style={[styles.billingNoticeText, { color: colors.onSecondaryContainer }]}>
                    February has 28 days (29 in leap years). For February, your cycle automatically starts on the final day of the month (Feb 28/29).
                  </Text>
                </View>
              </View>
            )}

            {isBillingDayValid && parsedBillingDay === 1 && (
              <View style={[styles.billingNoticeCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.outlineVariant }]}>
                <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.billingNoticeText, { color: colors.onSurface }]}>
                    Cycle aligns with standard calendar months (1st to the last day of each month).
                  </Text>
                </View>
              </View>
            )}

            {isBillingDayValid && parsedBillingDay > 1 && parsedBillingDay < 29 && (
              <View style={[styles.billingNoticeCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.outlineVariant }]}>
                <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.billingNoticeText, { color: colors.onSurface }]}>
                    Cycle runs from Day {parsedBillingDay} of each month to Day {parsedBillingDay - 1} of the next month.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowBillingDayPicker(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  {
                    backgroundColor: isBillingDayValid ? colors.primary : colors.surfaceVariant,
                    opacity: isBillingDayValid ? 1 : 0.6,
                  },
                ]}
                disabled={!isBillingDayValid}
                onPress={saveBillingDay}
              >
                <Text style={[styles.modalSaveText, { color: isBillingDayValid ? colors.onPrimary : colors.onSurfaceVariant }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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

      {/* ── AI Configuration Modal ── */}
      <Modal
        visible={showAiModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAiModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant, maxWidth: 440 },
            ]}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.primaryContainer,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}>
                <Ionicons name="sparkles" size={20} color={colors.onPrimaryContainer} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.onSurface, marginBottom: 2 }]}>
                  Cloud AI Assistant
                </Text>
                <Text style={{ fontSize: 13, color: colors.onSurfaceVariant }}>
                  Intelligent receipt & voice understanding
                </Text>
              </View>
            </View>

            {/* Provider Selection */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors.onSurfaceVariant,
                marginBottom: 8,
                marginTop: 6,
                letterSpacing: 0.5,
              }}>
              SELECT PROVIDER
            </Text>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              {[
                { id: "gemini" as const, label: "Google Gemini", tag: "Free" },
                { id: "groq" as const, label: "Groq Llama", tag: "Fast" },
                { id: "openai" as const, label: "OpenAI", tag: "" },
              ].map((p) => {
                const isSelected = selectedAiProvider === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setSelectedAiProvider(p.id)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      borderRadius: 12,
                      backgroundColor: isSelected ? colors.primaryContainer : colors.surfaceVariant,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.primary : "transparent",
                      alignItems: "center",
                    }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected ? "700" : "500",
                        color: isSelected ? colors.onPrimaryContainer : colors.onSurfaceVariant,
                      }}>
                      {p.label}
                    </Text>
                    {p.tag ? (
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "700",
                          color: colors.primary,
                          marginTop: 2,
                        }}>
                        {p.tag}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* API Key Input */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors.onSurfaceVariant,
                marginBottom: 6,
                letterSpacing: 0.5,
              }}>
              {selectedAiProvider.toUpperCase()} API KEY
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.surfaceVariant,
                borderRadius: 12,
                paddingHorizontal: 12,
                marginBottom: 10,
              }}>
              <TextInput
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  color: colors.onSurface,
                  fontSize: 14,
                }}
                value={aiKeyInput}
                onChangeText={setAiKeyInput}
                placeholder={
                  selectedAiProvider === "gemini"
                    ? "AIzaSy..."
                    : selectedAiProvider === "groq"
                    ? "gsk_..."
                    : "sk-..."
                }
                placeholderTextColor={colors.onSurfaceVariant}
                secureTextEntry={!showAiKeySecret}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowAiKeySecret(!showAiKeySecret)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons
                  name={showAiKeySecret ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            </View>

            {/* Helpful link to get key */}
            <TouchableOpacity
              onPress={() => {
                if (selectedAiProvider === "gemini") {
                  Linking.openURL("https://aistudio.google.com/app/apikey");
                } else if (selectedAiProvider === "groq") {
                  Linking.openURL("https://console.groq.com/keys");
                } else {
                  Linking.openURL("https://platform.openai.com/api-keys");
                }
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 6,
                marginBottom: 16,
              }}>
              <Ionicons name="open-outline" size={14} color={colors.primary} />
              <Text
                style={{
                  fontSize: 12,
                  color: colors.primary,
                  fontWeight: "600",
                  marginLeft: 6,
                  textDecorationLine: "underline",
                }}>
                {selectedAiProvider === "gemini"
                  ? "Get 100% Free Gemini API Key (No card required)"
                  : selectedAiProvider === "groq"
                  ? "Get Free Groq API Key (console.groq.com)"
                  : "Get OpenAI API Key"}
              </Text>
            </TouchableOpacity>

            {/* Test Connection Button */}
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: colors.surfaceVariant,
                borderWidth: 1,
                borderColor: colors.outlineVariant,
                marginBottom: 16,
              }}
              onPress={handleTestAi}
              disabled={isTestingAi}>
              {isTestingAi ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="flash-outline" size={16} color={colors.primary} />
              )}
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: "600",
                  fontSize: 13,
                  marginLeft: 6,
                }}>
                {isTestingAi ? "Testing Connection..." : "Test API Key"}
              </Text>
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAiModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveAiConfig}>
                <Text style={[styles.modalSaveText, { color: colors.onPrimary }]}>
                  Save Key
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    backgroundColor: colors.outlineVariant,
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
    backgroundColor: colors.surfaceVariant,
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
    borderColor: colors.outlineVariant,
    borderStyle: "dashed",
  },
  addCatText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
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
  billingNumberInput: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  quickPresetRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    flexWrap: "wrap",
    gap: 6,
  },
  quickPresetLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginRight: 4,
  },
  quickPresetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  quickPresetChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  billingNoticeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  billingNoticeTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  billingNoticeText: {
    fontSize: 12,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
});
