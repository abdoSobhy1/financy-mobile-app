import { createStackNavigator } from "@react-navigation/stack";
import { TransactionStackParamList } from "../types";
import { TransactionListScreen } from "../screens/TransactionScreens";
import AddTransactionScreen from "../screens/AddTransactionScreen";

const Stack = createStackNavigator<TransactionStackParamList>();

const TransactionStackNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
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
