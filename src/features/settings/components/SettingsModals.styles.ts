import { StyleSheet } from "react-native";

export const getStyles = (colors: any) => StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.onBackground,
    letterSpacing: 0.3,
    marginBottom: 24,
  },

  // ── Section label ───────────────────────────────────
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryContainer,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 8,
    paddingHorizontal: 4,
  },

  // ── Glass Card ──────────────────────────────────────
  card: {
    backgroundColor: "rgba(20,20,50,0.55)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.15)",
    marginBottom: 20,
    overflow: "hidden",
  },
  dangerCard: {
    borderColor: "rgba(255,107,107,0.2)",
    backgroundColor: "rgba(255,107,107,0.04)",
  },

  // ── Row ─────────────────────────────────────────────
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.onBackground,
  },
  rowSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 16,
  },
  separator: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: 16,
  },

  // ── Account ─────────────────────────────────────────
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "rgba(255,107,107,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.25)",
  },
  signOutText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FF6B6B",
  },

  // ── Category management ─────────────────────────────
  catGroupTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 10,
    marginBottom: 4,
  },
  catLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catName: {
    fontSize: 14,
    color: colors.onBackground,
  },
  addCatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderStyle: "dashed",
  },
  addCatText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },

  // ── Modal ───────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "88%",
    maxWidth: 380,
    maxHeight: "80%",
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.onBackground,
    textAlign: "center",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    marginBottom: 18,
  },
  dayOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: "transparent",
  },
  dayOptionActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 15,
    color: colors.onBackground,
  },
  dayTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  modalSaveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  billingNumberInput: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  quickPresetRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    flexWrap: "wrap",
    gap: 6,
  },
  quickPresetLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginRight: 4,
  },
  quickPresetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  quickPresetChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  billingNoticeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  billingNoticeTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  billingNoticeText: {
    fontSize: 12,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
});
