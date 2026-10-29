import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "./ThemeProvider";

export interface ToastConfig {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
  onDismiss?: () => void;
}

interface ToastProps {
  toast: ToastConfig;
  onDismiss: (id: string) => void;
  index: number;
}

const { width } = Dimensions.get("window");

// ── Color palette per type ───────────────────────────────────────────
const TOAST_THEME: Record<
  ToastConfig["type"],
  {
    gradient: [string, string];
    bg: string;
    border: string;
    icon: string;
    iconName: keyof typeof Ionicons.glyphMap;
  }
> = {
  success: {
    gradient: ["#2ED573", "#1B9C4F"],
    bg: "rgba(46,213,115,0.06)",
    border: "rgba(46,213,115,0.25)",
    icon: "#2ED573",
    iconName: "checkmark-circle",
  },
  error: {
    gradient: ["#FF6B6B", "#EE5A24"],
    bg: "rgba(255,107,107,0.06)",
    border: "rgba(255,107,107,0.25)",
    icon: "#FF6B6B",
    iconName: "alert-circle",
  },
  warning: {
    gradient: ["#F59E0B", "#D97706"],
    bg: "rgba(245,158,11,0.06)",
    border: "rgba(245,158,11,0.25)",
    icon: "#F59E0B",
    iconName: "warning",
  },
  info: {
    gradient: ["#6C5CE7", "#A29BFE"],
    bg: "rgba(108,92,231,0.06)",
    border: "rgba(108,92,231,0.25)",
    icon: "#A29BFE",
    iconName: "information-circle",
  },
};

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss, index }) => {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const translateY = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const dismissedRef = useRef(false);

  const theme = TOAST_THEME[toast.type];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
    ]).start();

    const timer = setTimeout(() => {
      handleDismiss();
    }, toast.duration || 3500);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -60,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.85,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(toast.id);
      toast.onDismiss?.();
    });
  };

  const topOffset =
    (Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 50) +
    12 +
    index * 76;

  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceVariant,
          borderColor: theme.border,
          transform: [{ translateY }, { scale }],
          opacity,
          top: topOffset,
        },
      ]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleDismiss}
        style={styles.content}>
        {/* Gradient icon circle */}
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconCircle}>
          <Ionicons name={theme.iconName} size={16} color="#fff" />
        </LinearGradient>

        {/* Message */}
        <Text style={styles.message} numberOfLines={2}>
          {toast.message}
        </Text>

        {/* Dismiss */}
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={14} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 16,
    borderWidth: 1,
    // Glass background
    backgroundColor: "rgba(20,20,50,0.85)",
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.onBackground,
    lineHeight: 20,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
});

// ── Toast Container ──────────────────────────────────────────────────
interface ToastContainerProps {
  toasts: ToastConfig[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          index={index}
        />
      ))}
    </View>
  );
};

// ── useToast Hook ────────────────────────────────────────────────────
export const useToast = () => {
  const [toasts, setToasts] = React.useState<ToastConfig[]>([]);

  const showToast = (
    message: string,
    type: ToastConfig["type"] = "info",
    duration?: number,
    onDismiss?: () => void,
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [
      ...prev,
      { id, message, type, duration: duration || 3500, onDismiss },
    ]);
  };

  const showSuccess = (
    message: string,
    duration?: number,
    onDismiss?: () => void,
  ) => showToast(message, "success", duration, onDismiss);

  const showError = (
    message: string,
    duration?: number,
    onDismiss?: () => void,
  ) => showToast(message, "error", duration, onDismiss);

  const showWarning = (
    message: string,
    duration?: number,
    onDismiss?: () => void,
  ) => showToast(message, "warning", duration, onDismiss);

  const showInfo = (
    message: string,
    duration?: number,
    onDismiss?: () => void,
  ) => showToast(message, "info", duration, onDismiss);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const clearAllToasts = () => setToasts([]);

  const ToastComponent = () => {
    if (toasts.length === 0) return null;
    return (
      <View
        style={[StyleSheet.absoluteFill, { zIndex: 99999, elevation: 999 }]}
        pointerEvents="box-none">
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </View>
    );
  };

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismissToast,
    clearAllToasts,
    toasts,
    ToastComponent,
  };
};
