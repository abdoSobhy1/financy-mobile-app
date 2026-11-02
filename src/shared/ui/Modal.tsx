import React from "react";
import { Modal as RNModal, View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../theme/ThemeProvider";
import { ToastOverlay } from "./ToastProvider";

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
  const { colors, typography, radius, spacing } = useAppTheme();

  const renderContent = () => (
    <SafeAreaView style={[styles.container, { backgroundColor: "rgba(0, 0, 0, 0.5)" }]} edges={["top"]}>
      <View
        style={[
          styles.modal,
          {
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg * 2,
            borderTopRightRadius: radius.lg * 2,
            borderColor: colors.outlineVariant,
            paddingBottom: Platform.OS === "ios" ? 34 : spacing.lg,
          },
        ]}>
        {(title || showCloseButton) && (
          <View style={[styles.header, { borderBottomColor: colors.outlineVariant, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
            {title && (
              <Text style={[typography.h3, { flex: 1, color: colors.onSurface, marginRight: spacing.md }]} numberOfLines={1}>
                {title}
              </Text>
            )}

            {showCloseButton && (
              <TouchableOpacity
                style={[
                  styles.closeButton,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.outlineVariant,
                  },
                ]}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={16} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={[{ flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl }]}>
          {scrollable ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.xl }}
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
      style={{ flex: 1 }}
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
      <ToastOverlay />
    </RNModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modal: {
    maxHeight: "85%",
    minHeight: "40%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 25,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});

export default Modal;
