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
} from "react-native";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SettingsStackParamList } from "../types";
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
import NotificationService from "../services/notificationService";
import {
  fetchSettings,
  updateBillingPeriodStartDay,
} from "../store/slices/settingsSlice";
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
  const { colors, typography, spacing, radius } = useAppTheme();
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
  }, [dispatch]);

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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Top Header */}
      <AppHeader title="Settings" showSettings={false} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: tabBarHeight + 100 }} showsVerticalScrollIndicator={false}>
        <SectionLabel text="ACCOUNT" />
        <GlassCard>
          <SettingRow icon="person-outline" title="Profile Information" subtitle="Update your name, email, and avatar" onPress={() => handleComingSoon("Profile")} />
          <SettingRow icon="shield-checkmark-outline" title="Security" subtitle="Password, 2FA, and linked devices" onPress={() => handleComingSoon("Security")} />
        </GlassCard>

        <SectionLabel text="PREFERENCES" />
        <GlassCard>
          <SettingRow icon="cash-outline" title="Currency" subtitle="Base currency for display (USD)" rightElement={<View style={{ flexDirection: "row", alignItems: "center" }}><Text style={[typography.bodyLarge, { color: colors.onSurfaceVariant, marginRight: 8 }]}>USD</Text><Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} /></View>} onPress={() => handleComingSoon("Currency")} />
          <SettingRow icon="calendar-outline" title="Billing Cycle" subtitle={`Starts on day ${currentBillingDay}`} onPress={() => setShowBillingDayPicker(true)} />
          <SettingRow icon="globe-outline" title="Language" subtitle="English (US)" rightElement={<Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} />} onPress={() => handleComingSoon("Language")} />
          <SettingRow icon="moon-outline" title="Theme" subtitle="Dark mode" rightElement={<Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} />} onPress={() => handleComingSoon("Theme")} />
          <SettingRow icon="apps-outline" title="Categories" subtitle="Manage transaction categories and icons" onPress={() => navigation.navigate("CategoryManagement")} />
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
          <SettingRow icon="download-outline" title="Export Data" subtitle="Download your transaction history (CSV/PDF)" onPress={handleExportData} />
          <SettingRow icon="cloud-upload-outline" title="Backup & Sync" subtitle="Last synced: Today, 10:42 AM" onPress={handleSyncNow} />
          <SettingRow icon="trash-outline" title="Cleanup Database" subtitle="Remove orphaned or invalid records" destructive onPress={() => setShowFirebaseCleanup(true)} />
        </GlassCard>

        <SectionLabel text="ABOUT" />
        <GlassCard>
          <SettingRow icon="information-circle-outline" title="About Financy" subtitle="Version 2.4.1 (Build 492)" onPress={handleVersionClick} />
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16 }}
            onPress={() => dispatch(signOut())}
          >
            <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,107,107,0.1)", marginRight: 16 }}>
              <Ionicons name="log-out-outline" size={16} color="#FF6B6B" />
            </View>
            <Text style={[typography.bodyLarge, { color: "#FF6B6B", fontWeight: "600" }]}>Sign Out</Text>
          </TouchableOpacity>
        </GlassCard>

      </ScrollView>

      {/* Category modal removed – navigate to CategoriesScreen instead */}

      <Modal visible={showBillingDayPicker} transparent animationType="fade" onRequestClose={() => setShowBillingDayPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
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
                  {selectedBillingDay === day && <Ionicons name="checkmark" size={20} color={colors.primaryContainer} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowBillingDayPicker(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.primaryContainer }]} onPress={saveBillingDay}>
                <Text style={styles.modalSaveText}>Save</Text>
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
    backgroundColor: "#161638",
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.2)",
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
    marginBottom: 4,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  dayOptionActive: {
    backgroundColor: "rgba(108,92,231,0.12)",
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.3)",
  },
  dayText: {
    fontSize: 15,
    color: colors.onBackground,
  },
  dayTextActive: {
    color: colors.primaryContainer,
    fontWeight: "600",
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
    borderColor: "rgba(108,92,231,0.2)",
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
