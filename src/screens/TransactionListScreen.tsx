import { AlertService } from "../services/AlertService";
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
  TextInput,
  Modal,
  LayoutAnimation,
  UIManager,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useDispatch, useSelector } from "react-redux";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootState, AppDispatch } from "../store";
import {
  fetchTransactions,
  deleteMultipleTransactions,
} from "../store/slices/transactionsSlice";
import { fetchCategories } from "../store/slices/categoriesSlice";
import { fetchBudgets } from "../store/slices/budgetsSlice";
import { fetchDebts } from "../store/slices/debtsSlice";
import { fetchSettings } from "../store/slices/settingsSlice";
import { Transaction, TransactionStackParamList, WalletAccount } from "../types";
import { walletService } from "../services/walletService";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { useTabBarHeight, IconChip, useToast, ToastOverlay } from "../components/ui";
import { AppHeader } from "../components/ui/AppHeader";
import { useTransactionActions } from "../hooks/useTransactionActions";

import { formatCurrency, getDateRangeForBillingPeriod } from "../utils";
import {
  format,
  isToday,
  isYesterday,
  startOfDay,
  endOfDay,
  subDays,
  startOfYear,
  endOfYear,
} from "date-fns";
import {
  CustomDateRangeModal,
  TransactionFilterModal,
} from "../components/transactions";

type NavigationProp = StackNavigationProp<
  TransactionStackParamList,
  "TransactionList"
>;

type TimeFilter =
  | "Today"
  | "This Month"
  | "Last Month"
  | "Year"
  | "All Time"
  | "custom";
type TypeFilter = "All" | "Income" | "Expense" | "Transfer";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface TransactionRowItemProps {
  tx: Transaction;
  cat: any;
  walletsMap: Record<string, any>;
  secretWalletIds: Set<string>;
  isAdjustment: boolean;
  isFirst: boolean;
  isLast: boolean;
  isOnlyOne: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
  colors: any;
  styles: any;
}

