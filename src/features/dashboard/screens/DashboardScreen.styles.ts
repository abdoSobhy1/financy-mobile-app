import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notificationButton: {
    padding: 8,
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
  },
  alertIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroCard: {
    borderRadius: 32,
    overflow: "hidden",
    justifyContent: "center",
    minHeight: 185,
  },
  sparklineWrap: {
    position: "absolute",
    bottom: -5,
    left: 0,
    right: 0,
    height: "60%",
  },
  heroCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flex: 1,
  },
  periodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pctBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statPill: {
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  statPillIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  paginationDot: {
    height: 6,
    borderRadius: 3,
  },
  quickAddDivider: {
    width: 1,
    height: 44,
    marginTop: 6,
    marginHorizontal: 8,
    opacity: 0.7,
  },
  circleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  moreChip: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTransactionsWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  emptyTransactionsIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
});
