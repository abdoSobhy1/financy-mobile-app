import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAppTheme } from "./ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

interface CustomKeypadProps {
  onPress: (key: string) => void;
  onBackspace: () => void;
}

export const CustomKeypad: React.FC<CustomKeypadProps> = ({ onPress, onBackspace }) => {
  const { colors, typography } = useAppTheme();

  const keys = [
    ["7", "8", "9", "÷"],
    ["4", "5", "6", "×"],
    ["1", "2", "3", "-"],
    [".", "0", "backspace", "+"],
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceVariant }]}>
      {keys.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key, colIndex) => {
            const isOperator = ["+", "-", "×", "÷"].includes(key);
            const isBackspace = key === "backspace";
            
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.key,
                  isOperator && { backgroundColor: "rgba(128, 203, 196, 0.1)" }
                ]}
                onPress={() => {
                  if (isBackspace) onBackspace();
                  else if (key === "×") onPress("*");
                  else if (key === "÷") onPress("/");
                  else onPress(key);
                }}
              >
                {isBackspace ? (
                  <Ionicons name="backspace-outline" size={24} color={colors.onBackground} />
                ) : (
                  <Text style={[
                    styles.keyText,
                    { color: isOperator ? colors.primary : colors.onBackground }
                  ]}>
                    {key}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 32,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  key: {
    flex: 1,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    marginHorizontal: 6,
  },
  keyText: {
    fontSize: 24,
    fontWeight: "600",
  },
});
