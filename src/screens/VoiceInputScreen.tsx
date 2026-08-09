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
import { useNavigation } from "@react-navigation/native";
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
const NUM_BARS = 5;
const SILENCE_TIMEOUT_MS = 3000;

export const VoiceInputScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors, typography } = useAppTheme();
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isOffline, setIsOffline] = useState(false);

  const categories = useSelector(selectAllCategories);
  const budgetsMap = useSelector((state: RootState) => state.budgets.items);
  const budgets = Object.values(budgetsMap);
  
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
      const parsed = parseVoiceInput(finalTranscript, categoriesList, undefined, budgets);
      
      if (parsed && parsed.length > 0) {
        navigation.replace("VoiceVerify", { parsedTransactions: parsed });
        return;
      }
    }
    
    navigation.goBack();
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
      if (!netInfo.isConnected) {
        setIsOffline(true);
        return;
      }

      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        return;
      }

      setTranscript("");
      transcriptRef.current = "";
      setIsOffline(false);
      
      startAnimations();

      ExpoSpeechRecognitionModule.start({
        lang: "ar-EG",
        interimResults: true,
        maxAlternatives: 1,
        continuous: true,
        requiresOnDeviceRecognition: false,
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color="#E4E4E7" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.content} 
        activeOpacity={1} 
        onPress={handleStop}
      >
        <View style={styles.micWrapper}>
          <Animated.View style={[styles.pulseRing, ringAnimStyle]} />
          <View style={styles.micCircle}>
            <Ionicons name="mic" size={40} color="#18181B" />
          </View>
        </View>

        <Text style={styles.statusText}>
          {isOffline ? "Offline" : "Listening..."}
        </Text>
        
        {transcript ? (
          <Text style={styles.transcriptText}>
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
                style={[styles.audioBar, barStyle, { opacity: isListening ? 1 : 0.3 }]} 
              />
            );
          })}
        </View>

        <Text style={styles.instructionText}>
          Tap anywhere to stop
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#18181B", // Dark surface to match popup
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
    borderColor: "#D0F4F0",
    backgroundColor: "rgba(208, 244, 240, 0.2)",
  },
  micCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#D0F4F0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#D0F4F0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#E4E4E7",
    marginBottom: 24,
  },
  transcriptText: {
    fontSize: 18,
    fontWeight: "400",
    color: "#A1A1AA",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 28,
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
    backgroundColor: "#80CAFF", // Light blue matching the image
  },
  instructionText: {
    fontSize: 14,
    color: "#71717A",
    position: "absolute",
    bottom: 60,
  },
});
