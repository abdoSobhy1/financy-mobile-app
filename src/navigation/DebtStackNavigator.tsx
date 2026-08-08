import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import DebtsScreen from "../screens/DebtsScreen";
import DebtFormScreen from "../screens/DebtFormScreen";
import AddPaymentScreen from "../screens/AddPaymentScreen";
import DebtPaymentsScreen from "../screens/DebtPaymentsScreen";
import { UI } from "../constants";
import { useAppTheme } from "../components/ui/ThemeProvider";


export type DebtStackParamList = {
  DebtsList: undefined;
  DebtForm: { debtId?: string }; // Unified form for both add and edit
  AddPayment: {
    debtId: string;
    debtName: string;
    currentBalance: number;
    minimumPayment?: number;
    interestRate?: number;
  };
  PaymentHistory: { debtId: string };
  DebtPayments: { debtId: string; debtName: string };
  EditPayment: { debtId: string; debtName: string; payment: any };
};

const Stack = createStackNavigator<DebtStackParamList>();

const DebtStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#1A1A2E",
          borderBottomColor: "rgba(255,255,255,0.1)",
          borderBottomWidth: 1,
        },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: {
          fontWeight: "600",
          fontSize: 18,
        },
        headerBackTitle: "",
      }}>
      <Stack.Screen
        name="DebtsList"
        component={DebtsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="DebtForm"
        component={DebtFormScreen}
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="AddPayment"
        component={AddPaymentScreen}
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="DebtPayments"
        component={DebtPaymentsScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default DebtStackNavigator;
