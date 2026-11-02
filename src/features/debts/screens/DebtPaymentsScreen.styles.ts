import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  // ── Header ─────────────────────────────────────────
  headerContainer: {
    marginBottom: 8,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: 12,
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(108,92,231,0.1)",
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  navContent: {
    flex: 1,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  navSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  placeholder: { width: 38 },

  // ── Hero Card ──────────────────────────────────────
  heroCard: {
    borderRadius: 20,
    padding: 22,
    overflow: "hidden",
    position: "relative",
  },
  decorCircle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  circle1: { width: 160, height: 160, top: -50, right: -30 },
  circle2: { width: 100, height: 100, bottom: -25, left: -20 },
  heroLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroValue: {
    fontSize: 36,
    fontWeight: "800",
    color: "#2ED573",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroSubtext: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 18,
  },

  // ── Stats Row (inside hero) ────────────────────────
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: "auto",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 12,
  },

  // ── Quick Stats Row ────────────────────────────────
  quickStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: "rgba(20,20,50,0.65)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.15)",
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
    gap: 6,
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  quickStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ── Section Label ──────────────────────────────────
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 12,
  },

  // ── List ───────────────────────────────────────────
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },

  // ── Empty State ────────────────────────────────────
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
    elevation: 4,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
