import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ImportResult } from "../../types/import";
import { Button, Card } from "../ui";
import { UI } from "../../constants";
import { formatCurrency } from "../../utils";

interface ResultsStepProps {
  result: ImportResult;
  onClose: () => void;
  onImportMore: () => void;
}

export const ResultsStep: React.FC<ResultsStepProps> = ({ result, onClose, onImportMore }) => {
  const totalAttempted = result.importedCount + result.skippedCount + result.errorCount;
  const successRate = totalAttempted > 0 ? (result.importedCount / totalAttempted) * 100 : 0;

  const renderSummaryCard = () => (
    <Card style={StyleSheet.flatten([styles.summaryCard, result.success ? styles.successCard : styles.errorCard])}>
      <View style={styles.summaryHeader}>
        <View style={[styles.summaryIcon, { backgroundColor: result.success ? UI.COLORS.SUCCESS + "20" : UI.COLORS.ERROR + "20" }]}>
          <Ionicons
            name={result.success ? "checkmark-done-circle" : "alert-circle"}
            size={32}
            color={result.success ? UI.COLORS.SUCCESS : UI.COLORS.ERROR}
          />
        </View>
        <View style={styles.summaryContent}>
          <Text style={styles.summaryTitle}>{result.success ? "Import Successful!" : "Import Completed with Issues"}</Text>
          <Text style={styles.summarySubtitle}>
            {result.importedCount} transactions imported successfully
            {successRate < 100 && ` (${successRate.toFixed(1)}% success rate)`}
          </Text>
        </View>
      </View>

      <View style={styles.summaryStats}>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: UI.COLORS.SUCCESS }]}>{result.importedCount}</Text>
          <Text style={styles.statLabel}>Imported</Text>
        </View>

        {result.skippedCount > 0 && (
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: UI.COLORS.WARNING }]}>{result.skippedCount}</Text>
            <Text style={styles.statLabel}>Skipped</Text>
          </View>
        )}

        {result.errorCount > 0 && (
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: UI.COLORS.ERROR }]}>{result.errorCount}</Text>
            <Text style={styles.statLabel}>Errors</Text>
          </View>
        )}
      </View>
    </Card>
  );

  const renderCreatedCategories = () => {
    if (result.createdCategories.length === 0) return null;

    return (
      <Card style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <Ionicons name="pricetags" size={20} color={UI.COLORS.ACCENT} />
          <Text style={styles.detailTitle}>New Categories Created</Text>
        </View>
        <Text style={styles.detailDescription}>The following categories were automatically created during import:</Text>
        <View style={styles.categoryList}>
          {result.createdCategories.map((categoryName, index) => (
            <View key={index} style={styles.categoryItem}>
              <View style={styles.categoryDot} />
              <Text style={styles.categoryName}>{categoryName}</Text>
            </View>
          ))}
        </View>
      </Card>
    );
  };

  const renderErrors = () => {
    if (result.errors.length === 0) return null;

    return (
      <Card style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <Ionicons name="warning" size={20} color={UI.COLORS.ERROR} />
          <Text style={styles.detailTitle}>Issues Encountered ({result.errors.length})</Text>
        </View>
        <Text style={styles.detailDescription}>Some rows couldn't be imported due to the following issues:</Text>
        <ScrollView style={styles.errorList} nestedScrollEnabled>
          {result.errors.slice(0, 10).map((error, index) => (
            <View key={index} style={styles.errorItem}>
              <Text style={styles.errorLocation}>
                Row {error.row}, Column "{error.column}":
              </Text>
              <Text style={styles.errorMessage}>{error.message}</Text>
            </View>
          ))}
          {result.errors.length > 10 && <Text style={styles.moreErrorsText}>... and {result.errors.length - 10} more issues</Text>}
        </ScrollView>
      </Card>
    );
  };

  const renderNextSteps = () => (
    <Card style={styles.detailCard}>
      <View style={styles.detailHeader}>
        <Ionicons name="bulb" size={20} color={UI.COLORS.PRIMARY} />
        <Text style={styles.detailTitle}>What's Next?</Text>
      </View>
      <View style={styles.nextStepsList}>
        <View style={styles.nextStep}>
          <Ionicons name="checkmark-circle-outline" size={16} color={UI.COLORS.TEXT_SECONDARY} />
          <Text style={styles.nextStepText}>Review your imported transactions in the Transactions tab</Text>
        </View>

        {result.createdCategories.length > 0 && (
          <View style={styles.nextStep}>
            <Ionicons name="color-palette-outline" size={16} color={UI.COLORS.TEXT_SECONDARY} />
            <Text style={styles.nextStepText}>Customize colors for your new categories in Settings</Text>
          </View>
        )}

        <View style={styles.nextStep}>
          <Ionicons name="analytics-outline" size={16} color={UI.COLORS.TEXT_SECONDARY} />
          <Text style={styles.nextStepText}>Check your budget balances if transactions were assigned to budgets</Text>
        </View>

        <View style={styles.nextStep}>
          <Ionicons name="download-outline" size={16} color={UI.COLORS.TEXT_SECONDARY} />
          <Text style={styles.nextStepText}>Import more data or export your complete transaction history</Text>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderSummaryCard()}
        {renderCreatedCategories()}
        {renderErrors()}
        {renderNextSteps()}
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <Button title="Import More Data" onPress={onImportMore} variant="secondary" style={styles.importMoreButton} />
        <Button title="Done" onPress={onClose} style={styles.doneButton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: UI.SPACING.LG,
  },
  summaryCard: {
    marginBottom: UI.SPACING.LG,
  },
  successCard: {
    borderLeftWidth: 4,
    borderLeftColor: UI.COLORS.SUCCESS,
  },
  errorCard: {
    borderLeftWidth: 4,
    borderLeftColor: UI.COLORS.ERROR,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: UI.SPACING.LG,
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: UI.SPACING.MD,
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  summarySubtitle: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: UI.SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
  },
  stat: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: UI.SPACING.XS,
  },
  statLabel: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  detailCard: {
    marginBottom: UI.SPACING.LG,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: UI.SPACING.SM,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginLeft: UI.SPACING.SM,
  },
  detailDescription: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    lineHeight: 20,
    marginBottom: UI.SPACING.MD,
  },
  categoryList: {
    gap: UI.SPACING.XS,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: UI.SPACING.XS,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: UI.COLORS.ACCENT,
    marginRight: UI.SPACING.SM,
  },
  categoryName: {
    fontSize: 14,
    color: UI.COLORS.TEXT_PRIMARY,
    fontWeight: "500",
  },
  errorList: {
    maxHeight: 150,
  },
  errorItem: {
    backgroundColor: UI.COLORS.BACKGROUND,
    padding: UI.SPACING.SM,
    borderRadius: 6,
    marginBottom: UI.SPACING.XS,
    borderLeftWidth: 3,
    borderLeftColor: UI.COLORS.ERROR,
  },
  errorLocation: {
    fontSize: 12,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  errorMessage: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
    lineHeight: 16,
  },
  moreErrorsText: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: UI.SPACING.SM,
  },
  nextStepsList: {
    gap: UI.SPACING.SM,
  },
  nextStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: UI.SPACING.SM,
  },
  nextStepText: {
    flex: 1,
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: UI.SPACING.MD,
    padding: UI.SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
    backgroundColor: UI.COLORS.SURFACE,
  },
  importMoreButton: {
    flex: 1,
  },
  doneButton: {
    flex: 1,
  },
});
