import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../theme/ThemeProvider";

export const useTabBarHeight = () => {
  const insets = useSafeAreaInsets();
  const { spacing } = useAppTheme();

  // TabBar base height (70) + bottom offset
  const tabBarHeight = 70 + Math.max(insets.bottom, spacing.md);

  // Add spacing.xl (20) for breathing room below content
  return tabBarHeight + spacing.xl;
};
