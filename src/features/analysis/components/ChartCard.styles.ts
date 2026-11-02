import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");
const GLASS = {
  bg: "rgba(255,255,255,0.04)",
  border: "rgba(108,92,231,0.18)",
  borderLight: "rgba(108,92,231,0.10)",
  grid: "rgba(108,92,231,0.10)",
  labelColor: "rgba(255,255,255,0.6)",
};
export const styles = StyleSheet.create({
  /* ── card shell ── */
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: GLASS.bg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GLASS.border,
    overflow: "hidden",
  },
  cardContent: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },

  /* ── header ── */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  titleText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  compareButton: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: "rgba(108,92,231,0.15)",
  },

  /* ── chart area ── */
  chartContainer: {
    alignItems: "center",
  },
  pieContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  lineContainer: {
    width: "100%",
    alignItems: "center",
  },
  barContainer: {
    width: "100%",
    alignItems: "center",
  },

  /* ── center states ── */
  centerContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  centerText: {
    textAlign: "center",
    fontSize: 13,
    color: "rgba(255,255,255,0.3)",
  },

  /* ── legend ── */
  legendContainer: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 100,
    marginBottom: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendName: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    fontFamily: "System",
    lineHeight: 16,
    marginBottom: 1,
  },
  legendAmount: {
    fontSize: 11,
    fontWeight: "400",
    color: "rgba(255,255,255,0.45)",
    fontFamily: "System",
    lineHeight: 14,
  },
  moreText: {
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 4,
    color: "rgba(255,255,255,0.3)",
    width: "100%",
  },

  /* ── custom chart card ── */
  customHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  chartInfo: {
    flex: 1,
  },
  chartMeta: {
    fontSize: 11,
    color: "rgba(108,92,231,0.6)",
    marginTop: 2,
    textTransform: "capitalize",
  },
  customActions: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    padding: 7,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  actionBtnPrimary: {
    backgroundColor: "rgba(108,92,231,0.3)",
  },
  actionBtnDanger: {
    backgroundColor: "rgba(255,107,107,0.25)",
  },

  /* ── period comparison bars ── */
  comparisonMainContainer: {
    position: "relative",
    paddingVertical: 16,
    height: 200,
  },
  comparisonGridContainer: {
    position: "absolute",
    top: 16,
    left: 0,
    right: 0,
    height: 120,
    justifyContent: "space-between",
  },
  comparisonGridLine: {
    height: 1,
    backgroundColor: GLASS.grid,
    marginHorizontal: 16,
  },
  comparisonScroll: {
    flex: 1,
    zIndex: 1,
  },
  comparisonScrollContent: {
    paddingHorizontal: 16,
    gap: 24,
    flexDirection: "row",
    minWidth: 400,
  },
  categoryComparison: {
    alignItems: "center",
    minWidth: 80,
    maxWidth: 100,
  },
  categoryLabelBottom: {
    fontSize: 10,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    marginTop: 8,
    minWidth: 80,
    lineHeight: 13,
  },
  barsGroup: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 120,
    gap: 3,
    justifyContent: "center",
  },
  barWrapper: {
    alignItems: "center",
    width: 22,
  },
  barValue: {
    fontSize: 8,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    marginBottom: 2,
    height: 10,
  },
  comparisonBar: {
    width: 18,
    borderRadius: 4,
    minHeight: 2,
  },
});
