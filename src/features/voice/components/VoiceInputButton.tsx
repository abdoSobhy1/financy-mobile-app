import { styles } from "./VoiceInputButton.styles";
import { useVoiceInputButton } from "../hooks/useVoiceInputButton";
import React, { useCallback } from "react";
import { TouchableOpacity, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { UI } from "../../../shared/constants";
import { ParsedTransaction } from "../../../shared/types";

import { Button } from "../../../shared/ui";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { LinearGradient } from "expo-linear-gradient";

import { BottomSheetBackdrop, BottomSheetView, BottomSheetModal } from "@gorhom/bottom-sheet";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

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

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onResult,
  size = 56,
  style,
  variant = "fab",
  title = "Voice Input",
  children,
}) => {
  const { transcript, timeLeft, isOffline, bottomSheetRef, snapPoints, barHeights, stopListening, handlePress, handleSheetChange, fabAnimStyle, ringAnimStyle } = useVoiceInputButton({ onResult, size, style, variant, title, children });
  const { colors } = useAppTheme();

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
      {variant === "custom" && children ? (
        <TouchableOpacity onPress={handlePress} style={style} activeOpacity={0.7}>
          {children}
        </TouchableOpacity>
      ) : variant === "button" ? (
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
