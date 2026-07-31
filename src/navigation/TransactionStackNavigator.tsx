import { createStackNavigator } from "@react-navigation/stack";
import { TransactionStackParamList } from "../types";
import { DashboardScreen } from "../screens/DashboardScreen";
import { TransactionListScreen } from "../screens/TransactionListScreen";
import AddTransactionScreen from "../screens/AddTransactionScreen";

const Stack = createStackNavigator<TransactionStackParamList>();

const TransactionStackNavigator = () => (
  <Stack.Navigator initialRouteName="Dashboard" screenOptions={{ headerShown: false }}>
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
  </Stack.Navigator>
);

export default TransactionStackNavigator;