import { SmsKeywordGroups } from "../components/SmsKeywordGroups";
import { SmsTestSandbox } from "../components/SmsTestSandbox";
import { SmsKeywordEditorModal } from "../components/SmsKeywordEditorModal";
import { styles } from "./SmsDetectorSettingsScreen.styles";
import { useSmsDetectorSettingsScreen } from "../hooks/useSmsDetectorSettingsScreen";
import { GROUPS } from "../model/settingsOptions";
import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { AppHeader } from "../../../shared/ui/AppHeader";
import { Card, Switch } from "../../../shared/ui";

export const SmsDetectorSettingsScreen: React.FC = () => {
  const { config, activeGroup, setActiveGroup, newKeywordInput, setNewKeywordInput, testSender, setTestSender, testBody, setTestBody, testResult, setTestResult, handleToggleAtm, openAddModal, handleAddKeyword, handleRemoveKeyword, handleResetToDefaults, handleRunTest, handleSimulateNotification } = useSmsDetectorSettingsScreen();
  const { colors, typography, spacing, radius, isDark } = useAppTheme();

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
            <SmsKeywordGroups key={group.key} group={group} list={list} openAddModal={openAddModal} handleRemoveKeyword={handleRemoveKeyword} />
          );
        })}

        {/* Interactive SMS Parser Tester */}
        <SmsTestSandbox testBody={testBody} setTestSender={setTestSender} setTestBody={setTestBody} setTestResult={setTestResult} testSender={testSender} handleRunTest={handleRunTest} handleSimulateNotification={handleSimulateNotification} testResult={testResult} />

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
      <SmsKeywordEditorModal activeGroup={activeGroup} setActiveGroup={setActiveGroup} newKeywordInput={newKeywordInput} setNewKeywordInput={setNewKeywordInput} handleAddKeyword={handleAddKeyword} />
    </SafeAreaView>
  );
};
