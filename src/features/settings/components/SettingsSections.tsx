import { SectionHeading as SectionLabel } from "../../../shared/ui/SectionHeading";
import { ActionRow as SettingRow } from "../../../shared/ui/ActionRow";
import { SectionCard as GlassCard } from "../../../shared/ui/SectionCard";

import { useSettingsScreen } from "../hooks/useSettingsScreen";

import { View, Text, ScrollView, TouchableOpacity, Platform } from "react-native";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";

import { Ionicons } from "@expo/vector-icons";
import { Switch } from "../../../shared/ui";

interface SettingsSectionsProps {
  tabBarHeight: number;
  isGuest: ReturnType<typeof useSettingsScreen>["isGuest"];
  user: ReturnType<typeof useSettingsScreen>["user"];
  setProfileNameInput: ReturnType<typeof useSettingsScreen>["setProfileNameInput"];
  setShowProfileModal: ReturnType<typeof useSettingsScreen>["setShowProfileModal"];
  handleSignOut: ReturnType<typeof useSettingsScreen>["handleSignOut"];
  setShowCurrencyPicker: ReturnType<typeof useSettingsScreen>["setShowCurrencyPicker"];
  currentBillingDay: ReturnType<typeof useSettingsScreen>["currentBillingDay"];
  setBillingDayInput: ReturnType<typeof useSettingsScreen>["setBillingDayInput"];
  setShowBillingDayPicker: ReturnType<typeof useSettingsScreen>["setShowBillingDayPicker"];
  handleToggleTheme: ReturnType<typeof useSettingsScreen>["handleToggleTheme"];
  navigation: ReturnType<typeof useSettingsScreen>["navigation"];
  notifSettings: ReturnType<typeof useSettingsScreen>["notifSettings"];
  handleReminderToggle: ReturnType<typeof useSettingsScreen>["handleReminderToggle"];
  smsEnabled: ReturnType<typeof useSettingsScreen>["smsEnabled"];
  handleSmsToggle: ReturnType<typeof useSettingsScreen>["handleSmsToggle"];
  isOwner: ReturnType<typeof useSettingsScreen>["isOwner"];
  aiStatus: ReturnType<typeof useSettingsScreen>["aiStatus"];
  handleOpenAiSettings: ReturnType<typeof useSettingsScreen>["handleOpenAiSettings"];
  handleExportData: ReturnType<typeof useSettingsScreen>["handleExportData"];
  lastSyncSubtitle: ReturnType<typeof useSettingsScreen>["lastSyncSubtitle"];
  handleSyncNow: ReturnType<typeof useSettingsScreen>["handleSyncNow"];
  setShowFirebaseCleanup: ReturnType<typeof useSettingsScreen>["setShowFirebaseCleanup"];

}
export function SettingsSections({ tabBarHeight, isGuest, user, setProfileNameInput, setShowProfileModal, handleSignOut, setShowCurrencyPicker, currentBillingDay, setBillingDayInput, setShowBillingDayPicker, handleToggleTheme, navigation, notifSettings, handleReminderToggle, smsEnabled, handleSmsToggle, isOwner, aiStatus, handleOpenAiSettings, handleExportData, lastSyncSubtitle, handleSyncNow, setShowFirebaseCleanup }: SettingsSectionsProps) {
  const { spacing, currencyCode, currencySymbol, typography, colors, isDark } = useAppTheme();

  return (<ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: tabBarHeight + 100 }} showsVerticalScrollIndicator={false}>
    <SectionLabel text="ACCOUNT" />
    <GlassCard>
      <SettingRow
        icon="person-outline"
        title={
          isGuest
            ? user?.displayName || "Guest User"
            : user?.displayName || "Profile Information"
        }
        subtitle={
          isGuest
            ? "Guest Mode — Data stored locally on device only"
            : user?.email
              ? `Signed in as ${user.email}`
              : "Tap to customize your display name"
        }
        onPress={() => {
          setProfileNameInput(
            isGuest
              ? user?.displayName || "Guest User"
              : user?.displayName || "",
          );
          setShowProfileModal(true);
        }}
      />
      {isGuest && (
        <SettingRow
          icon="log-in-outline"
          title="Sign In / Create Account"
          subtitle="Upgrade from Guest Mode to enable Firebase cloud sync"
          onPress={handleSignOut}
        />
      )}
    </GlassCard>

    <SectionLabel text="PREFERENCES" />
    <GlassCard>
      <SettingRow
        icon="cash-outline"
        title="Currency"
        subtitle={`Base currency for display (${currencyCode} • ${currencySymbol})`}
        rightElement={
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[typography.bodyLarge, { color: colors.primary, fontWeight: "700", marginRight: 8 }]}>
              {currencyCode}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} />
          </View>
        }
        onPress={() => setShowCurrencyPicker(true)}
      />
      <SettingRow
        icon="calendar-outline"
        title="Billing Cycle"
        subtitle={`Starts on day ${currentBillingDay} of each month`}
        onPress={() => {
          setBillingDayInput(String(currentBillingDay));
          setShowBillingDayPicker(true);
        }}
      />
      <SettingRow
        icon={isDark ? "moon-outline" : "sunny-outline"}
        title="Dark Mode"
        subtitle={isDark ? "Active — Matte Slate dark theme" : "Disabled — Crisp Alabaster light theme"}
        rightElement={
          <Switch
            value={isDark}
            onValueChange={handleToggleTheme}
          />
        }
        onPress={() => handleToggleTheme(!isDark)}
      />
      <SettingRow icon="apps-outline" title="Categories" subtitle="Manage transaction categories and icons" onPress={() => navigation.navigate("CategoryManagement")} />
      <SettingRow
        icon="wallet-outline"
        title="Wallets & Accounts"
        subtitle="Manage accounts, custom icons, and balances"
        onPress={() => navigation.navigate("WalletManagement")}
      />
      <SettingRow
        icon="notifications-outline"
        title="Daily Reminders"
        subtitle={
          notifSettings.transactionReminders
            ? "Active — morning & evening reminders"
            : "Disabled — tap to enable"
        }
        rightElement={
          <Switch
            value={notifSettings.transactionReminders}
            onValueChange={handleReminderToggle}
          />
        }
        onPress={() => handleReminderToggle(!notifSettings.transactionReminders)}
      />
      {Platform.OS === "android" && (
        <>
          <SettingRow
            icon="chatbubble-outline"
            title="SMS Transaction Detection"
            subtitle={smsEnabled ? "Active — listening for bank SMS" : "Disabled — tap to enable"}
            rightElement={
              <Switch
                value={smsEnabled}
                onValueChange={handleSmsToggle}
              />
            }
            onPress={() => handleSmsToggle(!smsEnabled)}
          />
          {smsEnabled && (
            <SettingRow
              icon="code-working-outline"
              title="SMS Detector Customization"
              subtitle="Customize bank senders, keywords & parsing rules"
              onPress={() => navigation.navigate("SmsSettings")}
            />
          )}
        </>
      )}
    </GlassCard>

    <SectionLabel text="AI ASSISTANT" />
    <GlassCard>
      <SettingRow
        icon="sparkles-outline"
        title="Cloud AI Assistant"
        subtitle={
          isOwner
            ? (aiStatus.hasCustomKey
              ? `Active (Custom key • ${aiStatus.activeModel}${aiStatus.isFallbackModel ? " - Fallback" : ""})`
              : aiStatus.hasHostedKey
                ? "Hosted Gemini (sign-in required; secure server key)"
                : "Not configured — add a provider key")
            : (aiStatus.hasCustomKey
              ? "Personal provider key saved on this device"
              : "Hosted Gemini available after sign-in")
        }
        onPress={handleOpenAiSettings}
      />
    </GlassCard>

    <SectionLabel text="DATA" />
    <GlassCard>
      <SettingRow icon="download-outline" title="Export Data" subtitle="Download your transaction history (CSV/Excel)" onPress={handleExportData} />
      <SettingRow icon="document-attach-outline" title="Import Data" subtitle="Import transactions from CSV or Excel" onPress={() => navigation.navigate("Import")} />
      <SettingRow icon="cloud-upload-outline" title="Backup & Sync" subtitle={lastSyncSubtitle} onPress={handleSyncNow} />
      <SettingRow icon="trash-outline" title="Cleanup Database" subtitle="Remove orphaned or invalid records" destructive onPress={() => setShowFirebaseCleanup(true)} />
    </GlassCard>

    <SectionLabel text="ACCOUNT" />
    <GlassCard>
      <TouchableOpacity
        style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16 }}
        onPress={handleSignOut}
      >
        <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.errorContainer, marginRight: 16 }}>
          <Ionicons name="log-out-outline" size={16} color={colors.error} />
        </View>
        <Text style={[typography.bodyLarge, { color: colors.error, fontWeight: "600" }]}>Sign Out</Text>
      </TouchableOpacity>
    </GlassCard>

  </ScrollView>);
}
