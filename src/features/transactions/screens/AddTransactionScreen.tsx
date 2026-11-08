import { TransactionFormContent } from "../components/TransactionFormContent";

import { styles } from "../components/AddTransactionForm.styles";
import { useAddTransactionScreen } from "../hooks/useAddTransactionScreen";
import React from "react";
import { View, ScrollView, Text, TouchableOpacity, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, Keyboard, Animated } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";


import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { CustomDatePicker, CustomKeypad } from "../../../shared/ui";
import { CategoryCreationModal } from "../../categories/components/CategoryCreationModal";

export const AddTransactionScreen: React.FC = () => {
  const { colors, spacing } = useAppTheme();
  const form = useAddTransactionScreen();
  const {
    navigation,
    editTransaction,
    type,
    date,
    setDate,
    showDatePicker,
    setShowDatePicker,
    KEYPAD_HEIGHT,
    showKeypad,
    setShowKeypad,
    isKeypadMounted,
    keypadTranslateY,
    keypadOpacity,
    setAmountFocused,
    showCreateCategoryModal,
    setShowCreateCategoryModal,
    scrollViewRef,
    keyboardHeight,
    isKeyboardVisible,
    hasMathOperator,
    handleKeypadPress,
    handleKeypadBackspace,
    handleKeypadClear,
    handleEvaluateExpression,
    handleQuickCreateCategory,
    handleSave,
  } = form;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Custom Top Bar */}
        <TouchableWithoutFeedback
          onPress={() => {
            if (showKeypad) setShowKeypad(false);
            Keyboard.dismiss();
          }}
          accessible={false}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: colors.surfaceVariant },
              ]}
              onPress={() => {
                if (showKeypad) setShowKeypad(false);
                navigation.goBack();
              }}>
              <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.onBackground }]}>
              {editTransaction ? "Edit Transaction" : "New Transaction"}
            </Text>
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: colors.primaryContainer },
              ]}
              onPress={() => {
                if (showKeypad) setShowKeypad(false);
                handleSave();
              }}>
              <Ionicons
                name="checkmark"
                size={24}
                color={colors.onPrimaryContainer}
              />
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: showKeypad
              ? KEYPAD_HEIGHT + spacing.md
              : isKeyboardVisible
                ? Math.max(keyboardHeight, 280) + spacing.xl
                : spacing.xxl,
          }}
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={() => {
            if (showKeypad) {
              setShowKeypad(false);
              setAmountFocused(false);
            }
          }}
          keyboardShouldPersistTaps="handled">
          <TouchableWithoutFeedback
            onPress={() => {
              if (showKeypad) {
                setShowKeypad(false);
                setAmountFocused(false);
              }
              Keyboard.dismiss();
            }}
            accessible={false}>
            <TransactionFormContent form={form} />
          </TouchableWithoutFeedback>
        </ScrollView>

        {isKeypadMounted && (
          <Animated.View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 100,
              transform: [{ translateY: keypadTranslateY }],
              opacity: keypadOpacity,
            }}>
            <CustomKeypad
              onPress={handleKeypadPress}
              onBackspace={handleKeypadBackspace}
              onClear={handleKeypadClear}
              onEvaluate={handleEvaluateExpression}
              onClose={() => setShowKeypad(false)}
              hasOperator={hasMathOperator}
            />
          </Animated.View>
        )}

        {showDatePicker && (
          <CustomDatePicker
            value={date}
            onDateChange={(d) => {
              setDate(d);
              setShowDatePicker(false);
            }}
            label="Transaction Date"
            hideTrigger
            open
            onClose={() => setShowDatePicker(false)}
          />
        )}

        <CategoryCreationModal
          visible={showCreateCategoryModal}
          onClose={() => setShowCreateCategoryModal(false)}
          onCreateCategory={handleQuickCreateCategory}
          initialData={{ name: "", type: type === "income" ? "income" : "expense" }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AddTransactionScreen;
