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
