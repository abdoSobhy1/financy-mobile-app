import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { BillStackParamList } from "../types";
import { BillsListScreen } from "../screens/BillsScreen";
import BillFormScreen from "../screens/BillFormScreen";
import { BillPaymentHistoryScreen } from "../screens";

const Stack = createStackNavigator<BillStackParamList>();

const BillStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="BillList" component={BillsListScreen} />
      <Stack.Screen
        name="BillForm"
        component={BillFormScreen}
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="BillPaymentHistory"
        component={BillPaymentHistoryScreen}
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default BillStackNavigator;
