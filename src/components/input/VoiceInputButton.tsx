import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "@jamsch/expo-speech-recognition";
import { UI } from "../../constants";
import { ParsedTransaction } from "../../types";
import { parseVoiceInput } from "../../services/voiceParser";
import { Button } from "../ui";
import { useAppTheme } from "../ui/ThemeProvider";
import { LinearGradient } from "expo-linear-gradient";
import NetInfo from "@react-native-community/netinfo";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { useSelector } from "react-redux";
import { selectAllCategories } from "../../store/slices/categoriesSlice";
import { TransactionRepository } from "../../database/queries/transactions";

const MAX_RECORDING_MS = 60_000;
const NUM_BARS = 7;

interface VoiceInputButtonProps {
  onResult: (parsed: ParsedTransaction[]) => void;
  size?: number;
  style?: any;
  variant?: "fab" | "button";
  title?: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onResult,
  size = 56,
  style,
  variant = "fab",
  title = "Voice Input",
}) => {
  const { colors } = useAppTheme();
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(false);
  const [transcript, setTranscript] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [isOffline, setIsOffline] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<string>("");
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["45%"], []);

  // Categories for enhanced parsing
  const categories = useSelector(selectAllCategories);
  const [lastCategoryId, setLastCategoryId] = useState<string | undefined>();

  // Fetch last used category when listening starts
  useEffect(() => {
    if (isListening) {
      const fetchLastCategory = async () => {
        try {
          const repo = new TransactionRepository();
          const lastTx = await repo.getLastTransaction();
          if (lastTx) {
            setLastCategoryId(lastTx.categoryId);
            console.log(
              "🎤 Voice Input: Fallback category set to",
              lastTx.categoryId,
            );
          }
        } catch (e) {
          console.warn(
            "Failed to fetch last transaction for voice fallback",
            e,
          );
        }
      };
      fetchLastCategory();
    }
  }, [isListening]);

  // Pulse animation for the FAB
  const fabScale = useSharedValue(1);

  // Waveform bar animations
  const barHeights = Array.from({ length: NUM_BARS }, () => useSharedValue(8));

  // Ring pulse animation
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.6);

  useEffect(() => {
    if (isListening) {
      // FAB pulse - DISABLED as per user request (modal covers it anyway)
      // keeping fabScale at 1
      fabScale.value = 1;

      // Ring pulse (inside modal)
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.6, { duration: 1200, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 0 }),
        ),
        -1,
      );
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 1200, easing: Easing.out(Easing.ease) }),
          withTiming(0.5, { duration: 0 }),
        ),
        -1,
      );

      // Waveform bars
      barHeights.forEach((bar, i) => {
        bar.value = withRepeat(
          withDelay(
            i * 80,
            withSequence(
              withTiming(16 + Math.random() * 28, {
                duration: 300 + Math.random() * 200,
                easing: Easing.inOut(Easing.ease),
              }),
              withTiming(6 + Math.random() * 10, {
                duration: 300 + Math.random() * 200,
                easing: Easing.inOut(Easing.ease),
              }),
            ),
          ),
          -1,
          true,
        );
      });
    } else {
      cancelAnimation(fabScale);
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
      fabScale.value = withTiming(1, { duration: 200 });
      ringScale.value = 1;
      ringOpacity.value = 0;
      barHeights.forEach((bar) => {
        cancelAnimation(bar);
        bar.value = withTiming(8, { duration: 200 });
      });
    }
  }, [isListening]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const finishRecording = useCallback(
    (finalText: string) => {
      console.log("🛑 Finishing recording with text:", finalText);

      // Stop listening first
      ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
      isListeningRef.current = false;

      // Parse with categories and fallback
      // Need to map Redux categories to the format expected by voiceParser {id, name}
      const categoryKeywords = categories.map((c) => ({
        id: c.id,
        name: c.name,
      }));
      console.log(
        "🧠 Parsing with",
        categoryKeywords.length,
        "categories and fallback:",
        lastCategoryId,
      );

      const parsed = parseVoiceInput(
        finalText,
        categoryKeywords,
        lastCategoryId,
      );

      // Close modal
      bottomSheetRef.current?.dismiss();

      // Send result
      if (parsed && parsed.length > 0) {
        onResult(parsed);
      }

      // Reset transcript for next time
      setTranscript("");
    },
    [categories, lastCategoryId, onResult],
  );

  // Speech recognition events
  useSpeechRecognitionEvent("result", (event) => {
    const text = event.results[0]?.transcript ?? "";
    setTranscript(text);
    transcriptRef.current = text;

    // Clear existing silence timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    // Set new silence timer (buffer before stopping)
    // If no new speech for 2 seconds, consider it done
    silenceTimerRef.current = setTimeout(() => {
      if (isListeningRef.current && text.trim()) {
        finishRecording(text);
      }
    }, 2000);
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.warn("[VoiceInput] Error:", event.error, event.message);
    setIsListening(false);
    isListeningRef.current = false;
    bottomSheetRef.current?.dismiss();
    if (timerRef.current) clearTimeout(timerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  });

  useSpeechRecognitionEvent("end", () => {
    const currentText = transcriptRef.current;
    if (currentText.trim()) {
      finishRecording(currentText);
    } else {
      setIsListening(false);
      isListeningRef.current = false;
      bottomSheetRef.current?.dismiss();
    }
  });

  const startListening = useCallback(async () => {
    try {
      // Check for internet connection first
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        setIsOffline(true);
        setIsListening(true);
        isListeningRef.current = true;
        bottomSheetRef.current?.present();
        return;
      }

      const result =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        console.warn("[VoiceInput] Permission denied");
        return;
      }

      setTranscript("");
      transcriptRef.current = "";
      setTimeLeft(60);
      setIsOffline(false);
      setIsListening(true);
      isListeningRef.current = true;
      bottomSheetRef.current?.present();

      countdownRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            ExpoSpeechRecognitionModule.stop();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      timerRef.current = setTimeout(() => {
        ExpoSpeechRecognitionModule.stop();
      }, MAX_RECORDING_MS);

      ExpoSpeechRecognitionModule.start({
        lang: "ar-EG",
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
      });
    } catch (error) {
      console.error("[VoiceInput] Start error:", error);
      setIsListening(false);
      isListeningRef.current = false;
      bottomSheetRef.current?.dismiss();
    }
  }, []);

  const stopListening = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Process the transcript before stopping
    if (transcript.trim()) {
      finishRecording(transcript);
    } else {
      ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
      isListeningRef.current = false;
      bottomSheetRef.current?.dismiss();
    }
  }, [transcript, finishRecording]);

  const handlePress = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1 && isListening) {
        stopListening();
      }
    },
    [isListening, stopListening],
  );

  // Animated styles
  const fabAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const ringAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.7}
      />
    ),
    [],
  );

  return (
    <>
      {variant === "button" ? (
        <Button
          title={title}
          onPress={handlePress}
          icon="mic"
          iconPosition="left"
          style={style}
          variant="primary"
        />
      ) : (
        <Animated.View style={[styles.fabWrapper, style, fabAnimStyle]}>
          <TouchableOpacity
            onPress={handlePress}
            style={[
              styles.fab,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
              },
            ]}
            activeOpacity={0.7}>
          <LinearGradient
            colors={[
              UI.COLORS.PRIMARY_LIGHT,
              UI.COLORS.PRIMARY,
              UI.COLORS.PRIMARY_DARK,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.gradient,
              { width: size, height: size, borderRadius: size / 2 },
            ]}>
            <Ionicons
              name="mic"
              size={size * 0.45}
              color={UI.COLORS.TEXT_PRIMARY}
            />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
      )}

      {/* Recording Bottom Sheet */}
      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        onChange={handleSheetChange}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
        style={styles.sheet}>
        <BottomSheetView style={styles.sheetContent}>
          {isOffline ? (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 20,
              }}>
              <View style={[styles.micContainer, { marginBottom: 20 }]}>
                <View
                  style={[
                    styles.micCircle,
                    { backgroundColor: UI.COLORS.SURFACE },
                  ]}>
                  <Ionicons
                    name="cloud-offline"
                    size={32}
                    color={UI.COLORS.ERROR}
                  />
                </View>
              </View>

              <Text style={styles.listeningLabel}>No Internet Connection</Text>
              <Text style={styles.hintText}>
                Voice recognition requires an active internet connection. Please
                check your network and try again.
              </Text>

              <TouchableOpacity
                style={[styles.stopButton, { marginTop: 20 }]}
                onPress={stopListening}>
                <LinearGradient
                  colors={[UI.COLORS.SURFACE, UI.COLORS.SURFACE]}
                  style={styles.stopGradient}>
                  <Text
                    style={[
                      styles.stopText,
                      { color: UI.COLORS.TEXT_PRIMARY },
                    ]}>
                    Close
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Pulsing ring + mic icon */}
              <View style={styles.micContainer}>
                <Animated.View style={[styles.pulseRing, ringAnimStyle]} />
                <View style={styles.micCircle}>
                  <Ionicons name="mic" size={36} color="#fff" />
                </View>
              </View>

              {/* Timer ring */}
              <View style={styles.timerRow}>
                <View style={styles.timerBadge}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={timeLeft <= 5 ? "#EF4444" : UI.COLORS.TEXT_SECONDARY}
                  />
                  <Text
                    style={[
                      styles.timerText,
                      timeLeft <= 5 && { color: "#EF4444" },
                    ]}>
                    {timeLeft}s
                  </Text>
                </View>
              </View>

              {/* Waveform visualizer */}
              <View style={styles.waveform}>
                {barHeights.map((bar, i) => {
                  const barStyle = useAnimatedStyle(() => ({
                    height: bar.value,
                  }));
                  return (
                    <Animated.View key={i} style={[styles.waveBar, barStyle]} />
                  );
                })}
              </View>

              {/* Status text */}
              <Text style={styles.listeningLabel}>Listening...</Text>
              <Text style={styles.hintText}>
                Say multiple transactions separated by "and" or "و"
              </Text>

              {/* Transcript */}
              <View style={styles.transcriptCard}>
                <Text style={styles.transcriptText}>
                  {transcript || "Speak now..."}
                </Text>
              </View>

              {/* Stop button */}
              <TouchableOpacity
                style={styles.stopButton}
                onPress={stopListening}>
                <LinearGradient
                  colors={["#EF4444", "#DC2626"]}
                  style={styles.stopGradient}>
                  <Ionicons name="stop" size={20} color="#fff" />
                  <Text style={styles.stopText}>Done</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
};

const styles = StyleSheet.create({
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
