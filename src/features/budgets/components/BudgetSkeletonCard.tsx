import { styles } from "./BudgetScreens.styles";

import { View } from "react-native";

import { useAppTheme, type AppTheme } from "../../../shared/theme/ThemeProvider";

import { Shimmer } from "../../../shared/ui";

interface BudgetSkeletonCardProps {
  colors: AppTheme["colors"];
}
export function BudgetSkeletonCard({ colors }: BudgetSkeletonCardProps) {
  return ((
    <View
      style={[
        styles.budgetCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.outlineVariant,
          borderWidth: 1,
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
        <Shimmer width={40} height={40} borderRadius={20} />
        <View style={{ marginLeft: 12, flex: 1, gap: 6 }}>
          <Shimmer width={130} height={18} borderRadius={4} />
          <Shimmer width={180} height={12} borderRadius={4} />
        </View>
        <Shimmer width={70} height={18} borderRadius={4} />
      </View>
      <Shimmer height={8} borderRadius={4} width="100%" />
    </View>
  ));
}
