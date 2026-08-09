import { AlertService } from "../../services/AlertService";
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, Button, useToast, Modal } from "../ui";
import { firebaseCleanup, CleanupReport, CleanupOptions } from "../../utils/firebaseCleanup";
import { useAppTheme } from "./ThemeProvider";

interface FirebaseCleanupModalProps {
  visible: boolean;
  onClose: () => void;
}

export const FirebaseCleanupModal: React.FC<FirebaseCleanupModalProps> = ({ visible, onClose }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [lastReport, setLastReport] = useState<CleanupReport | null>(null);
  const { showSuccess, showError } = useToast();
  const { colors, typography, spacing, radius } = useAppTheme();

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
    AlertService.alert(
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
    <Modal visible={visible} onClose={onClose} title="Firebase Data Cleanup">
        <ScrollView style={{ paddingHorizontal: spacing.lg }} showsVerticalScrollIndicator={false}>
          {/* Description */}
          <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginBottom: spacing.lg }]}>
            Clean up your Firebase data by removing duplicates, unused fields, and orphaned records. This can help reduce storage costs and improve
            sync performance.
          </Text>

          {/* Action Buttons */}
          <View style={{ marginBottom: spacing.lg }}>
            <Button
              title="Analyze Data"
              variant="secondary"
              onPress={analyzeFirebaseData}
              disabled={isAnalyzing || isCleaning}
              icon="search"
              iconPosition="left"
              style={{ marginBottom: spacing.xs }}
            />
            <Text style={[typography.label, { color: colors.onSurfaceVariant, marginLeft: spacing.sm }]}>Scan your Firebase data to identify cleanup opportunities without making any changes.</Text>
          </View>

          <View style={{ marginBottom: spacing.lg }}>
            <Button
              title="Quick Cleanup"
              variant="primary"
              onPress={performQuickCleanup}
              disabled={isAnalyzing || isCleaning}
              icon="brush"
              iconPosition="left"
              style={{ marginBottom: spacing.xs }}
            />
            <Text style={[typography.label, { color: colors.onSurfaceVariant, marginLeft: spacing.sm }]}>Remove unused fields and optimize field names. Safe and reversible.</Text>
          </View>

          <View style={{ marginBottom: spacing.lg }}>
            <Button
              title="Full Cleanup"
              variant="danger"
              onPress={performFullCleanup}
              disabled={isAnalyzing || isCleaning}
              icon="trash"
              iconPosition="left"
              style={{ marginBottom: spacing.xs }}
            />
            <Text style={[typography.label, { color: colors.onSurfaceVariant, marginLeft: spacing.sm }]}>Remove duplicates, orphaned records, and unused fields. ⚠️ This cannot be undone!</Text>
          </View>

          {/* Loading States */}
          {(isAnalyzing || isCleaning) && (
            <View style={{ alignItems: "center", padding: spacing.lg, backgroundColor: colors.surfaceVariant, borderRadius: radius.md, marginBottom: spacing.lg }}>
              <Text style={[typography.bodyMedium, { color: colors.onSurface }]}>{isAnalyzing ? "Analyzing Firebase data..." : "Cleaning up Firebase data..."}</Text>
            </View>
          )}

          {/* Results */}
          {lastReport && (
            <View style={{ backgroundColor: colors.surfaceVariant, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.md, marginBottom: spacing.lg * 2 }}>
              <Text style={[typography.h3, { color: colors.onSurface, marginBottom: spacing.md }]}>
                {lastReport.duplicatesRemoved === 0 && lastReport.fieldsCleanedUp === 0 ? "Analysis Report" : "Cleanup Report"}
              </Text>

              <View style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: spacing.xs }}>
                  <Ionicons name="document" size={20} color={colors.onSurfaceVariant} />
                  <Text style={[typography.bodyMedium, { flex: 1, color: colors.onSurfaceVariant, marginLeft: spacing.sm }]}>Total Documents</Text>
                  <Text style={[typography.bodyMedium, { fontWeight: "600", color: colors.onSurface }]}>{lastReport.totalDocuments}</Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: spacing.xs }}>
                  <Ionicons name="copy" size={20} color={colors.tertiary} />
                  <Text style={[typography.bodyMedium, { flex: 1, color: colors.onSurfaceVariant, marginLeft: spacing.sm }]}>Duplicates Removed</Text>
                  <Text style={[typography.bodyMedium, { fontWeight: "600", color: colors.onSurface }]}>{lastReport.duplicatesRemoved}</Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: spacing.xs }}>
                  <Ionicons name="brush" size={20} color={colors.primary} />
                  <Text style={[typography.bodyMedium, { flex: 1, color: colors.onSurfaceVariant, marginLeft: spacing.sm }]}>Fields Cleaned</Text>
                  <Text style={[typography.bodyMedium, { fontWeight: "600", color: colors.onSurface }]}>{lastReport.fieldsCleanedUp}</Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: spacing.xs }}>
                  <Ionicons name="unlink" size={20} color={colors.error} />
                  <Text style={[typography.bodyMedium, { flex: 1, color: colors.onSurfaceVariant, marginLeft: spacing.sm }]}>Orphaned Records</Text>
                  <Text style={[typography.bodyMedium, { fontWeight: "600", color: colors.onSurface }]}>{lastReport.orphanedDocuments}</Text>
                </View>
              </View>

              {/* Collection Details */}
              {Object.keys(lastReport.collectionStats).length > 0 && (
                <View style={{ marginTop: spacing.lg }}>
                  <Text style={[typography.bodyMedium, { fontWeight: "600", color: colors.onSurface, marginBottom: spacing.sm }]}>Collection Details</Text>
                  {Object.entries(lastReport.collectionStats).map(([collection, stats]) => (
                    <View key={collection} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant }}>
                      <Text style={[typography.bodyMedium, { color: colors.onSurface, fontWeight: "500" }]}>{collection}</Text>
                      <View style={{ flexDirection: "row", gap: spacing.sm }}>
                        <Text style={[typography.label, { color: colors.onSurfaceVariant }]}>{stats.documents} docs</Text>
                        {stats.duplicates > 0 && <Text style={[typography.label, { color: colors.tertiary }]}>{stats.duplicates} dupes</Text>}
                        {stats.fieldsRemoved > 0 && <Text style={[typography.label, { color: colors.primary }]}>{stats.fieldsRemoved} cleaned</Text>}
                        {stats.orphaned > 0 && <Text style={[typography.label, { color: colors.error }]}>{stats.orphaned} orphaned</Text>}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Errors */}
              {lastReport.errors.length > 0 && (
                <View style={{ marginTop: spacing.lg, padding: spacing.sm, backgroundColor: colors.error + "20", borderRadius: radius.md }}>
                  <Text style={[typography.bodyMedium, { fontWeight: "600", color: colors.error, marginBottom: spacing.xs }]}>Errors ({lastReport.errors.length})</Text>
                  {lastReport.errors.slice(0, 3).map((error, index) => (
                    <Text key={index} style={[typography.bodySmall, { color: colors.error }]}>
                      • {error}
                    </Text>
                  ))}
                  {lastReport.errors.length > 3 && <Text style={[typography.bodySmall, { color: colors.error }]}>... and {lastReport.errors.length - 3} more</Text>}
                </View>
              )}
            </View>
          )}
        </ScrollView>
    </Modal>
  );
};
