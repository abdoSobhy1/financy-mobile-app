import { useAddTransactionScreen } from "../hooks/useAddTransactionScreen";

import { View, Keyboard } from "react-native";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { Input } from "../../../shared/ui";

interface TransactionExtraNoteProps {
  showMore: ReturnType<typeof useAddTransactionScreen>["showMore"];
  setNoteY: ReturnType<typeof useAddTransactionScreen>["setNoteY"];
  spacing: ReturnType<typeof useAppTheme>["spacing"];
  noteInputRef: ReturnType<typeof useAddTransactionScreen>["noteInputRef"];
  note: ReturnType<typeof useAddTransactionScreen>["note"];
  setShowKeypad: ReturnType<typeof useAddTransactionScreen>["setShowKeypad"];
  setIsKeypadMounted: ReturnType<typeof useAddTransactionScreen>["setIsKeypadMounted"];
  setAmountFocused: ReturnType<typeof useAddTransactionScreen>["setAmountFocused"];
  scrollToNote: ReturnType<typeof useAddTransactionScreen>["scrollToNote"];
  setNote: ReturnType<typeof useAddTransactionScreen>["setNote"];
}
export function TransactionExtraNote({ showMore, setNoteY, spacing, noteInputRef, note, setShowKeypad, setIsKeypadMounted, setAmountFocused, scrollToNote, setNote }: TransactionExtraNoteProps) {
  return (<>{showMore && (
    <View
      onLayout={(e) => setNoteY(e.nativeEvent.layout.y)}
      style={{ gap: spacing.md, marginBottom: spacing.xl }}>
      <Input
        ref={noteInputRef}
        label="Note"
        placeholder="Additional details..."
        value={note}
        onFocus={() => {
          setShowKeypad(false);
          setIsKeypadMounted(false);
          setAmountFocused(false);
          scrollToNote();
        }}
        onChangeText={setNote}
        multiline
        numberOfLines={3}
        inputStyle={{ height: 80 }}
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
      />
    </View>
  )}</>);
}
