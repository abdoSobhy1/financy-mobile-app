import { Dimensions } from "react-native";

import { UI } from "../../../shared/constants";
export const { width } = Dimensions.get("window");
export const GLASS = {
  bg: "rgba(255,255,255,0.04)",
  border: "rgba(108,92,231,0.18)",
  borderLight: "rgba(108,92,231,0.10)",
  grid: "rgba(108,92,231,0.10)",
  labelColor: "rgba(255,255,255,0.6)",
};
export const makeChartConfig = (overrides: Record<string, any> = {}) => ({
  backgroundColor: "transparent",
  backgroundGradientFrom: "transparent",
  backgroundGradientTo: "transparent",
  backgroundGradientFromOpacity: 0,
  backgroundGradientToOpacity: 0,
  decimalPlaces: 0,
  color: (opacity = 1) => UI.COLORS.PRIMARY,
  labelColor: () => GLASS.labelColor,
  style: { borderRadius: 16 },
  propsForBackgroundLines: {
    strokeOpacity: 0.08,
    stroke: GLASS.grid,
  },
  propsForLabels: {
    fontSize: 11,
    fontFamily: "System",
  },
  withHorizontalLines: true,
  withVerticalLines: false,
  ...overrides,
});
