import { ReceiptScanResult } from "./ReceiptScanResult";
import { styles } from "./ReceiptScanModal.styles";
import { useReceiptScanModal } from "../hooks/useReceiptScanModal";
import React from "react";
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, TouchableWithoutFeedback } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../shared/theme/ThemeProvider";
import { ToastOverlay } from "../../../shared/ui";
import type { OcrReceiptResult } from "../services/ocrService";

import { Category } from "../../../shared/types";

interface ReceiptScanModalProps {
  visible: boolean;
  onClose: () => void;
  categories: Record<string, Category>;
  onScanComplete: (result: OcrReceiptResult, assetUri: string) => void;
}

export const ReceiptScanModal: React.FC<ReceiptScanModalProps> = ({
  visible,
  onClose,
  categories,
  onScanComplete,
}) => {
  const { isProcessing, statusMessage, quota, handleDocumentScanner, handleGalleryPick, handleDocumentPick } = useReceiptScanModal({ visible, onClose, categories, onScanComplete });
  const { colors, typography } = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isProcessing) onClose();
      }}>
      <TouchableWithoutFeedback onPress={() => !isProcessing && onClose()}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.outlineVariant,
                },
              ]}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: colors.primaryContainer },
                    ]}>
                    <Ionicons
                      name="scan-outline"
                      size={22}
                      color={colors.onPrimaryContainer}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        typography.h3,
                        { color: colors.onBackground, fontSize: 18 },
                      ]}>
                      Scan Receipt / Bill
                    </Text>
                    <Text
                      style={[
                        typography.bodySmall,
                        { color: colors.onSurfaceVariant, marginTop: 2 },
                      ]}>
                      Automatic item, amount & category extraction
                    </Text>
                  </View>
                </View>
                {!isProcessing && (
                  <TouchableOpacity
                    onPress={onClose}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.closeBtn}>
                    <Ionicons
                      name="close"
                      size={20}
                      color={colors.onSurfaceVariant}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Daily Gemini Scan Quota Indicator */}
              {quota && !isProcessing && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 10,
                    marginBottom: 12,
                    backgroundColor: quota.isUnlimited
                      ? colors.primaryContainer
                      : colors.surfaceVariant,
                  }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons
                      name={
                        quota.isUnlimited
                          ? "infinite-outline"
                          : quota.canScan
                            ? "sparkles-outline"
                            : "phone-portrait-outline"
                      }
                      size={16}
                      color={
                        quota.isUnlimited
                          ? colors.onPrimaryContainer
                          : quota.canScan
                            ? colors.primary
                            : colors.onSurfaceVariant
                      }
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: quota.isUnlimited
                          ? colors.onPrimaryContainer
                          : quota.canScan
                            ? colors.onSurface
                          : colors.onSurfaceVariant,
                      }}>
                      {quota.isUnlimited
                        ? "Unlimited AI Receipt Scans Active"
                        : quota.canScan
                          ? `Daily AI Scans: ${quota.remainingToday} of ${quota.dailyLimit} remaining today`
                          : "AI limit reached — on-device OCR is still available"}
                    </Text>
                  </View>
                </View>
              )}

              {/* Loading State */}
              {isProcessing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text
                    style={[
                      typography.bodyMedium,
                      {
                        color: colors.onBackground,
                        fontWeight: "600",
                        marginTop: 16,
                      },
                    ]}>
                    {statusMessage}
                  </Text>
                  <Text
                    style={[
                      typography.label,
                      {
                        color: colors.onSurfaceVariant,
                        marginTop: 4,
                        textAlign: "center",
                      },
                    ]}>
                    AI & on-device OCR are recognizing items and amounts
                  </Text>
                </View>
              ) : (
                /* Options List */
                <ReceiptScanResult colors={colors} handleDocumentScanner={handleDocumentScanner} typography={typography} handleGalleryPick={handleGalleryPick} handleDocumentPick={handleDocumentPick} />
              )}

              {/* Cancel Button */}
              {!isProcessing && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[
                    styles.cancelBtn,
                    {
                      borderColor: colors.outlineVariant,
                      backgroundColor: colors.surfaceVariant,
                    },
                  ]}
                  onPress={onClose}>
                  <Text
                    style={[
                      typography.bodyMedium,
                      { color: colors.onSurfaceVariant, fontWeight: "600" },
                    ]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
      <ToastOverlay visible={visible} priority={1} />
    </Modal>
  );
};
