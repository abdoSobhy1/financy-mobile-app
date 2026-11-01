import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { TransactionStackParamList, ParsedTransaction } from "../types";
import { useAppTheme } from "../components/ui/ThemeProvider";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
  withDelay,
} from "react-native-reanimated";
import NetInfo from "@react-native-community/netinfo";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "@jamsch/expo-speech-recognition";
import { parseVoiceInput } from "../services/voiceParser";
import { useSelector } from "react-redux";
import { selectAllCategories } from "../store/slices/categoriesSlice";
import { RootState } from "../store";

type NavigationProp = StackNavigationProp<TransactionStackParamList>;
type VoiceInputRouteProp = RouteProp<TransactionStackParamList, "VoiceInput">;
const NUM_BARS = 5;
const SILENCE_TIMEOUT_MS = 4500;
const INITIAL_SILENCE_TIMEOUT_MS = 10000;

export const VoiceInputScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<VoiceInputRouteProp>();
  const existingTransactions = (route.params as any)?.existingTransactions || [];
  const { colors, typography, isDark } = useAppTheme();
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isOffline, setIsOffline] = useState(false);

  const categories = useSelector(selectAllCategories);
  const budgetsMap = useSelector((state: RootState) => state.budgets.items);
  const budgets = Object.values(budgetsMap);
  const transactionsMap = useSelector((state: RootState) => state.transactions.items);
  const transactions = Object.values(transactionsMap);
  
  const transcriptRef = useRef("");
  const finalizedSegmentsRef = useRef("");
  const interimSegmentRef = useRef("");
  const isNavigatingRef = useRef(false);
  const silenceTimeoutRef = useRef<any>(null);

  // Animation values
  const pulseAnim = useSharedValue(1);
  const barHeights = Array(NUM_BARS).fill(0).map(() => useSharedValue(8));

  const processTranscript = async (finalTranscript: string) => {
    if (isNavigatingRef.current) return;
    
    stopAnimations();
    clearSilenceTimeout();
    
    const textToProcess = finalTranscript.trim();
    if (textToProcess) {
      isNavigatingRef.current = true;
      const categoriesList = categories.map((c) => ({ id: c.id, name: c.name }));
      const parsed = parseVoiceInput(textToProcess, categoriesList, undefined, budgets, transactions);
      
      if (parsed && parsed.length > 0) {
        // Merge with any existing transactions passed from VoiceVerify
        // Always use replace to keep a flat navigation stack
        const merged = [...existingTransactions, ...parsed];
        navigation.replace("VoiceVerify", { parsedTransactions: merged, rawText: textToProcess });
        return;
      } else {
        // Fallback: create draft transaction with transcribed description so user input is never lost
        const fallbackTx: ParsedTransaction = {
          amount: 0,
          type: "expense",
          description: textToProcess,
          date: new Date(),
          confidence: 0.5,
          rawText: textToProcess,
        };
        const merged = [...existingTransactions, fallbackTx];
        navigation.replace("VoiceVerify", { parsedTransactions: merged, rawText: textToProcess });
        return;
      }
    }
    
    if (existingTransactions.length > 0) {
      isNavigatingRef.current = true;
      navigation.replace("VoiceVerify", { parsedTransactions: existingTransactions });
    } else {
      isNavigatingRef.current = true;
      navigation.goBack();
    }
  };

  const clearSilenceTimeout = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  };

  const resetSilenceTimeout = (durationMs = SILENCE_TIMEOUT_MS) => {
    clearSilenceTimeout();
    silenceTimeoutRef.current = setTimeout(() => {
      handleStop();
    }, durationMs);
  };

  useSpeechRecognitionEvent("start", () => {
    setIsListening(true);
    resetSilenceTimeout(INITIAL_SILENCE_TIMEOUT_MS);
  });
  
  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
    clearSilenceTimeout();
    stopAnimations();
    if (transcriptRef.current.trim()) {
      processTranscript(transcriptRef.current);
    }
  });

  useSpeechRecognitionEvent("result", (event) => {
    const incomingRaw = event.results[0]?.transcript || "";
    const incoming = incomingRaw.trim();
    if (!incoming) {
      // Do not wipe or reset state if recognizer emits an empty result
      return;
    }

    const isFinal = Boolean(event.isFinal);
    const finalized = finalizedSegmentsRef.current.trim();

    // Determine if incoming transcript is cumulative (iOS / some engines where whole speech is returned)
    // or segmented (Android continuous EXTRA_SEGMENTED_SESSION where each segment returns only new words)
    const normalizedFinal = finalized.replace(/[.,!?:;،؟\s]+$/, "").trim();
    const isCumulative =
      normalizedFinal.length > 0 &&
      (incoming.startsWith(finalized) ||
        incoming.startsWith(normalizedFinal) ||
        incoming.toLowerCase().startsWith(normalizedFinal.toLowerCase()));

    let currentFullText = "";

    if (isCumulative) {
      // Cumulative stream: incoming already contains previous speech
      currentFullText = incoming;
      if (isFinal) {
        finalizedSegmentsRef.current = incoming;
        interimSegmentRef.current = "";
      } else {
        interimSegmentRef.current = incoming;
      }
    } else {
      // Segmented stream: incoming covers only the new segment and must be appended to finalized speech
      if (isFinal) {
        const updatedFinalized = finalized ? `${finalized} ${incoming}` : incoming;
        finalizedSegmentsRef.current = updatedFinalized;
        interimSegmentRef.current = "";
        currentFullText = updatedFinalized;
      } else {
        interimSegmentRef.current = incoming;
        currentFullText = finalized ? `${finalized} ${incoming}` : incoming;
      }
    }

    transcriptRef.current = currentFullText;
    setTranscript(currentFullText);

    // Reset silence timeout whenever we receive new recognized speech
    resetSilenceTimeout(SILENCE_TIMEOUT_MS);
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.warn("Speech recognition error:", event.error, event.message);

    // If speech was already captured, do not discard it on error (e.g. timeout or network)
    if (transcriptRef.current.trim()) {
      setIsListening(false);
      clearSilenceTimeout();
      stopAnimations();
      processTranscript(transcriptRef.current);
      return;
    }

    // If online recognition failed due to network before any speech, fallback to on-device offline recognition
    if (event.error === "network" && !isOffline) {
      setIsOffline(true);
      try {
        ExpoSpeechRecognitionModule.start({
          lang: "ar-EG",
          interimResults: true,
          maxAlternatives: 1,
          continuous: true,
          requiresOnDeviceRecognition: true,
          addsPunctuation: true,
          androidIntentOptions: {
            EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,
            EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,
            EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 30000,
          },
        });
        return;
      } catch (err) {
        console.warn("Fallback on-device speech recognition failed:", err);
      }
    }
    setIsListening(false);
    clearSilenceTimeout();
    stopAnimations();
  });

  const startAnimations = () => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    barHeights.forEach((bar, i) => {
      bar.value = withRepeat(
        withSequence(
          withDelay(
            i * 100,
            withTiming(24 + Math.random() * 24, { duration: 400 })
          ),
          withTiming(8, { duration: 400 })
        ),
        -1,
        true
      );
    });
  };

  const stopAnimations = () => {
    cancelAnimation(pulseAnim);
    pulseAnim.value = withTiming(1);
    barHeights.forEach((bar) => {
      cancelAnimation(bar);
      bar.value = withTiming(8);
    });
  };

  const startListening = useCallback(async () => {
    try {
      const netInfo = await NetInfo.fetch();
      const offline = !netInfo.isConnected;
      setIsOffline(offline);

      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        return;
      }

      setTranscript("");
      transcriptRef.current = "";
      finalizedSegmentsRef.current = "";
      interimSegmentRef.current = "";
      isNavigatingRef.current = false;
      
      startAnimations();

      ExpoSpeechRecognitionModule.start({
        lang: "ar-EG",
        interimResults: true,
        maxAlternatives: 1,
        continuous: true,
        requiresOnDeviceRecognition: offline,
        addsPunctuation: true,
        androidIntentOptions: {
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,
          EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 30000,
        },
      });
    } catch (error) {
      console.error("[VoiceInput] Start error:", error);
      stopAnimations();
      setIsListening(false);
    }
  }, []);

  useEffect(() => {
    startListening();
    return () => {
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch (e) {}
      stopAnimations();
      clearSilenceTimeout();
    };
  }, [startListening]);

  const handleStop = async () => {
    clearSilenceTimeout();
    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch (e) {}
    processTranscript(transcriptRef.current);
  };

  const handleContentPress = () => {
    if (isListening) {
      handleStop();
    } else {
      if (transcriptRef.current.trim()) {
        processTranscript(transcriptRef.current);
      } else {
        startListening();
      }
    }
  };

  const ringAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
    opacity: 1.2 - pulseAnim.value,
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            isNavigatingRef.current = true;
            transcriptRef.current = "";
            finalizedSegmentsRef.current = "";
            interimSegmentRef.current = "";
            clearSilenceTimeout();
            try {
              ExpoSpeechRecognitionModule.stop();
            } catch (e) {}
            if (existingTransactions.length > 0) {
              navigation.replace("VoiceVerify", { parsedTransactions: existingTransactions });
            } else {
              navigation.goBack();
            }
          }}
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
          {barHeights.map((heightAnim, i) => {
            const barStyle = useAnimatedStyle(() => ({
              height: heightAnim.value,
            }));
            return (
              <Animated.View 
                key={i} 
                style={[styles.audioBar, barStyle, { backgroundColor: colors.primary, opacity: isListening ? 1 : 0.3 }]} 
              />
            );
          })}
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
  audioBar: {
    width: 6,
    borderRadius: 3,
  },
});
