import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";

export const KEYPAD_HEIGHT = 350;

export const arabicToWestern = (str: string): string =>
  str.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));

export const evaluateMath = (expr: string): number => {
  const normalized = arabicToWestern(expr);
  const sanitized = normalized
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/[^-()\d/*+.]/g, "");
  if (!sanitized) return 0;

  let index = 0;

  const parseExpression = (): number => {
    let value = parseTerm();
    while (index < sanitized.length) {
      const op = sanitized[index];
      if (op !== "+" && op !== "-") break;
      index += 1;
      const right = parseTerm();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  };

  const parseTerm = (): number => {
    let value = parseFactor();
    while (index < sanitized.length) {
      const op = sanitized[index];
      if (op !== "*" && op !== "/") break;
      index += 1;
      const right = parseFactor();
      if (op === "/") {
        if (right === 0) return NaN;
        value /= right;
      } else {
        value *= right;
      }
    }
    return value;
  };

  const parseFactor = (): number => {
    if (index >= sanitized.length) return NaN;
    const ch = sanitized[index];
    if (ch === "+" || ch === "-") {
      index += 1;
      const val = parseFactor();
      return ch === "-" ? -val : val;
    }
    if (ch === "(") {
      index += 1;
      const val = parseExpression();
      if (sanitized[index] !== ")") return NaN;
      index += 1;
      return val;
    }
    const start = index;
    let hasDot = false;
    while (index < sanitized.length) {
      const c = sanitized[index];
      if (c >= "0" && c <= "9") {
        index += 1;
      } else if (c === "." && !hasDot) {
        hasDot = true;
        index += 1;
      } else {
        break;
      }
    }
    if (index === start) return NaN;
    return Number(sanitized.slice(start, index));
  };

  const result = parseExpression();
  if (index !== sanitized.length || !Number.isFinite(result)) {
    return 0;
  }
  return result;
};

interface UseCalculatorKeypadOptions {
  initialFocus?: boolean;
  onClearAmountError?: () => void;
}

export function useCalculatorKeypad({
  initialFocus = true,
  onClearAmountError,
}: UseCalculatorKeypadOptions = {}) {
  const [amountStr, setAmountStr] = useState("");
  const [showKeypad, setShowKeypad] = useState<boolean>(initialFocus);
  const [isKeypadMounted, setIsKeypadMounted] = useState<boolean>(initialFocus);
  const [amountFocused, setAmountFocused] = useState<boolean>(initialFocus);

  const keypadTranslateY = useRef(
    new Animated.Value(initialFocus ? 0 : KEYPAD_HEIGHT),
  ).current;
  const keypadOpacity = useRef(
    new Animated.Value(initialFocus ? 1 : 0),
  ).current;
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const showKeypadRef = useRef(showKeypad);

  useEffect(() => {
    showKeypadRef.current = showKeypad;
  }, [showKeypad]);

  useEffect(() => {
    if (showKeypad) {
      const blinkAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(cursorOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      );
      blinkAnimation.start();
      return () => blinkAnimation.stop();
    } else {
      cursorOpacity.setValue(0);
    }
  }, [showKeypad, cursorOpacity]);

  useEffect(() => {
    setAmountFocused(showKeypad);
    if (showKeypad) {
      setIsKeypadMounted(true);
      Animated.parallel([
        Animated.spring(keypadTranslateY, {
          toValue: 0,
          damping: 22,
          stiffness: 220,
          mass: 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(keypadOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(keypadTranslateY, {
          toValue: KEYPAD_HEIGHT,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(keypadOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setIsKeypadMounted(false);
        }
      });
    }
  }, [showKeypad, keypadTranslateY, keypadOpacity]);

  const hasMathOperator = /[+\-*/×÷]/.test(amountStr.slice(1));
  const evaluatedAmount = evaluateMath(amountStr);
  const amountDisplay = amountStr
    ? amountStr.replace(/\*/g, "×").replace(/\//g, "÷")
    : "0.00";

  const handleEvaluateExpression = () => {
    if (!amountStr) return;
    const result = evaluateMath(amountStr);
    if (result > 0) {
      setAmountStr(parseFloat(result.toFixed(2)).toString());
    }
  };

  const handleKeypadPress = (key: string) => {
    if (key === "=") {
      handleEvaluateExpression();
      return;
    }
    onClearAmountError?.();
    setAmountStr((prev) => {
      const isOp = ["+", "-", "*", "/"].includes(key);
      if (isOp) {
        if (!prev) return "";
        const lastChar = prev.slice(-1);
        if (["+", "-", "*", "/", "."].includes(lastChar)) {
          return prev.slice(0, -1) + key;
        }
      }
      if (key === ".") {
        const parts = prev.split(/[+\-*/]/);
        const currentPart = parts[parts.length - 1] || "";
        if (currentPart.includes(".")) return prev;
        if (!currentPart) return prev + "0.";
      }
      return prev + key;
    });
  };

  const handleKeypadBackspace = () => {
    setAmountStr((prev) => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setAmountStr("");
  };

  return {
    KEYPAD_HEIGHT,
    amountStr,
    setAmountStr,
    showKeypad,
    setShowKeypad,
    isKeypadMounted,
    setIsKeypadMounted,
    keypadTranslateY,
    keypadOpacity,
    amountFocused,
    setAmountFocused,
    cursorOpacity,
    showKeypadRef,
    hasMathOperator,
    evaluatedAmount,
    amountDisplay,
    handleKeypadPress,
    handleKeypadBackspace,
    handleKeypadClear,
    handleEvaluateExpression,
  };
}

export type CalculatorKeypadController = ReturnType<typeof useCalculatorKeypad>;
