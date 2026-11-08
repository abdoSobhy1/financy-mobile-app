import { SmsTestResult } from "./SmsTestResult";
import { styles } from "../screens/SmsDetectorSettingsScreen.styles";
import type { useSmsDetectorSettingsScreen } from "../hooks/useSmsDetectorSettingsScreen";
import { SAMPLE_MESSAGES } from "../model/settingsOptions";

import { View, Text, ScrollView, TouchableOpacity, TextInput } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";

import { Card } from "../../../shared/ui";

interface SmsTestSandboxProps {
  testBody: ReturnType<typeof useSmsDetectorSettingsScreen>["testBody"];
  setTestSender: ReturnType<typeof useSmsDetectorSettingsScreen>["setTestSender"];
  setTestBody: ReturnType<typeof useSmsDetectorSettingsScreen>["setTestBody"];
  setTestResult: ReturnType<typeof useSmsDetectorSettingsScreen>["setTestResult"];
  testSender: ReturnType<typeof useSmsDetectorSettingsScreen>["testSender"];
  handleRunTest: ReturnType<typeof useSmsDetectorSettingsScreen>["handleRunTest"];
  handleSimulateNotification: ReturnType<typeof useSmsDetectorSettingsScreen>["handleSimulateNotification"];
  testResult: ReturnType<typeof useSmsDetectorSettingsScreen>["testResult"];

}
export function SmsTestSandbox({ testBody, setTestSender, setTestBody, setTestResult, testSender, handleRunTest, handleSimulateNotification, testResult }: SmsTestSandboxProps) {
  const { colors, spacing } = useAppTheme();

  return (<Card variant="outlined" style={styles.sectionCard}>
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
      <SmsTestResult colors={colors} testResult={testResult} />
    )}
  </Card>);
}
