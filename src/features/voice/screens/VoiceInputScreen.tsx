import { useVoiceInputScreen } from "../hooks/useVoiceInputScreen";
import { VoiceAudioBar } from "../components/VoiceAudioBar";
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import Animated from "react-native-reanimated";

export const VoiceInputScreen: React.FC = () => {
  const {
    handleClose,
    isListening,
    transcript,
    isOffline,
    barHeights,
    handleContentPress,
    ringAnimStyle
  } = useVoiceInputScreen();
  const { colors, typography, isDark } = useAppTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeBtn}>
          <Ionicons name="close" size={28} color={colors.onBackground} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.content}
        activeOpacity={1}
        onPress={handleContentPress}
      >
        <View style={styles.micWrapper}>
          <Animated.View style={[styles.pulseRing, { borderColor: colors.primaryContainer, backgroundColor: colors.primaryContainer + "33" }, ringAnimStyle]} />
          <View style={[styles.micCircle, { backgroundColor: colors.primaryContainer, shadowColor: colors.primaryContainer }]}>
            <Ionicons name="mic" size={40} color={colors.onPrimaryContainer} />
          </View>
        </View>

        <Text style={[typography.h3, { color: colors.onBackground, marginBottom: 8 }]}>
          {isListening
            ? isOffline
              ? "Listening (Offline • العربية)"
              : "Listening (العربية)..."
            : transcript
              ? "Ready to Verify"
              : "Tap to Start"}
        </Text>
        <Text style={[typography.caption, { color: colors.onSurfaceVariant, marginBottom: 20 }]}>
          {isListening
            ? isOffline
              ? "On-device Arabic speech recognition active"
              : "Speak your transaction in Arabic (e.g. صرفت 150 قهوة)"
            : transcript
              ? "Tap anywhere to continue"
              : "Tap mic to speak your transaction"}
        </Text>

        {transcript ? (
          <Text style={[typography.bodyLarge, { color: colors.onSurfaceVariant, textAlign: "center", marginBottom: 40, lineHeight: 28 }]}>
            "{transcript}"
          </Text>
        ) : null}

        {/* Animated Audio Bars */}
        <View style={styles.barsContainer}>
          {barHeights.map((height, index) => (
            <VoiceAudioBar
              key={index}
              height={height}
              color={colors.primary}
              listening={isListening}
            />
          ))}
        </View>

        <Text style={[typography.label, { color: colors.onSurfaceVariant, position: "absolute", bottom: 60 }]}>
          {isListening
            ? "Tap anywhere to stop"
            : transcript
              ? "Tap anywhere to continue"
              : "Tap mic to start"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  closeBtn: {
    padding: 8,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  micWrapper: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 48,
  },
  pulseRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
  },
  micCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  barsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 60,
    gap: 6,
    marginBottom: 40,
  },
});
