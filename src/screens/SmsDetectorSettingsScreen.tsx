import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { useAppTheme } from "../components/ui/ThemeProvider";
import { AppHeader } from "../components/ui/AppHeader";
import { Card, useToast, Switch } from "../components/ui";
import {
  SmsDetectorConfig,
  getSmsConfig,
  saveSmsConfig,
  resetSmsConfigToDefaults,
  DEFAULT_SMS_CONFIG,
} from "../services/smsConfigService";
import {
  isBankSender,
  isAtmWithdrawal,
  parseSmsTransaction,
} from "../services/smsParser";
import { smsService } from "../services/smsService";
import { ParsedTransaction } from "../types";

type KeywordGroupKey = keyof Omit<SmsDetectorConfig, "ignoreAtmWithdrawals">;

interface GroupConfig {
  key: KeywordGroupKey;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  defaultValues: string[];
}

const GROUPS: GroupConfig[] = [
  {
    key: "bankSenders",
    title: "Bank Senders Whitelist",
    subtitle: "Incoming SMS from these senders trigger auto-detection",
    icon: "business-outline",
    placeholder: "e.g. CIB, NBE, FAWRY",
    defaultValues: DEFAULT_SMS_CONFIG.bankSenders,
  },
  {
    key: "incomeKeywords",
    title: "Income Keywords",
    subtitle: "Classifies detected transaction as Income when found",
    icon: "arrow-down-circle-outline",
    placeholder: "e.g. تحويل وارد, deposit, salary",
    defaultValues: DEFAULT_SMS_CONFIG.incomeKeywords,
  },
  {
    key: "expenseKeywords",
    title: "Expense Keywords",
    subtitle: "Classifies detected transaction as Expense when found",
    icon: "arrow-up-circle-outline",
    placeholder: "e.g. تم خصم, purchase, paid",
    defaultValues: DEFAULT_SMS_CONFIG.expenseKeywords,
  },
  {
    key: "atmKeywords",
    title: "ATM & Withdrawal Patterns",
    subtitle: "Patterns identifying cash withdrawals from ATMs",
    icon: "card-outline",
    placeholder: "e.g. ATM, سحب نقدي, cash withdrawal",
    defaultValues: DEFAULT_SMS_CONFIG.atmKeywords,
  },
  {
    key: "currencyKeywords",
    title: "Recognized Currencies",
    subtitle: "Currency symbols and tags recognized for amount extraction",
    icon: "cash-outline",
    placeholder: "e.g. EGP, USD, جم, LE",
    defaultValues: DEFAULT_SMS_CONFIG.currencyKeywords,
  },
];

const SAMPLE_MESSAGES = [
  {
    label: "Card Purchase (NBE)",
    sender: "BANK-ALAHLY",
    body: "تم خصم 450.50 EGP من بطاقة ماستركارد عند CARREFOUR يوم 22/10/26 المتاح 12500.00 EGP",
  },
  {
    label: "InstaPay Transfer (CIB)",
    sender: "CIB",
    body: "تم تنفيذ تحويل لحظي من حسابكم بمبلغ 1200.00 جم إلى AHMED MOHAMED رقم مرجعي 987654",
  },
  {
    label: "Salary / Income (BM)",
    sender: "BANQUEMISR",
    body: "تم إضافة تحويل لحظي لحسابكم بمبلغ 8500.00 جم من SALARY رقم مرجعي 112233",
  },
  {
    label: "ATM Cash Withdrawal",
    sender: "NBE",
    body: "عملية سحب نقدي بمبلغ 2000.00 EGP من ماكينة الصراف الآلي ATM186 يوم 22/10/26",
  },
];

