/**
 * Production-safe logging utility
 * Logs are suppressed in production unless debug mode is enabled
 */

// Check if we're in development mode
const __DEV__ = process.env.NODE_ENV === "development";

// Simple flag that can be toggled for debugging
let debugMode = __DEV__;

export const setDebugMode = (enabled: boolean) => {
  debugMode = enabled;
};

export const getDebugMode = () => debugMode;

// Production-safe logger
export const logger = {
  log: (...args: any[]) => {
    if (debugMode) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    if (debugMode) {
      console.error(...args);
    }
  },
  warn: (...args: any[]) => {
    if (debugMode) {
      console.warn(...args);
    }
  },
  info: (...args: any[]) => {
    if (debugMode) {
      console.info(...args);
    }
  },
};
