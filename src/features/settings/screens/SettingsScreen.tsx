import { SettingsSections } from "../components/SettingsSections";
import { CurrencyPickerModal } from "../components/CurrencyPickerModal";
import { BillingDayModal } from "../components/BillingDayModal";
import { ProfileEditorModal } from "../components/ProfileEditorModal";
import { AiSettingsModal } from "../components/AiSettingsModal";

import { useSettingsScreen } from "../hooks/useSettingsScreen";

import React from "react";
import { StatusBar } from "react-native";

import { useAppTheme } from "../../../shared/theme/ThemeProvider";

import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "../../../shared/ui";

import { FirebaseCleanupModal } from "../components/FirebaseCleanupModal";

export const SettingsScreen: React.FC = () => {
  const settings = useSettingsScreen();
  const {
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
    showProfileModal,
    setShowProfileModal,
    profileNameInput,
    setProfileNameInput,
    savingProfile,
    isGuest,
    handleSaveProfile,
    parsedBillingDay,
    isBillingDayValid,
    getBillingDayError,
    saveBillingDay,
    handleSelectCurrency,
  } = settings;
  const { colors, isDark } = useAppTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

      <AppHeader title="Settings" showSettings={false} />

      <SettingsSections settings={settings} />

      <CurrencyPickerModal
        showCurrencyPicker={showCurrencyPicker}
        setShowCurrencyPicker={setShowCurrencyPicker}
        handleSelectCurrency={handleSelectCurrency}
      />

      <BillingDayModal
        showBillingDayPicker={showBillingDayPicker}
        setShowBillingDayPicker={setShowBillingDayPicker}
        isBillingDayValid={isBillingDayValid}
        billingDayInput={billingDayInput}
        setBillingDayInput={setBillingDayInput}
        parsedBillingDay={parsedBillingDay}
        getBillingDayError={getBillingDayError}
        saveBillingDay={saveBillingDay}
      />

      <ProfileEditorModal
        showProfileModal={showProfileModal}
        setShowProfileModal={setShowProfileModal}
        isGuest={isGuest}
        profileNameInput={profileNameInput}
        setProfileNameInput={setProfileNameInput}
        user={user}
        savingProfile={savingProfile}
        handleSaveProfile={handleSaveProfile}
      />

      <AiSettingsModal settings={settings} />

      <FirebaseCleanupModal
        visible={showFirebaseCleanup}
        onClose={() => setShowFirebaseCleanup(false)}
      />

      <AlertComponent />
    </SafeAreaView>
  );
};
