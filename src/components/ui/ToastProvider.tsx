import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { ToastContainer, useToast as useToastHook } from "./Toast";

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

interface ToastContextType {
  showToast: (message: string, type?: "success" | "error" | "info" | "warning", duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const { showToast, showSuccess, showError, showWarning, showInfo, clearAllToasts, ToastComponent } = useToastHook();

  useEffect(() => {
    ToastService.register(showToast);
    return () => {
      ToastService.register(null);
    };
  }, [showToast]);

  const contextValue: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAllToasts,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastComponent />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
