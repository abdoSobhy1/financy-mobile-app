import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";

import Screen from "../components/ui/Screen";
import { UI } from "../constants";
import { db } from "../database/queries";
import { Transaction } from "../types";
import { SyncService } from "../services/syncService";
import { debugLinkedBillIds } from "../debug/checkLinkedBills";

interface Props {
  navigation: any;
  route: {
    params: {
      billId: string;
    };
  };
}

interface Bill {
  id: string;
  name: string;
  amount: number;
}

const BillPaymentHistoryScreen: React.FC<Props> = ({ navigation, route }) => {
  const { billId } = route.params;
  const [bill, setBill] = useState<Bill | null>(null);
  const [payments, setPayments] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadBillAndPayments = async () => {
    try {
      // Load bill details
      const billResult = await db.bills.getBillById(billId);
      if (billResult) {
        setBill(billResult);
      }

      // Load payment transactions linked to this bill
      const paymentsResult = await db.transactions.getTransactionsByBillId(billId);
      setPayments(paymentsResult || []);

      console.log("🔍 Loaded payments for bill:", billId);
      console.log("📊 Found transactions:", paymentsResult?.length || 0);
      console.log(
        "💰 Payment data:",
        paymentsResult?.map((p) => ({
          id: p.id,
          amount: p.amount,
          linkedBillId: p.linkedBillId,
          date: p.date,
          description: p.description,
        }))
      );
    } catch (error) {
      console.error("Error loading bill payments:", error);
      Alert.alert("Error", "Failed to load payment history");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBillAndPayments();
    setRefreshing(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const syncService = SyncService.getInstance();
      await syncService.forceFullSync();
      await loadBillAndPayments();
      Alert.alert("Success", "Data synced successfully!");
    } catch (error) {
      console.error("Sync error:", error);
      Alert.alert("Sync Error", "Failed to sync data with Firebase");
    } finally {
      setSyncing(false);
    }
  };

  const handleDebug = async () => {
    try {
      const results = await debugLinkedBillIds();
      Alert.alert(
        "Debug Results",
        `Total Transactions: ${results.totalTransactions}\nLinked: ${results.linkedTransactions}\nNull LinkedBillId: ${results.nullLinkedTransactions}\nTotal Bills: ${results.totalBills}`
      );
    } catch (error) {
      Alert.alert("Debug Error", "Failed to debug data");
    }
  };

  useEffect(() => {
    loadBillAndPayments();
  }, [billId]);

  const renderPaymentItem = ({ item }: { item: Transaction }) => (
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <Text style={styles.paymentAmount}></Text>
        <Text style={styles.paymentDate}>{format(new Date(item.date), "MMM dd, yyyy")}</Text>
      </View>
      {item.note && <Text style={styles.paymentNotes}>{item.note}</Text>}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={64} color={UI.COLORS.TEXT_SECONDARY} />
      <Text style={styles.emptyTitle}>No Payment History</Text>
      <Text style={styles.emptyMessage}>No payments have been recorded for this bill yet.</Text>
    </View>
  );

  if (loading) {
    return (
      <Screen style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={UI.COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.title}>Payment History</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.debugButton} onPress={handleDebug}>
            <Ionicons name="bug-outline" size={20} color={UI.COLORS.WARNING} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.syncButton, syncing && styles.syncButtonDisabled]} onPress={handleSync} disabled={syncing}>
            <Ionicons name={syncing ? "sync" : "cloud-download-outline"} size={20} color={syncing ? UI.COLORS.TEXT_SECONDARY : UI.COLORS.PRIMARY} />
          </TouchableOpacity>
        </View>
      </View>

      {bill && (
        <View style={styles.billInfo}>
          <Text style={styles.billName}>{bill.name}</Text>
          <Text style={styles.billAmount}>Bill Amount:</Text>
        </View>
      )}

      <FlatList
        data={payments}
        renderItem={renderPaymentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.paymentsList}
        ListEmptyComponent={renderEmptyState}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      />

      {payments.length > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>Total Payments: {payments.length}</Text>
          <Text style={styles.summaryText}>Total Paid: ${payments.reduce((sum, payment) => sum + Math.abs(payment.amount), 0).toFixed(2)}</Text>
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.COLORS.BACKGROUND,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: UI.SPACING.LG,
    paddingVertical: UI.SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: UI.COLORS.SURFACE,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
  },

  billInfo: {
    backgroundColor: UI.COLORS.SURFACE,
    padding: UI.SPACING.LG,
    margin: UI.SPACING.LG,
    borderRadius: UI.CARD_RADIUS,
  },
  billName: {
    fontSize: 18,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  billAmount: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
  },
  paymentsList: {
    padding: UI.SPACING.LG,
    flexGrow: 1,
  },
  paymentCard: {
    backgroundColor: UI.COLORS.SURFACE,
    padding: UI.SPACING.LG,
    borderRadius: UI.CARD_RADIUS,
    marginBottom: UI.SPACING.MD,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: "600",
    color: UI.COLORS.SUCCESS,
  },
  paymentDate: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
  },
  paymentNotes: {
    fontSize: 14,
    color: UI.COLORS.TEXT_PRIMARY,
    marginTop: UI.SPACING.SM,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: UI.SPACING.XL * 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginTop: UI.SPACING.LG,
    marginBottom: UI.SPACING.SM,
  },
  emptyMessage: {
    fontSize: 16,
    color: UI.COLORS.TEXT_SECONDARY,
    textAlign: "center",
    paddingHorizontal: UI.SPACING.XL,
  },
  summary: {
    backgroundColor: UI.COLORS.SURFACE,
    padding: UI.SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
  },
  summaryText: {
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  syncButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: UI.COLORS.SURFACE,
    justifyContent: "center",
    alignItems: "center",
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  headerButtons: {
    flexDirection: "row",
    gap: UI.SPACING.SM,
  },
  debugButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: UI.COLORS.SURFACE,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default BillPaymentHistoryScreen;
