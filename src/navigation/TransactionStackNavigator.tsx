import { createStackNavigator } from "@react-navigation/stack";
import { TransactionStackParamList } from "../types";
import { DashboardScreen } from "../screens/DashboardScreen";
import { TransactionListScreen } from "../screens/TransactionListScreen";
import AddTransactionScreen from "../screens/AddTransactionScreen";
import { VoiceInputScreen } from "../screens/VoiceInputScreen";
import { VoiceVerifyScreen } from "../screens/VoiceVerifyScreen";

const Stack = createStackNavigator<TransactionStackParamList>();

const TransactionStackNavigator = () => (
  <Stack.Navigator
    initialRouteName="Dashboard"
    screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Dashboard" component={DashboardScreen} />
    <Stack.Screen name="TransactionList" component={TransactionListScreen} />
    <Stack.Screen
      name="AddTransaction"
      component={AddTransactionScreen}
      options={{
        presentation: "modal",
        headerShown: false,
        cardStyle: { backgroundColor: "transparent" },
      }}
    />
    {/* <Stack.Screen name="EditTransaction" component={EditTransactionScreen} /> */}
    <Stack.Screen name="VoiceInput" component={VoiceInputScreen} />
    <Stack.Screen name="VoiceVerify" component={VoiceVerifyScreen} />
  </Stack.Navigator>
);

export default TransactionStackNavigator;
