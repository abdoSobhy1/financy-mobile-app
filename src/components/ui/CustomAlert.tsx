import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../constants";

export interface CustomAlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons: CustomAlertButton[];
  onRequestClose?: () => void;
}

export const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  buttons,
  onRequestClose,
}) => {
  const handleButtonPress = (button: CustomAlertButton) => {
    if (onRequestClose) onRequestClose();
    if (button.onPress) {
      setTimeout(() => button.onPress!(), 50);
    }
  };

  // Decide icon/color based on whether there's a destructive action
  const hasDestructive = buttons.some((b) => b.style === "destructive");
  const iconName = hasDestructive ? "warning" : "information-circle";
  const iconGradient: [string, string] = hasDestructive
    ? ["#FF6B6B", "#EE5A24"]
    : [UI.COLORS.PRIMARY, UI.COLORS.PRIMARY_DARK];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}>
      <TouchableWithoutFeedback onPress={onRequestClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Icon circle */}
              <LinearGradient
                colors={iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconCircle}>
                <Ionicons name={iconName} size={24} color="#fff" />
              </LinearGradient>

              {/* Title */}
              <Text style={styles.title}>{title}</Text>

              {/* Message */}
              {message && <Text style={styles.message}>{message}</Text>}

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                {buttons.map((button, index) => {
                  if (button.style === "destructive") {
                    return (
                      <TouchableOpacity
                        key={index}
                        activeOpacity={0.8}
                        onPress={() => handleButtonPress(button)}>
                        <LinearGradient
                          colors={["#FF6B6B", "#EE5A24"]}
                          style={styles.gradientBtn}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}>
                          <Text style={styles.gradientBtnText}>
                            {button.text}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  }

                  if (button.style === "cancel") {
                    return (
                      <TouchableOpacity
                        key={index}
                        style={styles.cancelBtn}
                        onPress={() => handleButtonPress(button)}>
                        <Text style={styles.cancelBtnText}>{button.text}</Text>
                      </TouchableOpacity>
                    );
                  }

                  // default
                  return (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.8}
                      onPress={() => handleButtonPress(button)}>
                      <LinearGradient
                        colors={[UI.COLORS.PRIMARY, UI.COLORS.PRIMARY_DARK]}
                        style={styles.gradientBtn}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}>
                        <Text style={styles.gradientBtnText}>
                          {button.text}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "85%",
    maxWidth: 360,
    backgroundColor: "#161638",
    borderRadius: 22,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.2)",
    // shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: UI.COLORS.TEXT_PRIMARY,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: UI.COLORS.TEXT_MUTED,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 6,
  },
  buttonContainer: {
    width: "100%",
    gap: 10,
    marginTop: 18,
  },
  gradientBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: UI.COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  gradientBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  cancelBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.2)",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: UI.COLORS.TEXT_MUTED,
  },
});

// ── useCustomAlert Hook ──────────────────────────────────────────────
export const useCustomAlert = () => {
  const [alertConfig, setAlertConfig] = React.useState<{
    visible: boolean;
    title: string;
    message?: string;
    buttons: CustomAlertButton[];
  }>({
    visible: false,
    title: "",
    buttons: [],
  });

  const showAlert = (
    title: string,
    message?: string,
    buttons: CustomAlertButton[] = [{ text: "OK" }],
  ) => {
    if (alertConfig.visible) {
      setAlertConfig((prev) => ({ ...prev, visible: false }));
      setTimeout(() => {
        setAlertConfig({ visible: true, title, message, buttons });
      }, 100);
    } else {
      setAlertConfig({ visible: true, title, message, buttons });
    }
  };

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  const AlertComponent = () => (
    <CustomAlert
      visible={alertConfig.visible}
      title={alertConfig.title}
      message={alertConfig.message}
      buttons={alertConfig.buttons}
      onRequestClose={hideAlert}
    />
  );

  return { showAlert, hideAlert, AlertComponent };
};
