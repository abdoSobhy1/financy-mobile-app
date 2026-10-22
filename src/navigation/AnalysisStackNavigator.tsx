import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { AnalysisScreen } from "../screens/analysis/AnalysisScreen";
import { CreateCustomChartScreen } from "../screens/analysis/CreateCustomChartScreen";
import { UI } from "../constants";
import { useAppTheme } from "../components/ui/ThemeProvider";

import { AnalysisStackParamList } from "../types";

const Stack = createStackNavigator<AnalysisStackParamList>();

const AnalysisStackNavigator: React.FC = () => {
  const { colors } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen
        name="AnalysisHome"
        component={AnalysisScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="CreateCustomChart"
        component={CreateCustomChartScreen}
        options={({ route }) => ({
          title: route.params?.isEditing ? "Edit Chart" : "Create Chart",
          presentation: "modal",
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.onSurface,
          headerTitleStyle: {
            fontWeight: "600",
          },
        })}
      />
    </Stack.Navigator>
  );
};

export default AnalysisStackNavigator;
