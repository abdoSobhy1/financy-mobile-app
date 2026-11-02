import { SettingsSections } from "../components/SettingsSections";
import { CurrencyPickerModal } from "../components/CurrencyPickerModal";
import { BillingDayModal } from "../components/BillingDayModal";
import { ProfileEditorModal } from "../components/ProfileEditorModal";
import { AiSettingsModal } from "../components/AiSettingsModal";

import { getStyles } from "./SettingsScreen.styles";
import { useSettingsScreen } from "../hooks/useSettingsScreen";

import React from "react";
import { StatusBar } from "react-native";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";

import { SafeAreaView } from "react-native-safe-area-context";

import { useTabBarHeight, AppHeader } from "../../../shared/ui";

import { FirebaseCleanupModal } from "../../../infrastructure/firebase/components/FirebaseCleanupModal";

// ═══════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════
export const SettingsScreen: React.FC = () => {
  const {
    handleSignOut,
    handleOpenAiSettings,
    navigation,
    user,
    showBillingDayPicker,
    setShowBillingDayPicker,
    showCurrencyPicker,
    setShowCurrencyPicker,
    billingDayInput,
    setBillingDayInput,
    showFirebaseCleanup,
    setShowFirebaseCleanup,
    AlertComponent,
    smsEnabled,
    showProfileModal,
    setShowProfileModal,
    profileNameInput,
    setProfileNameInput,
    savingProfile,
    notifSettings,
    isOwner,
    showAiModal,
    setShowAiModal,
    aiKeyInput,
    setAiKeyInput,
    selectedAiProvider,
    setSelectedAiProvider,
    isTestingAi,
    showAiKeySecret,
    setShowAiKeySecret,
    aiStatus,
    geminiUsage,
    geminiFallbackModels,
    geminiModelMetadata,
    showModelChain,
    setShowModelChain,
    isGuest,
    currentBillingDay,
    handleSaveAiConfig,
    handleTestAi,
    handleResetGeminiQuota,
    handleSaveProfile,
    handleReminderToggle,
    handleSmsToggle,
    parsedBillingDay,
    isBillingDayValid,
    getBillingDayError,
    saveBillingDay,
    handleSelectCurrency,
    handleToggleTheme,
    lastSyncSubtitle,
    handleVersionClick,
    handleSyncNow,
    handleExportData
  } = useSettingsScreen();
  const { colors, typography, spacing, radius, isDark, currencyCode, currencySymbol } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const tabBarHeight = useTabBarHeight();

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

      {/* Top Header */}
      <AppHeader title="Settings" showSettings={false} />

      <SettingsSections tabBarHeight={tabBarHeight} isGuest={isGuest} user={user} setProfileNameInput={setProfileNameInput} setShowProfileModal={setShowProfileModal} handleSignOut={handleSignOut} setShowCurrencyPicker={setShowCurrencyPicker} currentBillingDay={currentBillingDay} setBillingDayInput={setBillingDayInput} setShowBillingDayPicker={setShowBillingDayPicker} handleToggleTheme={handleToggleTheme} navigation={navigation} notifSettings={notifSettings} handleReminderToggle={handleReminderToggle} smsEnabled={smsEnabled} handleSmsToggle={handleSmsToggle} isOwner={isOwner} aiStatus={aiStatus} handleOpenAiSettings={handleOpenAiSettings} handleExportData={handleExportData} lastSyncSubtitle={lastSyncSubtitle} handleSyncNow={handleSyncNow} setShowFirebaseCleanup={setShowFirebaseCleanup} handleVersionClick={handleVersionClick} />

      {/* Currency Picker Modal */}
      <CurrencyPickerModal showCurrencyPicker={showCurrencyPicker} setShowCurrencyPicker={setShowCurrencyPicker} handleSelectCurrency={handleSelectCurrency} />

      <BillingDayModal showBillingDayPicker={showBillingDayPicker} setShowBillingDayPicker={setShowBillingDayPicker} isBillingDayValid={isBillingDayValid} billingDayInput={billingDayInput} setBillingDayInput={setBillingDayInput} parsedBillingDay={parsedBillingDay} getBillingDayError={getBillingDayError} saveBillingDay={saveBillingDay} />

      {/* Profile Information Modal */}
      <ProfileEditorModal showProfileModal={showProfileModal} setShowProfileModal={setShowProfileModal} isGuest={isGuest} profileNameInput={profileNameInput} setProfileNameInput={setProfileNameInput} user={user} savingProfile={savingProfile} handleSaveProfile={handleSaveProfile} />

      {/* ── AI Configuration Modal ── */}
      <AiSettingsModal showAiModal={showAiModal} setShowAiModal={setShowAiModal} isOwner={isOwner} aiStatus={aiStatus} selectedAiProvider={selectedAiProvider} handleResetGeminiQuota={handleResetGeminiQuota} setSelectedAiProvider={setSelectedAiProvider} setShowModelChain={setShowModelChain} showModelChain={showModelChain} geminiUsage={geminiUsage} geminiFallbackModels={geminiFallbackModels} geminiModelMetadata={geminiModelMetadata} aiKeyInput={aiKeyInput} setAiKeyInput={setAiKeyInput} showAiKeySecret={showAiKeySecret} setShowAiKeySecret={setShowAiKeySecret} handleTestAi={handleTestAi} isTestingAi={isTestingAi} handleSaveAiConfig={handleSaveAiConfig} />

      <FirebaseCleanupModal
        visible={showFirebaseCleanup}
        onClose={() => setShowFirebaseCleanup(false)}
      />

      <AlertComponent />
    </SafeAreaView>
  );
};