const TransactionRowItem: React.FC<TransactionRowItemProps> = React.memo(
  ({
    tx,
    cat,
    walletsMap,
    secretWalletIds,
    isAdjustment,
    isFirst,
    isLast,
    isOnlyOne,
    isSelected,
    isSelectionMode,
    onPress,
    onLongPress,
    colors,
    styles,
  }) => {
    const anim = useRef(
      new Animated.Value(isSelectionMode && isSelected ? 1 : 0),
    ).current;

    useEffect(() => {
      Animated.timing(anim, {
        toValue: isSelectionMode && isSelected ? 1 : 0,
        duration: 180,
        useNativeDriver: false,
      }).start();
    }, [isSelected, isSelectionMode]);

    const animatedBg = anim.interpolate({
      inputRange: [0, 1],
      outputRange: ["transparent", colors.surfaceVariant],
    });

    const isIncome = tx.type === "income";
    const isTransfer = tx.type === "transfer";
    const fromWallet = tx.accountId ? walletsMap[tx.accountId] : null;
    const toWallet = tx.toAccountId ? walletsMap[tx.toAccountId] : null;

    const transferTitle =
      fromWallet?.name && toWallet?.name
        ? `${fromWallet.name} → ${toWallet.name}`
        : tx.description?.replace(/^Transfer:\s*/i, "") || "Transfer";

    const transferSubtitle =
      fromWallet?.name && toWallet?.name
        ? `${fromWallet.name} → ${toWallet.name} • ${format(new Date(tx.date), "hh:mm a")}`
        : tx.description && tx.description.includes("->")
        ? `${tx.description.replace(/^Transfer:\s*/i, "")} • ${format(new Date(tx.date), "hh:mm a")}`
        : `Transfer • ${format(new Date(tx.date), "hh:mm a")}`;

    const reconcileSubtitle = fromWallet?.name
      ? `${fromWallet.name} • Reconcile • ${format(new Date(tx.date), "hh:mm a")}`
      : `Reconcile • ${format(new Date(tx.date), "hh:mm a")}`;

    const selectedRadiusStyle = isOnlyOne
      ? { borderRadius: 18 }
      : isFirst
      ? {
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          borderBottomLeftRadius: 3,
          borderBottomRightRadius: 3,
        }
      : isLast
      ? {
          borderBottomLeftRadius: 18,
          borderBottomRightRadius: 18,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
        }
      : {
          borderRadius: 3,
        };

    return (
      <View key={tx.id}>
        <AnimatedTouchable
          style={[
            styles.txRow,
            { backgroundColor: animatedBg },
            selectedRadiusStyle,
          ]}
          onPress={onPress}
          onLongPress={onLongPress}
          activeOpacity={0.7}>
          {/* Animated Icon Box: smooth cross-fade between icon and checkmark */}
          <View
            style={{
              width: 44,
              height: 44,
              marginRight: 14,
              justifyContent: "center",
              alignItems: "center",
            }}>
            <Animated.View
              style={{
                position: "absolute",
                opacity: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
              }}>
              <IconChip
                icon={
                  isTransfer
                    ? ("swap-horizontal-outline" as any)
                    : isAdjustment
                    ? ("wallet-outline" as any)
                    : ((((cat as any)?.icon as any) || "receipt-outline") as any)
                }
                color={
                  isTransfer
                    ? colors.onSurfaceVariant
                    : isAdjustment
                    ? "teal"
                    : cat?.color || colors.primary
                }
                size="md"
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.iconBadge,
                {
                  position: "absolute",
                  marginRight: 0,
                  backgroundColor: colors.primary,
                  opacity: anim,
                  transform: [
                    {
                      scale: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.65, 1],
                      }),
                    },
                  ],
                },
              ]}
              pointerEvents={isSelected ? "auto" : "none"}>
              <Ionicons name="checkmark" size={22} color={colors.onPrimary} />
            </Animated.View>
          </View>

          <View style={styles.txCenterCol}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text
                style={[styles.txTitleText, { flexShrink: 1 }]}
                numberOfLines={1}>
                {isTransfer
                  ? tx.description || transferTitle
                  : isAdjustment
                  ? "Balance adjustment"
                  : tx.description || cat?.name || "Transaction"}
              </Text>
              {Boolean(tx.receiptUri) && (
                <Ionicons
                  name="attach-outline"
                  size={15}
                  color={colors.primary}
                />
              )}
            </View>
            <Text style={styles.txSubtitleText} numberOfLines={1}>
              {isTransfer
                ? transferSubtitle
                : isAdjustment
                ? reconcileSubtitle
                : `${cat?.name || "Uncategorized"} • ${format(new Date(tx.date), "hh:mm a")}`}
              {walletService.isSecretTransaction(tx, secretWalletIds)
                ? " • 🔒 Secret"
                : ""}
            </Text>
          </View>

          <View style={styles.txRightCol}>
            <Text
              style={[
                styles.txAmountText,
                isIncome && !isAdjustment && styles.txAmountIncome,
                (isTransfer || isAdjustment) && { color: colors.onSurface },
              ]}>
              {isTransfer || isAdjustment ? "" : isIncome ? "+" : "-"}
              {formatCurrency(tx.amount)}
            </Text>
          </View>
        </AnimatedTouchable>
        {!isLast && <View style={styles.separator} />}
      </View>
    );
  },
);

