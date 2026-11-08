import { getStyles } from "../screens/CreateCustomChartScreen.styles";
import type { useCreateCustomChartScreen } from "../hooks/useCreateCustomChartScreen";

import { Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

interface CustomChartHeaderProps {
  styles: ReturnType<typeof getStyles>;
  navigation: ReturnType<typeof useCreateCustomChartScreen>["navigation"];
  colors: ReturnType<typeof useAppTheme>["colors"];
  isEditing: ReturnType<typeof useCreateCustomChartScreen>["isEditing"];
}
export function CustomChartHeader({ styles, navigation, colors, isEditing }: CustomChartHeaderProps) {

  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.onBackground} />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? "Edit Chart" : "Create Chart"}</Text>
        <View style={styles.headerSpacer} />
      </View>
    </View>
  );

}
