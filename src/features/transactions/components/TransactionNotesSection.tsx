import { styles } from "../screens/AddTransactionScreen.styles";
import type { useAddTransactionScreen } from "../hooks/useAddTransactionScreen";

import { View, TextInput, Text, TouchableOpacity, Keyboard } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";

interface TransactionNotesSectionProps {
  setOptionsCardY: ReturnType<typeof useAddTransactionScreen>["setOptionsCardY"];
  descriptionInputRef: ReturnType<typeof useAddTransactionScreen>["descriptionInputRef"];
  description: ReturnType<typeof useAddTransactionScreen>["description"];
  setShowKeypad: ReturnType<typeof useAddTransactionScreen>["setShowKeypad"];
  setIsKeypadMounted: ReturnType<typeof useAddTransactionScreen>["setIsKeypadMounted"];
  setAmountFocused: ReturnType<typeof useAddTransactionScreen>["setAmountFocused"];
  scrollToDescription: ReturnType<typeof useAddTransactionScreen>["scrollToDescription"];
  setDescription: ReturnType<typeof useAddTransactionScreen>["setDescription"];
  showMore: ReturnType<typeof useAddTransactionScreen>["showMore"];
  noteInputRef: ReturnType<typeof useAddTransactionScreen>["noteInputRef"];
  showKeypad: ReturnType<typeof useAddTransactionScreen>["showKeypad"];
  setShowDatePicker: ReturnType<typeof useAddTransactionScreen>["setShowDatePicker"];
  date: ReturnType<typeof useAddTransactionScreen>["date"];

}
export function TransactionNotesSection({ setOptionsCardY, descriptionInputRef, description, setShowKeypad, setIsKeypadMounted, setAmountFocused, scrollToDescription, setDescription, showMore, noteInputRef, showKeypad, setShowDatePicker, date }: TransactionNotesSectionProps) {
  const { colors, typography } = useAppTheme();

  return (<View
    onLayout={(e) => setOptionsCardY(e.nativeEvent.layout.y)}
    style={[
      styles.optionsCard,
      {
        backgroundColor: colors.surfaceVariant,
        borderColor: colors.outlineVariant,
        borderWidth: 1,
      },
    ]}>
    {/* Description */}
    <View
      style={[
        styles.optionRow,
        {
          borderBottomColor: colors.outlineVariant,
          borderBottomWidth: 1,
        },
      ]}>
      <View
        style={[
          styles.optionIcon,
          { backgroundColor: colors.surface },
        ]}>
        <Ionicons
          name="pencil-outline"
          size={20}
          color={colors.primary}
        />
      </View>
      <View style={styles.optionContent}>
        <TextInput
          ref={descriptionInputRef}
          style={[
            typography.bodyMedium,
            { color: colors.onBackground, padding: 0 },
          ]}
          placeholder="Add a description..."
          placeholderTextColor={colors.onSurfaceVariant}
          value={description}
          onFocus={() => {
            setShowKeypad(false);
            setIsKeypadMounted(false);
            setAmountFocused(false);
            scrollToDescription();
          }}
          onChangeText={setDescription}
          returnKeyType={showMore ? "next" : "done"}
          blurOnSubmit={false}
          onSubmitEditing={() => {
            if (showMore) {
              noteInputRef.current?.focus();
            } else {
              Keyboard.dismiss();
            }
          }}
        />
      </View>
    </View>

    {/* Date */}
    <TouchableOpacity
      style={[
        styles.optionRow,
        {
          borderBottomColor: "transparent",
          borderBottomWidth: 0,
        },
      ]}
      onPress={() => {
        if (showKeypad) {
          setShowKeypad(false);
          setAmountFocused(false);
        }
        setShowDatePicker(true);
      }}>
      <View
        style={[
          styles.optionIcon,
          { backgroundColor: colors.surface },
        ]}>
        <Ionicons
          name="calendar-outline"
          size={20}
          color={colors.primary}
        />
      </View>
      <View style={styles.optionContent}>
        <Text
          style={[
            typography.bodyMedium,
            { color: colors.onBackground, fontWeight: "600" },
          ]}>
          {date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.onSurfaceVariant}
      />
    </TouchableOpacity>
  </View>);
}
