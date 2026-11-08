import { styles } from "./SmsDetectorSections.styles";

import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme, type AppTheme } from "../../../shared/theme/ThemeProvider";
import type { ParsedTransaction } from "../../../shared/types";

interface SmsTestResultProps {
  colors: AppTheme["colors"];
  testResult: { checked: boolean; isBank: boolean; isAtm: boolean; parsed: ParsedTransaction | null; } | null;
}
export function SmsTestResult({ colors, testResult }: SmsTestResultProps) {
  if (!testResult) return null;
  return (<View
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
  </View>);
}
