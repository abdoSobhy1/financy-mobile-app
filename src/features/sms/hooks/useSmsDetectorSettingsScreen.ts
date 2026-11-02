import { SAMPLE_MESSAGES, type KeywordGroupKey, type GroupConfig } from "../model/settingsOptions";
import { useState, useEffect, useMemo } from "react";
import { AlertService } from "../../../shared/services/AlertService";

import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";

import { useToast } from "../../../shared/ui";
import { SmsDetectorConfig, getSmsConfig, saveSmsConfig, resetSmsConfigToDefaults, DEFAULT_SMS_CONFIG, subscribeSmsConfig } from "../services/smsConfigService";
import { isBankSender, isAtmWithdrawal, parseSmsTransaction } from "../services/smsParser";
import { smsService } from "../services/smsService";
import { ParsedTransaction } from "../../../shared/types";

export function useSmsDetectorSettingsScreen() {

  const navigation = useNavigation<any>();
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
    return subscribeSmsConfig(setConfig);
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
    AlertService.alert(
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
    AlertService.alert(
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
  return { config, activeGroup, setActiveGroup, newKeywordInput, setNewKeywordInput, testSender, setTestSender, testBody, setTestBody, testResult, setTestResult, handleToggleAtm, openAddModal, handleAddKeyword, handleRemoveKeyword, handleResetToDefaults, handleRunTest, handleSimulateNotification };
}
