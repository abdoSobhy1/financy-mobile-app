import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Card } from '../../components/ui';
import { useAppTheme } from '../../components/ui/ThemeProvider';

const { width } = Dimensions.get('window');

export interface LineChartCardProps {
  title: string;
  data: any[];
  emptyMessage?: string;
}

export const LineChartCard: React.FC<LineChartCardProps> = ({
  title,
  data,
  emptyMessage = 'No trend data available',
}) => {
  const { colors, typography, spacing } = useAppTheme();

  if (!data || data.length === 0) {
    return (
      <Card variant="outlined" style={{ marginBottom: spacing.md, padding: spacing.md }}>
        <Text style={{ color: colors.onSurface, ...typography.h3 }}>{title}</Text>
        <Text style={{ color: colors.onSurfaceVariant, marginTop: spacing.md }}>{emptyMessage}</Text>
      </Card>
    );
  }

  const chartData = {
    labels: data.map((item) => {
      const label = item.month || item.name || '';
      return label.substring(0, 3);
    }),
    datasets: [
      {
        data: data.map((item) => Math.abs(item.balance || item.value || item.amount || 0)),
        color: (opacity = 1) => colors.primary,
        strokeWidth: 2,
      },
    ],
  };

  return (
    <Card variant="outlined" style={{ marginBottom: spacing.md, padding: spacing.md }}>
      <Text style={{ color: colors.onSurface, ...typography.h3, marginBottom: spacing.md }}>{title}</Text>
      <View style={{ alignItems: 'center', marginLeft: -20 }}>
        <LineChart
          data={chartData}
          width={width - 56}
          height={220}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: 'transparent',
            backgroundGradientTo: 'transparent',
            color: (opacity = 1) => colors.primary,
            labelColor: () => colors.onSurfaceVariant,
            propsForDots: {
              r: '4',
              strokeWidth: '1',
              stroke: colors.primaryContainer,
            },
            propsForBackgroundLines: {
              stroke: colors.outlineVariant,
              strokeDasharray: '', // solid lines
            }
          }}
          bezier
          fromZero
          style={{ marginVertical: 8, borderRadius: 16 }}
        />
      </View>
    </Card>
  );
};
