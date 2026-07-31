import React from 'react';
import { View, Text } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Card } from '../../components/ui';
import { useAppTheme } from '../../components/ui/ThemeProvider';

export interface PieChartCardProps {
  title: string;
  data: { name: string; amount: number; color: string }[];
  emptyMessage?: string;
}

export const PieChartCard: React.FC<PieChartCardProps> = ({
  title,
  data,
  emptyMessage = 'No spending data available',
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

  const chartData = data.slice(0, 6).map((item: any, index: number) => {
    let name = item.name;
    if (typeof name === 'string' && name.length > 15) name = name.substring(0, 15) + '...';
    return {
      name: String(name),
      population: Math.abs(item.amount || 0),
      color: item.color || colors.primary,
      legendFontColor: colors.onSurfaceVariant,
      legendFontSize: 12,
    };
  });

  return (
    <Card variant="outlined" style={{ marginBottom: spacing.md, padding: spacing.md }}>
      <Text style={{ color: colors.onSurface, ...typography.h3, marginBottom: spacing.md }}>{title}</Text>
      <View style={{ alignItems: 'center' }}>
        <PieChart
          data={chartData}
          width={300}
          height={180}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: 'transparent',
            backgroundGradientTo: 'transparent',
            color: (opacity = 1) => colors.primary,
            labelColor: () => colors.onSurfaceVariant,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[0, 0]}
          hasLegend={true}
          absolute={false}
        />
      </View>
    </Card>
  );
};
