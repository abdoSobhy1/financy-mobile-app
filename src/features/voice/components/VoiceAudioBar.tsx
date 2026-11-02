import { StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";

interface VoiceAudioBarProps {
  height: SharedValue<number>;
  color: string;
  listening: boolean;
}

export function VoiceAudioBar({ height, color, listening }: VoiceAudioBarProps) {
  const animatedStyle = useAnimatedStyle(() => ({ height: height.value }));

  return (
    <Animated.View
      style={[
        styles.bar,
        animatedStyle,
        { backgroundColor: color, opacity: listening ? 1 : 0.3 },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    width: 6,
    borderRadius: 3,
  },
});
