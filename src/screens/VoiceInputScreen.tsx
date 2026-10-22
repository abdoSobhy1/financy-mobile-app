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
import { TransactionStackParamList } from "../types";
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
const SILENCE_TIMEOUT_MS = 3000;

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
  const isNavigatingRef = useRef(false);
  const silenceTimeoutRef = useRef<any>(null);

  // Animation values
  const pulseAnim = useSharedValue(1);
  const barHeights = Array(NUM_BARS).fill(0).map(() => useSharedValue(8));

  const processTranscript = async (finalTranscript: string) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    
    stopAnimations();
    clearSilenceTimeout();
    
    if (finalTranscript.trim()) {
      const categoriesList = categories.map((c) => ({ id: c.id, name: c.name }));
      const parsed = parseVoiceInput(finalTranscript, categoriesList, undefined, budgets, transactions);
      
      if (parsed && parsed.length > 0) {
        // Merge with any existing transactions passed from VoiceVerify
        // Always use replace to keep a flat navigation stack
        const merged = [...existingTransactions, ...parsed];
        navigation.replace("VoiceVerify", { parsedTransactions: merged });
        return;
      }
    }
    
    if (existingTransactions.length > 0) {
      navigation.replace("VoiceVerify", { parsedTransactions: existingTransactions });
    } else {
      navigation.goBack();
    }
  };

  const clearSilenceTimeout = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  };

  const resetSilenceTimeout = () => {
    clearSilenceTimeout();
    silenceTimeoutRef.current = setTimeout(() => {
      handleStop();
    }, SILENCE_TIMEOUT_MS);
  };

  useSpeechRecognitionEvent("start", () => {
    setIsListening(true);
    resetSilenceTimeout();
  });
  
  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
    clearSilenceTimeout();
    if (transcriptRef.current) {
      processTranscript(transcriptRef.current);
    }
  });

  useSpeechRecognitionEvent("result", (event) => {
    const text = event.results[0]?.transcript || "";
    setTranscript(text);
    transcriptRef.current = text;
    // Reset silence timeout whenever we get a new result
    resetSilenceTimeout();
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.warn("Speech recognition error:", event.error, event.message);
    // If online recognition failed due to network, fallback to on-device offline recognition
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
        });
        return;
      } catch (err) {
        console.warn("Fallback on-device speech recognition failed:", err);
      }
    }
    setIsListening(false);
    clearSilenceTimeout();
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
      
      startAnimations();

      ExpoSpeechRecognitionModule.start({
        lang: "ar-EG",
        interimResults: true,
        maxAlternatives: 1,
        continuous: true,
        requiresOnDeviceRecognition: offline,
        addsPunctuation: true,
      });
    } catch (error) {
      console.error("[VoiceInput] Start error:", error);
      stopAnimations();
    }
  }, []);

  useEffect(() => {
    startListening();
    return () => {
      ExpoSpeechRecognitionModule.stop();
      stopAnimations();
      clearSilenceTimeout();
    };
  }, [startListening]);

  const handleStop = async () => {
    ExpoSpeechRecognitionModule.stop();
    processTranscript(transcriptRef.current);
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
            clearSilenceTimeout();
            ExpoSpeechRecognitionModule.stop();
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
        onPress={handleStop}
      >
        <View style={styles.micWrapper}>
          <Animated.View style={[styles.pulseRing, { borderColor: colors.primaryContainer, backgroundColor: colors.primaryContainer + "33" }, ringAnimStyle]} />
          <View style={[styles.micCircle, { backgroundColor: colors.primaryContainer, shadowColor: colors.primaryContainer }]}>
            <Ionicons name="mic" size={40} color={colors.onPrimaryContainer} />
          </View>
        </View>

        <Text style={[typography.h3, { color: colors.onBackground, marginBottom: 8 }]}>
          {isOffline ? "Listening (Offline • العربية)" : "Listening (العربية)..."}
        </Text>
        <Text style={[typography.caption, { color: colors.onSurfaceVariant, marginBottom: 20 }]}>
          {isOffline ? "On-device Arabic speech recognition active" : "Speak your transaction in Arabic (e.g. صرفت 150 قهوة)"}
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
          Tap anywhere to stop
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
