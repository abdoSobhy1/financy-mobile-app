import type { AddTransactionScreenController } from "../hooks/useAddTransactionScreen";

import { View, Keyboard } from "react-native";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { Input } from "../../../shared/ui";

interface TransactionExtraNoteProps {
  showMore: AddTransactionScreenController["showMore"];
  setNoteY: AddTransactionScreenController["setNoteY"];
  noteInputRef: AddTransactionScreenController["noteInputRef"];
  note: AddTransactionScreenController["note"];
  setShowKeypad: AddTransactionScreenController["setShowKeypad"];
  setIsKeypadMounted: AddTransactionScreenController["setIsKeypadMounted"];
  setAmountFocused: AddTransactionScreenController["setAmountFocused"];
  scrollToNote: AddTransactionScreenController["scrollToNote"];
  setNote: AddTransactionScreenController["setNote"];
}
export function TransactionExtraNote({ showMore, setNoteY, noteInputRef, note, setShowKeypad, setIsKeypadMounted, setAmountFocused, scrollToNote, setNote }: TransactionExtraNoteProps) {
  const { spacing } = useAppTheme();
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
