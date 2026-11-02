import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../theme/ThemeProvider";
import { enqueueToast } from "./toastQueue";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface ToastConfig {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
  onDismiss?: () => void;
  replaceKey?: string;
  expiresAt?: number;
}

interface ToastProps {
  toast: ToastConfig;
  onDismiss: (id: string) => void;
  index: number;
  pendingCount?: number;
  inStack?: boolean;
  stacked?: boolean;
}

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

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss, index, pendingCount = 0, inStack = false, stacked = false }) => {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const isFront = !inStack || index === 0;
  const frontRef = useRef(isFront);
  frontRef.current = isFront;
  const mountedRef = useRef(false);
  const dismissedRef = useRef(false);
  const translateY = useRef(new Animated.Value(inStack ? index * 18 + (index === 0 ? -8 : 0) : -8)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(isFront ? 0 : 1)).current;
  const scale = useRef(new Animated.Value(inStack ? 1 - index * 0.04 : 1)).current;
  const motionRef = useRef<Animated.CompositeAnimation | null>(null);
  const dismissalRef = useRef<Animated.CompositeAnimation | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const theme = TOAST_THEME[toast.type];

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      motionRef.current?.stop();
      dismissalRef.current?.stop();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    dismissedRef.current = false;
    dismissalRef.current?.stop();
    motionRef.current = Animated.parallel([
      Animated.timing(translateY, { toValue: inStack ? index * 18 : 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(scale, { toValue: inStack ? 1 - index * 0.04 : 1, duration: 180, useNativeDriver: true }),
    ]);
    motionRef.current.start();
    return () => { motionRef.current?.stop(); };
  }, [index, inStack, toast.message]);

  const handleDismiss = () => {
    if (!frontRef.current || dismissedRef.current || !mountedRef.current) return;
    dismissedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    motionRef.current?.stop();
    dismissalRef.current = Animated.parallel([
      Animated.timing(translateX, { toValue: 32, duration: 160, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]);
    dismissalRef.current.start(({ finished }) => {
      if (!finished || !mountedRef.current || !frontRef.current) return;
      onDismiss(toast.id);
      toast.onDismiss?.();
    });
  };

  useEffect(() => {
    if (!isFront) return;
    const remaining = toast.expiresAt ? Math.max(0, toast.expiresAt - Date.now()) : (toast.duration || 3500);
    timerRef.current = setTimeout(handleDismiss, remaining);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      dismissalRef.current?.stop();
    };
  }, [isFront, toast.id, toast.message, toast.duration, toast.expiresAt]);

  return (
    <Animated.View
      pointerEvents={isFront ? "auto" : "none"}
      accessibilityElementsHidden={!isFront}
      importantForAccessibility={isFront ? "auto" : "no-hide-descendants"}
      style={[
        inStack ? styles.stackedCard : styles.container,
        { zIndex: 10 - index, elevation: inStack ? 12 - index * 4 : 12,
          transform: [{ translateY }, { translateX }, { scale }], opacity,
          top: inStack ? 0 : (Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 50) + 12 },
      ]}>
      <View style={[styles.frontCard, {
        height: stacked || pendingCount > 0 ? 80 : 56,
        backgroundColor: colors.surfaceVariant,
        borderColor: isFront ? theme.border : colors.onSurfaceVariant,
      }]}>
        <TouchableOpacity activeOpacity={0.95} onPress={handleDismiss} style={styles.content}
          disabled={!isFront} accessibilityLabel={toast.message}>
          <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconCircle}>
            <Ionicons name={theme.iconName} size={16} color="#fff" />
          </LinearGradient>
          <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>
          <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss} disabled={!isFront}
            accessibilityLabel="Dismiss notification" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={16} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </TouchableOpacity>
        {pendingCount > 0 && (
          <Text style={styles.stackCount}>
            {pendingCount + (pendingCount === 1 ? " more notification" : " more notifications")}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  frontCard: {
    borderRadius: 16,
    borderWidth: 1,
    // Glass background
    backgroundColor: "rgba(20,20,50,0.85)",
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  stackedCard: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  stackCount: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: "500",
    paddingHorizontal: 16,
    height: 24,
    lineHeight: 16,
    paddingBottom: 8,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    paddingVertical: 8,
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

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  if (toasts.length === 0) return null;
  const cards = toasts.slice(0, 3).map((toast, index) => ({ toast, index })).reverse();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={[styles.container, {
        top: Math.max(insets.top, Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 0) + 12,
        height: 116,
      }]} pointerEvents="box-none">
        {cards.map(({ toast, index }) => (
          <Toast key={toast.id} toast={toast} onDismiss={onDismiss} index={index}
            pendingCount={index === 0 ? toasts.length - 1 : 0} inStack stacked={toasts.length > 1} />
        ))}
      </View>
    </View>
  );
};

// ── useToast Hook ────────────────────────────────────────────────────
export const useToast = () => {
  const [toasts, setToasts] = React.useState<ToastConfig[]>([]);

  const showToast = React.useCallback((
    message: string,
    type: ToastConfig["type"] = "info",
    duration?: number,
    onDismiss?: () => void,
    replaceKey?: string,
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => enqueueToast(prev,
      { id, message, type, duration: duration || 3500, onDismiss, replaceKey,
        expiresAt: replaceKey ? Date.now() + (duration || 3500) : undefined },
    ));
  }, []);

  const showSuccess = (
    message: string,
    duration?: number,
    onDismiss?: () => void,
    replaceKey?: string,
  ) => showToast(message, "success", duration, onDismiss, replaceKey);

  const showError = (
    message: string,
    duration?: number,
    onDismiss?: () => void,
    replaceKey?: string,
  ) => showToast(message, "error", duration, onDismiss, replaceKey);

  const showWarning = (
    message: string,
    duration?: number,
    onDismiss?: () => void,
    replaceKey?: string,
  ) => showToast(message, "warning", duration, onDismiss, replaceKey);

  const showInfo = (
    message: string,
    duration?: number,
    onDismiss?: () => void,
    replaceKey?: string,
  ) => showToast(message, "info", duration, onDismiss, replaceKey);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id && (!t.expiresAt || t.expiresAt > Date.now())));
  }, []);

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
