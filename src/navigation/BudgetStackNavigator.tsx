import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { BudgetStackParamList } from "../types";
import { BudgetListScreen, BudgetDetailsScreen } from "../screens/BudgetScreens";
import BudgetFormScreen from "../screens/BudgetFormScreen";

const Stack = createStackNavigator<BudgetStackParamList>();

const BudgetStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="BudgetList" component={BudgetListScreen} />
      <Stack.Screen name="BudgetDetails" component={BudgetDetailsScreen} />
      <Stack.Screen
        name="BudgetForm"
        component={BudgetFormScreen}
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default BudgetStackNavigator;
