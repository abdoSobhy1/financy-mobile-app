import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ImportError } from "../types/import";
import { SectionHeading, Badge, useAppTheme } from "../../../shared/ui";

interface ImportIssueListProps {
  issues: ImportError[];
  headingPrefix?: string;
  limit?: number;
}

export const ImportIssueList: React.FC<ImportIssueListProps> = ({
  issues,
  headingPrefix = "ISSUES FOUND",
  limit = 15,
}) => {
  const { colors, typography, spacing } = useAppTheme();

  if (!issues || issues.length === 0) return null;

  return (
    <>
      <SectionHeading text={`${headingPrefix} (${issues.length})`} />
      {issues.slice(0, limit).map((item, index) => {
        const isErr = item.severity !== "warning";
        return (
          <View
            key={`${item.row}-${item.column}-${index}`}
            style={[
              styles.issueCard,
              {
                backgroundColor: isErr
                  ? colors.errorContainer + "44"
                  : colors.surface,
                borderColor: isErr ? colors.error : colors.outlineVariant,
              },
            ]}>
            <View style={styles.issueHeader}>
              <View style={styles.issueHeaderLeft}>
                <Ionicons
                  name={isErr ? "close-circle" : "warning"}
                  size={16}
                  color={isErr ? colors.error : colors.tertiary}
                />
                <Text style={[typography.label, { color: colors.onSurface }]}>
                  Row {item.row} • "{item.column}"
                </Text>
              </View>
              <Badge
                label={isErr ? "Error" : "Warning"}
                role={isErr ? "error" : "secondary"}
                size="small"
              />
            </View>
            <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
              {item.message}
            </Text>
          </View>
        );
      })}
      {issues.length > limit && (
        <Text
          style={[
            typography.caption,
            {
              color: colors.onSurfaceVariant,
              textAlign: "center",
              marginTop: spacing.xs,
              marginBottom: spacing.md,
            },
          ]}>
          + {issues.length - limit} additional issues not shown
        </Text>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  issueCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  issueHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  issueHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
});
