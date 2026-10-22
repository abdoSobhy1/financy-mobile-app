import React, { useEffect, useRef, useState } from "react";
import {
  AppState,
  AppStateStatus,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "./ThemeProvider";
import { securityService } from "../../services/securityService";

export const AppLockOverlay: React.FC = () => {
  const { colors } = useAppTheme();
  const [isLocked, setIsLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    let mounted = true;

    const checkInitialLock = async () => {
      const enabled = await securityService.isAppLockEnabled();
      if (mounted && enabled) {
        setIsLocked(true);
      }
    };

    checkInitialLock();

    const unsubscribeLockState = securityService.subscribeLockChanges(
      (enabled) => {
        if (!enabled) {
          setIsLocked(false);
          setPin("");
          setErrorMsg("");
        }
      },
    );

    const sub = AppState.addEventListener("change", async (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (prevState === "background" && nextState === "active") {
        const enabled = await securityService.isAppLockEnabled();
        if (enabled) {
          setPin("");
          setErrorMsg("");
          setIsLocked(true);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribeLockState();
      sub.remove();
    };
  }, []);

  const handleDigit = async (digit: string) => {
    if (pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setErrorMsg("");

    if (nextPin.length === 4) {
      const valid = await securityService.verifyAppLockPin(nextPin);
      if (valid) {
        setIsLocked(false);
        setPin("");
        setErrorMsg("");
      } else {
        Vibration.vibrate(100);
        setErrorMsg("Incorrect PIN. Please try again.");
        setTimeout(() => {
          setPin("");
        }, 250);
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length === 0) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg("");
  };

  if (!isLocked) return null;

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

  return (
    <View
      style={[
        styles.overlay,
        { backgroundColor: colors.background },
      ]}>
      <View style={styles.headerSection}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.primaryContainer },
          ]}>
          <Ionicons
            name="lock-closed"
            size={32}
            color={colors.primary}
          />
        </View>
        <Text style={[styles.title, { color: colors.onBackground }]}>
          Financy Locked
        </Text>
        <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          Enter your 4-digit security PIN to unlock
        </Text>

        {/* PIN Dots */}
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((idx) => {
            const filled = pin.length > idx;
            return (
              <View
                key={idx}
                style={[
                  styles.dot,
                  {
                    borderColor: errorMsg
                      ? colors.error
                      : filled
                        ? colors.primary
                        : colors.outlineVariant,
                    backgroundColor: errorMsg
                      ? colors.error
                      : filled
                        ? colors.primary
                        : "transparent",
                  },
                ]}
              />
            );
          })}
        </View>

        {errorMsg ? (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {errorMsg}
          </Text>
        ) : (
          <View style={{ height: 20 }} />
        )}
      </View>

      {/* Keypad */}
      <View style={styles.keypad}>
        {keys.map((key, idx) => {
          if (key === "") {
            return <View key={`empty_${idx}`} style={styles.keyButtonEmpty} />;
          }
          if (key === "back") {
            return (
              <TouchableOpacity
                key="back"
                style={[
                  styles.keyButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.outlineVariant,
                  },
                ]}
                onPress={handleBackspace}
                activeOpacity={0.7}>
                <Ionicons
                  name="backspace-outline"
                  size={24}
                  color={colors.onBackground}
                />
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.keyButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.outlineVariant,
                },
              ]}
              onPress={() => handleDigit(key)}
              activeOpacity={0.7}>
              <Text
                style={[styles.keyText, { color: colors.onBackground }]}>
                {key}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 99999,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 64,
    paddingHorizontal: 28,
  },
  headerSection: {
    alignItems: "center",
    marginTop: 24,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 28,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 18,
    marginBottom: 12,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  keypad: {
    width: "100%",
    maxWidth: 320,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  keyButton: {
    width: "30%",
    aspectRatio: 1.35,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  keyButtonEmpty: {
    width: "30%",
    aspectRatio: 1.35,
  },
  keyText: {
    fontSize: 26,
    fontWeight: "600",
  },
});
