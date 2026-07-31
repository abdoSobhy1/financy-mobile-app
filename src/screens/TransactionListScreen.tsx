import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Platform,
  ActionSheetIOS,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootState, AppDispatch } from "../store";
import {
  fetchTransactions,
  deleteTransaction,
  duplicateTransaction,
} from "../store/slices/transactionsSlice";
import { fetchCategories } from "../store/slices/categoriesSlice";
import { Transaction, TransactionStackParamList } from "../types";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { useTabBarHeight } from "../components/ui";
import { ListRow } from "../components/ui/ListRow";
import { IconChip } from "../components/ui/IconChip";
import { formatCurrency } from "../utils";
import { format, isToday, isYesterday, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns";

type NavigationProp = StackNavigationProp<TransactionStackParamList, "TransactionList">;

type TimeFilter = "This Month" | "Last Month" | "Year";
type TypeFilter = "All" | "Income" | "Expense";

export const TransactionListScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NavigationProp>();
  const { colors, typography, spacing, radius } = useAppTheme();
  const tabBarHeight = useTabBarHeight();

  const { items: transactionsMap, loading } = useSelector(
    (state: RootState) => state.transactions
  );
  const { items: categories } = useSelector(
    (state: RootState) => state.categories
  );

  const [refreshing, setRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("This Month");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");

  useEffect(() => {
    dispatch(fetchTransactions());
    dispatch(fetchCategories());
  }, [dispatch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchTransactions());
    setRefreshing(false);
  };

  const transactions = Object.values(transactionsMap || {}).filter(t => !t.deleted);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (timeFilter === "This Month") {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else if (timeFilter === "Last Month") {
      const lastMonth = subMonths(now, 1);
      startDate = startOfMonth(lastMonth);
      endDate = endOfMonth(lastMonth);
    } else {
      startDate = startOfYear(now);
      endDate = endOfYear(now);
    }

    return transactions
      .filter((t) => {
        const d = new Date(t.date);
        return d >= startDate && d <= endDate;
      })
      .filter((t) => {
        if (typeFilter === "All") return true;
        return typeFilter.toLowerCase() === t.type;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, timeFilter, typeFilter]);

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    filteredTransactions.forEach(t => {
      const d = new Date(t.date);
      let title = "";
      if (isToday(d)) title = "Today";
      else if (isYesterday(d)) title = "Yesterday";
      else title = format(d, "EEEE, d MMM");
      
      if (!groups[title]) groups[title] = [];
      groups[title].push(t);
    });

    return Object.keys(groups).map(title => ({
      title,
      data: groups[title],
    }));
  }, [filteredTransactions]);

  const handleTransactionPress = (transaction: Transaction) => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Edit", "Duplicate", "Delete"],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
          title: transaction.description || "Transaction",
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleEdit(transaction);
          if (buttonIndex === 2) handleDuplicate(transaction);
          if (buttonIndex === 3) handleDelete(transaction);
        }
      );
    } else {
      Alert.alert(
        transaction.description || "Transaction",
        "What would you like to do?",
        [
          { text: "Edit", onPress: () => handleEdit(transaction) },
          { text: "Duplicate", onPress: () => handleDuplicate(transaction) },
          { text: "Delete", onPress: () => handleDelete(transaction), style: "destructive" },
          { text: "Cancel", style: "cancel" },
        ]
      );
    }
  };

  const handleEdit = (transaction: Transaction) => {
    navigation.navigate("AddTransaction" as any, { editTransaction: transaction });
  };

  const handleDuplicate = async (transaction: Transaction) => {
    try {
      await dispatch(duplicateTransaction(transaction.id)).unwrap();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (transaction: Transaction) => {
    Alert.alert("Delete", "Are you sure you want to delete this transaction?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await dispatch(deleteTransaction(transaction.id)).unwrap();
        } catch (error) {
          console.error(error);
        }
      }}
    ]);
  };

  const FilterChip = ({ label, isActive, onPress }: { label: string, isActive: boolean, onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: isActive ? colors.primary : colors.surfaceVariant,
        marginRight: spacing.sm,
      }}>
      <Text style={[typography.bodyMedium, { color: isActive ? colors.onPrimary : colors.onSurfaceVariant }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <StatusBar barStyle="light-content" />
      
      <View style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
        <Text style={[typography.h2, { color: colors.onBackground, marginBottom: spacing.md }]}>
          Transactions
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.md }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ alignItems: "center", paddingRight: spacing.md }}>
            {(["This Month", "Last Month", "Year"] as TimeFilter[]).map(tf => (
              <FilterChip key={tf} label={tf} isActive={timeFilter === tf} onPress={() => setTimeFilter(tf)} />
            ))}
            
            <View style={{ width: 1, height: 24, backgroundColor: colors.outlineVariant, marginHorizontal: spacing.sm }} />

            {(["All", "Income", "Expense"] as TypeFilter[]).map(tf => (
              <FilterChip key={tf} label={tf} isActive={typeFilter === tf} onPress={() => setTypeFilter(tf)} />
            ))}
          </ScrollView>

          <TouchableOpacity style={{ padding: spacing.xs, marginLeft: spacing.xs }}>
            <Ionicons name="options" size={24} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>

      <SectionList
        sections={groupedTransactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: tabBarHeight }}
        renderSectionHeader={({ section: { title } }) => (
          <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.background }}>
            <Text style={[typography.label, { color: colors.onSurfaceVariant, textTransform: "uppercase" }]}>
              {title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const category = item.categoryId ? categories[item.categoryId] : null;
          const isIncome = item.type === "income";
          
          return (
            <View style={{ paddingHorizontal: spacing.lg }}>
              <ListRow
                title={category?.name || "Uncategorized"}
                subtitle={item.description || "No description"}
                leading={
                  <IconChip
                    iconName={((category as any)?.icon as any) || "help"}
                    colorName="bluegrey"
                    size={40}
                  />
                }
                trailing={
                  <Text style={[typography.label, { color: isIncome ? colors.tertiary : colors.error }]}>
                    {isIncome ? "+" : "-"}{formatCurrency(item.amount)}
                  </Text>
                }
                onPress={() => handleTransactionPress(item)}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={{ padding: spacing.xxl, alignItems: "center" }}>
              <Text style={[typography.bodyLarge, { color: colors.onSurfaceVariant }]}>No transactions found</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
};

export default TransactionListScreen;
