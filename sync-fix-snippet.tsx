// Quick Fix: Add this to your BillPaymentHistoryScreen header
// Add a sync button that pulls Firebase data to local database

const syncFromFirebase = async () => {
  try {
    console.log("🔄 Syncing transaction data from Firebase...");
    const { offlineFirstSync } = await import("../services/OfflineFirstSync");
    await offlineFirstSync.performComprehensiveCloudRestore();
    console.log("✅ Sync completed - reload the screen to see updated data");
    Alert.alert("Sync Complete", "Transaction data synced from Firebase. Pull down to refresh.");
  } catch (error) {
    console.error("❌ Sync failed:", error);
    Alert.alert("Sync Failed", "Could not sync from Firebase. Please try again.");
  }
};

// Add this button to your header:
<TouchableOpacity onPress={syncFromFirebase}>
  <Ionicons name="sync" size={20} color={UI.COLORS.PRIMARY} />
</TouchableOpacity>;
