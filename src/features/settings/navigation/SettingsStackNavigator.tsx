import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { SettingsStackParamList } from "../../../shared/types";
import { SettingsScreen } from "../screens/SettingsScreen";
import { ImportScreen } from "../../import/screens/ImportScreen";
import { CategoriesScreen } from "../../categories/screens/CategoriesScreen";
import { WalletManagementScreen } from "../../wallets/screens/WalletManagementScreen";
import { SmsDetectorSettingsScreen } from "../../sms/screens/SmsDetectorSettingsScreen";

const Stack = createStackNavigator<SettingsStackParamList>();

const SettingsStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="SettingsList" component={SettingsScreen} />
      <Stack.Screen name="CategoryManagement" component={CategoriesScreen} />
      <Stack.Screen name="WalletManagement" component={WalletManagementScreen} />
      <Stack.Screen name="SmsSettings" component={SmsDetectorSettingsScreen} />
      <Stack.Screen name="Import" component={ImportScreen} />
    </Stack.Navigator>
  );
};

export default SettingsStackNavigator;
