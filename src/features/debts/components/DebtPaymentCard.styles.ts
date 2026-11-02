import { StyleSheet } from "react-native";

import { UI } from "../../../shared/constants";

export const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(20,20,50,0.65)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.15)",
    padding: 16,
    marginBottom: 12,
  },

  // ── Main row ───────────────────────────────────────
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: 17,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
    letterSpacing: 0.2,
  },
  paymentDate: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  principalBadge: {
    backgroundColor: "rgba(46,213,115,0.1)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(46,213,115,0.15)",
  },
  principalBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2ED573",
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(108,92,231,0.1)",
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Expanded ───────────────────────────────────────
  expandedContent: {
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(108,92,231,0.1)",
  },

  // ── Breakdown ──────────────────────────────────────
  breakdownSection: {
    marginBottom: 14,
  },
  breakdownTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: UI.COLORS.TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  breakdownItem: {
    marginBottom: 10,
  },
  breakdownLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    fontSize: 13,
    color: UI.COLORS.TEXT_SECONDARY,
    fontWeight: "500",
    flex: 1,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  breakdownBarTrack: {
    height: 5,
    backgroundColor: "rgba(108,92,231,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  breakdownBarFill: {
    height: "100%",
    borderRadius: 3,
  },

  // ── Note ───────────────────────────────────────────
  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 14,
    padding: 12,
    backgroundColor: "rgba(108,92,231,0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.1)",
  },
  noteIconBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: "rgba(108,92,231,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  noteText: {
    fontSize: 13,
    color: UI.COLORS.TEXT_PRIMARY,
    lineHeight: 19,
    flex: 1,
  },

  // ── Actions ────────────────────────────────────────
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(108,92,231,0.08)",
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.15)",
    gap: 6,
  },
  deleteBtn: {
    backgroundColor: "rgba(255,107,107,0.06)",
    borderColor: "rgba(255,107,107,0.15)",
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
