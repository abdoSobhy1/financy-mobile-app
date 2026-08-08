/**
 * AlertService — drop-in replacement for React Native's Alert.
 *
 * Usage (identical to Alert.alert):
 *   AlertService.alert("Title", "Message", [{ text: "OK" }]);
 *
 * The singleton ref is wired up by <GlobalAlertProvider> in App.tsx.
 */

export type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

type ShowAlertFn = (
  title: string,
  message?: string,
  buttons?: AlertButton[]
) => void;

let _showAlert: ShowAlertFn | null = null;

export const AlertService = {
  /** Called once by <GlobalAlertProvider> to register the imperative handler. */
  register(fn: ShowAlertFn) {
    _showAlert = fn;
  },

  /**
   * Show an in-app alert.  Falls back to console.warn if the provider isn't
   * mounted yet (e.g. during server-side rendering / tests).
   */
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    if (_showAlert) {
      _showAlert(title, message, buttons);
    } else {
      console.warn(`[AlertService] ${title}: ${message}`);
    }
  },
};
