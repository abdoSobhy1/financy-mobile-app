import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SettingsStackParamList } from "../types";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../store";
import { Screen, useCustomAlert, useToast, CategoryCreationModal, FirebaseCleanupModal } from "../components/ui";
import { runSyncApplyTest } from "../debug/runSyncTest";
import { runAllSyncApplyTests } from "../debug/runSyncTest";
import { UI } from "../constants";
import NotificationService from "../services/notificationService";
import { fetchSettings, updateBillingPeriodStartDay, fetchCurrentBillingPeriod, clearError } from "../store/slices/settingsSlice";
import { fetchCategories, addCategory, updateCategory, deleteCategory } from "../store/slices/categoriesSlice";
import { resetAllBudgets, fetchBudgets } from "../store/slices/budgetsSlice";
import { fetchTransactions } from "../store/slices/transactionsSlice";
import { fetchBills } from "../store/slices/billsSlice";
import { Category } from "../types";
import { exportToExcel, exportToCSV, ExportData } from "../utils/exportUtils";
import { exportDatabaseToJSON, exportSQLiteDatabase, getDatabaseStats } from "../utils/databaseExport";
import { db } from "../database/queries";
import { useAuth } from "../contexts/AuthContext";
import { useSync } from "../contexts/SyncProvider";
import { setDebugMode, getDebugMode } from "../utils/logger";
import { getDeviceId } from "../utils/deviceId";
import { signOut } from "../store/slices/authSlice";
import { initializeSync, stopSync, forceSyncAll, refreshSyncStatus, initialCloudRestore } from "../store/slices/syncSlice";
import { SyncStatus } from "../components/ui";

type SettingsScreenNavigationProp = StackNavigationProp<SettingsStackParamList>;

// Predefined colors for category selection
const PREDEFINED_COLORS = [
  "#10B981", // Green
  "#059669", // Dark Green
  "#047857", // Darker Green
  "#EF4444", // Red
  "#F97316", // Orange
  "#F59E0B", // Yellow
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
  "#EC4899", // Pink
  "#3B82F6", // Blue
  "#6B7280", // Gray
  "#4F46E5", // Indigo
];

