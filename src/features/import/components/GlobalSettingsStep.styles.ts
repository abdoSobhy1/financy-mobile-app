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
    padding: UI.SPACING.LG,
  },
  settingCard: {
    marginBottom: UI.SPACING.LG,
  },
  settingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: UI.SPACING.MD,
  },
  settingIcon: {
    width: 40,
    height: 40,
    backgroundColor: UI.COLORS.BACKGROUND,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: UI.SPACING.MD,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  settingDescription: {
    fontSize: 13,
    color: UI.COLORS.TEXT_SECONDARY,
    lineHeight: 18,
  },
  typeSelector: {
    flexDirection: "row",
    gap: UI.SPACING.SM,
  },
  typeOption: {
    flex: 1,
    backgroundColor: UI.COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    borderRadius: UI.CARD_RADIUS,
    padding: UI.SPACING.MD,
    alignItems: "center",
  },
  typeOptionSelected: {
    borderColor: UI.COLORS.PRIMARY,
    backgroundColor: "rgba(79, 70, 229, 0.1)",
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginTop: UI.SPACING.SM,
    marginBottom: UI.SPACING.XS,
  },
  typeOptionTextSelected: {
    color: UI.COLORS.PRIMARY,
  },
  typeOptionDescription: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
    textAlign: "center",
  },
  budgetOptions: {
    gap: UI.SPACING.SM,
    marginTop: UI.SPACING.MD,
  },
  budgetOption: {
    backgroundColor: UI.COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    borderRadius: 8,
    padding: UI.SPACING.MD,
  },
  budgetOptionSelected: {
    borderColor: UI.COLORS.SUCCESS,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  budgetOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: UI.SPACING.XS,
  },
  budgetOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  budgetOptionTextSelected: {
    color: UI.COLORS.SUCCESS,
  },
  budgetOptionDescription: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
  },
  categoryPreviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: UI.SPACING.SM,
    marginTop: UI.SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: UI.COLORS.BORDER,
  },
  categoryPreviewText: {
    fontSize: 13,
    color: UI.COLORS.TEXT_SECONDARY,
    fontWeight: "500",
  },
  categoryPreview: {
    marginTop: UI.SPACING.SM,
  },
  categoryPreviewTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.SM,
  },
  categoryList: {
    gap: UI.SPACING.XS,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: UI.SPACING.SM,
    backgroundColor: UI.COLORS.BACKGROUND,
    borderRadius: 6,
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: UI.SPACING.SM,
  },
  categoryName: {
    flex: 1,
    fontSize: 12,
    color: UI.COLORS.TEXT_PRIMARY,
    fontWeight: "500",
  },
  categoryType: {
    fontSize: 11,
    color: UI.COLORS.TEXT_MUTED,
    textTransform: "uppercase",
  },
  noCategoriesText: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
    fontStyle: "italic",
    textAlign: "center",
    padding: UI.SPACING.MD,
  },
  advancedOptions: {
    gap: UI.SPACING.MD,
  },
  toggleOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: UI.SPACING.SM,
  },
  toggleInfo: {
    flex: 1,
    marginRight: UI.SPACING.MD,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: UI.SPACING.XS,
  },
  toggleDescription: {
    fontSize: 12,
    color: UI.COLORS.TEXT_SECONDARY,
    lineHeight: 16,
  },
  toggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: UI.COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: UI.COLORS.SUCCESS,
    borderColor: UI.COLORS.SUCCESS,
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
    flex: 2,
  },
});