export const TransactionListScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NavigationProp>();
  const { colors, typography, spacing, radius, isDark } = useAppTheme();
  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();
  const { handleTransactionPress } = useTransactionActions();

  const { items: transactionsMap, loading } = useSelector(
    (state: RootState) => state.transactions,
  );
  const { items: categories } = useSelector(
    (state: RootState) => state.categories,
  );
  const { data: settingsData } = useSelector(
    (state: RootState) => state.settings,
  );
  const { showSuccess, showError, showInfo } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("This Month");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedWalletIds, setSelectedWalletIds] = useState<Set<string>>(
    new Set(),
  );

  // Multi-select state
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState<boolean>(false);

  // Filter Modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  // Temporary state inside Modal
  const [tempTimeFilter, setTempTimeFilter] = useState<TimeFilter>(timeFilter);
  const [tempTypeFilter, setTempTypeFilter] = useState<TypeFilter>(typeFilter);
  const [tempCategoryIds, setTempCategoryIds] = useState<Set<string>>(
    new Set(),
  );
  const [tempBudgetIds, setTempBudgetIds] = useState<Set<string>>(
    new Set(),
  );
  const [tempWalletIds, setTempWalletIds] = useState<Set<string>>(
    new Set(),
  );

  // Custom Date Modal state
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date>(
    new Date(new Date().setMonth(new Date().getMonth() - 1)),
  );
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());

  // Temporary custom dates inside the modal
  const [tempCustomStartDate, setTempCustomStartDate] =
    useState<Date>(customStartDate);
  const [tempCustomEndDate, setTempCustomEndDate] =
    useState<Date>(customEndDate);
  const [wallets, setWallets] = useState<WalletAccount[]>(() =>
    walletService.getCachedWallets(),
  );
  const [secretWalletIds, setSecretWalletIds] = useState<Set<string>>(() =>
    walletService.getSecretWalletIds(walletService.getCachedWallets()),
  );

  const walletsMap = useMemo(() => {
    const map: Record<string, WalletAccount> = {};
    wallets.forEach((w) => {
      map[w.id] = w;
    });
    return map;
  }, [wallets]);

  const loadSecretWalletIds = async () => {
    try {
      const loadedWallets = await walletService.getWallets();
      setWallets(loadedWallets);
      setSecretWalletIds(walletService.getSecretWalletIds(loadedWallets));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    dispatch(fetchTransactions());
    dispatch(fetchCategories());
    dispatch(fetchBudgets());
    dispatch(fetchSettings());
    loadSecretWalletIds();
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchTransactions());
      dispatch(fetchBudgets());
      dispatch(fetchSettings());
      loadSecretWalletIds();
    }, [dispatch]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchTransactions()),
      dispatch(fetchBudgets()),
      dispatch(fetchSettings()),
      loadSecretWalletIds(),
    ]);
    setRefreshing(false);
  };

  const openFilterModal = () => {
    setTempTimeFilter(timeFilter);
    setTempTypeFilter(typeFilter);
    setTempCategoryIds(new Set(selectedCategoryIds));
    setTempBudgetIds(new Set(selectedBudgetIds));
    setTempWalletIds(new Set(selectedWalletIds));
    setShowFilterModal(true);
  };

  const applyModalFilters = () => {
    setTimeFilter(tempTimeFilter);
    setTypeFilter(tempTypeFilter);
    setSelectedCategoryIds(new Set(tempCategoryIds));
    setSelectedBudgetIds(new Set(tempBudgetIds));
    setSelectedWalletIds(new Set(tempWalletIds));
    setShowFilterModal(false);
  };

  const resetModalFilters = () => {
    setTempTimeFilter("This Month");
    setTempTypeFilter("All");
    setTempCategoryIds(new Set());
    setTempBudgetIds(new Set());
    setTempWalletIds(new Set());
  };

  const toggleCategorySelection = (catId: string) => {
    setTempCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  const toggleBudgetSelection = (budgetId: string) => {
    setTempBudgetIds((prev) => {
      const next = new Set(prev);
      if (next.has(budgetId)) {
        next.delete(budgetId);
      } else {
        next.add(budgetId);
      }
      return next;
    });
  };

  const toggleWalletSelection = (walletId: string) => {
    setTempWalletIds((prev) => {
      const next = new Set(prev);
      if (next.has(walletId)) {
        next.delete(walletId);
      } else {
        next.add(walletId);
      }
      return next;
    });
  };

  const transactions = useMemo(
    () => Object.values(transactionsMap || {}).filter((t) => !t.deleted),
    [transactionsMap],
  );

  const isWalletReconciliation = useCallback((t: Transaction) => {
    return (
      t.description === "Balance adjustment" ||
      t.description?.toLowerCase().includes("balance adjustment") ||
      t.description?.toLowerCase().includes("reconcil") ||
      (t as any).category === "Adjustment"
    );
  }, []);

  const isExcludedFromCalculations = useCallback(
    (t: Transaction) => {
      if (walletService.isSecretTransactionExcluded(t, secretWalletIds)) return true;
      if (isWalletReconciliation(t)) return true;
      if (t.type === "transfer") return true;
      return false;
    },
    [secretWalletIds, isWalletReconciliation],
  );

  const toggleSelectTx = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    const billingStartDay = settingsData?.billingPeriodStartDay ?? 1;

    if (timeFilter === "Today") {
      startDate = startOfDay(now);
      endDate = endOfDay(now);
    } else if (timeFilter === "This Month") {
      const currentPeriod = getDateRangeForBillingPeriod(billingStartDay, now);
      startDate = currentPeriod.start;
      endDate = currentPeriod.end;
    } else if (timeFilter === "Last Month") {
      const currentPeriod = getDateRangeForBillingPeriod(billingStartDay, now);
      const prevPeriodEnd = subDays(currentPeriod.start, 1);
      const prevPeriod = getDateRangeForBillingPeriod(billingStartDay, prevPeriodEnd);
      startDate = prevPeriod.start;
      endDate = prevPeriod.end;
    } else if (timeFilter === "Year") {
      startDate = startOfYear(now);
      endDate = endOfYear(now);
    } else if (timeFilter === "custom") {
      startDate = new Date(customStartDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // "All Time" - no date bounds
      startDate = undefined;
      endDate = undefined;
    }

    return transactions
      .filter((t) => {
        if (!startDate || !endDate) return true;
        const d = new Date(t.date);
        return d >= startDate && d <= endDate;
      })
      .filter((t) => {
        if (typeFilter === "All") return true;
        return typeFilter.toLowerCase() === t.type;
      })
      .filter((t) => {
        if (selectedCategoryIds.size === 0) return true;
        return t.categoryId && selectedCategoryIds.has(t.categoryId);
      })
      .filter((t) => {
        if (selectedBudgetIds.size === 0) return true;
        if (selectedBudgetIds.has("unbudgeted") && !t.budgetId) return true;
        if (t.budgetId && selectedBudgetIds.has(t.budgetId)) return true;
        return false;
      })
      .filter((t) => {
        if (selectedWalletIds.size === 0) return true;
        return (
          (t.accountId && selectedWalletIds.has(t.accountId)) ||
          (t.toAccountId && selectedWalletIds.has(t.toAccountId))
        );
      })
      .filter((t) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const desc = (t.description || "").toLowerCase();
        const catName = (
          (t.categoryId ? categories[t.categoryId]?.name : "") || ""
        ).toLowerCase();
        return desc.includes(query) || catName.includes(query);
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [
    transactions,
    timeFilter,
    typeFilter,
    selectedCategoryIds,
    selectedBudgetIds,
    selectedWalletIds,
    searchQuery,
    categories,
    settingsData?.billingPeriodStartDay,
    customStartDate,
    customEndDate,
  ]);

  const handleSelectAll = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (selectedTxIds.size === filteredTransactions.length && filteredTransactions.length > 0) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(filteredTransactions.map((t) => t.id)));
    }
  }, [selectedTxIds.size, filteredTransactions]);

  const handleLongPressTx = useCallback((tx: Transaction) => {
    if (!isSelectionMode) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsSelectionMode(true);
      setSelectedTxIds(new Set([tx.id]));
    }
  }, [isSelectionMode]);

  const exitSelectionMode = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSelectionMode(false);
    setSelectedTxIds(new Set());
  }, []);

  const handleMassDelete = useCallback(() => {
    if (selectedTxIds.size === 0) {
      showInfo("No transactions selected");
      return;
    }

    const count = selectedTxIds.size;
    AlertService.alert(
      "Delete Transactions",
      `Are you sure you want to delete ${count} selected ${count === 1 ? "transaction" : "transactions"}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeletingBulk(true);
              const idsArray = Array.from(selectedTxIds);
              await dispatch(deleteMultipleTransactions(idsArray)).unwrap();
              dispatch(fetchBudgets());
              dispatch(fetchDebts());
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setSelectedTxIds(new Set());
              setIsSelectionMode(false);
              showSuccess(`Deleted ${count} ${count === 1 ? "transaction" : "transactions"}`);
            } catch (err: any) {
              console.error("Failed to delete transactions:", err);
              showError("Failed to delete selected transactions");
            } finally {
              setIsDeletingBulk(false);
            }
          },
        },
      ],
    );
  }, [selectedTxIds, dispatch, showSuccess, showError, showInfo]);

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    filteredTransactions.forEach((t) => {
      const d = new Date(t.date);
      let title = "";
      if (isToday(d)) title = `TODAY, ${format(d, "MMM d").toUpperCase()}`;
      else if (isYesterday(d))
        title = `YESTERDAY, ${format(d, "MMM d").toUpperCase()}`;
      else title = format(d, "MMM d, yyyy").toUpperCase();

      if (!groups[title]) groups[title] = [];
      groups[title].push(t);
    });

    return Object.keys(groups).map((title) => {
      const data = groups[title];
      const dailyTotal = data.reduce((sum, t) => {
        if (isExcludedFromCalculations(t)) return sum;
        if (t.type === "income") return sum + t.amount;
        if (t.type === "expense") return sum - t.amount;
        return sum;
      }, 0);

      return {
        title,
        dailyTotal,
        // Wrap array in a single group object so we render a continuous card per date
        data: [{ id: title, items: data }],
      };
    });
  }, [filteredTransactions, isExcludedFromCalculations]);

  const totalAmount = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => {
      if (isExcludedFromCalculations(t)) return sum;
      return t.type === "income" ? sum + t.amount : sum - t.amount;
    }, 0);
  }, [filteredTransactions, isExcludedFromCalculations]);

  const allCategoriesList = useMemo(
    () => Object.values(categories).filter((c) => c && !c.deleted),
    [categories],
  );

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Standard App Header */}
      {isSelectionMode ? (
        <AppHeader
          title={`${selectedTxIds.size} Selected`}
          showSettings={false}
          rightAction={
            <TouchableOpacity
              onPress={exitSelectionMode}
              style={{ paddingHorizontal: 12, paddingVertical: 6 }}
              activeOpacity={0.7}>
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 16 }}>Done</Text>
            </TouchableOpacity>
          }
        />
      ) : (
        <AppHeader title="Transactions" />
      )}

      <View style={styles.topContainer}>
        {/* Search Bar & Filter */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons
              name="search"
              size={20}
              color={colors.onSurfaceVariant}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search transactions..."
              placeholderTextColor={colors.onSurfaceVariant}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={openFilterModal}>
            <Ionicons
              name="options-outline"
              size={24}
              color={colors.onBackground}
            />
            {(selectedCategoryIds.size > 0 ||
              selectedBudgetIds.size > 0 ||
              selectedWalletIds.size > 0 ||
              typeFilter === "Transfer") && (
              <View
                style={[
                  styles.filterBadge,
                  { backgroundColor: colors.primaryContainer },
                ]}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Multi-Select Action Banner */}
        {isSelectionMode && (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: colors.surfaceVariant,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.md,
              marginTop: 6,
              marginBottom: 4,
            }}>
            <TouchableOpacity
              onPress={handleSelectAll}
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              activeOpacity={0.7}>
              <Ionicons
                name={
                  selectedTxIds.size === filteredTransactions.length && filteredTransactions.length > 0
                    ? "checkbox"
                    : "square-outline"
                }
                size={20}
                color={colors.primary}
              />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.onSurfaceVariant }}>
                {selectedTxIds.size === filteredTransactions.length && filteredTransactions.length > 0
                  ? "Deselect All"
                  : `Select All (${filteredTransactions.length})`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleMassDelete}
              disabled={selectedTxIds.size === 0 || isDeletingBulk}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: selectedTxIds.size > 0 ? colors.error : colors.outlineVariant,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: radius.sm,
                opacity: selectedTxIds.size > 0 ? 1 : 0.5,
              }}
              activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={16} color={colors.onError} />
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.onError }}>
                {isDeletingBulk ? "Deleting..." : `Delete (${selectedTxIds.size})`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Segmented Control for Transaction Type (All | Income | Expense | Transfer) */}
        <View style={styles.segmentedControl}>
          {(["All", "Income", "Expense", "Transfer"] as const).map((t) => {
            const isActive = typeFilter === t;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
                onPress={() => setTypeFilter(t)}
                activeOpacity={0.8}>
                <Text
                  style={[
                    styles.segmentText,
                    isActive && styles.segmentTextActive,
                  ]}>
                  {t}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Horizontal Time Filter Chips (This Month | Last Month | Year | All Time) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeFiltersScroll}>
          {(
            ["This Month", "Last Month", "Year", "All Time"] as TimeFilter[]
          ).map((tf) => {
            const isActive = timeFilter === tf;
            return (
              <TouchableOpacity
                key={tf}
                style={[styles.timeChip, isActive && styles.timeChipActive]}
                onPress={() => setTimeFilter(tf)}
                activeOpacity={0.8}>
                <Text
                  style={[
                    styles.timeChipText,
                    isActive && styles.timeChipTextActive,
                  ]}>
                  {tf}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Total Summary */}
        <View style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: spacing.md,
          backgroundColor: colors.surfaceVariant,
          padding: spacing.md,
          borderRadius: radius.md,
          marginTop: 6,
        }}>
          <Text style={[typography.bodyLarge, { color: colors.onSurfaceVariant }]}>
            Total
          </Text>
          <Text
            style={[
              typography.h3,
              { color: totalAmount >= 0 ? colors.primary : colors.error },
            ]}>
            {totalAmount > 0 ? "+" : ""}{formatCurrency(totalAmount)}
          </Text>
        </View>
      </View>

      {/* Transaction Groups List */}
      <SectionList
        sections={groupedTransactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderTitle}>{section.title}</Text>
            <Text
              style={[
                styles.sectionHeaderTotal,
                section.dailyTotal > 0 && { color: colors.tertiary },
              ]}>
              {section.dailyTotal >= 0 ? "+" : "-"}
              {formatCurrency(Math.abs(section.dailyTotal))}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.cardGroupContainer}>
            {item.items.map((tx, idx) => {
              const cat = tx.categoryId ? categories[tx.categoryId] : null;
              const isAdjustment = isWalletReconciliation(tx);
              const isFirst = idx === 0;
              const isLast = idx === item.items.length - 1;
              const isOnlyOne = item.items.length === 1;
              const isSelected = selectedTxIds.has(tx.id);

              return (
                <TransactionRowItem
                  key={tx.id}
                  tx={tx}
                  cat={cat}
                  walletsMap={walletsMap}
                  secretWalletIds={secretWalletIds}
                  isAdjustment={isAdjustment}
                  isFirst={isFirst}
                  isLast={isLast}
                  isOnlyOne={isOnlyOne}
                  isSelected={isSelected}
                  isSelectionMode={isSelectionMode}
                  onPress={() => {
                    if (isSelectionMode) {
                      toggleSelectTx(tx.id);
                    } else {
                      handleTransactionPress(tx);
                    }
                  }}
                  onLongPress={() => handleLongPressTx(tx)}
                  colors={colors}
                  styles={styles}
                />
              );
            })}
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySubtitle}>
                Add your first transaction to see your overview
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => navigation.navigate("AddTransaction" as any)}
                activeOpacity={0.8}>
                <Ionicons
                  name="add"
                  size={20}
                  color={colors.onPrimaryContainer}
                />
                <Text style={styles.emptyAddText}>Add Transaction</Text>
              </TouchableOpacity>
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

      {/* Filter Modal */}
      <TransactionFilterModal
        visible={showFilterModal}
        filterType={tempTypeFilter}
        filterPeriod={tempTimeFilter}
        selectedCategoryIds={tempCategoryIds}
        selectedBudgetIds={tempBudgetIds}
        selectedWalletIds={tempWalletIds}
        wallets={wallets}
        onFilterTypeChange={(t) => setTempTypeFilter(t as any)}
        onFilterPeriodChange={(p) => setTempTimeFilter(p as any)}
        onCategoryToggle={toggleCategorySelection}
        onBudgetToggle={toggleBudgetSelection}
        onWalletToggle={toggleWalletSelection}
        onOpenCustomDate={() => setShowCustomDateModal(true)}
        onReset={resetModalFilters}
        onApply={applyModalFilters}
        onClose={() => setShowFilterModal(false)}
      />

      {/* Custom Date Range Modal */}
      <CustomDateRangeModal
        visible={showCustomDateModal}
        startDate={tempCustomStartDate}
        endDate={tempCustomEndDate}
        onStartDateChange={setTempCustomStartDate}
        onEndDateChange={setTempCustomEndDate}
        onApply={() => {
          setCustomStartDate(tempCustomStartDate);
          setCustomEndDate(tempCustomEndDate);
          setShowCustomDateModal(false);
        }}
        onClose={() => setShowCustomDateModal(false)}
      />
      <ToastOverlay />
    </View>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    topContainer: {
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
      gap: 10,
    },
    searchBar: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 14,
      height: 48,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      color: colors.onBackground,
      fontSize: 15,
    },
    filterBtn: {
      width: 48,
      height: 48,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.outlineVariant,
    },
    filterBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      backgroundColor: colors.primary,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
    },
    filterBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.onPrimaryContainer,
    },
    segmentedControl: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 4,
      marginBottom: 14,
    },
    segmentBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 38,
      borderRadius: 20,
    },
    segmentBtnActive: {
      backgroundColor: colors.primaryContainer,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.onSurfaceVariant,
    },
    segmentTextActive: {
      color: colors.onPrimaryContainer,
      fontWeight: "700",
    },
    timeFiltersScroll: {
      paddingBottom: 8,
      gap: 8,
    },
    timeChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
    },
    timeChipActive: {
      backgroundColor: colors.primaryContainer,
      borderColor: colors.primary,
    },
    timeChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.onSurfaceVariant,
    },
    timeChipTextActive: {
      color: colors.onPrimaryContainer,
      fontWeight: "700",
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 8,
    },
    sectionHeaderTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.onSurfaceVariant,
      textTransform: "uppercase",
    },
    sectionHeaderTotal: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.onBackground,
    },
    cardGroupContainer: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      marginHorizontal: 20,
      marginBottom: 8,
      paddingVertical: 4,
      paddingHorizontal: 4,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
    },
    txRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginVertical: 1,
    },
    iconBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    txCenterCol: {
      flex: 1,
      justifyContent: "center",
      marginRight: 10,
    },
    txTitleText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.onBackground,
      marginBottom: 3,
    },
    txSubtitleText: {
      fontSize: 13,
      color: colors.onSurfaceVariant,
    },
    txRightCol: {
      alignItems: "flex-end",
      justifyContent: "center",
    },
    txAmountText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.onBackground,
    },
    txAmountIncome: {
      color: colors.tertiary,
    },
    separator: {
      height: 1,
      backgroundColor: colors.outlineVariant,
      marginHorizontal: 12,
    },
    emptyContainer: {
      paddingTop: 60,
      paddingHorizontal: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.onBackground,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.onSurfaceVariant,
      textAlign: "center",
      marginBottom: 24,
      lineHeight: 20,
    },
    emptyAddBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primaryContainer,
      borderRadius: 28,
      paddingHorizontal: 24,
      paddingVertical: 14,
      gap: 6,
    },
    emptyAddText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.onPrimaryContainer,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.75)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      maxHeight: "88%",
      borderWidth: 1,
      borderColor: colors.outlineVariant,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant,
    },
    modalTitleText: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.onBackground,
    },
    modalCloseBtn: {
      padding: 4,
    },
    modalScrollContent: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 30,
    },
    modalSectionTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.onSurfaceVariant,
      letterSpacing: 0.8,
      marginBottom: 12,
      marginTop: 8,
    },
    modalPillWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 24,
    },
    modalChip: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
    },
    modalChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    modalChipText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.onSurfaceVariant,
    },
    modalChipTextActive: {
      color: colors.onBackground,
      fontWeight: "700",
    },
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 20,
    },
    catGridCard: {
      width: "48%",
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
    },
    catGridCardActive: {
      backgroundColor: colors.primaryContainer,
      borderColor: colors.primaryContainer,
    },
    catGridCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    catGridCardText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.onBackground,
    },
    catGridCardTextActive: {
      color: colors.onPrimaryContainer,
      fontWeight: "700",
    },
    modalFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 24,
      paddingVertical: 18,
      borderTopWidth: 1,
      borderTopColor: colors.outlineVariant,
    },
    resetBtn: {
      flex: 1,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      backgroundColor: colors.surface,
    },
    resetBtnText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.onBackground,
    },
    applyBtn: {
      flex: 1,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryContainer,
    },
    applyBtnText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.onPrimaryContainer,
    },
  });

export default TransactionListScreen;
