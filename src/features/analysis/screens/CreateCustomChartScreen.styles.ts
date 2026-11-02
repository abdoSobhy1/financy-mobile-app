import { StyleSheet } from "react-native";

import { UI } from "../../../shared/constants";

export const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: UI.SPACING.MD,
    paddingBottom: UI.SPACING.SM,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: UI.SPACING.SM,
    marginLeft: -UI.SPACING.SM,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.onBackground,
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40, // Same width as back button to center title
  },
  section: {
    margin: UI.SPACING.MD,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.onBackground,
    marginBottom: UI.SPACING.MD,
  },
  optionsList: {
    gap: UI.SPACING.SM,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: UI.SPACING.MD,
    backgroundColor: colors.surfaceVariant,
    borderRadius: UI.CARD_RADIUS,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  selectedOption: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  optionContent: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: UI.SPACING.SM,
    marginBottom: UI.SPACING.XS,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.onBackground,
  },
  selectedOptionText: {
    color: colors.primary,
  },
  optionDescription: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  colorThemeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: UI.SPACING.MD,
  },
  colorThemeItem: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    padding: UI.SPACING.MD,
    backgroundColor: colors.surfaceVariant,
    borderRadius: UI.CARD_RADIUS,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    position: "relative",
  },
  selectedColorTheme: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  colorPreview: {
    flexDirection: "row",
    marginBottom: UI.SPACING.SM,
  },
  colorSample: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  colorThemeLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: "center",
  },
  colorThemeCheck: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: colors.primary,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  filtersList: {
    gap: UI.SPACING.SM,
  },
  filterItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: UI.SPACING.MD,
    backgroundColor: colors.surfaceVariant,
    borderRadius: UI.CARD_RADIUS,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  filterLabel: {
    fontSize: 16,
    color: colors.onBackground,
  },
  filterValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: UI.SPACING.SM,
  },
  filterValueText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  actions: {
    margin: UI.SPACING.MD,
    gap: UI.SPACING.MD,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  deleteButton: {
    marginTop: UI.SPACING.SM,
  },
  transactionTypeButtons: {
    flexDirection: "row" as const,
    gap: 8,
    marginTop: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: "center" as const,
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    fontSize: 14,
    color: colors.onBackground,
    fontWeight: "500" as const,
  },
  typeButtonTextActive: {
    color: colors.background,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: colors.onBackground,
  },
  modalClearButton: {
    padding: 8,
  },
  modalClearText: {
    fontSize: 16,
    color: colors.primary,
  },
  modalList: {
    flex: 1,
  },
  categoryItem: {
    padding: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  selectedCategoryItem: {
    backgroundColor: colors.surfaceVariant,
  },
  categoryInfo: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flex: 1,
  },
  categoryColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    color: colors.onBackground,
    flex: 1,
  },
  selectedCategoryName: {
    fontWeight: "600" as const,
  },
  categoryType: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginLeft: 8,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  modalDoneButton: {
    backgroundColor: colors.primary,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  dateRangeLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.onBackground,
    marginBottom: 8,
    marginTop: 16,
  },
  quickDateOptions: {
    gap: 8,
  },
  quickDateOption: {
    padding: 12,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  quickDateOptionText: {
    fontSize: 16,
    color: colors.onBackground,
    textAlign: "center" as const,
  },
  currentDateRange: {
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  currentDateText: {
    fontSize: 16,
    color: colors.onBackground,
    textAlign: "center" as const,
  },
});
