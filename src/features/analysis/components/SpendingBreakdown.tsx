import { useAnalysisScreen } from "../hooks/useAnalysisScreen";
import { styles } from "../screens/AnalysisScreen.styles";
import { Ionicons } from "@expo/vector-icons";

import { Text, TouchableOpacity, View } from "react-native";

import Svg, { Circle, G } from "react-native-svg";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { IconChip } from "../../../shared/ui";

import { formatCurrency } from "../../../shared/utils";

interface SpendingBreakdownProps {
  categoryBreakdown: ReturnType<typeof useAnalysisScreen>["categoryBreakdown"];
  summary: ReturnType<typeof useAnalysisScreen>["summary"];
  selectedSliceIndex: ReturnType<typeof useAnalysisScreen>["selectedSliceIndex"];
  colors: ReturnType<typeof useAppTheme>["colors"];
  typography: ReturnType<typeof useAppTheme>["typography"];
  setSelectedSliceIndex: ReturnType<typeof useAnalysisScreen>["setSelectedSliceIndex"];
  resolveCategoryColor: ReturnType<typeof useAppTheme>["resolveCategoryColor"];
}
export function SpendingBreakdown({ categoryBreakdown, summary, selectedSliceIndex, colors, typography, setSelectedSliceIndex, resolveCategoryColor }: SpendingBreakdownProps) {

  const expenses = categoryBreakdown.filter((item) => item.category.type === "expense");
  const totalExpenses = Math.abs(summary.totalExpenses);

  const donutSize = 188;
  const strokeWidth = 18;
  const center = donutSize / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;

  let cumulativePct = 0;
  const activeItem =
    selectedSliceIndex !== null && expenses[selectedSliceIndex]
      ? expenses[selectedSliceIndex]
      : null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.outlineVariant,
          borderWidth: 1,
        },
      ]}>
      <View style={styles.cardHeader}>
        <Text style={[typography.h3, { color: colors.onBackground }]}>
          Spending Breakdown
        </Text>
        <Ionicons
          name="pie-chart-outline"
          size={20}
          color={colors.onSurfaceVariant}
        />
      </View>

      {/* Interactive SVG Donut Chart */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setSelectedSliceIndex(null)}
        style={{
          alignItems: "center",
          justifyContent: "center",
          marginVertical: 24,
        }}>
        <View
          style={{
            width: donutSize,
            height: donutSize,
            alignItems: "center",
            justifyContent: "center",
          }}>
          <Svg width={donutSize} height={donutSize}>
            <G rotation="-90" origin={`${center}, ${center}`}>
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={colors.surfaceVariant}
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {totalExpenses > 0 &&
                expenses.map((item, idx) => {
                  const pct = Math.max(0, Math.min(100, item.percentage)) / 100;
                  const strokeDasharray = `${pct * circumference} ${circumference}`;
                  const strokeDashoffset = -cumulativePct * circumference;
                  cumulativePct += pct;
                  const { iconColor } = resolveCategoryColor(
                    (item.category as any).color
                  );
                  const isDimmed =
                    selectedSliceIndex !== null && selectedSliceIndex !== idx;

                  return (
                    <Circle
                      key={item.category.id || idx}
                      cx={center}
                      cy={center}
                      r={radius}
                      stroke={iconColor}
                      strokeWidth={
                        selectedSliceIndex === idx
                          ? strokeWidth + 4
                          : strokeWidth
                      }
                      strokeOpacity={isDimmed ? 0.3 : 1}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap={expenses.length === 1 ? "round" : "butt"}
                      fill="transparent"
                    />
                  );
                })}
            </G>
          </Svg>

          {/* Center Label inside Donut */}
          <View
            style={{
              position: "absolute",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 24,
            }}>
            <Text
              style={[
                typography.label,
                {
                  color: colors.onSurfaceVariant,
                  marginBottom: 4,
                  textAlign: "center",
                },
              ]}
              numberOfLines={1}>
              {activeItem ? activeItem.category.name : "Total Spent"}
            </Text>
            <Text
              style={[
                typography.h2,
                {
                  color: colors.onBackground,
                  fontSize: 22,
                  fontWeight: "800",
                  textAlign: "center",
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {formatCurrency(
                activeItem ? Math.abs(activeItem.amount) : totalExpenses
              )}
            </Text>
            {activeItem && (
              <Text
                style={[
                  typography.bodySmall,
                  { color: colors.primary, fontWeight: "700", marginTop: 2 },
                ]}>
                {Math.round(activeItem.percentage)}% of total
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {expenses.length === 0 ? (
        <Text
          style={[
            typography.bodyMedium,
            {
              color: colors.onSurfaceVariant,
              textAlign: "center",
              paddingVertical: 12,
            },
          ]}>
          No expenses recorded for this period.
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {expenses.map((item, index) => {
            const isSelected = selectedSliceIndex === index;
            const { iconColor, bgColor } = resolveCategoryColor(
              (item.category as any).color
            );
            return (
              <TouchableOpacity
                key={item.category.id || index}
                activeOpacity={0.75}
                onPress={() =>
                  setSelectedSliceIndex(isSelected ? null : index)
                }
                style={[
                  styles.breakdownRow,
                  {
                    backgroundColor: isSelected
                      ? bgColor
                      : colors.surfaceVariant,
                    borderColor: isSelected ? iconColor : "transparent",
                    borderWidth: 1,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 16,
                  },
                ]}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}>
                  <IconChip
                    iconName={
                      ((item.category as any).icon || "pricetag") as any
                    }
                    colorName={(item.category as any).color || "bluegrey"}
                    size={32}
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    style={[
                      typography.bodyLarge,
                      { color: colors.onBackground, fontWeight: "600", flex: 1 },
                    ]}
                    numberOfLines={1}>
                    {item.category.name}
                  </Text>
                </View>
                <Text
                  style={[
                    typography.bodySmall,
                    {
                      color: colors.onSurfaceVariant,
                      width: 46,
                      textAlign: "right",
                      fontWeight: "600",
                    },
                  ]}>
                  {Math.round(item.percentage)}%
                </Text>
                <Text
                  style={[
                    typography.bodyLarge,
                    {
                      color: colors.onBackground,
                      fontWeight: "700",
                      minWidth: 84,
                      textAlign: "right",
                    },
                  ]}>
                  {formatCurrency(Math.abs(item.amount))}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

}
