import { TransactionExtraNote } from "./TransactionExtraNote";
import { TransactionAmountField } from "./TransactionAmountField";
import { TransactionBudgetPicker } from "./TransactionBudgetPicker";
import { TransactionWalletPicker } from "./TransactionWalletPicker";
import { TransactionNotesSection } from "./TransactionNotesSection";
import { styles } from "./AddTransactionForm.styles";
import type { AddTransactionScreenController } from "../hooks/useAddTransactionScreen";

import { View, ScrollView, Text, TouchableOpacity } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { TransactionType } from "../../../shared/types";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";

interface TransactionFormContentProps {
  form: AddTransactionScreenController;
}
export function TransactionFormContent({ form }: TransactionFormContentProps) {
  const { colors, radius, spacing, typography, resolveCategoryColor } = useAppTheme();
  const {
    type,
    showKeypad,
    setShowKeypad,
    setAmountFocused,
    setType,
    scrollViewRef,
    amountFocused,
    amountStr,
    amountDisplay,
    cursorOpacity,
    hasMathOperator,
    evaluatedAmount,
    handleEvaluateExpression,
    formErrors,
    activeCategories,
    categoryId,
    handleCategorySelect,
    setShowCreateCategoryModal,
    budgets,
    setBudgetId,
    setManualBudgetSelected,
    budgetId,
    displayWallets,
    accountId,
    setAccountId,
    setOptionsCardY,
    descriptionInputRef,
    description,
    setIsKeypadMounted,
    scrollToDescription,
    setDescription,
    showMore,
    noteInputRef,
    setShowDatePicker,
    date,
    setShowMore,
    setNoteY,
    note,
    scrollToNote,
    setNote,
  } = form;
  return (<View>
    <View
      style={[
        styles.segmentContainer,
        {
          backgroundColor: colors.surfaceVariant,
          borderRadius: radius.pill,
          marginBottom: spacing.xl,
        },
      ]}>
      {["income", "expense"].map((t) => {
        const isActive = type === t;
        return (
          <TouchableOpacity
            key={t}
            style={[
              styles.segmentButton,
              {
                borderRadius: radius.pill,
                backgroundColor: isActive
                  ? colors.surface
                  : "transparent",
              },
            ]}
            onPress={() => {
              if (showKeypad) {
                setShowKeypad(false);
                setAmountFocused(false);
              }
              setType(t as TransactionType);
            }}>
            <Text
              style={[
                typography.bodyMedium,
                {
                  color: isActive
                    ? colors.onBackground
                    : colors.onSurfaceVariant,
                  fontWeight: isActive ? "700" : "500",
                  textTransform: "capitalize",
                },
              ]}>
              {t}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>

    {/* Amount Section — Tactile Calculator Display */}
    <TransactionAmountField setShowKeypad={setShowKeypad} setAmountFocused={setAmountFocused} scrollViewRef={scrollViewRef} amountFocused={amountFocused} amountStr={amountStr} type={type} amountDisplay={amountDisplay} showKeypad={showKeypad} cursorOpacity={cursorOpacity} hasMathOperator={hasMathOperator} evaluatedAmount={evaluatedAmount} handleEvaluateExpression={handleEvaluateExpression} formErrors={formErrors} />
    <Text
      style={[
        typography.label,
        {
          color: colors.onSurfaceVariant,
          marginBottom: spacing.sm,
          textTransform: "uppercase",
          letterSpacing: 0.8,
        },
      ]}>
      Category
    </Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      style={{ flexGrow: 0 }}
      onScrollBeginDrag={() => {
        if (showKeypad) setShowKeypad(false);
      }}
      contentContainerStyle={{
        gap: spacing.sm,
        marginBottom: spacing.lg,
      }}>
      {activeCategories.map((cat) => {
        const isSelected = cat.id === categoryId;
        const catTheme = resolveCategoryColor(cat.color);
        return (
          <TouchableOpacity
            key={cat.id}
            onPress={() => handleCategorySelect(cat.id)}
            activeOpacity={0.75}
            style={[
              styles.categoryChip,
              {
                backgroundColor: isSelected
                  ? catTheme.bgColor
                  : colors.surfaceVariant,
                borderColor: isSelected
                  ? catTheme.iconColor
                  : colors.outlineVariant,
              },
            ]}>
            <Ionicons
              name={(cat.icon || "pricetag") as React.ComponentProps<typeof Ionicons>["name"]}
              size={18}
              color={catTheme.iconColor}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                typography.bodyMedium,
                {
                  color: isSelected
                    ? catTheme.iconColor
                    : colors.onBackground,
                  fontWeight: isSelected ? "700" : "500",
                },
              ]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Quick "+ New" Category Chip */}
      <TouchableOpacity
        onPress={() => {
          if (showKeypad) setShowKeypad(false);
          setShowCreateCategoryModal(true);
        }}
        activeOpacity={0.75}
        style={[
          styles.categoryChip,
          {
            backgroundColor: colors.surface,
            borderColor: colors.primary,
            borderStyle: "dashed",
          },
        ]}>
        <Ionicons
          name="add-circle-outline"
          size={18}
          color={colors.primary}
          style={{ marginRight: 6 }}
        />
        <Text
          style={[
            typography.bodyMedium,
            { color: colors.primary, fontWeight: "700" },
          ]}>
          New Category
        </Text>
      </TouchableOpacity>
    </ScrollView>
    {formErrors.category ? (
      <Text
        style={{
          color: colors.error,
          fontSize: 13,
          fontWeight: "600",
          marginBottom: spacing.md,
          marginLeft: 4,
        }}>
        {formErrors.category}
      </Text>
    ) : null}

    {/* Budgets (Visible by default for expenses) */}
    {Object.values(budgets).length > 0 && type !== "income" && (
      <TransactionBudgetPicker showKeypad={showKeypad} setShowKeypad={setShowKeypad} setBudgetId={setBudgetId} setManualBudgetSelected={setManualBudgetSelected} budgetId={budgetId} budgets={budgets} />
    )}

    {/* Account / Wallet Selector - always rendered to prevent layout jump */}
    <TransactionWalletPicker showKeypad={showKeypad} setShowKeypad={setShowKeypad} displayWallets={displayWallets} accountId={accountId} setAccountId={setAccountId} />

    {/* Options Grouped Card */}
    <TransactionNotesSection setOptionsCardY={setOptionsCardY} descriptionInputRef={descriptionInputRef} description={description} setShowKeypad={setShowKeypad} setIsKeypadMounted={setIsKeypadMounted} setAmountFocused={setAmountFocused} scrollToDescription={scrollToDescription} setDescription={setDescription} showMore={showMore} noteInputRef={noteInputRef} showKeypad={showKeypad} setShowDatePicker={setShowDatePicker} date={date} />

    {/* More Options */}
    <TouchableOpacity
      style={styles.moreOptionsBtn}
      onPress={() => {
        if (showKeypad) {
          setShowKeypad(false);
          setAmountFocused(false);
        }
        setShowMore(!showMore);
      }}>
      <Text
        style={[
          typography.bodyMedium,
          {
            color: colors.primary,
            fontWeight: "700",
            marginRight: 4,
          },
        ]}>
        More options
      </Text>
      <Ionicons
        name={showMore ? "chevron-up" : "chevron-down"}
        size={16}
        color={colors.primary}
      />
    </TouchableOpacity>

    <TransactionExtraNote showMore={showMore} setNoteY={setNoteY} noteInputRef={noteInputRef} note={note} setShowKeypad={setShowKeypad} setIsKeypadMounted={setIsKeypadMounted} setAmountFocused={setAmountFocused} scrollToNote={scrollToNote} setNote={setNote} />
  </View>);
}
