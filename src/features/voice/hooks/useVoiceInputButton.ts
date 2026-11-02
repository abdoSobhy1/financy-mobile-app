import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";

import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "@jamsch/expo-speech-recognition";

import { ParsedTransaction } from "../../../shared/types";
import { parseVoiceInput } from "../services/voiceParser";

import NetInfo from "@react-native-community/netinfo";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, withDelay, Easing, cancelAnimation } from "react-native-reanimated";
import { useSelector } from "react-redux";
import { selectAllCategories } from "../../categories/store/categoriesSlice";
import { TransactionRepository } from "../../transactions/repositories/transactionsRepository";
const MAX_RECORDING_MS = 60_000;
const NUM_BARS = 7;
interface VoiceInputButtonProps {
  onResult: (parsed: ParsedTransaction[]) => void;
  size?: number;
  style?: any;
  variant?: "fab" | "button" | "custom";
  title?: string;
  children?: React.ReactNode;
}
export function useVoiceInputButton({
  onResult,
  size = 56,
  style,
  variant = "fab",
  title = "Voice Input",
  children,
}: VoiceInputButtonProps) {

  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(false);
  const [transcript, setTranscript] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [isOffline, setIsOffline] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<string>("");
  const finalizedSegmentsRef = useRef<string>("");
  const interimSegmentRef = useRef<string>("");
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
      transcriptRef.current = "";
      finalizedSegmentsRef.current = "";
      interimSegmentRef.current = "";
    },
    [categories, lastCategoryId, onResult],
  );

  // Speech recognition events
  useSpeechRecognitionEvent("result", (event) => {
    const incomingRaw = event.results[0]?.transcript ?? "";
    const incoming = incomingRaw.trim();
    if (!incoming) return;

    const isFinal = Boolean(event.isFinal);
    const finalized = finalizedSegmentsRef.current.trim();

    const normalizedFinal = finalized.replace(/[.,!?:;،؟\s]+$/, "").trim();
    const isCumulative =
      normalizedFinal.length > 0 &&
      (incoming.startsWith(finalized) ||
        incoming.startsWith(normalizedFinal) ||
        incoming.toLowerCase().startsWith(normalizedFinal.toLowerCase()));

    let currentFullText = "";

    if (isCumulative) {
      currentFullText = incoming;
      if (isFinal) {
        finalizedSegmentsRef.current = incoming;
        interimSegmentRef.current = "";
      } else {
        interimSegmentRef.current = incoming;
      }
    } else {
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

    // Clear existing silence timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    // Set new silence timer (buffer before stopping)
    silenceTimerRef.current = setTimeout(() => {
      if (isListeningRef.current && currentFullText.trim()) {
        finishRecording(currentFullText);
      }
    }, 4000);
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.warn("[VoiceInput] Error:", event.error, event.message);
    const textToFinish = transcriptRef.current.trim();
    if (textToFinish) {
      finishRecording(textToFinish);
      return;
    }
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
      bottomSheetRef.current?.present();

      // Check for internet connection first
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        setIsOffline(true);
        setIsListening(true);
        isListeningRef.current = true;
        return;
      }

      const result =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        console.warn("[VoiceInput] Permission denied");
        setIsListening(false);
        isListeningRef.current = false;
        return;
      }

      setTranscript("");
      transcriptRef.current = "";
      finalizedSegmentsRef.current = "";
      interimSegmentRef.current = "";
      setTimeLeft(60);
      setIsOffline(false);
      setIsListening(true);
      isListeningRef.current = true;

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
        androidIntentOptions: {
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,
          EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 30000,
        },
      });
    } catch (error) {
      console.error("[VoiceInput] Start error:", error);
      setIsListening(false);
      isListeningRef.current = false;
      // Don't dismiss, let user see it failed or just keep the modal open with default state
    }
  }, []);

  const stopListening = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Process the transcript before stopping
    const textToFinish = transcriptRef.current.trim();
    if (textToFinish) {
      finishRecording(textToFinish);
    } else {
      ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
      isListeningRef.current = false;
      bottomSheetRef.current?.dismiss();
    }
  }, [finishRecording]);

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
  return { transcript, timeLeft, isOffline, bottomSheetRef, snapPoints, barHeights, stopListening, handlePress, handleSheetChange, fabAnimStyle, ringAnimStyle };
}
