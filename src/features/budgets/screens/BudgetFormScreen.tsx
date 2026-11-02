import { styles } from "./BudgetFormScreen.styles";
import React from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBudgetFormScreen } from "../hooks/useBudgetFormScreen";

import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { Switch } from "../../../shared/ui";

const BudgetFormScreen: React.FC = () => {
  const {
    navigation,
    budget,
    amountStr,
    setAmountStr,
    name,
    setName,
    alertsEnabled,
    setAlertsEnabled,
    formErrors,
    setFormErrors,
    loading,
    amountInputRef,
    nameInputRef,
    handleSave,
    handleDelete
  } = useBudgetFormScreen();
  const {
    colors,
    typography,
    spacing,
    currencySymbol,
  } = useAppTheme();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Custom Top Bar matching AddTransactionScreen */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: colors.surfaceVariant },
            ]}
            onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.onBackground }]}>
            {budget ? "Edit Budget" : "New Budget"}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            {budget && (
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  { backgroundColor: "rgba(239, 68, 68, 0.12)" },
                ]}
                onPress={handleDelete}
                disabled={loading}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: colors.primaryContainer },
              ]}
              onPress={handleSave}
              disabled={loading}>
              <Ionicons
                name="checkmark"
                size={24}
                color={colors.onPrimaryContainer}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: spacing.xxl,
          }}
          keyboardShouldPersistTaps="handled">
          {/* Amount Section — Tactile Display */}
          <View style={styles.amountSection}>
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.onSurfaceVariant, marginBottom: 6 },
              ]}>
              Budget Limit
            </Text>
            <View style={styles.amountRow}>
              <View style={styles.amountTextContainer}>
                <Text
                  style={[
                    styles.currencySymbol,
                    { color: colors.onSurfaceVariant },
                  ]}>
                  {currencySymbol.trim()}
                </Text>
                <TextInput
                  ref={amountInputRef}
                  style={[
                    styles.amountValue,
                    {
                      color: amountStr
                        ? colors.onBackground
                        : colors.onSurfaceVariant,
                    },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={colors.onSurfaceVariant}
                  keyboardType="decimal-pad"
                  value={amountStr}
                  onChangeText={(val) => {
                    setAmountStr(val);
                    if (formErrors.amount) {
                      setFormErrors((prev) => ({ ...prev, amount: undefined }));
                    }
                  }}
                  autoFocus={!budget}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => nameInputRef.current?.focus()}
                />
              </View>
            </View>
            {formErrors.amount ? (
              <Text style={styles.errorText}>{formErrors.amount}</Text>
            ) : null}
          </View>

          {/* Options Grouped Card matching AddTransactionScreen */}
          <View
            style={[
              styles.optionsCard,
              {
                backgroundColor: colors.surfaceVariant,
                borderColor: colors.outlineVariant,
                borderWidth: 1,
              },
            ]}>
            {/* Budget Name */}
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
                  ref={nameInputRef}
                  style={[
                    typography.bodyMedium,
                    { color: colors.onBackground, padding: 0 },
                  ]}
                  placeholder="Budget Name (e.g. Monthly Budget)"
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (formErrors.name) {
                      setFormErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>
            </View>

            {/* Overspending Alerts */}
            <View
              style={[
                styles.optionRow,
                {
                  borderBottomColor: "transparent",
                  borderBottomWidth: 0,
                },
              ]}>
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: colors.surface },
                ]}>
                <Ionicons
                  name="notifications-outline"
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
                  Overspending Alerts
                </Text>
                <Text
                  style={[
                    typography.bodySmall,
                    { color: colors.onSurfaceVariant, marginTop: 2 },
                  ]}>
                  Notify when 80% reached
                </Text>
              </View>
              <Switch
                value={alertsEnabled}
                onValueChange={setAlertsEnabled}
              />
            </View>
          </View>
          {formErrors.name ? (
            <Text
              style={[
                styles.errorText,
                {
                  marginTop: -16,
                  marginBottom: spacing.lg,
                  marginLeft: 8,
                  textAlign: "left",
                },
              ]}>
              {formErrors.name}
            </Text>
          ) : null}

          {/* Action Button at bottom */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: colors.primaryContainer,
                opacity: loading ? 0.7 : 1,
              },
            ]}
            onPress={handleSave}
            disabled={loading}>
            <Text
              style={[
                typography.bodyLarge,
                { color: colors.onPrimaryContainer, fontWeight: "700" },
              ]}>
              {loading
                ? "Saving..."
                : budget
                  ? "Update Budget"
                  : "Create Budget"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default BudgetFormScreen;
