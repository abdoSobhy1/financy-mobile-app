/**
 * CustomAlert  — beautiful in-app alert that replaces the OS system dialog.
 *
 * Three exports:
 *  1. <CustomAlert>          – low-level controlled modal (used internally)
 *  2. <GlobalAlertProvider>  – mount once near the root; wires AlertService
 *  3. useCustomAlert()       – hook for local per-screen alert state (legacy)
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "./ThemeProvider";
import { AlertService, AlertButton } from "../../services/AlertService";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomAlertButton extends AlertButton {}

interface AlertConfig {
  visible: boolean;
  title: string;
  message?: string;
  buttons: CustomAlertButton[];
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons: CustomAlertButton[];
  onRequestClose?: () => void;
}

// ─── Presentation component ───────────────────────────────────────────────────

export const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  buttons,
  onRequestClose,
}) => {
  const { colors, typography, spacing } = useAppTheme();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 20,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleButtonPress = (button: CustomAlertButton) => {
    if (onRequestClose) onRequestClose();
    if (button.onPress) setTimeout(() => button.onPress!(), 60);
  };

  const hasDestructive = buttons.some((b) => b.style === "destructive");
  const iconName: any = hasDestructive ? "warning" : "information-circle";
  const iconGradient: [string, string] = hasDestructive
    ? ["#FF6B6B", "#EE5A24"]
    : [colors.primary, colors.primaryContainer];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onRequestClose}>
      <TouchableWithoutFeedback onPress={onRequestClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.outlineVariant,
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                },
              ]}>
              {/* Icon badge */}
              <LinearGradient
                colors={iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconCircle}>
                <Ionicons name={iconName} size={26} color="#fff" />
              </LinearGradient>

              {/* Title */}
              <Text style={[styles.title, { color: colors.onBackground }]}>
                {title}
              </Text>

              {/* Message */}
              {message ? (
                <Text style={[styles.message, { color: colors.onSurfaceVariant }]}>
                  {message}
                </Text>
              ) : null}

              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

              {/* Buttons */}
              <View style={styles.buttonRow}>
                {buttons.map((button, index) => {
                  const isDestructive = button.style === "destructive";
                  const isCancel = button.style === "cancel";
                  const isLast = index === buttons.length - 1;

                  if (isDestructive) {
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[styles.btn, styles.destructiveBtn]}
                        activeOpacity={0.75}
                        onPress={() => handleButtonPress(button)}>
                        <Text style={styles.destructiveBtnText}>{button.text}</Text>
                      </TouchableOpacity>
                    );
                  }

                  if (isCancel) {
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[styles.btn, { borderColor: colors.outlineVariant }]}
                        activeOpacity={0.7}
                        onPress={() => handleButtonPress(button)}>
                        <Text style={[styles.cancelBtnText, { color: colors.onSurfaceVariant }]}>
                          {button.text}
                        </Text>
                      </TouchableOpacity>
                    );
                  }

                  // default / primary
                  return (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.8}
                      onPress={() => handleButtonPress(button)}
                      style={styles.primaryBtnWrapper}>
                      <LinearGradient
                        colors={[colors.primary, colors.primaryContainer]}
                        style={styles.primaryBtn}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}>
                        <Text style={styles.primaryBtnText}>{button.text}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─── GlobalAlertProvider ──────────────────────────────────────────────────────
// Mount this ONCE near the root (in App.tsx / RootNavigator).
// It registers itself with AlertService so AlertService.alert() works anywhere.

export const GlobalAlertProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AlertConfig>({
    visible: false,
    title: "",
    buttons: [],
  });

  const hide = useCallback(() => {
    setConfig((c) => ({ ...c, visible: false }));
  }, []);

  useEffect(() => {
    AlertService.register((title, message, buttons = [{ text: "OK" }]) => {
      setConfig((c) => {
        if (c.visible) {
          // dismiss current then show next
          setTimeout(
            () => setConfig({ visible: true, title, message, buttons }),
            120,
          );
          return { ...c, visible: false };
        }
        return { visible: true, title, message, buttons };
      });
    });
  }, []);

  return (
    <>
      {children}
      <CustomAlert
        visible={config.visible}
        title={config.title}
        message={config.message}
        buttons={config.buttons}
        onRequestClose={hide}
      />
    </>
  );
};

// ─── Legacy per-screen hook ───────────────────────────────────────────────────

export const useCustomAlert = () => {
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: "",
    buttons: [],
  });

  const showAlert = (
    title: string,
    message?: string,
    buttons: CustomAlertButton[] = [{ text: "OK" }],
  ) => {
    if (alertConfig.visible) {
      setAlertConfig((prev) => ({ ...prev, visible: false }));
      setTimeout(() => setAlertConfig({ visible: true, title, message, buttons }), 100);
    } else {
      setAlertConfig({ visible: true, title, message, buttons });
    }
  };

  const hideAlert = () => setAlertConfig((prev) => ({ ...prev, visible: false }));

  const AlertComponent = () => (
    <CustomAlert
      visible={alertConfig.visible}
      title={alertConfig.title}
      message={alertConfig.message}
      buttons={alertConfig.buttons}
      onRequestClose={hideAlert}
    />
  );

  return { showAlert, hideAlert, AlertComponent };
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    paddingTop: 30,
    paddingBottom: 0,
    paddingHorizontal: 0,
    alignItems: "center",
    borderWidth: 1,
    overflow: "hidden",
    // shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 32,
    elevation: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 4,
    paddingHorizontal: 24,
  },
  divider: {
    width: "100%",
    height: 1,
    marginTop: 22,
  },
  buttonRow: {
    width: "100%",
    flexDirection: "column",
  },
  btn: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderColor: "transparent",
  },
  destructiveBtn: {
    borderTopWidth: 0,
  },
  destructiveBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF6B6B",
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "500",
  },
  primaryBtnWrapper: {
    width: "100%",
  },
  primaryBtn: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
