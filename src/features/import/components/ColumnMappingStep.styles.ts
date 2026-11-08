import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  columnCard: {
    marginBottom: 12,
    overflow: "hidden",
  },
  columnRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionsContainer: {
    borderTopWidth: 1,
    padding: 12,
    gap: 8,
  },
});
