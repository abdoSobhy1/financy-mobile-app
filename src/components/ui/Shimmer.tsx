import React, { useEffect, useRef } from "react";
import { Animated, ViewStyle, StyleProp } from "react-native";
import { useAppTheme } from "./ThemeProvider";

interface ShimmerProps {
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  width?: number | string;
  height?: number;
}

export const Shimmer: React.FC<ShimmerProps> = ({
  style,
  borderRadius = 4,
  width,
  height,
}) => {
  const { colors } = useAppTheme();
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.surfaceVariant,
          borderRadius,
          width: width as any,
          height,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
};

export default Shimmer;
