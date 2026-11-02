import { StyleSheet } from "react-native";

import { UI } from "../../../../shared/constants";

export const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#12122E",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.15)",
  },
  sheetHandle: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 40,
  },
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: UI.COLORS.PRIMARY + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  filterCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: UI.COLORS.PRIMARY,
    borderRadius: 10,
    minWidth: 22,
    alignItems: "center",
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Section tabs
  sectionSelector: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  sectionTab: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    gap: 4,
  },
  sectionTabActive: {
    backgroundColor: UI.COLORS.PRIMARY + "18",
    borderWidth: 1,
    borderColor: UI.COLORS.PRIMARY + "30",
  },
  sectionTabText: {
    fontSize: 11,
    fontWeight: "500",
    color: UI.COLORS.TEXT_MUTED,
  },
  sectionTabTextActive: {
    color: UI.COLORS.PRIMARY,
    fontWeight: "600",
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  sectionContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  filterGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  customDateContainer: {
    marginTop: 20,
  },
  dateInputsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  dateInputWrapper: {
    flex: 1,
  },
  dateInput: {
    marginBottom: 0,
  },

  // Switch options
  switchCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 14,
  },
  switchInfo: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: UI.COLORS.TEXT_PRIMARY,
  },
  switchSubtext: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
    marginTop: 2,
  },

  // Amount range
  amountRangeContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  amountInputWrapper: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: UI.COLORS.TEXT_MUTED,
    marginBottom: 6,
  },
  amountInput: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center",
  },
  amountDash: {
    paddingBottom: 12,
  },
  amountError: {
    fontSize: 12,
    color: UI.COLORS.ERROR,
    marginTop: 8,
  },

  // Footer
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  resetButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    gap: 6,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: UI.COLORS.TEXT_SECONDARY,
  },
  applyButton: {
    flex: 2,
    borderRadius: 14,
    overflow: "hidden",
  },
  applyGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
