import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { TransactionStackParamList, ParsedTransaction } from "../types";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { formatCurrency } from "../utils";
import { useCustomAlert, useToast, Button, Card } from "../components/ui";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store";
import { addTransaction } from "../store/slices/transactionsSlice";

type NavigationProp = StackNavigationProp<TransactionStackParamList>;
type VoiceVerifyRouteProp = RouteProp<TransactionStackParamList, "VoiceVerify">;

export const VoiceVerifyScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<VoiceVerifyRouteProp>();
  const { colors, typography, spacing, radius } = useAppTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { showSuccess, showError } = useToast();
  
  const parsedTransactions = route.params.parsedTransactions || [];

  const { items: categoriesMap } = useSelector(
    (state: RootState) => state.categories
  );

  const totalAmount = useMemo(() => {
    return parsedTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [parsedTransactions]);

  const handleConfirmAll = async () => {
    try {
      const promises = parsedTransactions.map((t) => {
        return dispatch(
          addTransaction({
            amount: (t.amount || 0).toString(),
            type: t.type || "expense",
            description: t.description || "",
            date: t.date || new Date(),
            categoryId: t.categoryId || "",
            note: t.note || "",
          })
        ).unwrap();
      });

      await Promise.all(promises);
      showSuccess(`Saved ${parsedTransactions.length} transactions`);
      navigation.navigate("TransactionList");
    } catch (e: any) {
      showError(e?.message || "Failed to save transactions");
    }
  };

  const handleEdit = (transaction: ParsedTransaction) => {
    // Navigate to AddTransaction with prefilled data for editing
    navigation.replace("AddTransaction", { prefilledData: transaction });
  };

  const handleAddAnother = () => {
    navigation.goBack(); // Go back to VoiceInput
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.onBackground} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.onBackground }]}>
          Verify Transactions
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[typography.bodyLarge, styles.subtitle, { color: colors.onSurfaceVariant }]}>
          We detected {parsedTransactions.length} transaction{parsedTransactions.length !== 1 && "s"} from your voice note. Please review them before saving.
        </Text>

        {parsedTransactions.map((tx, index) => {
          const category = tx.categoryId ? categoriesMap[tx.categoryId] : null;
          const iconColor = category?.color || colors.primaryContainer;
          
          return (
            <Card key={index} variant="elevated" style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <View style={[styles.iconBox, { backgroundColor: "rgba(255,255,255,0.05)" }]}>
                    <Ionicons 
                      name="help-outline" 
                      size={20} 
                      color={iconColor} 
                    />
                  </View>
                  <View>
                    <Text style={[typography.bodyLarge, { color: colors.onSurface, fontWeight: "600" }]}>
                      {tx.description || "Unknown"}
                    </Text>
                    <View style={[styles.categoryPill, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
                      <Text style={[typography.label, { color: colors.onSurfaceVariant }]}>
                        {category?.name || "Uncategorized"}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <Text style={[typography.bodyLarge, { color: colors.onSurface, fontWeight: "700" }]}>
                  {tx.type === "expense" ? "-" : "+"}{formatCurrency(tx.amount || 0)}
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.editBtn} 
                onPress={() => handleEdit(tx)}
              >
                <Ionicons name="pencil" size={14} color="#A5F3FC" />
                <Text style={[typography.label, { color: "#A5F3FC", marginLeft: 4 }]}>
                  Edit
                </Text>
              </TouchableOpacity>
            </Card>
          );
        })}

        <TouchableOpacity 
          style={[styles.addAnotherBtn, { borderColor: "rgba(255,255,255,0.15)" }]}
          onPress={handleAddAnother}
        >
          <Ionicons name="add" size={18} color={colors.onSurfaceVariant} />
          <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginLeft: 8 }]}>
            Add Another Transaction
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: "rgba(255,255,255,0.05)" }]}>
        <TouchableOpacity 
          style={[styles.confirmBtn, { backgroundColor: "#A5F3FC" }]}
          onPress={handleConfirmAll}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#164E63" />
          <Text style={[typography.bodyLarge, { color: "#164E63", fontWeight: "700", marginLeft: 8 }]}>
            Confirm All ({formatCurrency(totalAmount)})
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backBtn: {
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  subtitle: {
    marginBottom: 24,
    lineHeight: 22,
  },
  card: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 24,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addAnotherBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 8,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 100,
  },
});
