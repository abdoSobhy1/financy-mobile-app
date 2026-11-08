import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");
export const CARD_MARGIN = 8;
const CARD_WIDTH = (width - 40 - CARD_MARGIN * 2) / 2;
export const styles = StyleSheet.create({
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  viewToggle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  walletCard: {
    width: CARD_WIDTH,
    margin: CARD_MARGIN,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  addCard: {
    width: CARD_WIDTH,
    margin: CARD_MARGIN,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
  },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  walletAddRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
  },
});
