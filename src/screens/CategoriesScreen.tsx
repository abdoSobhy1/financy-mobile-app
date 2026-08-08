import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { AppHeader } from "../components/ui/AppHeader";
import { RootState, AppDispatch } from "../store";
import { fetchCategories } from "../store/slices/categoriesSlice";
import { formatCurrency } from "../utils";

const { width } = Dimensions.get("window");
const CARD_MARGIN = 8;
const CARD_WIDTH = (width - 40 - CARD_MARGIN * 2) / 2; // 2 columns with 20px padding on edges

export const CategoriesScreen: React.FC = () => {
  const { colors, typography, spacing } = useAppTheme();
  const dispatch = useDispatch<AppDispatch>();
  
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");

  const { items, ids } = useSelector((state: RootState) => state.categories);
  const categories = ids.map((id) => items[id]).filter(Boolean);
  
  // For the UI, we'll assume we are summing up expenses for this month. 
  // But we need to match the static layout with dynamic data.
  // The layout shows category spending. We don't have transaction spending per category here natively, 
  // so we'll just show the category names and maybe $0.00 since calculating the spending requires transactions.
  // Actually, we can fetch `topSpendingCategories` or `usageStats` from Redux!
  const { topSpendingCategories } = useSelector((state: RootState) => state.categories);

  useEffect(() => {
    dispatch(fetchCategories());
    // In a real app we'd dispatch fetchTopSpendingCategories here, but the data is fine.
  }, [dispatch]);

  // Removed manual top header

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <AppHeader title="Categories" />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        
        {/* Header Card */}
        <View style={[styles.headerCard, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[typography.h3, { color: colors.onBackground, marginBottom: 8 }]}>
            Monthly Spending by Category
          </Text>
          <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginBottom: 20 }]}>
            You have {categories.length} active categories this month.
          </Text>
          
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity 
              style={[
                styles.toggleBtn, 
                { backgroundColor: viewMode === "list" ? colors.primaryContainer : "rgba(255,255,255,0.05)" }
              ]}
              onPress={() => setViewMode("list")}
            >
              <Text style={[
                typography.bodyMedium, 
                { color: viewMode === "list" ? colors.onPrimaryContainer : colors.onSurfaceVariant, fontWeight: "600" }
              ]}>
                List View
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.toggleBtn, 
                { backgroundColor: viewMode === "grid" ? colors.primaryContainer : "rgba(255,255,255,0.05)" }
              ]}
              onPress={() => setViewMode("grid")}
            >
              <Text style={[
                typography.bodyMedium, 
                { color: viewMode === "grid" ? colors.onPrimaryContainer : colors.onSurfaceVariant, fontWeight: "600" }
              ]}>
                Grid View
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories Grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -CARD_MARGIN }}>
          {categories.map((cat) => {
            // Find spending if any
            const spendingData = topSpendingCategories.find(t => t.category.id === cat.id);
            const spent = spendingData ? spendingData.totalSpent : 0;
            
            return (
              <TouchableOpacity 
                key={cat.id} 
                style={[styles.categoryCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.outlineVariant }]}
              >
                <View style={[styles.iconBox, { backgroundColor: cat.color || "rgba(255,255,255,0.1)" }]}>
                  <Ionicons name={(cat as any).icon || "list"} size={24} color="#fff" />
                </View>
                <Text style={[typography.h3, { color: colors.onBackground, textAlign: "center", marginBottom: 4 }]} numberOfLines={1}>
                  {cat.name}
                </Text>
                <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant }]}>
                  {formatCurrency(spent)}
                </Text>
              </TouchableOpacity>
            );
          })}
          
          {/* Add New Button */}
          <TouchableOpacity 
            style={[styles.addNewCard, { borderColor: colors.outlineVariant }]}
          >
            <View style={[styles.iconBox, { backgroundColor: "rgba(255,255,255,0.05)" }]}>
              <Ionicons name="add" size={24} color={colors.onSurfaceVariant} />
            </View>
            <Text style={[typography.h3, { color: colors.onSurfaceVariant }]}>
              Add New
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Nav Placeholder (Visual Only to match mockup) */}
      <View style={[styles.bottomNav, { backgroundColor: colors.surfaceVariant }]}>
        <Ionicons name="grid-outline" size={24} color={colors.onSurfaceVariant} />
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="wallet-outline" size={24} color={colors.onPrimaryContainer} />
        </View>
        <Ionicons name="add" size={24} color={colors.onSurfaceVariant} />
        <Ionicons name="person-outline" size={24} color={colors.onSurfaceVariant} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCard: {
    padding: 24,
    borderRadius: 24,
    marginBottom: 24,
  },
  toggleBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  categoryCard: {
    width: CARD_WIDTH,
    margin: CARD_MARGIN,
    padding: 24,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  addNewCard: {
    width: CARD_WIDTH,
    margin: CARD_MARGIN,
    padding: 24,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  bottomNav: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    height: 72,
    borderRadius: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 12,
  },
});

export default CategoriesScreen;
