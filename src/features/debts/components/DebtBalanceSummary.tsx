import { styles } from "./DebtsSections.styles";
import type { DebtsScreenController } from "../hooks/useDebtsScreen";

import { View, Text } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useAppTheme, type AppTheme } from "../../../shared/theme/ThemeProvider";

import { formatCurrency } from "../../../shared/utils";

interface DebtBalanceSummaryProps {
  colors: AppTheme["colors"];
  typography: AppTheme["typography"];
  totalOwedToYou: DebtsScreenController["totalOwedToYou"];
  owedToMeList: DebtsScreenController["owedToMeList"];
  totalYouOwe: DebtsScreenController["totalYouOwe"];
  overdueList: DebtsScreenController["overdueList"];
  iOweList: DebtsScreenController["iOweList"];
}
export function DebtBalanceSummary({ colors, typography, totalOwedToYou, owedToMeList, totalYouOwe, overdueList, iOweList }: DebtBalanceSummaryProps) {
  return (<View style={styles.summaryGrid}>
    {/* Owed To You Card */}
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.outlineVariant,
        },
      ]}>
      <View style={styles.summaryHeaderRow}>
        <View
          style={[
            styles.miniIconBadge,
            { backgroundColor: colors.primary + "22" },
          ]}>
          <Ionicons
            name="arrow-down-outline"
            size={16}
            color={colors.primary}
          />
        </View>
        <Text
          style={[
            typography.label,
            { color: colors.onSurfaceVariant, fontSize: 11 },
          ]}>
          OWED TO YOU
        </Text>
      </View>
      <Text
        style={[styles.summaryAmount, { color: colors.primary }]}
        numberOfLines={1}
        adjustsFontSizeToFit>
        {formatCurrency(totalOwedToYou)}
      </Text>
      <Text
        style={[
          typography.bodySmall,
          { color: colors.onSurfaceVariant },
        ]}>
        {owedToMeList.length} active{" "}
        {owedToMeList.length === 1 ? "record" : "records"}
      </Text>
    </View>

    {/* You Owe Card */}
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.outlineVariant,
        },
      ]}>
      <View style={styles.summaryHeaderRow}>
        <View
          style={[
            styles.miniIconBadge,
            { backgroundColor: colors.error + "22" },
          ]}>
          <Ionicons
            name="arrow-up-outline"
            size={16}
            color={colors.error}
          />
        </View>
        <Text
          style={[
            typography.label,
            { color: colors.onSurfaceVariant, fontSize: 11 },
          ]}>
          YOU OWE
        </Text>
      </View>
      <Text
        style={[styles.summaryAmount, { color: colors.error }]}
        numberOfLines={1}
        adjustsFontSizeToFit>
        {formatCurrency(totalYouOwe)}
      </Text>
      <Text
        style={[
          typography.bodySmall,
          {
            color:
              overdueList.length > 0
                ? colors.error
                : colors.onSurfaceVariant,
          },
        ]}>
        {overdueList.length > 0
          ? `${overdueList.length} overdue`
          : `${iOweList.length} active`}
      </Text>
    </View>
  </View>);
}
