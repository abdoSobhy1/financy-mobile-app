import { StyleSheet } from "react-native";

import { UI } from "../../../shared/constants";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  instructions: {
    padding: UI.SPACING.LG,
    backgroundColor: UI.COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  description: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  columnsSection: {
    padding: UI.SPACING.LG,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: UI.COLORS.TEXT_SECONDARY,
    marginBottom: UI.SPACING.MD,
  },
  columnItem: {
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    borderRadius: UI.CARD_RADIUS,
    marginBottom: UI.SPACING.SM,
  },
  columnItemSelected: {
    borderColor: UI.COLORS.PRIMARY,
    backgroundColor: "rgba(79, 70, 229, 0.1)",
  },
  columnItemMapped: {
    borderColor: UI.COLORS.SUCCESS,
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: UI.SPACING.MD,
  },
  columnInfo: {
    flex: 1,
  },
  columnName: {
    fontSize: 15,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  columnType: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
  },
  columnMapping: {
    flexDirection: "row",
    alignItems: "center",
    gap: UI.SPACING.SM,
  },
  mappingChip: {
    backgroundColor: UI.COLORS.SUCCESS,
    paddingHorizontal: UI.SPACING.SM,
    paddingVertical: UI.SPACING.XS,
    borderRadius: 12,
  },
  mappingChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  unmappedText: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
    fontStyle: "italic",
  },
  mappingSection: {
    padding: UI.SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
    backgroundColor: UI.COLORS.BACKGROUND,
  },
  mappingOptions: {
    gap: UI.SPACING.SM,
  },
  mappingOption: {
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    borderRadius: UI.CARD_RADIUS,
    padding: UI.SPACING.MD,
  },
  mappingOptionSelected: {
    borderColor: UI.COLORS.PRIMARY,
    backgroundColor: "rgba(79, 70, 229, 0.1)",
  },
  mappingOptionUsed: {
    opacity: 0.5,
    backgroundColor: UI.COLORS.BACKGROUND,
  },
  mappingOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: UI.SPACING.XS,
  },
  mappingOptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  requiredLabel: {
    color: UI.COLORS.PRIMARY,
  },
  usedLabel: {
    color: UI.COLORS.TEXT_MUTED,
  },
  mappingOptionDescription: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
    lineHeight: 16,
  },
  usedDescription: {
    color: UI.COLORS.TEXT_MUTED,
  },
  summary: {
    padding: UI.SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
    backgroundColor: UI.COLORS.SURFACE,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: UI.SPACING.SM,
  },
  summaryItem: {
    backgroundColor: UI.COLORS.BACKGROUND,
    padding: UI.SPACING.SM,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    minWidth: "45%",
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: UI.SPACING.XS,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  summaryLabelMissing: {
    color: UI.COLORS.ERROR,
  },
  summaryStatus: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryStatusMapped: {
    backgroundColor: UI.COLORS.SUCCESS,
  },
  summaryStatusUnmapped: {
    backgroundColor: UI.COLORS.ERROR,
  },
  summaryValue: {
    fontSize: 11,
    color: UI.COLORS.TEXT_MUTED,
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
  continueButton: {
    flex: 1,
  },
});
