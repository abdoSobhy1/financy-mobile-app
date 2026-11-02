import { StyleSheet } from "react-native";

import { UI } from "../../../shared/constants";

export const styles = StyleSheet.create({
  fabWrapper: {
    zIndex: 1000,
  },
  fab: {
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: UI.COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  gradient: {
    justifyContent: "center",
    alignItems: "center",
  },

  // Bottom Sheet
  sheet: {
    zIndex: 9999,
  },
  sheetBackground: {
    backgroundColor: "#12122E",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.15)",
  },
  sheetHandle: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 40,
  },
  sheetContent: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 32,
  },

  // Mic area
  micContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 12,
    width: 80,
    height: 80,
  },
  pulseRing: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: UI.COLORS.PRIMARY,
  },
  micCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },

  // Timer
  timerRow: {
    marginBottom: 16,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.COLORS.TEXT_SECONDARY,
  },

  // Waveform
  waveform: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 48,
    marginBottom: 16,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: UI.COLORS.PRIMARY,
  },

  // Text
  listeningLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  hintText: {
    fontSize: 12,
    color: UI.COLORS.TEXT_MUTED,
    textAlign: "center",
    marginBottom: 16,
  },

  // Transcript
  transcriptCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    minHeight: 56,
    justifyContent: "center",
  },
  transcriptText: {
    fontSize: 15,
    color: UI.COLORS.TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 22,
  },

  // Stop button
  stopButton: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
  },
  stopGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  stopText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
