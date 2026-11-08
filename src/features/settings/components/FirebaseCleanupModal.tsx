import React from "react";
import { View, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Button from "../../../shared/ui/Button";
import Modal from "../../../shared/ui/Modal";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { useFirebaseCleanupModal } from "../hooks/useFirebaseCleanupModal";

interface FirebaseCleanupModalProps {
  visible: boolean;
  onClose: () => void;
}

export const FirebaseCleanupModal: React.FC<FirebaseCleanupModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    isAnalyzing,
    isCleaning,
    lastReport,
    analyzeFirebaseData,
    performQuickCleanup,
    performFullCleanup,
  } = useFirebaseCleanupModal();
  const { colors, typography, spacing, radius } = useAppTheme();

  if (!visible) return null;

  return (
    <Modal visible={visible} onClose={onClose} title="Firebase Data Cleanup">
      <ScrollView
        style={{ paddingHorizontal: spacing.lg }}
        showsVerticalScrollIndicator={false}>
        <Text
          style={[
            typography.bodyMedium,
            { color: colors.onSurfaceVariant, marginBottom: spacing.lg },
          ]}>
          Clean up your Firebase data by removing duplicates, unused fields, and
          orphaned records. This can help reduce storage costs and improve sync
          performance.
        </Text>

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
          <Text
            style={[
              typography.label,
              { color: colors.onSurfaceVariant, marginLeft: spacing.sm },
            ]}>
            Scan your Firebase data to identify cleanup opportunities without
            making any changes.
          </Text>
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
          <Text
            style={[
              typography.label,
              { color: colors.onSurfaceVariant, marginLeft: spacing.sm },
            ]}>
            Remove unused fields and optimize field names. Safe and reversible.
          </Text>
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
          <Text
            style={[
              typography.label,
              { color: colors.onSurfaceVariant, marginLeft: spacing.sm },
            ]}>
            Remove duplicates, orphaned records, and unused fields. ⚠️ This
            cannot be undone!
          </Text>
        </View>

        {(isAnalyzing || isCleaning) && (
          <View
            style={{
              alignItems: "center",
              padding: spacing.lg,
              backgroundColor: colors.surfaceVariant,
              borderRadius: radius.md,
              marginBottom: spacing.lg,
            }}>
            <Text style={[typography.bodyMedium, { color: colors.onSurface }]}>
              {isAnalyzing
                ? "Analyzing Firebase data..."
                : "Cleaning up Firebase data..."}
            </Text>
          </View>
        )}

        {lastReport && (
          <View
            style={{
              backgroundColor: colors.surfaceVariant,
              padding: spacing.md,
              borderRadius: radius.md,
              marginTop: spacing.md,
              marginBottom: spacing.lg * 2,
            }}>
            <Text
              style={[
                typography.h3,
                { color: colors.onSurface, marginBottom: spacing.md },
              ]}>
              {lastReport.duplicatesRemoved === 0 &&
              lastReport.fieldsCleanedUp === 0
                ? "Analysis Report"
                : "Cleanup Report"}
            </Text>

            <View style={{ gap: spacing.sm }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: spacing.xs,
                }}>
                <Ionicons
                  name="document"
                  size={20}
                  color={colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    typography.bodyMedium,
                    {
                      flex: 1,
                      color: colors.onSurfaceVariant,
                      marginLeft: spacing.sm,
                    },
                  ]}>
                  Total Documents
                </Text>
                <Text
                  style={[
                    typography.bodyMedium,
                    { fontWeight: "600", color: colors.onSurface },
                  ]}>
                  {lastReport.totalDocuments}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: spacing.xs,
                }}>
                <Ionicons name="copy" size={20} color={colors.tertiary} />
                <Text
                  style={[
                    typography.bodyMedium,
                    {
                      flex: 1,
                      color: colors.onSurfaceVariant,
                      marginLeft: spacing.sm,
                    },
                  ]}>
                  Duplicates Removed
                </Text>
                <Text
                  style={[
                    typography.bodyMedium,
                    { fontWeight: "600", color: colors.onSurface },
                  ]}>
                  {lastReport.duplicatesRemoved}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: spacing.xs,
                }}>
                <Ionicons name="brush" size={20} color={colors.primary} />
                <Text
                  style={[
                    typography.bodyMedium,
                    {
                      flex: 1,
                      color: colors.onSurfaceVariant,
                      marginLeft: spacing.sm,
                    },
                  ]}>
                  Fields Cleaned
                </Text>
                <Text
                  style={[
                    typography.bodyMedium,
                    { fontWeight: "600", color: colors.onSurface },
                  ]}>
                  {lastReport.fieldsCleanedUp}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: spacing.xs,
                }}>
                <Ionicons name="unlink" size={20} color={colors.error} />
                <Text
                  style={[
                    typography.bodyMedium,
                    {
                      flex: 1,
                      color: colors.onSurfaceVariant,
                      marginLeft: spacing.sm,
                    },
                  ]}>
                  Orphaned Records
                </Text>
                <Text
                  style={[
                    typography.bodyMedium,
                    { fontWeight: "600", color: colors.onSurface },
                  ]}>
                  {lastReport.orphanedDocuments}
                </Text>
              </View>
            </View>

            {Object.keys(lastReport.collectionStats).length > 0 && (
              <View style={{ marginTop: spacing.lg }}>
                <Text
                  style={[
                    typography.bodyMedium,
                    {
                      fontWeight: "600",
                      color: colors.onSurface,
                      marginBottom: spacing.sm,
                    },
                  ]}>
                  Collection Details
                </Text>
                {Object.entries(lastReport.collectionStats).map(
                  ([collection, stats]) => (
                    <View
                      key={collection}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: spacing.xs,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.outlineVariant,
                      }}>
                      <Text
                        style={[
                          typography.bodyMedium,
                          { color: colors.onSurface, fontWeight: "500" },
                        ]}>
                        {collection}
                      </Text>
                      <View style={{ flexDirection: "row", gap: spacing.sm }}>
                        <Text
                          style={[
                            typography.label,
                            { color: colors.onSurfaceVariant },
                          ]}>
                          {stats.documents} docs
                        </Text>
                        {stats.duplicates > 0 && (
                          <Text
                            style={[
                              typography.label,
                              { color: colors.tertiary },
                            ]}>
                            {stats.duplicates} dupes
                          </Text>
                        )}
                        {stats.fieldsRemoved > 0 && (
                          <Text
                            style={[
                              typography.label,
                              { color: colors.primary },
                            ]}>
                            {stats.fieldsRemoved} cleaned
                          </Text>
                        )}
                        {stats.orphaned > 0 && (
                          <Text
                            style={[typography.label, { color: colors.error }]}>
                            {stats.orphaned} orphaned
                          </Text>
                        )}
                      </View>
                    </View>
                  ),
                )}
              </View>
            )}

            {lastReport.errors.length > 0 && (
              <View
                style={{
                  marginTop: spacing.lg,
                  padding: spacing.sm,
                  backgroundColor: colors.error + "20",
                  borderRadius: radius.md,
                }}>
                <Text
                  style={[
                    typography.bodyMedium,
                    {
                      fontWeight: "600",
                      color: colors.error,
                      marginBottom: spacing.xs,
                    },
                  ]}>
                  Errors ({lastReport.errors.length})
                </Text>
                {lastReport.errors.slice(0, 3).map((error, index) => (
                  <Text
                    key={index}
                    style={[typography.bodySmall, { color: colors.error }]}>
                    • {error}
                  </Text>
                ))}
                {lastReport.errors.length > 3 && (
                  <Text
                    style={[typography.bodySmall, { color: colors.error }]}>
                    ... and {lastReport.errors.length - 3} more
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </Modal>
  );
};
