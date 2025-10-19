import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../constants";

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

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss, index }) => {
  const translateY = useRef(new Animated.Value(100)).current; // Start from below
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    const timer = setTimeout(() => {
      handleDismiss();
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100, // Slide down when dismissing
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(toast.id);
      toast.onDismiss?.();
    });
  };

  const getToastStyle = () => {
    switch (toast.type) {
      case "success":
        return styles.successToast;
      case "error":
        return styles.errorToast;
      case "warning":
        return styles.warningToast;
      case "info":
      default:
        return styles.infoToast;
    }
  };

  const getIconName = () => {
    switch (toast.type) {
      case "success":
        return "checkmark-circle";
      case "error":
        return "alert-circle";
      case "warning":
        return "warning";
      case "info":
      default:
        return "information-circle";
    }
  };

  const getIconColor = () => {
    switch (toast.type) {
      case "success":
        return UI.COLORS.SUCCESS;
      case "error":
        return UI.COLORS.ERROR;
      case "warning":
        return UI.COLORS.WARNING;
      case "info":
      default:
        return UI.COLORS.PRIMARY;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        getToastStyle(),
        {
          transform: [{ translateY }],
          opacity,
          bottom: 100 + index * 80, // Stack multiple toasts from bottom
        },
      ]}>
      <View style={styles.content}>
        <Ionicons name={getIconName()} size={20} color={getIconColor()} style={styles.icon} />
        <Text style={styles.message} numberOfLines={2}>
          {toast.message}
        </Text>
        <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={16} color={UI.COLORS.TEXT_SECONDARY} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: UI.SPACING.MD,
    right: UI.SPACING.MD,
    zIndex: 9999,
    borderRadius: UI.CARD_RADIUS,
    backgroundColor: UI.COLORS.SURFACE,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: UI.SPACING.MD,
    paddingHorizontal: UI.SPACING.LG,
  },
  icon: {
    marginRight: UI.SPACING.SM,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: UI.COLORS.TEXT_PRIMARY,
    fontWeight: "500",
    lineHeight: 20,
  },
  dismissButton: {
    marginLeft: UI.SPACING.SM,
    padding: UI.SPACING.XS,
  },
  successToast: {
    borderLeftWidth: 4,
    borderLeftColor: UI.COLORS.SUCCESS,
  },
  errorToast: {
    borderLeftWidth: 4,
    borderLeftColor: UI.COLORS.ERROR,
  },
  warningToast: {
    borderLeftWidth: 4,
    borderLeftColor: UI.COLORS.WARNING,
  },
  infoToast: {
    borderLeftWidth: 4,
    borderLeftColor: UI.COLORS.PRIMARY,
  },
});

// Toast Container Component
interface ToastContainerProps {
  toasts: ToastConfig[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {toasts.map((toast, index) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} index={index} />
      ))}
    </View>
  );
};

// Hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = React.useState<ToastConfig[]>([]);

  const showToast = (message: string, type: ToastConfig["type"] = "info", duration?: number, onDismiss?: () => void) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastConfig = {
      id,
      message,
      type,
      duration: duration || 4000,
      onDismiss,
    };

    setToasts((prev) => [...prev, newToast]);
  };

  const showSuccess = (message: string, duration?: number, onDismiss?: () => void) => {
    showToast(message, "success", duration, onDismiss);
  };

  const showError = (message: string, duration?: number, onDismiss?: () => void) => {
    showToast(message, "error", duration, onDismiss);
  };

  const showWarning = (message: string, duration?: number, onDismiss?: () => void) => {
    showToast(message, "warning", duration, onDismiss);
  };

  const showInfo = (message: string, duration?: number, onDismiss?: () => void) => {
    showToast(message, "info", duration, onDismiss);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  const ToastComponent = () => <ToastContainer toasts={toasts} onDismiss={dismissToast} />;

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
