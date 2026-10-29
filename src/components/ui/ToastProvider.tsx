import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { ToastConfig, ToastContainer, useToast as useToastHook } from "./Toast";

let _showToast: ((message: string, type?: "success" | "error" | "info" | "warning", duration?: number) => void) | null = null;

export const ToastService = {
  register(fn: ((message: string, type?: "success" | "error" | "info" | "warning", duration?: number) => void) | null) {
    _showToast = fn;
  },
  show(message: string, type: "success" | "error" | "info" | "warning" = "info", duration?: number) {
    if (_showToast) {
      _showToast(message, type, duration);
    } else {
      console.log(`[ToastService] (${type}) ${message}`);
    }
  },
  showSuccess(message: string, duration?: number) {
    this.show(message, "success", duration);
  },
  showError(message: string, duration?: number) {
    this.show(message, "error", duration);
  },
  showInfo(message: string, duration?: number) {
    this.show(message, "info", duration);
  },
  showWarning(message: string, duration?: number) {
    this.show(message, "warning", duration);
  },
};

export interface ToastContextType {
  toasts: ToastConfig[];
  dismissToast: (id: string) => void;
  showToast: (message: string, type?: "success" | "error" | "info" | "warning", duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  clearAllToasts: () => void;
  ToastComponent: React.FC;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastOverlay: React.FC = () => {
  const context = useContext(ToastContext);
  if (!context || !context.toasts || context.toasts.length === 0) return null;
  return (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: 99999, elevation: 999 }]}
      pointerEvents="box-none">
      <ToastContainer toasts={context.toasts} onDismiss={context.dismissToast} />
    </View>
  );
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAllToasts,
    dismissToast,
    toasts,
    ToastComponent,
  } = useToastHook();

  useEffect(() => {
    ToastService.register(showToast);
    return () => {
      ToastService.register(null);
    };
  }, [showToast]);

  const contextValue: ToastContextType = {
    toasts,
    dismissToast,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAllToasts,
    ToastComponent,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      <View style={styles.container} pointerEvents="box-none">
        {children}
        <ToastOverlay />
      </View>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    return {
      toasts: [],
      dismissToast: () => {},
      showToast: () => {},
      showSuccess: () => {},
      showError: () => {},
      showWarning: () => {},
      showInfo: () => {},
      clearAllToasts: () => {},
      ToastComponent: () => null,
    };
  }
  return context;
};
