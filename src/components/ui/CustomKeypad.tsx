import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAppTheme } from "./ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

interface CustomKeypadProps {
  onPress: (key: string) => void;
  onBackspace: () => void;
  onClear?: () => void;
  onEvaluate?: () => void;
  onSubmit?: () => void;
  onClose?: () => void;
  hasOperator?: boolean;
}

export const CustomKeypad: React.FC<CustomKeypadProps> = ({
  onPress,
  onBackspace,
  onClear,
  onEvaluate,
  onSubmit,
  onClose,
  hasOperator = false,
}) => {
  const { colors } = useAppTheme();

  const keys = [
    ["7", "8", "9", "÷"],
    ["4", "5", "6", "×"],
    ["1", "2", "3", "-"],
    [".", "0", "backspace", "+"],
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.outlineVariant,
        },
      ]}>
      {onClose && (
        <View style={styles.headerBar}>
          <View
            style={[
              styles.dragHandle,
              { backgroundColor: colors.outlineVariant },
            ]}
          />
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}>
            <Ionicons
              name="chevron-down"
              size={20}
              color={colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>
      )}
      {keys.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => {
            const isOperator = ["+", "-", "×", "÷"].includes(key);
            const isBackspace = key === "backspace";

            return (
              <TouchableOpacity
                key={key}
                activeOpacity={0.65}
                style={[
                  styles.key,
                  {
                    backgroundColor: isOperator
                      ? colors.secondaryContainer
                      : colors.surfaceVariant,
                  },
                ]}
                onLongPress={() => {
                  if (isBackspace && onClear) onClear();
                }}
                onPress={() => {
                  if (isBackspace) onBackspace();
                  else if (key === "×") onPress("*");
                  else if (key === "÷") onPress("/");
                  else onPress(key);
                }}>
                {isBackspace ? (
                  <Ionicons
                    name="backspace-outline"
                    size={22}
                    color={colors.onSurface}
                  />
                ) : (
                  <Text
                    style={[
                      styles.keyText,
                      {
                        color: isOperator
                          ? colors.onSecondaryContainer
                          : colors.onSurface,
                      },
                    ]}>
                    {key}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {(onEvaluate || onSubmit) && (
        <View style={styles.actionRow}>
          {onClear && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.clearBtn,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.outlineVariant,
                },
              ]}
              onPress={onClear}>
              <Text style={[styles.clearText, { color: colors.onSurfaceVariant }]}>
                AC
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.submitBtn,
              { backgroundColor: colors.primaryContainer },
            ]}
            onPress={() => {
              if (hasOperator && onEvaluate) {
                onEvaluate();
              } else if (onSubmit) {
                onSubmit();
              }
            }}>
            <Ionicons
              name={hasOperator ? "calculator-outline" : "checkmark-circle"}
              size={20}
              color={colors.onPrimaryContainer}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.submitText,
                { color: colors.onPrimaryContainer },
              ]}>
              {hasOperator ? "Calculate (=)" : "Save Transaction"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 18,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 12,
  },
  headerBar: {
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    position: "relative",
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  closeBtn: {
    position: "absolute",
    right: 4,
    top: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  key: {
    flex: 1,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    marginHorizontal: 4,
  },
  keyText: {
    fontSize: 22,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingHorizontal: 4,
    gap: 8,
  },
  clearBtn: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  clearText: {
    fontSize: 15,
    fontWeight: "700",
  },
  submitBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  submitText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
