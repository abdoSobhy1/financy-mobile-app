import React, { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { syncService } from "../../services/syncService";

export const SyncTestComponent: React.FC = () => {
  const [lastSync, setLastSync] = useState<string>("No sync detected");

  useEffect(() => {
    const unsubscribe = syncService.onDataChange((collectionName, operation, docId) => {
      const timestamp = new Date().toLocaleTimeString();
      setLastSync(`${timestamp}: ${operation} on ${collectionName}/${docId}`);
    });

    return unsubscribe;
  }, []);

  const simulateSync = () => {
    console.log("🧪 Manually triggering sync notification test...");
    syncService.testNotification("budgets");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sync Status</Text>
      <Text style={styles.status}>{lastSync}</Text>
      <Button title="Test Sync" onPress={simulateSync} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f0f0f0",
    margin: 8,
    borderRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  status: {
    fontSize: 14,
    marginBottom: 8,
    color: "#666",
  },
});
