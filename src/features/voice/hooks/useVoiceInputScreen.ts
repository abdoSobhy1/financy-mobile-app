import { useState, useCallback, useRef, useEffect } from "react";

import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { TransactionStackParamList, ParsedTransaction } from "../../../shared/types";

import { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing, cancelAnimation, withDelay } from "react-native-reanimated";
import NetInfo from "@react-native-community/netinfo";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "@jamsch/expo-speech-recognition";
import { parseVoiceInput } from "../services/voiceParser";
import { useSelector } from "react-redux";
import { selectAllCategories } from "../../categories/store/categoriesSlice";
import { RootState } from "../../../app/store";

type NavigationProp = StackNavigationProp<TransactionStackParamList>;

type VoiceInputRouteProp = RouteProp<TransactionStackParamList, "VoiceInput">;

const SILENCE_TIMEOUT_MS = 4500;

const INITIAL_SILENCE_TIMEOUT_MS = 10000;

/** Owns screen state and actions; rendering stays in VoiceInputScreen. */
export function useVoiceInputScreen() {

  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<VoiceInputRouteProp>();
  const existingTransactions = (route.params as any)?.existingTransactions || [];

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
  const firstBar = useSharedValue(8);
  const secondBar = useSharedValue(8);
  const thirdBar = useSharedValue(8);
  const fourthBar = useSharedValue(8);
  const fifthBar = useSharedValue(8);
  const barHeights = [firstBar, secondBar, thirdBar, fourthBar, fifthBar];

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
      } catch (e) { }
      stopAnimations();
      clearSilenceTimeout();
    };
  }, [startListening]);

  const handleStop = async () => {
    clearSilenceTimeout();
    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch (e) { }
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
  const handleClose = () => {
    isNavigatingRef.current = true;
    transcriptRef.current = "";
    finalizedSegmentsRef.current = "";
    interimSegmentRef.current = "";
    clearSilenceTimeout();
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (e) { }
    if (existingTransactions.length > 0) {
      navigation.replace("VoiceVerify", { parsedTransactions: existingTransactions });
    } else {
      navigation.goBack();
    }
  };

  return {
    handleClose,
    isListening,
    transcript,
    isOffline,
    barHeights,
    handleContentPress,
    ringAnimStyle
  };
}

export type VoiceInputScreenController = ReturnType<typeof useVoiceInputScreen>;
