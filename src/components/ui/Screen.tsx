import React from "react";
import { View, ScrollView, StyleSheet, StatusBar, ViewStyle, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { UI } from "../../constants";

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
  const content = scrollable ? (
    <ScrollView
      style={[styles.scrollView, style]}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.container, style]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={UI.COLORS.BACKGROUND} />
      {content}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: UI.COLORS.BACKGROUND,
  },

  container: {
    flex: 1,
    backgroundColor: UI.COLORS.BACKGROUND,
  },

  scrollView: {
    flex: 1,
    backgroundColor: UI.COLORS.BACKGROUND,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: UI.SPACING.LG,
  },
});

export default Screen;
