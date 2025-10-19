import React, { useState, useMemo, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootState, AppDispatch } from "../store";
import { deleteBill, fetchBills } from "../store/slices/billsSlice";
import { Screen, Button, EmptyState } from "../components/ui";
import { EnhancedBillCard } from "../components/bills/EnhancedBillCard";
import { BillFiltersModal } from "../components/bills/BillFiltersModal";
import { UI } from "../constants";
import { EnhancedBill, BillStatus, getBillStatus } from "../types/bills";
import { BillStackParamList } from "../types";
import { format, startOfDay, endOfDay, isWithinInterval, parseISO } from "date-fns";

type BillsViewMode = "all" | "upcoming" | "overdue" | "paid" | "recurring";

type BillsScreenNavigationProp = StackNavigationProp<BillStackParamList, "BillList">;

interface BillFilters {
  status?: BillStatus;
  dateRange?: {
    start: Date;
    end: Date;
  };
  recurring?: boolean;
  minAmount?: number;
  maxAmount?: number;
  searchText?: string;
}

const QUICK_FILTERS: Array<{ key: BillsViewMode; label: string; icon: string }> = [
  { key: "all", label: "All Bills", icon: "list" },
  { key: "upcoming", label: "Upcoming", icon: "calendar" },
  { key: "overdue", label: "Overdue", icon: "alert-circle" },
  { key: "paid", label: "Paid", icon: "checkmark-circle" },
  { key: "recurring", label: "Recurring", icon: "repeat" },
];

