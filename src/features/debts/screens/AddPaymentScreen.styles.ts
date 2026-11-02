import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },

  // ── Nav ────────────────────────────────────────────
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(108,92,231,0.1)",
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  savePill: {
    backgroundColor: "#000000",
    borderColor: "#000000",
  },
  navCenter: { flex: 1, alignItems: "center" },
  navTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000000",
  },
  navSubtitle: {
    fontSize: 12,
    color: "#000000",
    marginTop: 2,
  },

  // ── Scroll ─────────────────────────────────────────
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },

  // ── Debt Info Hero ─────────────────────────────────
  debtInfoCard: {
    borderRadius: 20,
    padding: 22,
    overflow: "hidden",
    position: "relative",
    marginBottom: 20,
  },
  decorCircle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  circle1: { width: 150, height: 150, top: -45, right: -30 },
  circle2: { width: 90, height: 90, bottom: -20, left: -15 },
  heroLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FF6B6B",
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 16,
  },
  heroStat: {},
  heroStatLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  heroStatValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },

  // ── Sections ───────────────────────────────────────
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000000",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  // ── Quick chips ────────────────────────────────────
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickChip: {
    backgroundColor: "rgba(108,92,231,0.08)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.15)",
    minWidth: 72,
  },
  quickChipAccent: {
    backgroundColor: "rgba(46,213,115,0.06)",
    borderColor: "rgba(46,213,115,0.2)",
  },
  quickChipLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 2,
  },
  quickChipValue: {
    fontSize: 11,
    color: "#000000",
  },

  // ── Input cards ────────────────────────────────────
  inputCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20,20,50,0.65)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.15)",
    paddingHorizontal: 14,
  },
  inputCardError: {
    borderColor: "rgba(255,107,107,0.5)",
  },
  inputIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(108,92,231,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
    paddingVertical: 16,
  },

  // ── Split (principal/interest) ─────────────────────
  splitRow: {
    flexDirection: "row",
    gap: 10,
  },
  splitCard: {
    flex: 1,
    backgroundColor: "rgba(20,20,50,0.65)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.15)",
    padding: 14,
  },
  splitHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  splitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  splitLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000000",
  },
  splitInputWrap: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  splitInput: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
    paddingVertical: 12,
  },

  // ── Error / Tip ────────────────────────────────────
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "500",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 2,
  },
  tipText: {
    fontSize: 12,
    color: "#000000",
    fontStyle: "italic",
    flex: 1,
    lineHeight: 16,
  },

  // ── Bottom bar ─────────────────────────────────────
  bottomBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(108,92,231,0.1)",
    backgroundColor: "rgba(15,15,45,0.8)",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000000",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 14,
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