export const SettingsScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { items: categories } = useSelector((state: RootState) => state.categories);
  const { items: transactions } = useSelector((state: RootState) => state.transactions);
  const settings = useSelector((state: RootState) => state.settings);
  const syncState = useSelector((state: RootState) => state.sync);
  const { user, isAuthenticated } = useAuth();
  const { syncState: newSyncState, refresh, fullRefresh, checkForChanges } = useSync();
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [showBillingDayPicker, setShowBillingDayPicker] = useState(false);
  const [selectedBillingDay, setSelectedBillingDay] = useState(1);
  const [debugClickCount, setDebugClickCount] = useState(0);
  const [showDebugSection, setShowDebugSection] = useState(false);
  const [debugLoggingEnabled, setDebugLoggingEnabled] = useState(getDebugMode());
  const [addCategoryModalVisible, setAddCategoryModalVisible] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [showLastSyncModal, setShowLastSyncModal] = useState(false);
  const [showFirebaseCleanup, setShowFirebaseCleanup] = useState(false);
  const [deviceId, setDeviceId] = useState<string>("");
  const { showAlert, AlertComponent } = useCustomAlert();
  const { showSuccess, showError } = useToast();

  const currentBillingDay = settings.data?.billingPeriodStartDay || 1;

  useEffect(() => {
    if (settings.data) {
      setSelectedBillingDay(settings.data.billingPeriodStartDay);
    }
  }, [settings.data]);

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchSettings());
    dispatch(fetchTransactions());

    // Load device ID for debug info
    getDeviceId().then(setDeviceId);
  }, [dispatch]);

  // selectedBillingDay is now derived from Redux state

  const handleBillingPeriodChange = () => {
    setShowBillingDayPicker(true);
  };

  const saveBillingDay = async () => {
    try {
      await dispatch(updateBillingPeriodStartDay(selectedBillingDay)).unwrap();
      setShowBillingDayPicker(false);
      showSuccess(`Billing period updated to start on day ${selectedBillingDay}`);
    } catch (error) {
      showError("Failed to update billing period");
    }
  };

  const handleVersionClick = () => {
    const newCount = debugClickCount + 1;
    setDebugClickCount(newCount);

    if (newCount >= 6) {
      setShowDebugSection(true);
      showSuccess("Debug section enabled!");
    } else if (newCount >= 3) {
      showSuccess(`${6 - newCount} more clicks to enable debug section`);
    }
  };

  const handleNewCategoryAdd = async (categoryData: { name: string; type: "income" | "expense"; color?: string }) => {
    // Check for duplicate names
    const categoryName = categoryData.name.toLowerCase();
    const categoryArray = Object.values(categories);
    const existingCategory = categoryArray.find((cat) => cat.name.toLowerCase() === categoryName && cat.type === categoryData.type);

    if (existingCategory) {
      showError(`A ${categoryData.type} category with this name already exists`);
      return;
    }

    setIsAddingCategory(true);
    try {
      await dispatch(
        addCategory({
          name: categoryData.name,
          type: categoryData.type,
          color: categoryData.color,
        })
      ).unwrap();

      // Success - close modal
      setAddCategoryModalVisible(false);
      showSuccess(`${categoryData.type === "income" ? "Income" : "Expense"} category "${categoryData.name}" added successfully`);
    } catch (err: any) {
      showError(err.message || "Failed to add category");
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleClearAllData = () => {
    showAlert(
      "Clear All Data",
      "This will delete all transactions, bills, budgets, and reset settings. Categories will be preserved. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              await db.clearAllData();
              // Refresh all data
              await dispatch(fetchCategories());
              await dispatch(fetchBudgets());
              await dispatch(fetchBills());
              await dispatch(fetchTransactions());
              showSuccess("All data has been cleared except categories");
            } catch (error) {
              showError("Failed to clear data");
            }
          },
        },
      ]
    );
  };

  const handleExportDatabase = async () => {
    try {
      const stats = await getDatabaseStats();

      showAlert(
        "Export Database",
        `Export complete database backup including:\n• ${stats.transactions} transactions\n• ${stats.categories} categories\n• ${stats.budgets} budgets\n• ${stats.bills} bills\n• ${stats.debts} debts\n\nTotal: ${stats.totalRecords} records\n\nNote: Exports will be logged to console for copying.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "JSON Format",
            onPress: async () => {
              try {
                await exportDatabaseToJSON();
                showSuccess("Database exported to console as JSON! Check console and copy the data.");
              } catch (error) {
                console.error("JSON export error:", error);
                showError("Export failed - check console for details");
              }
            },
          },
          {
            text: "SQL Format",
            onPress: async () => {
              try {
                await exportSQLiteDatabase();
                showSuccess("SQL database exported to console! Copy from console to create .sql file.");
              } catch (error) {
                console.error("SQLite export error:", error);
                showError("Export failed - check console for details");
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error getting database stats:", error);
      showError("Failed to get database information");
    }
  };

  const handleExportData = () => {
    console.log("🔍 Export Data button clicked - starting export flow");

    showAlert("Export Data", "Choose export period:", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Current Month",
        onPress: () => {
          console.log("🗓️ User selected Current Month");
          showExportFormatDialog("month");
        },
      },
      {
        text: "Last 3 Months",
        onPress: () => {
          console.log("🗓️ User selected Last 3 Months");
          showExportFormatDialog("quarter");
        },
      },
      {
        text: "All Time",
        onPress: () => {
          console.log("🗓️ User selected All Time");
          showExportFormatDialog("all");
        },
      },
    ]);
  };

  const showExportFormatDialog = (period: string) => {
    console.log(`📄 Showing format dialog for period: ${period}`);

    // Add a delay to ensure first dialog is fully closed
    setTimeout(() => {
      console.log(`📄 Actually showing format dialog now for period: ${period}`);
      showAlert("Export Format", "Choose file format:", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Excel (.xlsx)",
          onPress: () => {
            console.log(`📊 User selected Excel format for period: ${period}`);
            exportDataForPeriod(period, "excel");
          },
        },
        {
          text: "CSV (.csv)",
          onPress: () => {
            console.log(`📋 User selected CSV format for period: ${period}`);
            exportDataForPeriod(period, "csv");
          },
        },
      ]);
    }, 500); // Increased delay to ensure proper closing
  };

  const exportDataForPeriod = async (period: string, format: "excel" | "csv") => {
    console.log(`🚀 Starting export for period: ${period}, format: ${format}`);
    try {
      console.log("📊 Getting transactions from Redux store...");
      // Get transactions based on period
      const transactionsList = Object.values(transactions || {});
      const categoriesData = categories || {};
      console.log(`📈 Found ${transactionsList.length} total transactions in store`);
      console.log(`🏷️ Found ${Object.keys(categoriesData).length} categories in store`);

      // Filter transactions by period if needed
      let filteredTransactions = transactionsList;
      const now = new Date();

      if (period === "month") {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        filteredTransactions = transactionsList.filter((t) => new Date(t.date) >= monthStart);
        console.log(`📅 Filtered to current month: ${filteredTransactions.length} transactions`);
      } else if (period === "quarter") {
        const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        filteredTransactions = transactionsList.filter((t) => new Date(t.date) >= threeMonthsAgo);
        console.log(`📅 Filtered to last 3 months: ${filteredTransactions.length} transactions`);
      } else {
        console.log(`📅 Using all time data: ${filteredTransactions.length} transactions`);
      }

      const exportData: ExportData = {
        exportDate: new Date().toISOString(),
        period: period,
        transactions: filteredTransactions,
        categories: categoriesData,
        summary: {
          totalTransactions: filteredTransactions.length,
          totalIncome: filteredTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0),
          totalExpenses: filteredTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0),
        },
      };

      console.log("📦 Export data prepared:", {
        period: exportData.period,
        transactionCount: exportData.transactions.length,
        categoryCount: Object.keys(exportData.categories).length,
        totalIncome: exportData.summary.totalIncome,
        totalExpenses: exportData.summary.totalExpenses,
      });

      // Export based on format
      console.log(`🔄 Attempting to export ${filteredTransactions.length} transactions as ${format}`);

      if (format === "excel") {
        console.log("📊 Calling exportToExcel...");
        await exportToExcel(exportData);
        console.log("✅ Excel export completed successfully");
        showSuccess(`Excel file exported successfully! ${filteredTransactions.length} transactions included.`);
      } else {
        console.log("📋 Calling exportToCSV...");
        await exportToCSV(exportData);
        console.log("✅ CSV export completed successfully");
        showSuccess(`CSV file exported successfully! ${filteredTransactions.length} transactions included.`);
      }
    } catch (error) {
      console.error("❌ Export error:", error);
      showError(`Export failed: ${error instanceof Error ? error.message : "Unknown error"}. Please check console for details.`);
    }
  };

  const SettingSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightElement,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={!onPress}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={24} color={UI.COLORS.PRIMARY} />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement && <View style={styles.settingRight}>{rightElement}</View>}
    </TouchableOpacity>
  );

  return (
    <Screen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <SettingSection title="Billing Period">
          <SettingItem
            icon="calendar"
            title="Billing Start Day"
            subtitle={`Day ${currentBillingDay} of each month`}
            onPress={handleBillingPeriodChange}
            rightElement={<Ionicons name="chevron-forward" size={20} color={UI.COLORS.TEXT_SECONDARY} />}
          />
          <SettingItem
            icon="trash"
            title="Clear All Data"
            subtitle="Delete all data except categories"
            onPress={handleClearAllData}
            rightElement={<Ionicons name="chevron-forward" size={20} color={UI.COLORS.TEXT_SECONDARY} />}
          />
        </SettingSection>

        <SettingSection title="Data Management">
          {isAuthenticated ? (
            <>
              <SettingItem
                icon="person"
                title="Signed in as"
                subtitle={user?.email || "Unknown user"}
                rightElement={
                  <TouchableOpacity onPress={() => dispatch(signOut())} style={styles.signOutButton}>
                    <Text style={styles.signOutButtonText}>Sign Out</Text>
                  </TouchableOpacity>
                }
              />
              <SettingItem icon="cloud" title="Firebase Sync Status" subtitle="" rightElement={<SyncStatus />} />
              <SettingItem
                icon="sync-circle"
                title="Complete Data Sync"
                subtitle="Push all local data + restore all cloud data (full bidirectional sync)"
                onPress={async () => {
                  // Check authentication first
                  if (!isAuthenticated) {
                    showError("Please sign in first for complete sync");
                    return;
                  }

                  if (syncState.syncInProgress) {
                    showError("Sync already in progress, please wait");
                    return;
                  }

                  try {
                    showSuccess("Starting complete bidirectional data synchronization...");

                    const { offlineFirstSync } = await import("../services/OfflineFirstSync");

                    // Step 1: Push all local data to cloud
                    showSuccess("Step 1/2: Pushing local data to cloud...");
                    const pushResult = await offlineFirstSync.pushAllDataToCloud();

                    // Step 2: Pull all cloud data to local
                    showSuccess("Step 2/2: Restoring cloud data to local...");
                    const pullResult = await offlineFirstSync.performComprehensiveCloudRestore();

                    // Combined results
                    const totalPushed = pushResult.totalUploaded;
                    const totalPulled = pullResult.itemsCreated + pullResult.itemsUpdated;
                    const message = `Complete sync finished! ${totalPushed} items pushed to cloud, ${totalPulled} items pulled from cloud.`;

                    showSuccess(message);

                    // Refresh all data after successful sync
                    dispatch(fetchTransactions());
                    dispatch(fetchCategories());
                    dispatch(fetchBudgets());
                    dispatch(fetchBills());

                    // Show any errors
                    const allErrors = [...pushResult.errors, ...pullResult.errors];
                    if (allErrors.length > 0) {
                      console.warn("Complete sync had some errors:", allErrors);
                      showError(`Sync completed with ${allErrors.length} warnings. Check console for details.`);
                    }
                  } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    if (errorMessage.includes("authenticated")) {
                      showError("Please sign in first for complete sync");
                    } else {
                      showError(`Complete sync failed: ${errorMessage}`);
                    }
                  }
                }}
                rightElement={<Ionicons name="refresh-circle" size={20} color={UI.COLORS.SUCCESS} />}
              />
              <SettingItem
                icon="sync"
                title="Quick Sync"
                subtitle={newSyncState.isSyncing ? "Syncing..." : "Sync pending local changes only (smart sync)"}
                onPress={async () => {
                  if (!isAuthenticated) {
                    showError("Please sign in first to sync");
                    return;
                  }

                  if (!newSyncState.isSyncing) {
                    try {
                      await refresh();
                    } catch (error) {
                      showError(`Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`);
                    }
                  }
                }}
                rightElement={<Ionicons name="chevron-forward" size={20} color={UI.COLORS.TEXT_SECONDARY} />}
              />
              <SettingItem
                icon="search"
                title="Check for Changes"
                subtitle={newSyncState.isSyncing ? "Checking..." : "Instantly check for remote changes (efficient)"}
                onPress={async () => {
                  if (!isAuthenticated) {
                    showError("Please sign in first to check for changes");
                    return;
                  }

                  if (!newSyncState.isSyncing) {
                    try {
                      await checkForChanges();
                    } catch (error) {
                      showError(`Change check failed: ${error instanceof Error ? error.message : "Unknown error"}`);
                    }
                  }
                }}
                rightElement={<Ionicons name="search" size={20} color={UI.COLORS.PRIMARY} />}
              />
              <SettingItem
                icon="refresh-circle"
                title="Full Sync"
                subtitle={newSyncState.isSyncing ? "Syncing..." : "Complete bidirectional sync (pulls all remote data)"}
                onPress={async () => {
                  if (!isAuthenticated) {
                    showError("Please sign in first to sync");
                    return;
                  }

                  if (!newSyncState.isSyncing) {
                    try {
                      await fullRefresh();
                    } catch (error) {
                      showError(`Full sync failed: ${error instanceof Error ? error.message : "Unknown error"}`);
                    }
                  }
                }}
                rightElement={<Ionicons name="refresh-circle" size={20} color={UI.COLORS.SUCCESS} />}
              />
              <SettingItem
                icon="time"
                title="Sync Status"
                subtitle={
                  newSyncState.lastSyncTime
                    ? `Last synced: ${newSyncState.lastSyncTime.toLocaleString()}`
                    : settings.data?.syncUpdatedAt
                    ? `Legacy sync: ${new Date(settings.data.syncUpdatedAt).toLocaleString()}`
                    : "No sync record"
                }
                onPress={() => setShowLastSyncModal(true)}
                rightElement={<Ionicons name="chevron-forward" size={20} color={UI.COLORS.TEXT_SECONDARY} />}
              />
              <SettingItem
                icon="cloud-download"
                title="Restore Cloud Data"
                subtitle="Download and restore all data from cloud (useful after reinstalling app)"
                onPress={async () => {
                  // Check authentication first
                  if (!isAuthenticated) {
                    showError("Please sign in first to restore cloud data");
                    return;
                  }

                  if (syncState.syncInProgress) {
                    showError("Sync already in progress, please wait");
                    return;
                  }

                  try {
                    showSuccess("Starting comprehensive cloud data restore...");

                    // Import the offlineFirstSync service and use performComprehensiveCloudRestore
                    const { offlineFirstSync } = await import("../services/OfflineFirstSync");
                    const result = await offlineFirstSync.performComprehensiveCloudRestore();

                    const totalItems = result.itemsCreated + result.itemsUpdated;
                    if (totalItems > 0) {
                      const message = `Cloud data restored successfully! ${result.itemsCreated} items created, ${result.itemsUpdated} items updated.`;
                      showSuccess(message);

                      // Refresh all data after successful restore
                      dispatch(fetchTransactions());
                      dispatch(fetchCategories());
                      dispatch(fetchBudgets());
                      dispatch(fetchBills());
                    } else {
                      showSuccess("Cloud data is up to date. No changes needed.");
                    }

                    // Show any errors that occurred during sync
                    if (result.errors.length > 0) {
                      console.warn("Sync completed with some errors:", result.errors);
                      showError(`Restore completed with ${result.errors.length} warnings. Check console for details.`);
                    }
                  } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    if (errorMessage.includes("authenticated")) {
                      showError("Please sign in first to access your cloud data");
                    } else {
                      showError(`Failed to restore cloud data: ${errorMessage}`);
                    }
                  }
                }}
                rightElement={<Ionicons name="chevron-forward" size={20} color={UI.COLORS.TEXT_SECONDARY} />}
              />
              <SettingItem
                icon="brush"
                title="Firebase Cleanup"
                subtitle="Remove duplicate data, unused fields, and optimize Firebase storage"
                onPress={() => {
                  if (!isAuthenticated) {
                    showError("Please sign in first to clean up Firebase data");
                    return;
                  }
                  setShowFirebaseCleanup(true);
                }}
                rightElement={<Ionicons name="chevron-forward" size={20} color={UI.COLORS.TEXT_SECONDARY} />}
              />
              <SettingItem
                icon="sync"
                title="Sync Categories"
                subtitle="Bidirectional sync of categories with cloud (mobile ↔ cloud)"
                onPress={async () => {
                  // Check authentication first
                  if (!isAuthenticated) {
                    showError("Please sign in first to sync categories");
                    return;
                  }

                  if (syncState.syncInProgress) {
                    showError("Sync already in progress, please wait");
                    return;
                  }

                  try {
                    showSuccess("Starting category synchronization...");

                    // Import the offlineFirstSync service and use syncCategoriesWithMobile
                    const { offlineFirstSync } = await import("../services/OfflineFirstSync");
                    const result = await offlineFirstSync.syncCategoriesWithMobile();

                    const message = `Category sync completed! ${result.uploaded} uploaded to cloud, ${result.downloaded} downloaded from cloud, ${result.softDeleted} soft deleted.`;
                    showSuccess(message);

                    // Refresh categories after successful sync
                    dispatch(fetchCategories());
                  } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    if (errorMessage.includes("authenticated")) {
                      showError("Please sign in first to sync categories");
                    } else {
                      showError(`Failed to sync categories: ${errorMessage}`);
                    }
                  }
                }}
                rightElement={<Ionicons name="chevron-forward" size={20} color={UI.COLORS.TEXT_SECONDARY} />}
              />
              <SettingItem
                icon="cloud-upload"
                title="Push All Data to Cloud"
                subtitle="Upload all local data to Firebase (ensures complete backup)"
                onPress={async () => {
                  // Check authentication first
                  if (!isAuthenticated) {
                    showError("Please sign in first to push data to cloud");
                    return;
                  }

                  if (syncState.syncInProgress) {
                    showError("Sync already in progress, please wait");
                    return;
                  }

                  try {
                    showSuccess("Starting comprehensive data upload to cloud...");

                    // Import the offlineFirstSync service and use pushAllDataToCloud
                    const { offlineFirstSync } = await import("../services/OfflineFirstSync");
                    const result = await offlineFirstSync.pushAllDataToCloud();

                    // Create detailed success message
                    const collectionsInfo = Object.entries(result.collections)
                      .map(([name, stats]) => `${name}: ${stats.uploaded} uploaded, ${stats.skipped} skipped`)
                      .join(", ");

                    if (result.totalUploaded > 0) {
                      const message = `Data push completed! ${result.totalUploaded} items uploaded, ${result.totalSkipped} already up to date.`;
                      showSuccess(message);
                      console.log("📊 Collection details:", collectionsInfo);
                    } else if (result.totalSkipped > 0) {
                      showSuccess(`All ${result.totalSkipped} items are already up to date in cloud.`);
                    } else {
                      showSuccess("No data found to upload.");
                    }

                    // Show any collection errors
                    if (result.errors.length > 0) {
                      console.warn("Push completed with some errors:", result.errors);
                      showError(`Upload completed with ${result.errors.length} collection errors. Check console for details.`);
                    }
                  } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    if (errorMessage.includes("authenticated")) {
                      showError("Please sign in first to push data to cloud");
                    } else {
                      showError(`Failed to push data to cloud: ${errorMessage}`);
                    }
                  }
                }}
                rightElement={<Ionicons name="chevron-forward" size={20} color={UI.COLORS.TEXT_SECONDARY} />}
              />
            </>
          ) : (
            <SettingItem
              icon="log-in"
              title="Sign In to Enable Sync"
              subtitle="Sign in to sync your data across devices"
              rightElement={<Ionicons name="chevron-forward" size={20} color={UI.COLORS.TEXT_SECONDARY} />}
            />
          )}
          <SettingItem
            icon="download"
            title="Export Data"
            subtitle="Export transactions to Excel or CSV file"
            onPress={() => {
              console.log("🎯 Export Data SettingItem onPress triggered");
              handleExportData();
            }}
            rightElement={<Ionicons name="chevron-forward" size={20} color={UI.COLORS.TEXT_SECONDARY} />}
          />
          <SettingItem
            icon="cloud-upload"
            title="Import from Excel"
            subtitle="Import transactions from Excel file"
            onPress={() => navigation.navigate("Import")}
            rightElement={<Ionicons name="chevron-forward" size={20} color={UI.COLORS.TEXT_SECONDARY} />}
          />
          <SettingItem
            icon="server"
            title="Export Database Backup"
            subtitle="Export complete database as JSON or SQL dump"
            onPress={handleExportDatabase}
            rightElement={<Ionicons name="chevron-forward" size={20} color={UI.COLORS.TEXT_SECONDARY} />}
          />
        </SettingSection>

        {/* Debug section - hidden by default, shown after 6 clicks on app version */}
        {showDebugSection && (
          <SettingSection title="Debug">
            <SettingItem
              icon="bug"
              title="Debug Logging"
              subtitle={debugLoggingEnabled ? "Console logging enabled" : "Console logging disabled"}
              rightElement={
                <Switch
                  value={debugLoggingEnabled}
                  onValueChange={(value) => {
                    setDebugLoggingEnabled(value);
                    setDebugMode(value);
                    showSuccess(value ? "Debug logging enabled" : "Debug logging disabled");
                  }}
                  trackColor={{ false: UI.COLORS.SURFACE, true: UI.COLORS.PRIMARY + "50" }}
                  thumbColor={debugLoggingEnabled ? UI.COLORS.PRIMARY : UI.COLORS.TEXT_SECONDARY}
                />
              }
            />
            <SettingItem
              icon="phone-portrait"
              title="Device ID"
              subtitle={deviceId || "Loading..."}
              onPress={() => {
                if (deviceId) {
                  showSuccess("Device ID copied to console");
                  console.log("Device ID:", deviceId);
                }
              }}
              rightElement={<Ionicons name="copy" size={20} color={UI.COLORS.TEXT_SECONDARY} />}
            />
            <SettingItem
              icon="construct"
              title="Run Database Migrations"
              subtitle="Update database schema for cloud compatibility"
              onPress={async () => {
                try {
                  showSuccess("Running database migrations...");

                  const { databaseMigration } = await import("../utils/databaseMigration");
                  await databaseMigration.runCloudCompatibilityMigrations();

                  showSuccess("Database migrations completed successfully!");
                } catch (error) {
                  showError(`Migration failed: ${error instanceof Error ? error.message : "Unknown error"}`);
                }
              }}
              rightElement={<Ionicons name="chevron-forward" size={20} color={UI.COLORS.TEXT_SECONDARY} />}
            />
            <SettingItem
              icon="play"
              title="Run Sync Apply Test"
              subtitle="Apply a fake remote debt and check sync_log (dev only)"
              onPress={async () => {
                try {
                  showSuccess("Running sync apply test...");
                  const res = await runSyncApplyTest();
                  if (res && res.newLogCount === 0) {
                    showSuccess("PASS: No new sync_log entries created");
                  } else if (res && res.newLogCount >= 0) {
                    showError(`FAIL: ${res.newLogCount} new sync_log entries created`);
                  } else {
                    showError(`Test error: ${res?.error || "unknown"}`);
                  }
                } catch (err: any) {
                  console.error("Sync apply test failed:", err);
                  showError(`Test failed: ${err?.message || String(err)}`);
                }
              }}
              rightElement={<Ionicons name="play-circle" size={20} color={UI.COLORS.PRIMARY} />}
            />
            <SettingItem
              icon="layers"
              title="Run All Apply Tests"
              subtitle="Run apply tests for all collections and report results"
              onPress={async () => {
                try {
                  showSuccess("Running all apply tests...");
                  const res = await runAllSyncApplyTests();
                  // Summarize
                  const entries = Object.entries(res);
                  const failures = entries.filter(([_, v]) => v.newLogCount !== 0);
                  if (failures.length === 0) {
                    showSuccess("All apply tests passed: no new sync_log entries");
                  } else {
                    showError(`Some tests failed: ${failures.map((f) => f[0]).join(", ")}`);
                    console.log("Apply test details:", res);
                  }
                } catch (err: any) {
                  console.error("Run all apply tests failed:", err);
                  showError(`Run all tests failed: ${err?.message || String(err)}`);
                }
              }}
              rightElement={<Ionicons name="layers" size={20} color={UI.COLORS.PRIMARY} />}
            />
            <SettingItem
              icon="notifications"
              title="Send Test Notification"
              subtitle="Test notification system with sample transaction reminder"
              onPress={async () => {
                try {
                  showSuccess("Sending test notification...");

                  // Get the notification service instance
                  const notificationService = NotificationService.getInstance();

                  // Initialize notification service if not already done
                  await notificationService.initialize();

                  // Send a test transaction reminder
                  await notificationService.sendTransactionReminder();

                  showSuccess("Test notification sent successfully! Check your device notifications.");
                } catch (error) {
                  console.error("Test notification failed:", error);
                  showError(`Test notification failed: ${error instanceof Error ? error.message : "Unknown error"}`);
                }
              }}
              rightElement={<Ionicons name="notifications-outline" size={20} color={UI.COLORS.PRIMARY} />}
            />
            <SettingItem
              icon="timer"
              title="Test Scheduled Notification"
              subtitle="Schedule a test notification to appear in 10 seconds"
              onPress={async () => {
                console.log("⏰ Test notification button pressed!");
                console.warn("⏰ Test notification button pressed!");

                try {
                  showSuccess("Scheduling test notification...");

                  console.log("🔧 Getting NotificationService instance...");
                  console.warn("🔧 Getting NotificationService instance...");

                  // Get the notification service instance
                  const notificationService = NotificationService.getInstance();

                  console.log("📅 Calling scheduleTestNotification...");
                  console.warn("📅 Calling scheduleTestNotification...");

                  // Schedule a test notification
                  const notificationId = await notificationService.scheduleTestNotification();

                  console.log(`🎯 Test notification result: ${notificationId}`);
                  console.warn(`🎯 Test notification result: ${notificationId}`);

                  if (notificationId) {
                    showSuccess("Test notification scheduled! It will appear in 10 seconds.");
                  } else {
                    showError("Failed to schedule test notification");
                  }
                } catch (error) {
                  console.error("❌ Scheduled test notification failed:", error);
                  console.warn("❌ Scheduled test notification failed:", error);
                  showError(`Scheduled test failed: ${error instanceof Error ? error.message : "Unknown error"}`);
                }
              }}
              rightElement={<Ionicons name="time-outline" size={20} color={UI.COLORS.PRIMARY} />}
            />
            <SettingItem
              icon="medical"
              title="Run Notification Diagnostics"
              subtitle="Check notification permissions, scheduled notifications, and system settings"
              onPress={async () => {
                console.log("🎯 Diagnostics button pressed!");
                console.warn("🎯 Diagnostics button pressed!");

                try {
                  showSuccess("Running notification diagnostics...");

                  console.log("🔧 Getting NotificationService instance...");
                  console.warn("🔧 Getting NotificationService instance...");

                  // Get the notification service instance
                  const notificationService = NotificationService.getInstance();

                  console.log("🔍 Calling runNotificationDiagnostics...");
                  console.warn("🔍 Calling runNotificationDiagnostics...");

                  // Run comprehensive diagnostics
                  await notificationService.runNotificationDiagnostics();

                  console.log("✅ Diagnostics call completed");
                  console.warn("✅ Diagnostics call completed");

                  showSuccess("Notification diagnostics completed! Check console for detailed results.");
                } catch (error) {
                  console.error("❌ Notification diagnostics failed:", error);
                  console.warn("❌ Notification diagnostics failed:", error);
                  showError(`Diagnostics failed: ${error instanceof Error ? error.message : "Unknown error"}`);
                }
              }}
              rightElement={<Ionicons name="medical-outline" size={20} color={UI.COLORS.PRIMARY} />}
            />
            <SettingItem
              icon="refresh-circle"
              title="Force Reschedule Notifications"
              subtitle="Cancel all notifications and reschedule them (useful for fixing scheduling issues)"
              onPress={async () => {
                console.log("🔄 Force reschedule button pressed!");
                console.warn("🔄 Force reschedule button pressed!");

                try {
                  showSuccess("Force rescheduling notifications...");

                  // Get the notification service instance
                  const notificationService = NotificationService.getInstance();

                  // Force reschedule all notifications
                  await notificationService.forceRescheduleNotifications();

                  showSuccess("Notifications rescheduled! Check console for details.");
                } catch (error) {
                  console.error("❌ Force reschedule failed:", error);
                  console.warn("❌ Force reschedule failed:", error);
                  showError(`Force reschedule failed: ${error instanceof Error ? error.message : "Unknown error"}`);
                }
              }}
              rightElement={<Ionicons name="refresh-circle-outline" size={20} color={UI.COLORS.PRIMARY} />}
            />
          </SettingSection>
        )}

        <SettingSection title="Categories">
          <SettingItem
            icon="pricetags"
            title="Manage Categories"
            subtitle={`${Object.keys(categories).length} categories`}
            onPress={() => setShowCategoryManagement(!showCategoryManagement)}
            rightElement={<Ionicons name={showCategoryManagement ? "chevron-up" : "chevron-down"} size={20} color={UI.COLORS.TEXT_SECONDARY} />}
          />
        </SettingSection>

        {showCategoryManagement && (
          <CategoryManagement
            showAlert={showAlert}
            showSuccess={showSuccess}
            showError={showError}
            onAddCategory={() => setAddCategoryModalVisible(true)}
          />
        )}

        <SettingSection title="About">
          <SettingItem icon="information-circle" title="App Version" subtitle="1.0.0" onPress={handleVersionClick} />
          <SettingItem icon="person" title="Copyright" subtitle="© 2025 Abdelrahman Sobhy. All rights reserved." />
          <SettingItem icon="shield-checkmark" title="Privacy Policy" subtitle="Your data stays on your device" />
        </SettingSection>
      </ScrollView>

      <AlertComponent />

      {/* Last Sync Stamp Modal */}
      <Modal visible={showLastSyncModal} animationType="slide" transparent onRequestClose={() => setShowLastSyncModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Last Sync Information</Text>
            <Text style={styles.modalSubtitle}>Local settings marker (sync_updated_at):</Text>
            <Text style={styles.modalBody}>{settings.data?.syncUpdatedAt ? new Date(settings.data.syncUpdatedAt).toLocaleString() : "Not set"}</Text>
            <Text style={styles.modalEpoch}>{settings.data?.syncUpdatedAt ?? "-"}</Text>

            <Text style={[styles.modalSubtitle, { marginTop: 12 }]}>Redux last sync:</Text>
            <Text style={styles.modalBody}>{syncState.lastSync ? new Date(syncState.lastSync).toLocaleString() : "Not available"}</Text>
            <Text style={styles.modalEpoch}>{syncState.lastSync ?? "-"}</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={() => setShowLastSyncModal(false)}>
                <Text style={styles.saveButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Billing Day Picker Modal */}
      <Modal visible={showBillingDayPicker} animationType="slide" transparent onRequestClose={() => setShowBillingDayPicker(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Billing Start Day</Text>
            <Text style={styles.modalSubtitle}>Choose the day of the month when your billing period starts</Text>

            <ScrollView style={styles.dayPickerContainer} showsVerticalScrollIndicator={false}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayOption, selectedBillingDay === day && styles.dayOptionSelected]}
                  onPress={() => setSelectedBillingDay(day)}>
                  <Text style={[styles.dayOptionText, selectedBillingDay === day && styles.dayOptionTextSelected]}>Day {day}</Text>
                  {selectedBillingDay === day && <Ionicons name="checkmark" size={20} color={UI.COLORS.PRIMARY} />}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setSelectedBillingDay(currentBillingDay);
                  setShowBillingDayPicker(false);
                }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={saveBillingDay} disabled={settings.loading}>
                <Text style={styles.saveButtonText}>{settings.loading ? "Saving..." : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CategoryCreationModal
        visible={addCategoryModalVisible}
        onClose={() => setAddCategoryModalVisible(false)}
        onCreateCategory={handleNewCategoryAdd}
        title="Add New Category"
      />

      <FirebaseCleanupModal visible={showFirebaseCleanup} onClose={() => setShowFirebaseCleanup(false)} />
    </Screen>
  );
};
interface CategoryManagementProps {
  showAlert: (title: string, message: string, actions?: any[]) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  onAddCategory: () => void;
}

const CategoryManagement: React.FC<CategoryManagementProps> = ({ showAlert, showSuccess, showError, onAddCategory }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: categories } = useSelector((state: RootState) => state.categories);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categoryArray = Object.values(categories);
  const incomeCategories = categoryArray.filter((cat) => cat.type === "income");
  const expenseCategories = categoryArray.filter((cat) => cat.type === "expense");

  const handleDeleteCategory = (category: Category) => {
    showAlert("Delete Category", `Are you sure you want to delete "${category.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeletingId(category.id);
          try {
            await dispatch(deleteCategory(category.id)).unwrap();
            showSuccess("Category deleted successfully");
          } catch (err: any) {
            showError(err.message || "Failed to delete category");
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const CategoryList = ({ title, items, color }: { title: string; items: any[]; color: string }) => (
    <View style={styles.categorySection}>
      <Text style={[styles.categoryHeader, { color }]}>
        {title} ({items.length})
      </Text>
      {items.map((category) => (
        <View key={category.id} style={styles.categoryItem}>
          <View style={styles.categoryLeft}>
            <View style={[styles.categoryColor, { backgroundColor: category.color || color }]} />
            <Text style={styles.categoryName}>{category.name}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDeleteCategory(category)} disabled={deletingId === category.id}>
            <Ionicons name="trash" size={20} color={UI.COLORS.ERROR} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.categoryManagement}>
      <CategoryList title="Income Categories" items={incomeCategories} color={UI.COLORS.SUCCESS} />
      <CategoryList title="Expense Categories" items={expenseCategories} color={UI.COLORS.ERROR} />
      <TouchableOpacity style={styles.addCategoryButton} onPress={onAddCategory}>
        <Ionicons name="add-circle" size={24} color={UI.COLORS.PRIMARY} />
        <Text style={styles.addCategoryText}>Add New Category</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: UI.SPACING.MD,
  },
  header: {
    marginBottom: UI.SPACING.LG,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.MD,
  },
  section: {
    marginBottom: UI.SPACING.LG,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.MD,
    paddingHorizontal: UI.SPACING.SM,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: UI.CARD_RADIUS,
    padding: UI.SPACING.MD,
    marginBottom: UI.SPACING.SM,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingText: {
    marginLeft: UI.SPACING.MD,
    // flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  settingSubtitle: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  settingRight: {
    marginLeft: UI.SPACING.MD,
    // flex: 1,
  },
  categoryManagement: {
    backgroundColor: UI.COLORS.CARD,
    borderRadius: UI.CARD_RADIUS,
    padding: UI.SPACING.MD,
    marginBottom: UI.SPACING.LG,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  categorySection: {
    marginBottom: UI.SPACING.MD,
  },
  categoryHeader: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: UI.SPACING.SM,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: UI.SPACING.SM,
    paddingHorizontal: UI.SPACING.MD,
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: UI.SPACING.SM,
    marginBottom: UI.SPACING.XS,
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: UI.SPACING.SM,
  },
  categoryName: {
    fontSize: 14,
    color: UI.COLORS.TEXT_PRIMARY,
  },

  addCategoryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: UI.SPACING.MD,
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: UI.CARD_RADIUS,
    borderWidth: 1,
    borderColor: UI.COLORS.PRIMARY,
    borderStyle: "dashed",
    marginTop: UI.SPACING.MD,
  },
  addCategoryText: {
    fontSize: 16,
    fontWeight: "500",
    color: UI.COLORS.PRIMARY,
    marginLeft: UI.SPACING.SM,
  },
  // Modal styles for billing day picker
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: UI.CARD_RADIUS,
    padding: UI.SPACING.LG,
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.SM,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    marginBottom: UI.SPACING.LG,
    textAlign: "center",
  },
  modalBody: {
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center",
    marginBottom: UI.SPACING.SM,
  },
  modalEpoch: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
    textAlign: "center",
    marginBottom: UI.SPACING.SM,
  },
  dayPickerContainer: {
    maxHeight: 300,
    marginBottom: UI.SPACING.LG,
  },
  dayOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: UI.SPACING.MD,
    paddingHorizontal: UI.SPACING.MD,
    borderRadius: UI.SPACING.SM,
    marginBottom: UI.SPACING.XS,
    backgroundColor: UI.COLORS.CARD,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  dayOptionSelected: {
    backgroundColor: UI.COLORS.PRIMARY + "20",
    borderColor: UI.COLORS.PRIMARY,
  },
  dayOptionText: {
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
  },
  dayOptionTextSelected: {
    color: UI.COLORS.PRIMARY,
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: UI.SPACING.MD,
  },
  modalButton: {
    flex: 1,
    paddingVertical: UI.SPACING.MD,
    paddingHorizontal: UI.SPACING.LG,
    borderRadius: UI.SPACING.SM,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    marginRight: UI.SPACING.SM,
  },
  saveButton: {
    backgroundColor: UI.COLORS.PRIMARY,
    marginLeft: UI.SPACING.SM,
  },
  cancelButtonText: {
    fontSize: 16,
    color: UI.COLORS.TEXT_SECONDARY,
    fontWeight: "500",
  },
  saveButtonText: {
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    fontWeight: "600",
  },
  signOutButton: {
    paddingHorizontal: UI.SPACING.SM,
    paddingVertical: UI.SPACING.XS,
    backgroundColor: UI.COLORS.ERROR + "20",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: UI.COLORS.ERROR,
  },
  signOutButtonText: {
    fontSize: 12,
    color: UI.COLORS.ERROR,
    fontWeight: "500",
  },
  // Add Category Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: UI.SPACING.LG,
  },
  addCategoryModal: {
    backgroundColor: UI.COLORS.CARD,
    borderRadius: UI.SPACING.LG,
    padding: UI.SPACING.XL,
    width: "100%",
    maxWidth: 400,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: UI.SPACING.LG,
  },
  closeButton: {
    padding: UI.SPACING.SM,
  },
  inputGroup: {
    marginBottom: UI.SPACING.LG,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.SM,
  },
  modalInput: {
    backgroundColor: UI.COLORS.INPUT_BACKGROUND,
    borderRadius: UI.SPACING.SM,
    padding: UI.SPACING.MD,
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  typeSelector: {
    flexDirection: "row",
    gap: UI.SPACING.SM,
  },
  typeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: UI.SPACING.MD,
    paddingHorizontal: UI.SPACING.LG,
    borderRadius: UI.SPACING.SM,
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    gap: UI.SPACING.SM,
  },
  typeOptionActive: {
    backgroundColor: UI.COLORS.PRIMARY + "20",
    borderColor: UI.COLORS.PRIMARY,
  },
  typeOptionText: {
    fontSize: 16,
    color: UI.COLORS.TEXT_SECONDARY,
    fontWeight: "500",
  },
  typeOptionTextActive: {
    color: UI.COLORS.PRIMARY,
    fontWeight: "600",
  },
  colorPicker: {
    flexDirection: "row",
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: UI.SPACING.SM,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorOptionSelected: {
    borderColor: UI.COLORS.TEXT_PRIMARY,
  },
  colorPickerContent: {
    paddingRight: UI.SPACING.MD,
  },
  colorOptionClear: {
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 2,
    borderColor: UI.COLORS.BORDER,
    borderStyle: "dashed",
  },
  saveButtonDisabled: {
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  saveButtonTextDisabled: {
    color: UI.COLORS.TEXT_MUTED,
  },
});
