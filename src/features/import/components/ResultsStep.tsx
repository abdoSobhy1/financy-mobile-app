import { styles } from "./ResultsStep.styles";
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ImportResult } from "../types/import";
import { Button, Card } from "../../../shared/ui";
import { UI } from "../../../shared/constants";

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
