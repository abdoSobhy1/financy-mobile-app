import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  StatusBar,
  ViewStyle,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { UI } from "../../constants";
import { useAppTheme } from "./ThemeProvider";

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  showsVerticalScrollIndicator?: boolean;
  keyboardShouldPersistTaps?: "always" | "never" | "handled";
}

const Screen: React.FC<ScreenProps> = ({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
  keyboardShouldPersistTaps = "handled",
}) => {
  const { colors, isDark } = useAppTheme();

  const content = scrollable ? (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }, style]}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      {content}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: UI.SPACING.LG,
  },
});

export default Screen;
