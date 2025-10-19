import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from "react-native";
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

export const CustomAlert: React.FC<CustomAlertProps> = ({ visible, title, message, buttons, onRequestClose }) => {
  const handleButtonPress = (button: CustomAlertButton) => {
    // First close the dialog, then execute the button action after a small delay
    if (onRequestClose) {
      onRequestClose();
    }

    // Execute button action after dialog is closed
    if (button.onPress) {
      setTimeout(() => {
        button.onPress!();
      }, 100); // Small delay to ensure dialog is fully closed
    }
  };

  const getButtonStyle = (style?: string) => {
    switch (style) {
      case "destructive":
        return [styles.button, styles.destructiveButton];
      case "cancel":
        return [styles.button, styles.cancelButton];
      default:
        return [styles.button, styles.defaultButton];
    }
  };

  const getButtonTextStyle = (style?: string) => {
    switch (style) {
      case "destructive":
        return [styles.buttonText, styles.destructiveText];
      case "cancel":
        return [styles.buttonText, styles.cancelText];
      default:
        return [styles.buttonText, styles.defaultText];
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <TouchableWithoutFeedback onPress={onRequestClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.alertContainer}>
              <View style={styles.alertContent}>
                <View style={styles.header}>
                  <Ionicons name="alert-circle" size={24} color={UI.COLORS.WARNING} style={styles.icon} />
                  <Text style={styles.title}>{title}</Text>
                </View>

                {message && <Text style={styles.message}>{message}</Text>}

                <View style={styles.buttonContainer}>
                  {buttons.map((button, index) => (
                    <TouchableOpacity key={index} style={getButtonStyle(button.style)} onPress={() => handleButtonPress(button)}>
                      <Text style={getButtonTextStyle(button.style)}>{button.text}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertContainer: {
    width: "85%",
    maxWidth: 400,
  },
  alertContent: {
    backgroundColor: UI.COLORS.SURFACE,
    borderRadius: UI.CARD_RADIUS,
    padding: UI.SPACING.LG,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: UI.SPACING.MD,
  },
  icon: {
    marginRight: UI.SPACING.SM,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  message: {
    fontSize: 16,
    color: UI.COLORS.TEXT_SECONDARY,
    marginBottom: UI.SPACING.LG,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: UI.SPACING.SM,
    marginTop: UI.SPACING.SM,
  },
  button: {
    paddingVertical: UI.SPACING.SM,
    paddingHorizontal: UI.SPACING.MD,
    borderRadius: UI.SPACING.SM,
    minWidth: 80,
    maxWidth: 150,
    alignItems: "center",
    flexShrink: 1,
  },
  defaultButton: {
    backgroundColor: UI.COLORS.PRIMARY,
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },
  destructiveButton: {
    backgroundColor: UI.COLORS.ERROR,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  defaultText: {
    color: UI.COLORS.TEXT_PRIMARY,
  },
  cancelText: {
    color: UI.COLORS.TEXT_SECONDARY,
  },
  destructiveText: {
    color: UI.COLORS.TEXT_PRIMARY,
  },
});

// Helper hook for using custom alerts
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

  const showAlert = (title: string, message?: string, buttons: CustomAlertButton[] = [{ text: "OK" }]) => {
    // If an alert is currently visible, hide it first before showing the new one
    if (alertConfig.visible) {
      setAlertConfig((prev) => ({ ...prev, visible: false }));
      setTimeout(() => {
        setAlertConfig({
          visible: true,
          title,
          message,
          buttons,
        });
      }, 100);
    } else {
      setAlertConfig({
        visible: true,
        title,
        message,
        buttons,
      });
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