export const SmsDetectorSettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors, typography, spacing, radius, isDark } = useAppTheme();
  const { showSuccess, showError } = useToast();

  const categories = useSelector((state: RootState) => state.categories.items);
  const budgets = useSelector((state: RootState) => state.budgets.items);

  const categoryList = useMemo(
    () => Object.values(categories || {}),
    [categories]
  );

  const [config, setConfig] = useState<SmsDetectorConfig>({
    bankSenders: [...DEFAULT_SMS_CONFIG.bankSenders],
    incomeKeywords: [...DEFAULT_SMS_CONFIG.incomeKeywords],
    expenseKeywords: [...DEFAULT_SMS_CONFIG.expenseKeywords],
    atmKeywords: [...DEFAULT_SMS_CONFIG.atmKeywords],
    currencyKeywords: [...DEFAULT_SMS_CONFIG.currencyKeywords],
    ignoreAtmWithdrawals: DEFAULT_SMS_CONFIG.ignoreAtmWithdrawals,
  });

  // Modal for adding a keyword
  const [activeGroup, setActiveGroup] = useState<GroupConfig | null>(null);
  const [newKeywordInput, setNewKeywordInput] = useState("");

  // Test sandbox state
  const [testSender, setTestSender] = useState("BANK-ALAHLY");
  const [testBody, setTestBody] = useState(SAMPLE_MESSAGES[0].body);
  const [testResult, setTestResult] = useState<{
    checked: boolean;
    isBank: boolean;
    isAtm: boolean;
    parsed: ParsedTransaction | null;
  } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const loaded = await getSmsConfig();
      setConfig(loaded);
    } catch (err) {
      console.warn("Failed to load SMS config:", err);
    }
  };

  const handleToggleAtm = async (value: boolean) => {
    try {
      const updated: SmsDetectorConfig = {
        ...config,
        ignoreAtmWithdrawals: value,
      };
      setConfig(updated);
      await saveSmsConfig(updated);
      showSuccess(
        value
          ? "ATM withdrawals will now be ignored"
          : "ATM withdrawals will now be parsed"
      );
    } catch {
      showError("Failed to update ATM setting");
    }
  };

  const openAddModal = (group: GroupConfig) => {
    setActiveGroup(group);
    setNewKeywordInput("");
  };

  const handleAddKeyword = async () => {
    if (!activeGroup || !newKeywordInput.trim()) return;
    const trimmed = newKeywordInput.trim();
    const currentList = config[activeGroup.key];

    // Check duplicate (case-insensitive)
    if (currentList.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      showError(`"${trimmed}" is already in the list`);
      return;
    }

    const updatedList = [...currentList, trimmed];
    const updatedConfig: SmsDetectorConfig = {
      ...config,
      [activeGroup.key]: updatedList,
    };

    try {
      setConfig(updatedConfig);
      await saveSmsConfig(updatedConfig);
      showSuccess(`Added "${trimmed}" to ${activeGroup.title}`);
      setActiveGroup(null);
      setNewKeywordInput("");
    } catch {
      showError("Failed to save changes");
    }
  };

  const handleRemoveKeyword = (groupKey: KeywordGroupKey, keyword: string) => {
    Alert.alert(
      "Remove Keyword",
      `Are you sure you want to remove "${keyword}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const updatedList = config[groupKey].filter((k) => k !== keyword);
            const updatedConfig: SmsDetectorConfig = {
              ...config,
              [groupKey]: updatedList,
            };
            try {
              setConfig(updatedConfig);
              await saveSmsConfig(updatedConfig);
              showSuccess(`Removed "${keyword}"`);
            } catch {
              showError("Failed to remove keyword");
            }
          },
        },
      ]
    );
  };

  const handleResetToDefaults = () => {
    Alert.alert(
      "Reset to Default Rules",
      "This will restore all hardcoded bank senders, keywords, and parsing rules to Financy defaults. Any custom additions will be cleared.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              const reset = await resetSmsConfigToDefaults();
              setConfig(reset);
              showSuccess("SMS rules reset to defaults");
            } catch {
              showError("Failed to reset SMS rules");
            }
          },
        },
      ]
    );
  };

  const handleRunTest = () => {
    const isBank = isBankSender(testSender, config);
    const isAtm = isAtmWithdrawal(testBody, config);
    const parsed = parseSmsTransaction(
      testBody,
      categoryList,
      budgets,
      undefined,
      config
    );

    setTestResult({
      checked: true,
      isBank,
      isAtm,
      parsed,
    });
  };

  const handleSimulateNotification = async () => {
    handleRunTest();
    try {
      const res = await smsService.simulateSms(
        { originatingAddress: testSender, body: testBody, timestamp: Date.now() },
        categoryList,
        budgets
      );
      if (res.success) {
        showSuccess("Notification sent! Tap it to test deep-linking.");
      } else {
        showError(res.reason || "Could not trigger notification for this SMS");
      }
    } catch {
      showError("Failed to schedule test notification");
    }
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <AppHeader
        title="SMS Detector Settings"
        subtitle="Bank rules & keyword customization"
        showBack={true}
        showSettings={false}
        rightAction={
          <TouchableOpacity
            style={[
              styles.headerResetBtn,
              { backgroundColor: colors.surfaceVariant },
            ]}
            onPress={handleResetToDefaults}
            accessibilityLabel="Reset to Defaults"
          >
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: spacing.xxl * 2 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Overview Banner */}
        <Card
          variant="default"
          style={StyleSheet.flatten([
            styles.overviewCard,
            { backgroundColor: colors.primaryContainer },
          ])}
        >
          <View style={styles.overviewHeader}>
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: colors.primary },
              ]}
            >
              <Ionicons name="sparkles" size={20} color={colors.onPrimary} />
            </View>
            <View style={styles.overviewTextContainer}>
              <Text
                style={[
                  styles.overviewTitle,
                  { color: colors.onPrimaryContainer },
                ]}
              >
                Configurable SMS Parser
              </Text>
              <Text
                style={[
                  styles.overviewSubtitle,
                  { color: colors.onPrimaryContainer, opacity: 0.85 },
                ]}
              >
                Financy inspects incoming bank messages in real-time. Below are
                the default hardcoded patterns, which you can customize by
                adding or removing keywords.
              </Text>
            </View>
          </View>
        </Card>

        {/* Global Parsing Toggle: Ignore ATM Cash Withdrawals */}
        <Card variant="outlined" style={styles.sectionCard}>
          <View style={styles.toggleRow}>
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: colors.surfaceVariant, marginRight: spacing.md },
              ]}
            >
              <Ionicons
                name="cash-outline"
                size={20}
                color={colors.onSurfaceVariant}
              />
            </View>
            <View style={styles.toggleTextContainer}>
              <Text style={[styles.toggleTitle, { color: colors.onSurface }]}>
                Ignore ATM Cash Withdrawals
              </Text>
              <Text
                style={[
                  styles.toggleSubtitle,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                Prevent cash withdrawals from being logged as expenses since
                funds stay in your pocket.
              </Text>
            </View>
            <Switch
              value={config.ignoreAtmWithdrawals}
              onValueChange={handleToggleAtm}
            />
          </View>
        </Card>

        {/* Keyword Groups */}
        {GROUPS.map((group) => {
          const list = config[group.key];
          return (
            <Card key={group.key} variant="outlined" style={styles.sectionCard}>
              <View style={styles.groupHeader}>
                <View style={styles.groupTitleRow}>
                  <View
                    style={[
                      styles.iconBadgeSmall,
                      { backgroundColor: colors.secondaryContainer },
                    ]}
                  >
                    <Ionicons
                      name={group.icon}
                      size={16}
                      color={colors.onSecondaryContainer}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <View style={styles.groupTitleWithCount}>
                      <Text
                        style={[
                          styles.groupTitle,
                          { color: colors.onSurface },
                        ]}
                      >
                        {group.title}
                      </Text>
                      <View
                        style={[
                          styles.countBadge,
                          { backgroundColor: colors.surfaceVariant },
                        ]}
                      >
                        <Text
                          style={[
                            styles.countText,
                            { color: colors.onSurfaceVariant },
                          ]}
                        >
                          {list.length}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.groupSubtitle,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {group.subtitle}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.addBtn,
                    { backgroundColor: colors.primaryContainer },
                  ]}
                  onPress={() => openAddModal(group)}
                >
                  <Ionicons name="add" size={16} color={colors.onPrimaryContainer} />
                  <Text
                    style={[
                      styles.addBtnText,
                      { color: colors.onPrimaryContainer },
                    ]}
                  >
                    Add
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Chips container */}
              <View style={styles.chipsContainer}>
                {list.map((kw, idx) => {
                  const isDefault = group.defaultValues.includes(kw);
                  return (
                    <View
                      key={`${kw}-${idx}`}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isDefault
                            ? colors.surfaceVariant
                            : colors.tertiaryContainer,
                          borderColor: isDefault
                            ? colors.outlineVariant
                            : colors.tertiary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isDefault
                              ? colors.onSurfaceVariant
                              : colors.onTertiaryContainer,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {kw}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveKeyword(group.key, kw)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.chipCloseBtn}
                      >
                        <Ionicons
                          name="close-circle"
                          size={16}
                          color={
                            isDefault
                              ? colors.onSurfaceVariant
                              : colors.onTertiaryContainer
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </Card>
          );
        })}

        {/* Interactive SMS Parser Tester */}
        <Card variant="outlined" style={styles.sectionCard}>
          <View style={styles.testerHeader}>
            <View style={styles.groupTitleRow}>
              <View
                style={[
                  styles.iconBadgeSmall,
                  { backgroundColor: colors.primaryContainer },
                ]}
              >
                <Ionicons
                  name="flask-outline"
                  size={16}
                  color={colors.onPrimaryContainer}
                />
              </View>
              <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                <Text style={[styles.groupTitle, { color: colors.onSurface }]}>
                  Interactive Parser Sandbox
                </Text>
                <Text
                  style={[
                    styles.groupSubtitle,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  Test your custom keywords and parsing rules instantly
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Sample Selector */}
          <Text
            style={[
              styles.inputLabel,
              { color: colors.onSurfaceVariant, marginTop: spacing.sm },
            ]}
          >
            Quick Samples:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.sampleScroll}
          >
            {SAMPLE_MESSAGES.map((sample, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.sampleChip,
                  {
                    backgroundColor:
                      testBody === sample.body
                        ? colors.primary
                        : colors.surfaceVariant,
                  },
                ]}
                onPress={() => {
                  setTestSender(sample.sender);
                  setTestBody(sample.body);
                  setTestResult(null);
                }}
              >
                <Text
                  style={[
                    styles.sampleChipText,
                    {
                      color:
                        testBody === sample.body
                          ? colors.onPrimary
                          : colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {sample.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Sender Input */}
          <Text
            style={[
              styles.inputLabel,
              { color: colors.onSurfaceVariant, marginTop: spacing.md },
            ]}
          >
            Sender ID / Bank Name:
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.surfaceVariant,
                color: colors.onSurface,
                borderColor: colors.outlineVariant,
              },
            ]}
            value={testSender}
            onChangeText={(text) => {
              setTestSender(text);
              setTestResult(null);
            }}
            placeholder="e.g. BANK-ALAHLY, CIB"
            placeholderTextColor={colors.onSurfaceVariant}
            autoCapitalize="characters"
          />

          {/* Message Body Input */}
          <Text
            style={[
              styles.inputLabel,
              { color: colors.onSurfaceVariant, marginTop: spacing.sm },
            ]}
          >
            SMS Message Text:
          </Text>
          <TextInput
            style={[
              styles.textInputMulti,
              {
                backgroundColor: colors.surfaceVariant,
                color: colors.onSurface,
                borderColor: colors.outlineVariant,
              },
            ]}
            value={testBody}
            onChangeText={(text) => {
              setTestBody(text);
              setTestResult(null);
            }}
            placeholder="Paste SMS here..."
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
            numberOfLines={4}
          />

          <View style={{ flexDirection: "row", gap: 8, marginTop: spacing.md }}>
            <TouchableOpacity
              style={[
                styles.testBtn,
                { backgroundColor: colors.primary, flex: 1 },
              ]}
              onPress={handleRunTest}
            >
              <Ionicons name="play" size={16} color={colors.onPrimary} />
              <Text style={[styles.testBtnText, { color: colors.onPrimary }]}>
                Test Parsing
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.testBtn,
                { backgroundColor: colors.secondaryContainer, flex: 1 },
              ]}
              onPress={handleSimulateNotification}
            >
              <Ionicons
                name="notifications-outline"
                size={16}
                color={colors.onSecondaryContainer}
              />
              <Text
                style={[
                  styles.testBtnText,
                  { color: colors.onSecondaryContainer },
                ]}
              >
                Fire Notification
              </Text>
            </TouchableOpacity>
          </View>

          {/* Test Results Display */}
          {testResult?.checked && (
            <View
              style={[
                styles.resultContainer,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.outlineVariant,
                },
              ]}
            >
              <Text
                style={[styles.resultTitle, { color: colors.onSurfaceVariant }]}
              >
                Parse Diagnostics:
              </Text>

              {/* Bank Sender check */}
              <View style={styles.resultRow}>
                <Ionicons
                  name={
                    testResult.isBank
                      ? "checkmark-circle"
                      : "close-circle"
                  }
                  size={18}
                  color={testResult.isBank ? "#22C55E" : colors.error}
                />
                <Text
                  style={[styles.resultRowText, { color: colors.onSurface }]}
                >
                  Bank Sender Whitelist:{" "}
                  <Text style={{ fontWeight: "700" }}>
                    {testResult.isBank ? "Recognized" : "Ignored (Not in whitelist)"}
                  </Text>
                </Text>
              </View>

              {/* ATM check */}
              {testResult.isAtm && (
                <View style={styles.resultRow}>
                  <Ionicons
                    name="alert-circle"
                    size={18}
                    color="#F59E0B"
                  />
                  <Text
                    style={[styles.resultRowText, { color: colors.onSurface }]}
                  >
                    ATM Cash Withdrawal:{" "}
                    <Text style={{ fontWeight: "700", color: "#F59E0B" }}>
                      Detected (Ignored by policy)
                    </Text>
                  </Text>
                </View>
              )}

              {/* Parsed Result Summary */}
              {testResult.parsed ? (
                (() => {
                  const parsedType = testResult.parsed.type || "expense";
                  const isIncome = parsedType === "income";
                  return (
                    <View
                      style={[
                        styles.parsedBox,
                        {
                          backgroundColor: isIncome ? "#DCFCE7" : "#FEE2E2",
                          borderColor: isIncome ? "#22C55E" : "#EF4444",
                        },
                      ]}
                    >
                      <View style={styles.parsedHeaderRow}>
                        <View
                          style={[
                            styles.parsedTypeBadge,
                            {
                              backgroundColor: isIncome ? "#16A34A" : "#DC2626",
                            },
                          ]}
                        >
                          <Text style={styles.parsedTypeText}>
                            {parsedType.toUpperCase()}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.parsedAmount,
                            {
                              color: isIncome ? "#15803D" : "#B91C1C",
                            },
                          ]}
                        >
                          {isIncome ? "+" : "-"}
                          {testResult.parsed.amount} EGP
                        </Text>
                      </View>

                      <Text style={styles.parsedDetailText}>
                        <Text style={{ fontWeight: "700" }}>Merchant / Note: </Text>
                        {testResult.parsed.description}
                      </Text>
                      {testResult.parsed.categoryHint && (
                        <Text style={styles.parsedDetailText}>
                          <Text style={{ fontWeight: "700" }}>Category Hint: </Text>
                          {testResult.parsed.categoryHint}
                        </Text>
                      )}
                      <Text style={styles.parsedDetailText}>
                        <Text style={{ fontWeight: "700" }}>Confidence: </Text>
                        {(testResult.parsed.confidence * 100).toFixed(0)}%
                      </Text>
                    </View>
                  );
                })()
              ) : (
                !testResult.isAtm && (
                  <View
                    style={[
                      styles.unparsedBox,
                      { backgroundColor: colors.errorContainer },
                    ]}
                  >
                    <Ionicons
                      name="information-circle"
                      size={18}
                      color={colors.onErrorContainer}
                    />
                    <Text
                      style={[
                        styles.unparsedText,
                        { color: colors.onErrorContainer },
                      ]}
                    >
                      Could not extract transaction amount or structure from this message.
                    </Text>
                  </View>
                )
              )}
            </View>
          )}
        </Card>

        {/* Reset Button at the bottom */}
        <TouchableOpacity
          style={[
            styles.resetBottomBtn,
            { borderColor: colors.outlineVariant },
          ]}
          onPress={handleResetToDefaults}
        >
          <Ionicons name="refresh" size={18} color={colors.error} />
          <Text style={[styles.resetBottomText, { color: colors.error }]}>
            Reset All Rules to Financy Defaults
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Keyword Modal */}
      <Modal
        visible={activeGroup !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveGroup(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
                  Add to {activeGroup?.title}
                </Text>
                <Text
                  style={[
                    styles.modalSubtitle,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {activeGroup?.subtitle}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setActiveGroup(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.surfaceVariant,
                  color: colors.onSurface,
                  borderColor: colors.outlineVariant,
                },
              ]}
              value={newKeywordInput}
              onChangeText={setNewKeywordInput}
              placeholder={activeGroup?.placeholder}
              placeholderTextColor={colors.onSurfaceVariant}
              autoFocus
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleAddKeyword}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  { backgroundColor: colors.surfaceVariant },
                ]}
                onPress={() => setActiveGroup(null)}
              >
                <Text
                  style={[
                    styles.modalCancelText,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  {
                    backgroundColor: newKeywordInput.trim()
                      ? colors.primary
                      : colors.surfaceVariant,
                  },
                ]}
                disabled={!newKeywordInput.trim()}
                onPress={handleAddKeyword}
              >
                <Text
                  style={[
                    styles.modalConfirmText,
                    {
                      color: newKeywordInput.trim()
                        ? colors.onPrimary
                        : colors.onSurfaceVariant,
                    },
                  ]}
                >
                  Add Keyword
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerResetBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  overviewCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBadgeSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  overviewSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  groupTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  groupTitleWithCount: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  countBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countText: {
    fontSize: 11,
    fontWeight: "600",
  },
  groupSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginLeft: 8,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 2,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: "100%",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    marginRight: 4,
  },
  chipCloseBtn: {
    padding: 2,
  },
  testerHeader: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  sampleScroll: {
    flexDirection: "row",
    marginBottom: 8,
  },
  sampleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 8,
  },
  sampleChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  textInput: {
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  textInputMulti: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    fontSize: 13,
    textAlignVertical: "top",
    minHeight: 70,
  },
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 42,
    borderRadius: 12,
  },
  testBtnText: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },
  resultContainer: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  resultTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  resultRowText: {
    fontSize: 13,
    marginLeft: 8,
  },
  parsedBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  parsedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  parsedTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  parsedTypeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  parsedAmount: {
    fontSize: 18,
    fontWeight: "800",
  },
  parsedDetailText: {
    fontSize: 13,
    color: "#1F2937",
    marginTop: 2,
  },
  unparsedBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  unparsedText: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  resetBottomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 4,
  },
  resetBottomText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalInput: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    fontSize: 15,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalConfirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
