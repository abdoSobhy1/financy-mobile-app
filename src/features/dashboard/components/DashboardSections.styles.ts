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
  budgetHeroCard: {
    borderRadius: 32,
    overflow: "hidden",
    justifyContent: "space-between",
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
  balanceLeftColumn: {
    flex: 1,
    justifyContent: "space-between",
  },
  balanceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerSectionLabel: {
    textTransform: "uppercase",
    letterSpacing: 1,
    opacity: 0.75,
  },
  eyeToggleButton: {
    opacity: 0.75,
  },
  heroAmountText: {
    fontSize: 38,
    fontWeight: "900",
  },
  periodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  periodBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  pctBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pctBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    opacity: 0.9,
  },
  vsPeriodText: {
    fontSize: 11,
    opacity: 0.65,
    fontWeight: "600",
  },
  statsColumn: {
    width: 124,
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
  statPillContent: {
    flex: 1,
    justifyContent: "center",
  },
  statPillTitle: {
    opacity: 0.8,
    fontSize: 10,
    lineHeight: 12,
  },
  statPillValue: {
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 14,
  },
  budgetTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  budgetSafeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    alignItems: "flex-end",
  },
  budgetSafeLabel: {
    fontSize: 10,
    opacity: 0.8,
    fontWeight: "600",
  },
  budgetSafeValue: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 1,
  },
  budgetProgressRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  budgetRingWrap: {
    width: 48,
    height: 48,
  },
  budgetEmptyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  setBudgetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  setBudgetButtonText: {
    fontSize: 12,
    fontWeight: "700",
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
