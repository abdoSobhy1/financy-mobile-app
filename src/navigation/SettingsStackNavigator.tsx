import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { SettingsStackParamList } from "../types";
import { SettingsScreen } from "../screens/SettingsScreens";
import { ImportScreen } from "../screens/ImportScreen";
import { WalletsScreen } from "../screens/WalletsScreen";

const Stack = createStackNavigator<SettingsStackParamList>();

const SettingsStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="SettingsList" component={SettingsScreen} />
      <Stack.Screen name="Wallets" component={WalletsScreen} />
      <Stack.Screen
        name="Import"
        component={ImportScreen}
        options={{
          headerShown: true,
          headerTitle: "Import Data",
        }}
      />
    </Stack.Navigator>
  );
};

export default SettingsStackNavigator;
