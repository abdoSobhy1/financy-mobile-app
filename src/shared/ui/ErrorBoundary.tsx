import React, { Component, ReactNode, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Share,
  StatusBar,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "../theme/ThemeProvider";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface ErrorBoundaryFallbackProps {
  error?: Error;
  errorInfo?: React.ErrorInfo;
  onReset: () => void;
  reset?: () => void;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?:
    | ReactNode
    | ((props: ErrorBoundaryFallbackProps) => ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * Safe theme hook that gracefully falls back to default styling
 * if rendered outside the ThemeProvider or during critical bootstrap errors.
 */
function useSafeTheme() {
  try {
    return useAppTheme();
  } catch {
    return {
      colors: {
        primary: "#0D7A55",
        onPrimary: "#FFFFFF",
        primaryContainer: "rgba(13, 122, 85, 0.15)",
        onPrimaryContainer: "#0D7A55",
        secondary: "#00CE9F",
        onSecondary: "#FFFFFF",
        surface: "#1A1A2E",
        onSurface: "#FFFFFF",
        surfaceVariant: "#25253E",
        onSurfaceVariant: "#A0A0B0",
        background: "#0B0B1E",
        onBackground: "#FFFFFF",
        error: "#FF7675",
        onError: "#FFFFFF",
        errorContainer: "rgba(255, 118, 117, 0.16)",
        onErrorContainer: "#FF7675",
        outline: "rgba(255, 255, 255, 0.15)",
        outlineVariant: "rgba(255, 255, 255, 0.08)",
      },
      isDark: true,
      typography: {
        h1: { fontSize: 32, fontWeight: "700" as const, lineHeight: 40 },
        h2: { fontSize: 24, fontWeight: "700" as const, lineHeight: 32 },
        h3: { fontSize: 20, fontWeight: "600" as const, lineHeight: 28 },
        bodyLarge: { fontSize: 16, fontWeight: "400" as const, lineHeight: 24 },
        bodyMedium: { fontSize: 14, fontWeight: "400" as const, lineHeight: 20 },
        bodySmall: { fontSize: 12, fontWeight: "400" as const, lineHeight: 16 },
        caption: { fontSize: 12, fontWeight: "400" as const, lineHeight: 16 },
        label: { fontSize: 14, fontWeight: "600" as const, lineHeight: 20 },
      },
      spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 },
      radius: { sm: 10, md: 16, lg: 20, pill: 999 },
    };
  }
}

/**
 * Modernized Error Boundary Screen
 * Designed to match Financy's refined Material 3 aesthetic in both light and dark themes.
 */
export const ErrorFallbackView: React.FC<ErrorBoundaryFallbackProps> = ({
  error,
  errorInfo,
  onReset,
}) => {
  const { colors, isDark, typography, spacing, radius } = useSafeTheme();
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [hasShared, setHasShared] = useState(false);

  const toggleDetails = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsDetailsExpanded((prev) => !prev);
  };

  const handleShareDiagnostics = async () => {
    try {
      const timestamp = new Date().toISOString();
      const report = [
        `=== Financy Diagnostic Error Report ===`,
        `Timestamp: ${timestamp}`,
        `Platform: ${Platform.OS} (${Platform.Version})`,
        `Error Name: ${error?.name || "Error"}`,
        `Error Message: ${error?.message || "Unknown error"}`,
        ``,
        `--- Stack Trace ---`,
        error?.stack || "No stack trace available",
        ``,
        errorInfo?.componentStack
          ? `--- Component Stack ---\n${errorInfo.componentStack.trim()}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      await Share.share({
        title: "Financy Error Report",
        message: report,
      });

      setHasShared(true);
      setTimeout(() => setHasShared(false), 3000);
    } catch (err) {
      console.error("Failed to share diagnostic report:", err);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top", "bottom", "left", "right"]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centerCardContainer}>
          {/* Hero Visual Icon with Ambient Glow */}
          <View style={styles.heroSection}>
            <View
              style={[
                styles.heroGlowOuter,
                {
                  backgroundColor: colors.errorContainer,
                  borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(239, 68, 68, 0.15)",
                },
              ]}
            >
              <LinearGradient
                colors={
                  isDark
                    ? [colors.error + "40", colors.error + "15"]
                    : [colors.errorContainer, colors.surface]
                }
                style={styles.heroBadgeInner}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={42}
                  color={colors.error}
                />
              </LinearGradient>
            </View>

            {/* Pill Badge Tag */}
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: colors.errorContainer,
                  borderColor: isDark ? "rgba(255, 118, 117, 0.3)" : "rgba(239, 68, 68, 0.25)",
                },
              ]}
            >
              <View style={[styles.statusDot, { backgroundColor: colors.error }]} />
              <Text style={[styles.statusPillText, { color: colors.error }]}>
                Application Issue
              </Text>
            </View>

            {/* Main Headline */}
            <Text
              style={[
                typography.h2,
                styles.headline,
                { color: colors.onBackground },
              ]}
            >
              Something went wrong
            </Text>

            {/* Reassuring Subtitle */}
            <Text
              style={[
                typography.bodyMedium,
                styles.subtitle,
                { color: colors.onSurfaceVariant },
              ]}
            >
              An unexpected error interrupted this view. Your transactions, budgets,
              and financial data remain safely preserved in your database.
            </Text>
          </View>

          {/* Elevated Error Summary Card */}
          <View
            style={[
              styles.errorCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.outlineVariant,
                borderRadius: radius.md,
                shadowColor: isDark ? "#000000" : "#64748B",
                shadowOpacity: isDark ? 0.35 : 0.08,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="bug-outline" size={16} color={colors.error} />
                <Text
                  style={[
                    styles.cardHeaderTitle,
                    { color: colors.error },
                  ]}
                >
                  Error Details
                </Text>
              </View>

              <View
                style={[
                  styles.errorTypeTag,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.outlineVariant,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.errorTypeTagText,
                    { color: colors.onSurfaceVariant },
                  ]}
                  numberOfLines={1}
                >
                  {error?.name || "Exception"}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.errorMessageBox,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: isDark
                    ? "rgba(255, 255, 255, 0.05)"
                    : colors.outlineVariant,
                },
              ]}
            >
              <Text
                selectable
                style={[
                  styles.errorMessageText,
                  { color: colors.onSurface },
                ]}
              >
                {error?.message || "An unexpected error occurred during execution."}
              </Text>
            </View>
          </View>

          {/* Expandable Technical Diagnostics Drawer */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={toggleDetails}
            style={[
              styles.diagnosticsToggle,
              {
                backgroundColor: colors.surface,
                borderColor: colors.outlineVariant,
                borderRadius: radius.sm,
              },
            ]}
          >
            <View style={styles.diagnosticsToggleLeft}>
              <Ionicons
                name="terminal-outline"
                size={18}
                color={colors.onSurfaceVariant}
              />
              <Text
                style={[
                  typography.label,
                  styles.diagnosticsToggleLabel,
                  { color: colors.onSurface },
                ]}
              >
                Technical Diagnostics
              </Text>
            </View>
            <Ionicons
              name={isDetailsExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.onSurfaceVariant}
            />
          </TouchableOpacity>

          {isDetailsExpanded && (
            <View
              style={[
                styles.terminalContainer,
                {
                  borderColor: isDark
                    ? "rgba(255, 255, 255, 0.12)"
                    : "rgba(15, 23, 42, 0.15)",
                },
              ]}
            >
              {/* Terminal Title Bar */}
              <View style={styles.terminalHeader}>
                <View style={styles.terminalDots}>
                  <View style={[styles.terminalDot, { backgroundColor: "#FF5F56" }]} />
                  <View style={[styles.terminalDot, { backgroundColor: "#FFBD2E" }]} />
                  <View style={[styles.terminalDot, { backgroundColor: "#27C93F" }]} />
                </View>
                <Text style={styles.terminalHeaderTitle}>stack-trace.log</Text>
                <View style={{ width: 40 }} />
              </View>

              <ScrollView
                style={styles.terminalScrollView}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                <Text selectable style={styles.terminalCode}>
                  {error?.stack || errorInfo?.componentStack || error?.message || "No stack trace available."}
                  {errorInfo?.componentStack && error?.stack
                    ? `\n\n[Component Hierarchy]\n${errorInfo.componentStack.trim()}`
                    : ""}
                </Text>
              </ScrollView>
            </View>
          )}

          {/* Action CTAs */}
          <View style={styles.actionsContainer}>
            {/* Primary "Try Again" Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.md,
                },
              ]}
              onPress={onReset}
            >
              <Ionicons
                name="refresh-outline"
                size={20}
                color={colors.onPrimary}
              />
              <Text
                style={[
                  typography.label,
                  styles.primaryButtonText,
                  { color: colors.onPrimary },
                ]}
              >
                Try Again
              </Text>
            </TouchableOpacity>

            {/* Secondary "Share Diagnostics" Button */}
            <TouchableOpacity
              activeOpacity={0.75}
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.outlineVariant,
                  borderRadius: radius.md,
                },
              ]}
              onPress={handleShareDiagnostics}
            >
              <Ionicons
                name={hasShared ? "checkmark-circle-outline" : "share-social-outline"}
                size={18}
                color={hasShared ? colors.primary : colors.onSurface}
              />
              <Text
                style={[
                  typography.label,
                  styles.secondaryButtonText,
                  { color: hasShared ? colors.primary : colors.onSurface },
                ]}
              >
                {hasShared ? "Report Shared" : "Share Diagnostics"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/**
 * Modern Class Component ErrorBoundary
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          onReset: this.handleReset,
          reset: this.handleReset,
        });
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallbackView
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerCardContainer: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  heroGlowOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  heroBadgeInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    justifyContent: "center",
    alignItems: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  headline: {
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    paddingHorizontal: 12,
    lineHeight: 20,
  },
  errorCard: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardHeaderTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  errorTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    maxWidth: 160,
  },
  errorTypeTagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  errorMessageBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorMessageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  diagnosticsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  diagnosticsToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  diagnosticsToggleLabel: {
    fontSize: 13,
  },
  terminalContainer: {
    backgroundColor: "#0A0E17",
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  terminalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  terminalDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  terminalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  terminalHeaderTitle: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "500",
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  },
  terminalScrollView: {
    maxHeight: 180,
    padding: 12,
  },
  terminalCode: {
    color: "#E2E8F0",
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  },
  actionsContainer: {
    marginTop: 6,
    gap: 10,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    borderWidth: 1,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default ErrorBoundary;
