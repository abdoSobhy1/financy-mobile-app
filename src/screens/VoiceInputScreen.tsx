import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
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
import { TransactionRepository } from "../database/queries/transactions";

type NavigationProp = StackNavigationProp<TransactionStackParamList>;
const NUM_BARS = 5;

export const VoiceInputScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors, typography } = useAppTheme();
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isOffline, setIsOffline] = useState(false);

  const categories = useSelector(selectAllCategories);
  const transcriptRef = useRef("");
  const isNavigatingRef = useRef(false);

  // Animation values
  const pulseAnim = useSharedValue(1);
  const barHeights = Array(NUM_BARS).fill(0).map(() => useSharedValue(4));

  const processTranscript = async (finalTranscript: string) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    
    stopAnimations();
    
    if (finalTranscript.trim()) {
      const categoriesList = categories.map((c) => ({ id: c.id, name: c.name }));
      const parsed = parseVoiceInput(finalTranscript, categoriesList);
      
      if (parsed && parsed.length > 0) {
        navigation.replace("VoiceVerify", { parsedTransactions: parsed });
        return;
      }
    }
    
    navigation.goBack();
  };

  useSpeechRecognitionEvent("start", () => setIsListening(true));
  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
    if (transcriptRef.current) {
      processTranscript(transcriptRef.current);
    }
  });
  useSpeechRecognitionEvent("result", (event) => {
    const text = event.results[0]?.transcript || "";
    setTranscript(text);
    transcriptRef.current = text;
  });
  useSpeechRecognitionEvent("error", (event) => {
    console.warn("Speech recognition error:", event.error, event.message);
    setIsListening(false);
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
      bar.value = withTiming(4);
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
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color={colors.onBackground} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.content} 
        activeOpacity={1} 
        onPress={handleStop}
      >
        <View style={styles.micWrapper}>
          <Animated.View style={[styles.pulseRing, { borderColor: "#A5F3FC" }, ringAnimStyle]} />
          <View style={[styles.micCircle, { backgroundColor: "#A5F3FC" }]}>
            <Ionicons name="mic" size={40} color="#164E63" />
          </View>
        </View>

        <Text style={[typography.h2, styles.statusText, { color: colors.onBackground }]}>
          {isOffline ? "Offline" : "Listening..."}
        </Text>

        <Text style={[typography.bodyLarge, styles.transcript, { color: colors.onSurfaceVariant }]}>
          {transcript ? `"${transcript}"` : ""}
        </Text>

        {!isOffline && (
          <View style={styles.waveform}>
            {barHeights.map((bar, i) => {
              const barStyle = useAnimatedStyle(() => ({
                height: bar.value,
              }));
              return (
                <Animated.View 
                  key={i} 
                  style={[styles.waveBar, { backgroundColor: "#7DD3FC" }, barStyle]} 
                />
              );
            })}
          </View>
        )}

        <Text style={[typography.bodyMedium, styles.footerText, { color: colors.onSurfaceVariant }]}>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: "flex-start",
  },
  closeBtn: {
    padding: 8,
    marginLeft: -8,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  micWrapper: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  pulseRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
  },
  micCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#A5F3FC",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  statusText: {
    marginBottom: 16,
    fontWeight: "600",
  },
  transcript: {
    textAlign: "center",
    minHeight: 60,
    marginBottom: 40,
    fontStyle: "italic",
  },
  waveform: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 60,
    marginBottom: 60,
  },
  waveBar: {
    width: 6,
    borderRadius: 3,
  },
  footerText: {
    position: "absolute",
    bottom: 50,
    opacity: 0.7,
  }
});
