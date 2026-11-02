import { StyleSheet } from "react-native";

import { UI } from "../../../shared/constants";

export const styles = StyleSheet.create({
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
  warningCard: {
    borderLeftWidth: 4,
    borderLeftColor: UI.COLORS.WARNING,
  },
  errorCard: {
    borderLeftWidth: 4,
    borderLeftColor: UI.COLORS.ERROR,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: UI.SPACING.LG,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginTop: UI.SPACING.MD,
    marginBottom: UI.SPACING.XS,
  },
  loadingSubtext: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: UI.SPACING.LG,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.ERROR,
    marginTop: UI.SPACING.MD,
    marginBottom: UI.SPACING.XS,
  },
  errorMessage: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    textAlign: "center",
    marginBottom: UI.SPACING.MD,
  },
  retryButton: {
    minWidth: 120,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: UI.SPACING.MD,
  },
  summaryContent: {
    flex: 1,
    marginLeft: UI.SPACING.MD,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  summarySubtitle: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: UI.SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
  },
  stat: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: UI.COLORS.SUCCESS,
    marginBottom: UI.SPACING.XS,
  },
  statLabel: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
    textTransform: "uppercase",
  },
  settingsCard: {
    marginBottom: UI.SPACING.LG,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.MD,
  },
  settingsList: {
    gap: UI.SPACING.SM,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: UI.SPACING.SM,
  },
  settingLabel: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    fontWeight: "500",
  },
  settingValue: {
    fontSize: 14,
    color: UI.COLORS.TEXT_PRIMARY,
    fontWeight: "600",
  },
  mappingCard: {
    marginBottom: UI.SPACING.LG,
  },
  mappingTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.MD,
  },
  mappingList: {
    gap: UI.SPACING.SM,
  },
  mappingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: UI.SPACING.SM,
  },
  mappingField: {
    flexDirection: "row",
    alignItems: "center",
    gap: UI.SPACING.SM,
  },
  mappingFieldName: {
    fontSize: 14,
    color: UI.COLORS.TEXT_PRIMARY,
    fontWeight: "600",
  },
  requiredBadge: {
    fontSize: 10,
    color: UI.COLORS.PRIMARY,
    backgroundColor: "rgba(79, 70, 229, 0.2)",
    paddingHorizontal: UI.SPACING.XS,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  mappingColumn: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    fontStyle: "italic",
  },
  issuesCard: {
    marginBottom: UI.SPACING.LG,
  },
  issuesHeader: {
    marginBottom: UI.SPACING.MD,
  },
  issuesTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  issuesSubtitle: {
    fontSize: 13,
    color: UI.COLORS.TEXT_SECONDARY,
  },
  issuesList: {
    maxHeight: 200,
  },
  issueItem: {
    padding: UI.SPACING.SM,
    borderRadius: 6,
    marginBottom: UI.SPACING.XS,
  },
  errorItem: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  warningItem: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  issueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: UI.SPACING.XS,
    marginBottom: UI.SPACING.XS,
  },
  issueLocation: {
    fontSize: 12,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  issueMessage: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
    lineHeight: 16,
  },
  moreIssuesText: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
    textAlign: "center",
    marginTop: UI.SPACING.SM,
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    gap: UI.SPACING.MD,
    padding: UI.SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
    backgroundColor: UI.COLORS.SURFACE,
  },
  backButton: {
    flex: 1,
  },
  importButton: {
    flex: 2,
  },
});
