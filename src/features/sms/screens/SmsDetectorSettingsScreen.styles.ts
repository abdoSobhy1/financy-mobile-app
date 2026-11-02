import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerResetBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  overviewCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBadgeSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  overviewSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  groupTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  groupTitleWithCount: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  countBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countText: {
    fontSize: 11,
    fontWeight: "600",
  },
  groupSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginLeft: 8,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 2,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: "100%",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    marginRight: 4,
  },
  chipCloseBtn: {
    padding: 2,
  },
  testerHeader: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  sampleScroll: {
    flexDirection: "row",
    marginBottom: 8,
  },
  sampleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 8,
  },
  sampleChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  textInput: {
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  textInputMulti: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    fontSize: 13,
    textAlignVertical: "top",
    minHeight: 70,
  },
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 42,
    borderRadius: 12,
  },
  testBtnText: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },
  resultContainer: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  resultTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  resultRowText: {
    fontSize: 13,
    marginLeft: 8,
  },
  parsedBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  parsedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  parsedTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  parsedTypeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  parsedAmount: {
    fontSize: 18,
    fontWeight: "800",
  },
  parsedDetailText: {
    fontSize: 13,
    color: "#1F2937",
    marginTop: 2,
  },
  unparsedBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  unparsedText: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  resetBottomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 4,
  },
  resetBottomText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalInput: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    fontSize: 15,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalConfirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
