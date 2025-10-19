import React from "react";
import { Modal as RNModal, View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { UI } from "../../constants";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  animationType?: "slide" | "fade" | "none";
  presentationStyle?: "fullScreen" | "pageSheet" | "formSheet" | "overFullScreen";
  showCloseButton?: boolean;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  animationType = "slide",
  presentationStyle = "pageSheet",
  showCloseButton = true,
  scrollable = false,
  keyboardAvoiding = true,
}) => {
  const renderContent = () => (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.modal}>
        {(title || showCloseButton) && (
          <View style={styles.header}>
            {title && (
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            )}

            {showCloseButton && (
              <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={16} color={UI.COLORS.TEXT_SECONDARY} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.content}>
          {scrollable ? (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              bounces={false}>
              {children}
            </ScrollView>
          ) : (
            children
          )}
        </View>
      </View>
    </SafeAreaView>
  );

  const content = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}>
      {renderContent()}
    </KeyboardAvoidingView>
  ) : (
    renderContent()
  );

  return (
    <RNModal visible={visible} animationType={animationType} presentationStyle={presentationStyle} onRequestClose={onClose} statusBarTranslucent>
      <StatusBar backgroundColor="rgba(0, 0, 0, 0.5)" barStyle="light-content" />
      {content}
    </RNModal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },

  container: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 15, 35, 0.95)",
  },

  modal: {
    backgroundColor: UI.COLORS.SURFACE,
    borderTopLeftRadius: UI.CARD_RADIUS * 2,
    borderTopRightRadius: UI.CARD_RADIUS * 2,
    maxHeight: "85%",
    minHeight: "40%",
    paddingBottom: Platform.OS === "ios" ? 34 : UI.SPACING.LG,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 25,
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: UI.SPACING.LG,
    paddingVertical: UI.SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.BORDER,
  },

  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: UI.COLORS.TEXT_PRIMARY,
    marginRight: UI.SPACING.MD,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: UI.COLORS.SURFACE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: UI.COLORS.BORDER,
  },

  content: {
    flex: 1,
    paddingHorizontal: UI.SPACING.LG,
    paddingTop: UI.SPACING.MD,
    paddingBottom: UI.SPACING.XL,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: UI.SPACING.XL,
  },
});

export default Modal;