export const BillsListScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<BillsScreenNavigationProp>();
  const bills = useSelector((state: RootState) => state.bills);

  const [selectedMode, setSelectedMode] = useState<BillsViewMode>("all");

  const [showFilters, setShowFilters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedBill, setSelectedBill] = useState<EnhancedBill | null>(null);
  const [filters, setFilters] = useState<BillFilters>({});

  // Load bills data on component mount
  useEffect(() => {
    dispatch(fetchBills());
  }, [dispatch]);

  // Helper function to calculate next due date for recurring bills
  const calculateNextDueDate = (bill: any): string | undefined => {
    if (!bill.recurring || !bill.recurrenceFrequency) return undefined;

    const dueDate = new Date(bill.dueDate);
    const today = new Date();

    if (dueDate > today) return bill.dueDate;

    // Simple calculation - add 30 days for monthly, 7 for weekly, etc.
    const nextDate = new Date(dueDate);
    switch (bill.recurrenceFrequency) {
      case "weekly":
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case "bi-weekly":
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case "quarterly":
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case "yearly":
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        return undefined;
    }

    return nextDate.toISOString();
  };

  // Convert bills to EnhancedBill format
  const enhancedBills = useMemo(() => {
    // Convert Record<string, Bill> to Bill[]
    const billsArray = Object.values(bills.items);
    return billsArray.map(
      (bill) =>
        ({
          ...bill,
          nextDueDate: bill.recurring ? calculateNextDueDate(bill) : undefined,
        } as EnhancedBill)
    );
  }, [bills]);

  // Filter bills based on selected mode and additional filters
  const filteredBills = useMemo(() => {
    let filtered = enhancedBills;

    // Apply mode filter
    switch (selectedMode) {
      case "upcoming":
        filtered = filtered.filter((bill) => {
          const status = getBillStatus(bill);
          return status === "upcoming" || status === "due";
        });
        break;
      case "overdue":
        filtered = filtered.filter((bill) => getBillStatus(bill) === "overdue");
        break;
      case "paid":
        filtered = filtered.filter((bill) => getBillStatus(bill) === "paid");
        break;
      case "recurring":
        filtered = filtered.filter((bill) => bill.recurring);
        break;
      // 'all' shows everything
    }

    // Apply additional filters
    if (filters.status) {
      filtered = filtered.filter((bill) => getBillStatus(bill) === filters.status);
    }

    if (filters.dateRange) {
      filtered = filtered.filter((bill) => {
        const dueDate = parseISO(bill.dueDate);
        return isWithinInterval(dueDate, {
          start: startOfDay(filters.dateRange!.start),
          end: endOfDay(filters.dateRange!.end),
        });
      });
    }

    if (filters.recurring !== undefined) {
      filtered = filtered.filter((bill) => bill.recurring === filters.recurring);
    }

    if (filters.minAmount !== undefined) {
      filtered = filtered.filter((bill) => bill.amount >= filters.minAmount!);
    }

    if (filters.maxAmount !== undefined) {
      filtered = filtered.filter((bill) => bill.amount <= filters.maxAmount!);
    }

    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(
        (bill) => bill.name.toLowerCase().includes(searchLower) || (bill.notes && bill.notes.toLowerCase().includes(searchLower))
      );
    }

    // Sort by due date
    return filtered.sort((a, b) => {
      const dateA = new Date(a.dueDate);
      const dateB = new Date(b.dueDate);
      return dateA.getTime() - dateB.getTime();
    });
  }, [enhancedBills, selectedMode, filters]);

  // Group bills by status for better organization
  const groupedBills = useMemo(() => {
    const groups: Record<string, EnhancedBill[]> = {};

    filteredBills.forEach((bill) => {
      const status = getBillStatus(bill);
      const key =
        status === "overdue" ? "Overdue" : status === "due" ? "Due Today" : status === "upcoming" ? "Upcoming" : status === "paid" ? "Paid" : "Other";

      if (!groups[key]) groups[key] = [];
      groups[key].push(bill);
    });

    // Sort groups by priority
    const sortOrder = ["Overdue", "Due Today", "Upcoming", "Paid", "Other"];
    return sortOrder.filter((key) => groups[key]).map((key) => ({ title: key, data: groups[key] }));
  }, [filteredBills]);

  const handleEditBill = (bill: EnhancedBill) => {
    navigation.navigate("BillForm", { billId: bill.id });
  };

  const handleDeleteBill = (bill: EnhancedBill) => {
    Alert.alert(
      "Delete Bill",
      `Are you sure you want to delete "${bill.name}"?${bill.recurring ? " This will also remove all future occurrences." : ""}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await dispatch(deleteBill(bill.id)).unwrap();
            } catch (error) {
              Alert.alert("Error", "Failed to delete bill");
            }
          },
        },
      ]
    );
  };

  const handleViewHistory = (bill: EnhancedBill) => {
    navigation.navigate("BillPaymentHistory", { billId: bill.id });
  };

  const renderBillCard = ({ item }: { item: EnhancedBill }) => (
    <EnhancedBillCard bill={item} onEdit={handleEditBill} onDelete={handleDeleteBill} onViewHistory={handleViewHistory} />
  );

  const renderGroupHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.groupHeader}>
      <Text style={styles.groupTitle}>{section.title}</Text>
      <View style={styles.groupLine} />
    </View>
  );

  const renderEmptyState = () => (
    <EmptyState
      icon="receipt-outline"
      title="No Bills Found"
      message={
        selectedMode === "all"
          ? "You haven't added any bills yet. Tap the + button to add your first bill."
          : `No ${selectedMode} bills found. Try adjusting your filters.`
      }
      action={
        selectedMode === "all"
          ? {
              text: "Add First Bill",
              onPress: () => navigation.navigate("BillForm", {}),
            }
          : undefined
      }
    />
  );

  const getFilterCount = () => {
    return Object.values(filters).filter((value) => value !== undefined && value !== null && value !== "").length;
  };

  return (
    <Screen style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Bills</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.headerButton, getFilterCount() > 0 && styles.activeFilterButton]} onPress={() => setShowFilters(true)}>
            <Ionicons name="filter" size={20} color={UI.COLORS.TEXT_PRIMARY} />
            {getFilterCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getFilterCount()}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              setSelectedBill(null);
              navigation.navigate("BillForm", {});
            }}>
            <Ionicons name="add" size={24} color={UI.COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Filters */}
      <View style={styles.quickFilters}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={QUICK_FILTERS}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.quickFilter, selectedMode === item.key && styles.quickFilterActive]}
              onPress={() => setSelectedMode(item.key)}>
              <Ionicons name={item.icon as any} size={16} color={selectedMode === item.key ? "white" : UI.COLORS.TEXT_SECONDARY} />
              <Text style={[styles.quickFilterText, selectedMode === item.key && styles.quickFilterTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.quickFiltersContent}
        />
      </View>

      {/* Bills List */}
      <FlatList
        data={filteredBills}
        renderItem={renderBillCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.billsList}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Modals */}
      <BillFiltersModal visible={showFilters} onClose={() => setShowFilters(false)} filters={filters} onFiltersChange={setFilters} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: UI.SPACING.LG,
    paddingVertical: UI.SPACING.MD,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  headerActions: {
    flexDirection: "row",
    gap: UI.SPACING.SM,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: UI.COLORS.SURFACE,
    justifyContent: "center",
    alignItems: "center",
  },
  activeFilterButton: {
    backgroundColor: UI.COLORS.PRIMARY,
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: UI.COLORS.ERROR,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "white",
  },
  quickFilters: {
    paddingVertical: UI.SPACING.SM,
  },
  quickFiltersContent: {
    paddingHorizontal: UI.SPACING.LG,
    gap: UI.SPACING.SM,
  },
  quickFilter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: UI.SPACING.MD,
    paddingVertical: UI.SPACING.SM,
    borderRadius: UI.CARD_RADIUS,
    backgroundColor: UI.COLORS.SURFACE,
    gap: UI.SPACING.XS,
  },
  quickFilterActive: {
    backgroundColor: UI.COLORS.PRIMARY,
  },
  quickFilterText: {
    fontSize: 14,
    fontWeight: "500",
    color: UI.COLORS.TEXT_SECONDARY,
  },
  quickFilterTextActive: {
    color: "white",
  },
  billsList: {
    padding: UI.SPACING.LG,
    flexGrow: 1,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: UI.SPACING.LG,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginRight: UI.SPACING.MD,
  },
  groupLine: {
    flex: 1,
    height: 1,
    backgroundColor: UI.COLORS.BORDER,
  },
});

export default BillsListScreen;
