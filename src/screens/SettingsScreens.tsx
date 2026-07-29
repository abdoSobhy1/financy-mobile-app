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
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SettingsStackParamList } from "../types";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../store";
import {
  useCustomAlert,
  useToast,
  CategoryCreationModal,
  FirebaseCleanupModal,
  SyncStatus,
  WalletModal,
  TransferModal,
} from "../components/ui";
import { runSyncApplyTest, runAllSyncApplyTests } from "../debug/runSyncTest";
import { UI } from "../constants";
import { useAppTheme, categoryPalette } from "../theme";
import {
  getCategoryColorKey,
  getCategoryIconName,
} from "../utils/categoryDictionary";
import NotificationService from "../services/notificationService";
import { smsService } from "../services/smsService";
import {
  fetchSettings,
  updateBillingPeriodStartDay,
} from "../store/slices/settingsSlice";
import {
  fetchCategories,
  addCategory,
  deleteCategory,
  updateCategory,
} from "../store/slices/categoriesSlice";
import {
  fetchWallets,
  addWallet,
  editWallet,
  removeWallet,
  transferBetweenWallets,
} from "../store/slices/walletsSlice";
import { fetchBudgets } from "../store/slices/budgetsSlice";
import { fetchTransactions } from "../store/slices/transactionsSlice";
import { Category, Wallet, WalletFormData } from "../types";
import { exportToExcel, exportToCSV, ExportData } from "../utils/exportUtils";
import { exportDatabaseToJSON } from "../utils/databaseExport";
import { db } from "../database/queries";
import { useAuth } from "../contexts/AuthContext";
import { useSync } from "../contexts/SyncProvider";
import { setDebugMode, getDebugMode } from "../utils/logger";
import { getDeviceId } from "../utils/deviceId";
import { signOut } from "../store/slices/authSlice";

type SettingsScreenNavigationProp = StackNavigationProp<SettingsStackParamList>;

// ── Reusable sub-components ──────────────────────────────────────────

const SectionLabel = ({ text }: { text: string }) => (
  <Text style={styles.sectionLabel}>{text}</Text>
);

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
}) => (
  <TouchableOpacity
    style={styles.row}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={0.7}>
    <LinearGradient
      colors={
        iconGradient ||
        (destructive
          ? ["#FF6B6B", "#EE5A24"]
          : [UI.COLORS.PRIMARY, UI.COLORS.PRIMARY_DARK])
      }
      style={styles.rowIcon}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}>
      <Ionicons name={icon as any} size={16} color="#fff" />
    </LinearGradient>
    <View style={styles.rowText}>
      <Text
        style={[styles.rowTitle, destructive && { color: "#FF6B6B" }]}
        numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.rowSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </View>
    {rightElement || (
      <Ionicons
        name="chevron-forward"
        size={16}
        color="rgba(255,255,255,0.2)"
      />
    )}
  </TouchableOpacity>
);

const GlassCard = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) => <View style={[styles.card, style]}>{children}</View>;

