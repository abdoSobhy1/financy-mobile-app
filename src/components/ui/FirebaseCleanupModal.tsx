import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, Button, useToast } from "../ui";
import { UI } from "../../constants";
import { firebaseCleanup, CleanupReport, CleanupOptions } from "../../utils/firebaseCleanup";
import { formatCurrency } from "../../utils";

interface FirebaseCleanupModalProps {
  visible: boolean;
  onClose: () => void;
}

export const FirebaseCleanupModal: React.FC<FirebaseCleanupModalProps> = ({ visible, onClose }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [lastReport, setLastReport] = useState<CleanupReport | null>(null);
  const { showSuccess, showError } = useToast();

  const analyzeFirebaseData = async () => {
    setIsAnalyzing(true);
    try {
      console.log("🔍 Analyzing Firebase data...");
      const report = await firebaseCleanup.analyzeFirebaseData();
      setLastReport(report);

      if (report.errors.length > 0) {
        showError(`Analysis completed with ${report.errors.length} errors. Check console for details.`);
      } else {
        showSuccess("Firebase data analysis completed successfully!");
      }
    } catch (error) {
      console.error("Firebase analysis failed:", error);
      showError(`Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const performQuickCleanup = async () => {
    setIsCleaning(true);
    try {
      console.log("🧹 Performing quick cleanup...");
      const report = await firebaseCleanup.quickCleanup();
      setLastReport(report);

      if (report.errors.length > 0) {
        showError(`Quick cleanup completed with ${report.errors.length} errors.`);
      } else {
        showSuccess(`Quick cleanup completed! Cleaned ${report.fieldsCleanedUp} fields from ${report.totalDocuments} documents.`);
      }
    } catch (error) {
      console.error("Quick cleanup failed:", error);
      showError(`Quick cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsCleaning(false);
    }
  };

  const performFullCleanup = async () => {
    Alert.alert(
      "Full Firebase Cleanup",
      "This will remove duplicate documents, orphaned records, and unused fields. This action cannot be undone. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed",
          style: "destructive",
          onPress: async () => {
            setIsCleaning(true);
            try {
              console.log("🧹 Performing full cleanup...");
              const report = await firebaseCleanup.fullCleanup();
              setLastReport(report);

              if (report.errors.length > 0) {
                showError(`Full cleanup completed with ${report.errors.length} errors.`);
              } else {
                showSuccess(`Full cleanup completed! Removed ${report.duplicatesRemoved} duplicates and cleaned ${report.fieldsCleanedUp} fields.`);
              }
            } catch (error) {
              console.error("Full cleanup failed:", error);
              showError(`Full cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`);
            } finally {
              setIsCleaning(false);
            }
          },
        },
      ]
    );
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Card style={styles.modal}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Firebase Data Cleanup</Text>
            <Button title="" variant="secondary" onPress={onClose} style={styles.closeButton} icon="close" />
          </View>

          {/* Description */}
          <Text style={styles.description}>
            Clean up your Firebase data by removing duplicates, unused fields, and orphaned records. This can help reduce storage costs and improve
            sync performance.
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <Button
              title="Analyze Data"
              variant="secondary"
              onPress={analyzeFirebaseData}
              disabled={isAnalyzing || isCleaning}
              icon="search"
              iconPosition="left"
              style={styles.actionButton}
            />
            <Text style={styles.actionDescription}>Scan your Firebase data to identify cleanup opportunities without making any changes.</Text>
          </View>

          <View style={styles.actionSection}>
            <Button
              title="Quick Cleanup"
              variant="primary"
              onPress={performQuickCleanup}
              disabled={isAnalyzing || isCleaning}
              icon="brush"
              iconPosition="left"
              style={styles.actionButton}
            />
            <Text style={styles.actionDescription}>Remove unused fields and optimize field names. Safe and reversible.</Text>
          </View>

          <View style={styles.actionSection}>
            <Button
              title="Full Cleanup"
              variant="danger"
              onPress={performFullCleanup}
              disabled={isAnalyzing || isCleaning}
              icon="trash"
              iconPosition="left"
              style={styles.actionButton}
            />
            <Text style={styles.actionDescription}>Remove duplicates, orphaned records, and unused fields. ⚠️ This cannot be undone!</Text>
          </View>

          {/* Loading States */}
          {(isAnalyzing || isCleaning) && (
            <View style={styles.loadingSection}>
              <Text style={styles.loadingText}>{isAnalyzing ? "Analyzing Firebase data..." : "Cleaning up Firebase data..."}</Text>
            </View>
          )}

          {/* Results */}
          {lastReport && (
            <View style={styles.reportSection}>
              <Text style={styles.reportTitle}>
                {lastReport.duplicatesRemoved === 0 && lastReport.fieldsCleanedUp === 0 ? "Analysis Report" : "Cleanup Report"}
              </Text>

              <View style={styles.reportStats}>
                <View style={styles.statItem}>
                  <Ionicons name="document" size={20} color={UI.COLORS.TEXT_SECONDARY} />
                  <Text style={styles.statLabel}>Total Documents</Text>
                  <Text style={styles.statValue}>{lastReport.totalDocuments}</Text>
                </View>

                <View style={styles.statItem}>
                  <Ionicons name="copy" size={20} color={UI.COLORS.WARNING} />
                  <Text style={styles.statLabel}>Duplicates Removed</Text>
                  <Text style={styles.statValue}>{lastReport.duplicatesRemoved}</Text>
                </View>

                <View style={styles.statItem}>
                  <Ionicons name="brush" size={20} color={UI.COLORS.SUCCESS} />
                  <Text style={styles.statLabel}>Fields Cleaned</Text>
                  <Text style={styles.statValue}>{lastReport.fieldsCleanedUp}</Text>
                </View>

                <View style={styles.statItem}>
                  <Ionicons name="unlink" size={20} color={UI.COLORS.ERROR} />
                  <Text style={styles.statLabel}>Orphaned Records</Text>
                  <Text style={styles.statValue}>{lastReport.orphanedDocuments}</Text>
                </View>
              </View>

              {/* Collection Details */}
              {Object.keys(lastReport.collectionStats).length > 0 && (
                <View style={styles.collectionsSection}>
                  <Text style={styles.collectionsTitle}>Collection Details</Text>
                  {Object.entries(lastReport.collectionStats).map(([collection, stats]) => (
                    <View key={collection} style={styles.collectionItem}>
                      <Text style={styles.collectionName}>{collection}</Text>
                      <View style={styles.collectionStats}>
                        <Text style={styles.collectionStat}>{stats.documents} docs</Text>
                        {stats.duplicates > 0 && <Text style={[styles.collectionStat, styles.warningText]}>{stats.duplicates} dupes</Text>}
                        {stats.fieldsRemoved > 0 && <Text style={[styles.collectionStat, styles.successText]}>{stats.fieldsRemoved} cleaned</Text>}
                        {stats.orphaned > 0 && <Text style={[styles.collectionStat, styles.errorText]}>{stats.orphaned} orphaned</Text>}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Errors */}
              {lastReport.errors.length > 0 && (
                <View style={styles.errorsSection}>
                  <Text style={styles.errorsTitle}>Errors ({lastReport.errors.length})</Text>
                  {lastReport.errors.slice(0, 3).map((error, index) => (
                    <Text key={index} style={styles.errorText}>
                      • {error}
                    </Text>
                  ))}
                  {lastReport.errors.length > 3 && <Text style={styles.errorText}>... and {lastReport.errors.length - 3} more</Text>}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modal: {
    width: "90%",
    maxWidth: 500,
    maxHeight: "80%",
    margin: 0,
  },
  content: {
    padding: UI.SPACING.LG,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: UI.SPACING.MD,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    padding: 0,
    marginLeft: UI.SPACING.MD,
  },
  description: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    marginBottom: UI.SPACING.LG,
    lineHeight: 20,
  },
  actionSection: {
    marginBottom: UI.SPACING.LG,
  },
  actionButton: {
    marginBottom: UI.SPACING.XS,
  },
  actionDescription: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
    marginLeft: UI.SPACING.SM,
  },
  loadingSection: {
    alignItems: "center",
    padding: UI.SPACING.LG,
    backgroundColor: UI.COLORS.SURFACE + "80",
    borderRadius: UI.CARD_RADIUS,
    marginBottom: UI.SPACING.LG,
  },
  loadingText: {
    fontSize: 14,
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center",
  },
  reportSection: {
    backgroundColor: UI.COLORS.SURFACE,
    padding: UI.SPACING.MD,
    borderRadius: UI.CARD_RADIUS,
    marginTop: UI.SPACING.MD,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.MD,
  },
  reportStats: {
    gap: UI.SPACING.SM,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: UI.SPACING.XS,
  },
  statLabel: {
    flex: 1,
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    marginLeft: UI.SPACING.SM,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  collectionsSection: {
    marginTop: UI.SPACING.LG,
  },
  collectionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.SM,
  },
  collectionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: UI.SPACING.XS,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
  },
  collectionName: {
    fontSize: 14,
    color: UI.COLORS.TEXT_PRIMARY,
    fontWeight: "500",
  },
  collectionStats: {
    flexDirection: "row",
    gap: UI.SPACING.SM,
  },
  collectionStat: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
  },
  warningText: {
    color: UI.COLORS.WARNING,
  },
  successText: {
    color: UI.COLORS.SUCCESS,
  },
  errorText: {
    color: UI.COLORS.ERROR,
  },
  errorsSection: {
    marginTop: UI.SPACING.LG,
    padding: UI.SPACING.SM,
    backgroundColor: UI.COLORS.ERROR + "20",
    borderRadius: UI.CARD_RADIUS,
  },
  errorsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.ERROR,
    marginBottom: UI.SPACING.XS,
  },
});
