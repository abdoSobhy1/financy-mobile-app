import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, Switch, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, Button, CustomDatePicker, Input } from "../ui";
import { UI } from "../../constants";
import { BillStatus } from "../../types/bills";

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

interface BillFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  filters: BillFilters;
  onFiltersChange: (filters: BillFilters) => void;
}

export const BillFiltersModal: React.FC<BillFiltersModalProps> = ({ visible, onClose, filters, onFiltersChange }) => {
  const [localFilters, setLocalFilters] = useState<BillFilters>(filters);

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleClear = () => {
    const clearedFilters: BillFilters = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={UI.COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Filter Bills</Text>
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Date Range</Text>
            <View style={styles.dateRange}>
              <View style={styles.dateField}>
                <CustomDatePicker
                  label="Start Date"
                  value={localFilters.dateRange?.start || new Date()}
                  onDateChange={(date) =>
                    setLocalFilters({
                      ...localFilters,
                      dateRange: {
                        ...localFilters.dateRange,
                        start: date,
                        end: localFilters.dateRange?.end || new Date(),
                      },
                    })
                  }
                />
              </View>
              <View style={styles.dateField}>
                <CustomDatePicker
                  label="End Date"
                  value={localFilters.dateRange?.end || new Date()}
                  onDateChange={(date) =>
                    setLocalFilters({
                      ...localFilters,
                      dateRange: {
                        start: localFilters.dateRange?.start || new Date(),
                        end: date,
                      },
                    })
                  }
                />
              </View>
            </View>
          </Card>

          <Card style={styles.section}>
            <View style={styles.switchRow}>
              <Text style={styles.sectionTitle}>Recurring Bills Only</Text>
              <Switch
                value={localFilters.recurring || false}
                onValueChange={(value) =>
                  setLocalFilters({
                    ...localFilters,
                    recurring: value ? true : undefined,
                  })
                }
                trackColor={{ false: UI.COLORS.BORDER, true: UI.COLORS.PRIMARY }}
                thumbColor={localFilters.recurring ? "white" : UI.COLORS.TEXT_MUTED}
              />
            </View>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Amount Range</Text>
            <View style={styles.amountRange}>
              <View style={styles.amountField}>
                <Input
                  label="Min Amount"
                  value={localFilters.minAmount?.toString() || ""}
                  onChangeText={(value) =>
                    setLocalFilters({
                      ...localFilters,
                      minAmount: value ? parseFloat(value) : undefined,
                    })
                  }
                  keyboardType="numeric"
                  placeholder="0.00"
                />
              </View>
              <View style={styles.amountField}>
                <Input
                  label="Max Amount"
                  value={localFilters.maxAmount?.toString() || ""}
                  onChangeText={(value) =>
                    setLocalFilters({
                      ...localFilters,
                      maxAmount: value ? parseFloat(value) : undefined,
                    })
                  }
                  keyboardType="numeric"
                  placeholder="999.99"
                />
              </View>
            </View>
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          <Button title="Apply Filters" onPress={handleApply} style={styles.applyButton} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.COLORS.BACKGROUND,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: UI.SPACING.LG,
    paddingVertical: UI.SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: UI.COLORS.SURFACE,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  clearButton: {
    paddingHorizontal: UI.SPACING.MD,
    paddingVertical: UI.SPACING.SM,
  },
  clearText: {
    fontSize: 16,
    color: UI.COLORS.PRIMARY,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    padding: UI.SPACING.LG,
  },
  section: {
    marginBottom: UI.SPACING.LG,
    padding: UI.SPACING.LG,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.MD,
  },
  dateRange: {
    flexDirection: "row",
    gap: UI.SPACING.MD,
  },
  dateField: {
    flex: 1,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountRange: {
    flexDirection: "row",
    gap: UI.SPACING.MD,
  },
  amountField: {
    flex: 1,
  },
  footer: {
    padding: UI.SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
  },
  applyButton: {
    marginBottom: 0,
  },
});
