import React, { createContext, useContext, ReactNode, useEffect, useId, useSyncExternalStore } from "react";
import { View, StyleSheet } from "react-native";
import { ToastConfig, ToastContainer, useToast as useToastHook } from "./Toast";
import { toastHosts } from "./toastHosts";

type ShowToast = (message: string, type?: ToastConfig["type"], duration?: number, onDismiss?: () => void, replaceKey?: string) => void;
type ShowVariant = (message: string, duration?: number, onDismiss?: () => void, replaceKey?: string) => void;
let _showToast: ShowToast | null = null;

export const ToastService = {
  register(fn: ShowToast | null) {
    _showToast = fn;
  },
  show(message: string, type: "success" | "error" | "info" | "warning" = "info", duration?: number, replaceKey?: string) {
    if (_showToast) {
      _showToast(message, type, duration, undefined, replaceKey);
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
  showToast: ShowToast;
  showSuccess: ShowVariant;
  showError: ShowVariant;
  showWarning: ShowVariant;
  showInfo: ShowVariant;
  clearAllToasts: () => void;
  ToastComponent: React.FC;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastOverlay: React.FC<{ visible?: boolean; priority?: number }> = ({ visible = true, priority = 0 }) => {
  const context = useContext(ToastContext);
  const hostId = useId();
  const activeHost = useSyncExternalStore(toastHosts.subscribe, toastHosts.getActive, toastHosts.getActive);
  useEffect(() => visible ? toastHosts.register(hostId, priority) : undefined, [hostId, priority, visible]);
  if (!visible || activeHost !== hostId || !context || context.toasts.length === 0) return null;
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
