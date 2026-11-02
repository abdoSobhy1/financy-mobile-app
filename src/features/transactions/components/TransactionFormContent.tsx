import { TransactionExtraNote } from "./TransactionExtraNote";
import { TransactionAmountField } from "./TransactionAmountField";
import { TransactionBudgetPicker } from "./TransactionBudgetPicker";
import { TransactionWalletPicker } from "./TransactionWalletPicker";
import { TransactionNotesSection } from "./TransactionNotesSection";
import { styles } from "../screens/AddTransactionScreen.styles";
import { useAddTransactionScreen } from "../hooks/useAddTransactionScreen";

import { View, ScrollView, Text, TouchableOpacity } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { TransactionType } from "../../../shared/types";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";

interface TransactionFormContentProps {
  colors: ReturnType<typeof useAppTheme>["colors"];
  radius: ReturnType<typeof useAppTheme>["radius"];
  spacing: ReturnType<typeof useAppTheme>["spacing"];
  type: ReturnType<typeof useAddTransactionScreen>["type"];
  showKeypad: ReturnType<typeof useAddTransactionScreen>["showKeypad"];
  setShowKeypad: ReturnType<typeof useAddTransactionScreen>["setShowKeypad"];
  setAmountFocused: ReturnType<typeof useAddTransactionScreen>["setAmountFocused"];
  setType: ReturnType<typeof useAddTransactionScreen>["setType"];
  typography: ReturnType<typeof useAppTheme>["typography"];
  scrollViewRef: ReturnType<typeof useAddTransactionScreen>["scrollViewRef"];
  amountFocused: ReturnType<typeof useAddTransactionScreen>["amountFocused"];
  amountStr: ReturnType<typeof useAddTransactionScreen>["amountStr"];
  amountDisplay: ReturnType<typeof useAddTransactionScreen>["amountDisplay"];
  cursorOpacity: ReturnType<typeof useAddTransactionScreen>["cursorOpacity"];
  hasMathOperator: ReturnType<typeof useAddTransactionScreen>["hasMathOperator"];
  evaluatedAmount: ReturnType<typeof useAddTransactionScreen>["evaluatedAmount"];
  handleEvaluateExpression: ReturnType<typeof useAddTransactionScreen>["handleEvaluateExpression"];
  formErrors: ReturnType<typeof useAddTransactionScreen>["formErrors"];
  activeCategories: ReturnType<typeof useAddTransactionScreen>["activeCategories"];
  categoryId: ReturnType<typeof useAddTransactionScreen>["categoryId"];
  resolveCategoryColor: ReturnType<typeof useAppTheme>["resolveCategoryColor"];
  handleCategorySelect: ReturnType<typeof useAddTransactionScreen>["handleCategorySelect"];
  setShowCreateCategoryModal: ReturnType<typeof useAddTransactionScreen>["setShowCreateCategoryModal"];
  budgets: ReturnType<typeof useAddTransactionScreen>["budgets"];
  setBudgetId: ReturnType<typeof useAddTransactionScreen>["setBudgetId"];
  setManualBudgetSelected: ReturnType<typeof useAddTransactionScreen>["setManualBudgetSelected"];
  budgetId: ReturnType<typeof useAddTransactionScreen>["budgetId"];
  displayWallets: ReturnType<typeof useAddTransactionScreen>["displayWallets"];
  accountId: ReturnType<typeof useAddTransactionScreen>["accountId"];
  setAccountId: ReturnType<typeof useAddTransactionScreen>["setAccountId"];
  setOptionsCardY: ReturnType<typeof useAddTransactionScreen>["setOptionsCardY"];
  descriptionInputRef: ReturnType<typeof useAddTransactionScreen>["descriptionInputRef"];
  description: ReturnType<typeof useAddTransactionScreen>["description"];
  setIsKeypadMounted: ReturnType<typeof useAddTransactionScreen>["setIsKeypadMounted"];
  scrollToDescription: ReturnType<typeof useAddTransactionScreen>["scrollToDescription"];
  setDescription: ReturnType<typeof useAddTransactionScreen>["setDescription"];
  showMore: ReturnType<typeof useAddTransactionScreen>["showMore"];
  noteInputRef: ReturnType<typeof useAddTransactionScreen>["noteInputRef"];
  setShowDatePicker: ReturnType<typeof useAddTransactionScreen>["setShowDatePicker"];
  date: ReturnType<typeof useAddTransactionScreen>["date"];
  setShowMore: ReturnType<typeof useAddTransactionScreen>["setShowMore"];
  setNoteY: ReturnType<typeof useAddTransactionScreen>["setNoteY"];
  note: ReturnType<typeof useAddTransactionScreen>["note"];
  scrollToNote: ReturnType<typeof useAddTransactionScreen>["scrollToNote"];
  setNote: ReturnType<typeof useAddTransactionScreen>["setNote"];
}
export function TransactionFormContent({ colors, radius, spacing, type, showKeypad, setShowKeypad, setAmountFocused, setType, typography, scrollViewRef, amountFocused, amountStr, amountDisplay, cursorOpacity, hasMathOperator, evaluatedAmount, handleEvaluateExpression, formErrors, activeCategories, categoryId, resolveCategoryColor, handleCategorySelect, setShowCreateCategoryModal, budgets, setBudgetId, setManualBudgetSelected, budgetId, displayWallets, accountId, setAccountId, setOptionsCardY, descriptionInputRef, description, setIsKeypadMounted, scrollToDescription, setDescription, showMore, noteInputRef, setShowDatePicker, date, setShowMore, setNoteY, note, scrollToNote, setNote }: TransactionFormContentProps) {
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
        const catTheme = resolveCategoryColor((cat as any).color);
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
              name={((cat as any).icon || "pricetag") as any}
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

    {<TransactionExtraNote showMore={showMore} setNoteY={setNoteY} spacing={spacing} noteInputRef={noteInputRef} note={note} setShowKeypad={setShowKeypad} setIsKeypadMounted={setIsKeypadMounted} setAmountFocused={setAmountFocused} scrollToNote={scrollToNote} setNote={setNote} />}
  </View>);
}