// ═══════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════
export const SettingsScreen: React.FC = () => {
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
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showFirebaseCleanup, setShowFirebaseCleanup] = useState(false);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const { items: wallets } = useSelector((state: RootState) => state.wallets);
  const [showWalletManagement, setShowWalletManagement] = useState(false);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deviceId, setDeviceId] = useState<string>("");
  const [smsEnabled, setSmsEnabled] = useState(false);
  const { showAlert, AlertComponent } = useCustomAlert();
  const { showSuccess, showError } = useToast();

  const currentBillingDay = settings.data?.billingPeriodStartDay || 28;

  // ── Effects ─────────────────────────────────────────────────────
  useEffect(() => {
    if (settings.data)
      setSelectedBillingDay(settings.data.billingPeriodStartDay);
  }, [settings.data]);

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchWallets());
    dispatch(fetchSettings());
    dispatch(fetchTransactions());
    getDeviceId().then(setDeviceId);
  }, [dispatch]);

  useEffect(() => {
    if (Platform.OS === "android") {
      smsService.hasPermissions().then((hasPerms) => {
        setSmsEnabled(hasPerms);
        if (hasPerms) {
          smsService.startListening(categories, budgets);
        }
      });
    }
  }, [categories, budgets]);

  // ── Handlers ────────────────────────────────────────────────────
  const handleSmsToggle = async (value: boolean) => {
    if (Platform.OS !== "android") return;
    if (value) {
      const granted = await smsService.requestPermissions();
      if (granted) {
        setSmsEnabled(true);
        smsService.startListening(categories, budgets);
        showSuccess("Bank SMS Auto-Detection enabled");
      } else {
        setSmsEnabled(false);
        showError("SMS permissions denied. Could not enable Bank SMS Auto-Detection.");
      }
    } else {
      setSmsEnabled(false);
      smsService.stopListening();
      showSuccess("Bank SMS Auto-Detection disabled");
    }
  };


  const saveBillingDay = async () => {
    try {
      await dispatch(updateBillingPeriodStartDay(selectedBillingDay)).unwrap();
      setShowBillingDayPicker(false);
      showSuccess(`Billing period starts on day ${selectedBillingDay}`);
    } catch {
      showError("Failed to update billing period");
    }
  };

  const handleSaveWallet = async (walletData: WalletFormData) => {
    try {
      if (editingWallet) {
        await dispatch(
          editWallet({ id: editingWallet.id, updates: walletData })
        ).unwrap();
        showSuccess("Wallet updated");
      } else {
        await dispatch(addWallet(walletData)).unwrap();
        showSuccess("Wallet created");
      }
    } catch (e: any) {
      showError(e?.message || "Failed to save wallet");
    } finally {
      setEditingWallet(null);
    }
  };

  const handleTransfer = async (data: {
    fromWalletId: string;
    toWalletId: string;
    amount: string;
    description?: string;
    note?: string;
  }) => {
    try {
      await dispatch(transferBetweenWallets(data)).unwrap();
      showSuccess("Transfer completed");
    } catch (e: any) {
      showError(e?.message || "Transfer failed");
    }
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

  // ── Add category ───────────────────────────────────────────────
  const handleNewCategoryAdd = async (categoryData: {
    name: string;
    type: "income" | "expense";
    color?: string;
    icon?: string;
  }) => {
    const arr = Object.values(categories);
    if (
      arr.find(
        (c) =>
          c.name.toLowerCase() === categoryData.name.toLowerCase() &&
          c.type === categoryData.type,
      )
    ) {
      showError("Category already exists");
      return;
    }
    try {
      await dispatch(addCategory(categoryData)).unwrap();
      setAddCategoryModalVisible(false);
      showSuccess(`Category "${categoryData.name}" added`);
    } catch (e: any) {
      showError(e?.message || "Failed to add category");
    }
  };

  const handleCategoryUpdate = async (
    id: string,
    categoryData: {
      name: string;
      type: "income" | "expense";
      color?: string;
      icon?: string;
    },
  ) => {
    try {
      await dispatch(updateCategory({ id, updates: categoryData })).unwrap();
      setAddCategoryModalVisible(false);
      setEditingCategory(null);
      showSuccess(`Category "${categoryData.name}" updated`);
    } catch (e: any) {
      showError(e?.message || "Failed to update category");
    }
  };

  // ── Export Category Map (dev tool) ────────────────────────────
  const handleExportCategoryMap = async () => {
    try {
      const txList = Object.values(transactions || {});
      const cats = categories || {};

      // Group descriptions by categoryId
      const grouped: Record<string, Set<string>> = {};
      for (const tx of txList) {
        if (!tx.categoryId || !tx.description) continue;
        if (!grouped[tx.categoryId]) grouped[tx.categoryId] = new Set();
        grouped[tx.categoryId].add(tx.description.trim());
      }

      // Resolve to category names
      const result: Record<string, string[]> = {};
      for (const [catId, descs] of Object.entries(grouped)) {
        const catName = cats[catId]?.name || `Unknown (${catId})`;
        result[catName] = Array.from(descs).sort();
      }

      const json = JSON.stringify(result, null, 2);
      console.log("=== CATEGORY MAP ===");
      console.log(json);

      await Share.share({ message: json, title: "Category Map" });
      const catCount = Object.keys(result).length;
      showSuccess(`Exported ${catCount} categories with descriptions`);
    } catch (e: any) {
      if (e?.message !== "User did not share") {
        showError(`Export failed: ${e?.message || "Unknown"}`);
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <LinearGradient
      colors={["#0a0a2e", "#1a1040", "#0d0d30"]}
      style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          {/* ── Header ──────────────────────────────────── */}
          <Text style={styles.screenTitle}>Settings</Text>

          {/* ══ ACCOUNT ══════════════════════════════════ */}
          <SectionLabel text="Account" />
          <GlassCard>
            {isAuthenticated ? (
              <>
                <View style={styles.accountRow}>
                  <LinearGradient
                    colors={[UI.COLORS.PRIMARY, UI.COLORS.PRIMARY_DARK]}
                    style={styles.avatar}>
                    <Ionicons name="person" size={20} color="#fff" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {user?.email || "Unknown"}
                    </Text>
                    <Text style={styles.rowSubtitle}>Signed in</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.signOutPill}
                    onPress={() => dispatch(signOut())}>
                    <Text style={styles.signOutText}>Sign Out</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <SettingRow
                icon="log-in"
                title="Sign In"
                subtitle="Sign in to sync your data across devices"
              />
            )}
          </GlassCard>

          {/* ══ PREFERENCES ══════════════════════════════ */}
          <SectionLabel text="Preferences" />
          <GlassCard>
            <SettingRow
              icon="calendar"
              iconGradient={["#F59E0B", "#D97706"]}
              title="Billing Start Day"
              subtitle={`Day ${currentBillingDay} of each month`}
              onPress={() => setShowBillingDayPicker(true)}
            />
            {Platform.OS === "android" && (
              <>
                <View style={styles.separator} />
                <SettingRow
                  icon="chatbubble-ellipses"
                  iconGradient={["#10B981", "#059669"]}
                  title="Bank SMS Auto-Detection"
                  subtitle={
                    smsEnabled
                      ? "Listening for bank SMS messages"
                      : "Auto-detect bank transactions from SMS (Android only)"
                  }
                  rightElement={
                    <Switch
                      value={smsEnabled}
                      onValueChange={handleSmsToggle}
                      trackColor={{ false: "#333", true: "#10B981" }}
                      thumbColor="#fff"
                    />
                  }
                />
              </>
            )}
          </GlassCard>

          {/* ══ CLOUD SYNC ═══════════════════════════════ */}
          {isAuthenticated && (
            <>
              <SectionLabel text="Cloud Sync" />
              <GlassCard>
                <SettingRow
                  icon="sync"
                  iconGradient={["#2ED573", "#1B9C4F"]}
                  title="Sync Now"
                  subtitle={
                    syncing || newSyncState.isSyncing
                      ? "Syncing…"
                      : "Push local changes & pull from cloud"
                  }
                  onPress={handleSyncNow}
                  rightElement={
                    syncing || newSyncState.isSyncing ? (
                      <ActivityIndicator
                        size="small"
                        color={UI.COLORS.PRIMARY_LIGHT}
                      />
                    ) : undefined
                  }
                />
                <View style={styles.separator} />
                <SettingRow
                  icon="cloud-download"
                  iconGradient={["#6C5CE7", "#A29BFE"]}
                  title="Restore from Cloud"
                  subtitle="Download all cloud data (useful after reinstall)"
                  onPress={handleRestore}
                />
                <View style={styles.separator} />
                <SettingRow
                  icon="brush"
                  iconGradient={["#F59E0B", "#D97706"]}
                  title="Firebase Cleanup"
                  subtitle="Remove duplicates & optimize storage"
                  onPress={() => setShowFirebaseCleanup(true)}
                />
                <View style={styles.separator} />
                <SettingRow
                  icon="time"
                  title="Sync Status"
                  subtitle={
                    newSyncState.lastSyncTime
                      ? `Last synced: ${newSyncState.lastSyncTime.toLocaleString()}`
                      : settings.data?.syncUpdatedAt
                        ? `Last: ${new Date(settings.data.syncUpdatedAt).toLocaleString()}`
                        : "No sync record"
                  }
                  rightElement={<SyncStatus />}
                />
              </GlassCard>
            </>
          )}

          {/* ══ DATA ═════════════════════════════════════ */}
          <SectionLabel text="Data" />
          <GlassCard>
            <SettingRow
              icon="download"
              iconGradient={["#3B82F6", "#2563EB"]}
              title="Export Data"
              subtitle="Export transactions as Excel, CSV, or JSON"
              onPress={handleExportData}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="cloud-upload"
              iconGradient={["#8B5CF6", "#6D28D9"]}
              title="Import from Excel"
              subtitle="Import transactions from an Excel file"
              onPress={() => navigation.navigate("Import")}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="pricetags"
              iconGradient={["#EC4899", "#DB2777"]}
              title="Manage Categories"
              subtitle={`${Object.keys(categories).length} categories`}
              onPress={() => setShowCategoryManagement(!showCategoryManagement)}
              rightElement={
                <Ionicons
                  name={showCategoryManagement ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="rgba(255,255,255,0.2)"
                />
              }
            />
          </GlassCard>

          {showCategoryManagement && (
            <CategoryManagement
              showAlert={showAlert}
              showSuccess={showSuccess}
              showError={showError}
              onAddCategory={() => {
                setEditingCategory(null);
                setAddCategoryModalVisible(true);
              }}
              onEditCategory={(cat) => {
                setEditingCategory(cat);
                setAddCategoryModalVisible(true);
              }}
            />
          )}

          <View style={styles.separator} />
          <SettingRow
            icon="wallet"
            iconGradient={["#10B981", "#059669"]}
            title="Manage Wallets"
            subtitle={`${Object.keys(wallets).length} wallets`}
            onPress={() => setShowWalletManagement(!showWalletManagement)}
            rightElement={
              <Ionicons
                name={showWalletManagement ? "chevron-up" : "chevron-down"}
                size={16}
                color="rgba(255,255,255,0.2)"
              />
            }
          />

          {showWalletManagement && (
            <WalletManagement
              showAlert={showAlert}
              showSuccess={showSuccess}
              showError={showError}
              onAddWallet={() => {
                setEditingWallet(null);
                setWalletModalVisible(true);
              }}
              onEditWallet={(w) => {
                setEditingWallet(w);
                setWalletModalVisible(true);
              }}
              onTransfer={() => setTransferModalVisible(true)}
            />
          )}

          {/* ══ ABOUT ════════════════════════════════════ */}
          <SectionLabel text="About" />
          <GlassCard>
            <SettingRow
              icon="information-circle"
              title="App Version"
              subtitle="1.0.0"
              onPress={handleVersionClick}
              rightElement={null}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="person"
              title="Copyright"
              subtitle={`© ${new Date().getFullYear()} Abdelrahman Sobhy`}
              rightElement={null}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="shield-checkmark"
              iconGradient={["#2ED573", "#1B9C4F"]}
              title="Privacy Policy"
              subtitle="Your data stays on your device"
              rightElement={null}
            />
          </GlassCard>

          {/* ══ DEBUG (hidden) ════════════════════════════ */}
          {showDebugSection && (
            <>
              <SectionLabel text="Debug" />
              <GlassCard>
                <SettingRow
                  icon="bug"
                  iconGradient={["#FF6B6B", "#EE5A24"]}
                  title="Debug Logging"
                  subtitle={
                    debugLoggingEnabled
                      ? "Console logging on"
                      : "Console logging off"
                  }
                  rightElement={
                    <Switch
                      value={debugLoggingEnabled}
                      onValueChange={(v) => {
                        setDebugLoggingEnabled(v);
                        setDebugMode(v);
                        showSuccess(
                          v
                            ? "Debug logging enabled"
                            : "Debug logging disabled",
                        );
                      }}
                      trackColor={{
                        false: "rgba(255,255,255,0.08)",
                        true: UI.COLORS.PRIMARY + "50",
                      }}
                      thumbColor={
                        debugLoggingEnabled
                          ? UI.COLORS.PRIMARY
                          : UI.COLORS.TEXT_SECONDARY
                      }
                    />
                  }
                />
                <View style={styles.separator} />
                <SettingRow
                  icon="phone-portrait"
                  title="Device ID"
                  subtitle={deviceId || "Loading…"}
                  onPress={() => {
                    if (deviceId) {
                      showSuccess("Device ID logged to console");
                      console.log("Device ID:", deviceId);
                    }
                  }}
                />
                <View style={styles.separator} />
                <SettingRow
                  icon="construct"
                  title="Run DB Migrations"
                  subtitle="Update schema for cloud compatibility"
                  onPress={async () => {
                    try {
                      showSuccess("Running migrations…");
                      const { databaseMigration } =
                        await import("../utils/databaseMigration");
                      await databaseMigration.runCloudCompatibilityMigrations();
                      showSuccess("Migrations completed!");
                    } catch (e: any) {
                      showError(`Migration failed: ${e?.message}`);
                    }
                  }}
                />
                <View style={styles.separator} />
                <SettingRow
                  icon="play"
                  title="Run Sync Apply Test"
                  subtitle="Apply a fake remote debt (dev only)"
                  onPress={async () => {
                    try {
                      showSuccess("Running sync apply test…");
                      const res = await runSyncApplyTest();
                      if (res?.newLogCount === 0)
                        showSuccess("PASS: No new sync_log entries");
                      else showError(`FAIL: ${res?.newLogCount} new entries`);
                    } catch (e: any) {
                      showError(`Test failed: ${e?.message}`);
                    }
                  }}
                />
                <View style={styles.separator} />
                <SettingRow
                  icon="layers"
                  title="Run All Apply Tests"
                  subtitle="Run apply tests for all collections"
                  onPress={async () => {
                    try {
                      showSuccess("Running all apply tests…");
                      const res = await runAllSyncApplyTests();
                      const failures = Object.entries(res).filter(
                        ([_, v]) => v.newLogCount !== 0,
                      );
                      if (failures.length === 0)
                        showSuccess("All tests passed!");
                      else
                        showError(
                          `Failed: ${failures.map((f) => f[0]).join(", ")}`,
                        );
                    } catch (e: any) {
                      showError(`Tests failed: ${e?.message}`);
                    }
                  }}
                />
                <View style={styles.separator} />
                <SettingRow
                  icon="notifications"
                  title="Send Test Notification"
                  subtitle="Test notification system"
                  onPress={async () => {
                    try {
                      const ns = NotificationService.getInstance();
                      await ns.initialize();
                      await ns.sendTransactionReminder();
                      showSuccess("Test notification sent!");
                    } catch (e: any) {
                      showError(`Failed: ${e?.message}`);
                    }
                  }}
                />
                <View style={styles.separator} />
                <SettingRow
                  icon="timer"
                  title="Scheduled Notification (10s)"
                  subtitle="Schedule a test notification"
                  onPress={async () => {
                    try {
                      const ns = NotificationService.getInstance();
                      const id = await ns.scheduleTestNotification();
                      if (id) showSuccess("Notification in 10s!");
                      else showError("Failed to schedule");
                    } catch (e: any) {
                      showError(`Failed: ${e?.message}`);
                    }
                  }}
                />
                <View style={styles.separator} />
                <SettingRow
                  icon="medical"
                  title="Notification Diagnostics"
                  subtitle="Check permissions & scheduled notifications"
                  onPress={async () => {
                    try {
                      const ns = NotificationService.getInstance();
                      await ns.runNotificationDiagnostics();
                      showSuccess("Diagnostics done — see console");
                    } catch (e: any) {
                      showError(`Failed: ${e?.message}`);
                    }
                  }}
                />
                <View style={styles.separator} />
                <SettingRow
                  icon="refresh-circle"
                  title="Force Reschedule Notifications"
                  subtitle="Cancel all & reschedule"
                  onPress={async () => {
                    try {
                      const ns = NotificationService.getInstance();
                      await ns.forceRescheduleNotifications();
                      showSuccess("Rescheduled — see console");
                    } catch (e: any) {
                      showError(`Failed: ${e?.message}`);
                    }
                  }}
                />
                <View style={styles.separator} />
                <SettingRow
                  icon="map"
                  iconGradient={["#10B981", "#059669"]}
                  title="Export Category Map"
                  subtitle="Export category→descriptions JSON"
                  onPress={handleExportCategoryMap}
                />
              </GlassCard>
            </>
          )}

          {/* ══ DANGER ZONE ══════════════════════════════ */}
          <SectionLabel text="Danger Zone" />
          <GlassCard style={styles.dangerCard}>
            <SettingRow
              icon="trash"
              destructive
              title="Clear All Data"
              subtitle="Delete everything except categories"
              onPress={handleClearAllData}
            />
          </GlassCard>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* ── Modals ─────────────────────────────────────── */}
        <AlertComponent />

        {/* Billing Day Picker */}
        <Modal
          visible={showBillingDayPicker}
          animationType="fade"
          transparent
          onRequestClose={() => setShowBillingDayPicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Billing Start Day</Text>
              <Text style={styles.modalSubtitle}>
                Choose the day your billing period starts
              </Text>

              <ScrollView
                style={{ maxHeight: 300 }}
                showsVerticalScrollIndicator={false}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayOption,
                      selectedBillingDay === day && styles.dayOptionActive,
                    ]}
                    onPress={() => setSelectedBillingDay(day)}>
                    <Text
                      style={[
                        styles.dayText,
                        selectedBillingDay === day && styles.dayTextActive,
                      ]}>
                      Day {day}
                    </Text>
                    {selectedBillingDay === day && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={UI.COLORS.PRIMARY}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setSelectedBillingDay(currentBillingDay);
                    setShowBillingDayPicker(false);
                  }}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={saveBillingDay}
                  disabled={settings.loading}>
                  <LinearGradient
                    colors={[UI.COLORS.PRIMARY, UI.COLORS.PRIMARY_DARK]}
                    style={styles.modalSaveBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}>
                    <Text style={styles.modalSaveText}>
                      {settings.loading ? "Saving…" : "Save"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <CategoryCreationModal
          visible={addCategoryModalVisible}
          onClose={() => {
            setAddCategoryModalVisible(false);
            setEditingCategory(null);
          }}
          category={editingCategory}
          onCreateCategory={handleNewCategoryAdd}
          onUpdateCategory={handleCategoryUpdate}
          title={editingCategory ? "Edit Category" : "Add New Category"}
        />

        <FirebaseCleanupModal
          visible={showFirebaseCleanup}
          onClose={() => setShowFirebaseCleanup(false)}
        />

        <WalletModal
          visible={walletModalVisible}
          onClose={() => {
            setWalletModalVisible(false);
            setEditingWallet(null);
          }}
          onSave={handleSaveWallet}
          initialWallet={editingWallet}
          title={editingWallet ? "Edit Wallet" : "Add Wallet"}
        />

        <TransferModal
          visible={transferModalVisible}
          onClose={() => setTransferModalVisible(false)}
          wallets={Object.values(wallets)}
          onTransfer={handleTransfer}
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Category Management (inline expandable)
// ═══════════════════════════════════════════════════════════════════

interface CategoryManagementProps {
  showAlert: (title: string, message: string, actions?: any[]) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  onAddCategory: () => void;
  onEditCategory: (cat: Category) => void;
}

const CategoryManagement: React.FC<CategoryManagementProps> = ({
  showAlert,
  showSuccess,
  showError,
  onAddCategory,
  onEditCategory,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: categories } = useSelector(
    (state: RootState) => state.categories,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const catArr = Object.values(categories);
  const income = catArr.filter((c) => c.type === "income");
  const expense = catArr.filter((c) => c.type === "expense");

  const handleDelete = (cat: Category) => {
    showAlert("Delete Category", `Delete "${cat.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeletingId(cat.id);
          try {
            await dispatch(deleteCategory(cat.id)).unwrap();
            showSuccess("Category deleted");
          } catch (e: any) {
            showError(e?.message || "Failed to delete");
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const CatList = ({
    title,
    items,
    color,
  }: {
    title: string;
    items: Category[];
    color: string;
  }) => {
    const { colors, typography, spacing, radius } = useAppTheme();
    const isDark = true;

    return (
      <View style={{ marginBottom: spacing.s16 }}>
        <Text
          style={[
            typography.titleMedium,
            { color, marginBottom: spacing.s8 },
          ]}>
          {title} ({items.length})
        </Text>
        {items.map((cat) => {
          const paletteKey = getCategoryColorKey(cat.name);
          const colorPair = categoryPalette[paletteKey] || {
            light: cat.color || color,
            dark: cat.color || color,
            textLight: "#FFFFFF",
            textDark: "#FFFFFF",
          };
          const iconBg = isDark ? colorPair.dark : colorPair.light;
          const iconColor = isDark ? colorPair.textDark : colorPair.textLight;
          const iconName = getCategoryIconName(cat);

          return (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.75}
              onPress={() => onEditCategory(cat)}
              style={[
                styles.catRow,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderRadius: radius.medium,
                  paddingVertical: spacing.s12,
                  paddingHorizontal: spacing.s16,
                  marginBottom: spacing.s8,
                  borderColor: colors.outline,
                  borderWidth: 1,
                },
              ]}>
              <View style={styles.catLeft}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: iconBg,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: spacing.s12,
                  }}>
                  <Ionicons
                    name={iconName as any}
                    size={18}
                    color={iconColor}
                  />
                </View>
                <Text
                  style={[
                    typography.titleMedium,
                    { color: colors.onSurface },
                  ]}>
                  {cat.name}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                }}>
                <TouchableOpacity
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => onEditCategory(cat)}>
                  <Ionicons
                    name="pencil-outline"
                    size={18}
                    color={colors.primary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => handleDelete(cat)}
                  disabled={deletingId === cat.id}>
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={colors.error}
                  />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <GlassCard style={{ marginTop: -4 }}>
      <CatList title="Income" items={income} color="#2ED573" />
      <CatList title="Expense" items={expense} color="#FF6B6B" />
      <TouchableOpacity style={styles.addCatBtn} onPress={onAddCategory}>
        <Ionicons name="add-circle" size={20} color={UI.COLORS.PRIMARY_LIGHT} />
        <Text style={styles.addCatText}>Add Category</Text>
      </TouchableOpacity>
    </GlassCard>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Wallet Management (inline expandable)
// ═══════════════════════════════════════════════════════════════════

interface WalletManagementProps {
  showAlert: (title: string, message: string, actions?: any[]) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  onAddWallet: () => void;
  onEditWallet: (wallet: Wallet) => void;
  onTransfer: () => void;
}

const WalletManagement: React.FC<WalletManagementProps> = ({
  showAlert,
  showSuccess,
  showError,
  onAddWallet,
  onEditWallet,
  onTransfer,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: wallets } = useSelector((state: RootState) => state.wallets);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const walletArr = Object.values(wallets);

  const handleDelete = (wallet: Wallet) => {
    showAlert("Delete Wallet", `Delete "${wallet.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeletingId(wallet.id);
          try {
            await dispatch(removeWallet(wallet.id)).unwrap();
            showSuccess("Wallet deleted");
          } catch (e: any) {
            showError(e?.message || "Failed to delete");
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  return (
    <GlassCard style={{ marginTop: -4 }}>
      <View style={{ marginBottom: 14 }}>
        <Text style={[styles.catGroupTitle, { color: "#10B981" }]}>
          Wallets ({walletArr.length})
        </Text>
        {walletArr.map((w) => (
          <View key={w.id} style={styles.catRow}>
            <TouchableOpacity
              style={styles.catLeft}
              onPress={() => onEditWallet(w)}>
              <View
                style={[styles.catDot, { backgroundColor: w.color || "#10B981" }]}
              />
              <Text style={styles.catName}>
                {w.name} (${Number(w.balance).toFixed(2)})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(w)}
              disabled={deletingId === w.id}>
              <Ionicons name="trash-outline" size={17} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <TouchableOpacity style={[styles.addCatBtn, { flex: 1 }]} onPress={onAddWallet}>
          <Ionicons name="add-circle" size={20} color={UI.COLORS.PRIMARY_LIGHT} />
          <Text style={styles.addCatText}>Add Wallet</Text>
        </TouchableOpacity>
        {walletArr.length >= 2 && (
          <TouchableOpacity
            style={[styles.addCatBtn, { flex: 1, borderColor: "rgba(59, 130, 246, 0.3)" }]}
            onPress={onTransfer}>
            <Ionicons name="swap-horizontal" size={20} color="#3B82F6" />
            <Text style={[styles.addCatText, { color: "#3B82F6" }]}>Transfer</Text>
          </TouchableOpacity>
        )}
      </View>
    </GlassCard>
  );
};

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: UI.COLORS.TEXT_PRIMARY,
    letterSpacing: 0.3,
    marginBottom: 24,
  },

  // ── Section label ───────────────────────────────────
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: UI.COLORS.PRIMARY_LIGHT,
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
    color: UI.COLORS.TEXT_PRIMARY,
  },
  rowSubtitle: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
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
    color: UI.COLORS.TEXT_PRIMARY,
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
    color: UI.COLORS.PRIMARY_LIGHT,
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
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: UI.COLORS.TEXT_MUTED,
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
    color: UI.COLORS.TEXT_PRIMARY,
  },
  dayTextActive: {
    color: UI.COLORS.PRIMARY_LIGHT,
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
    color: UI.COLORS.TEXT_MUTED,
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
