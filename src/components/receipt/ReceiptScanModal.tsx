import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../ui/ThemeProvider";
import { ToastOverlay } from "../ui";
import {
  OCRService,
  OcrReceiptResult,
  DocumentAsset,
} from "../../services/ocrService";
import {
  getOcrQuotaStatus,
  getCachedOcrQuotaSync,
  subscribeOcrQuota,
  OcrQuotaStatus,
} from "../../services/ocrRateLimitService";
import { Category } from "../../types";

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
  const { colors, typography } = useAppTheme();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Analyzing receipt...");
  const [quota, setQuota] = useState<OcrQuotaStatus | null>(() =>
    getCachedOcrQuotaSync(),
  );

  useEffect(() => {
    const unsubscribe = subscribeOcrQuota((latest) => {
      setQuota(latest);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (visible) {
      const syncCached = getCachedOcrQuotaSync();
      if (syncCached) {
        setQuota(syncCached);
      }
      // Non-blocking fast check + background cloud refresh
      getOcrQuotaStatus({ fast: true })
        .then(setQuota)
        .catch(() => {});
    }
  }, [visible]);

  const ensureCanScan = async (): Promise<boolean> => {
    // Non-blocking check: uses in-memory / local cache immediately while background sync updates quota
    const latest =
      getCachedOcrQuotaSync() ?? (await getOcrQuotaStatus({ fast: true }));
    setQuota(latest);
    if (!latest.canScan) {
      Alert.alert(
        "Daily OCR Limit Reached",
        `You have used all ${latest.dailyLimit} free AI receipt scans for today. Your quota resets tomorrow.`,
      );
      return false;
    }
    return true;
  };

  const processAsset = async (asset: DocumentAsset) => {
    try {
      setIsProcessing(true);
      setStatusMessage("Extracting receipt data...");
      const result = await OCRService.scanReceiptFile(asset, categories);
      getOcrQuotaStatus({ fast: true })
        .then(setQuota)
        .catch(() => {});
      setIsProcessing(false);
      onClose();
      onScanComplete(result, asset.uri);
    } catch (err: any) {
      setIsProcessing(false);
      Alert.alert(
        "Scanning Failed",
        err?.message || "Failed to parse receipt. Please try another image or angle."
      );
    }
  };

  const handleDocumentScanner = async () => {
    if (!(await ensureCanScan())) return;
    try {
      setIsProcessing(true);
      setStatusMessage("Opening camera document scanner...");
      const uri = await OCRService.scanReceiptWithScanner();
      if (!uri) {
        setIsProcessing(false);
        return;
      }
      await processAsset({
        uri,
        name: "scanned_receipt.jpg",
        mimeType: "image/jpeg",
      });
    } catch (e: any) {
      setIsProcessing(false);
      Alert.alert("Scanner Error", e?.message || "Unable to open document scanner.");
    }
  };

  const handleGalleryPick = async () => {
    if (!(await ensureCanScan())) return;
    try {
      setIsProcessing(true);
      setStatusMessage("Selecting image...");
      const uri = await OCRService.pickReceiptFromGallery();
      if (!uri) {
        setIsProcessing(false);
        return;
      }
      await processAsset({
        uri,
        name: "gallery_receipt.jpg",
        mimeType: "image/jpeg",
      });
    } catch (e: any) {
      setIsProcessing(false);
      Alert.alert("Gallery Error", e?.message || "Unable to pick image.");
    }
  };

  const handleDocumentPick = async () => {
    if (!(await ensureCanScan())) return;
    try {
      setIsProcessing(true);
      setStatusMessage("Selecting document...");
      const asset = await OCRService.pickReceiptDocument();
      if (!asset) {
        setIsProcessing(false);
        return;
      }
      await processAsset(asset);
    } catch (e: any) {
      setIsProcessing(false);
      Alert.alert("Document Error", e?.message || "Unable to select document.");
    }
  };

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

              {/* Daily OCR Quota Indicator */}
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
                      : quota.canScan
                        ? colors.surfaceVariant
                        : colors.errorContainer,
                  }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons
                      name={
                        quota.isUnlimited
                          ? "infinite-outline"
                          : quota.canScan
                            ? "sparkles-outline"
                            : "lock-closed-outline"
                      }
                      size={16}
                      color={
                        quota.isUnlimited
                          ? colors.onPrimaryContainer
                          : quota.canScan
                            ? colors.primary
                            : colors.onErrorContainer
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
                            : colors.onErrorContainer,
                      }}>
                      {quota.isUnlimited
                        ? "Unlimited AI Receipt Scans Active"
                        : quota.canScan
                          ? `Daily AI Scans: ${quota.remainingToday} of ${quota.dailyLimit} remaining today`
                          : `Daily limit reached (${quota.dailyLimit}/${quota.dailyLimit} used today)`}
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
                <View style={styles.optionsList}>
                  {/* Option 1: Document Scanner */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.primary,
                        borderWidth: 1.5,
                      },
                    ]}
                    onPress={handleDocumentScanner}>
                    <View
                      style={[
                        styles.optionIconBox,
                        { backgroundColor: colors.primaryContainer },
                      ]}>
                      <Ionicons
                        name="camera-outline"
                        size={24}
                        color={colors.onPrimaryContainer}
                      />
                    </View>
                    <View style={styles.optionContent}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}>
                        <Text
                          style={[
                            typography.bodyMedium,
                            { color: colors.onBackground, fontWeight: "700" },
                          ]}>
                          Document Scanner
                        </Text>
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: colors.primary },
                          ]}>
                          <Text style={styles.badgeText}>SMART CROP</Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          typography.label,
                          { color: colors.onSurfaceVariant, marginTop: 2 },
                        ]}>
                        Live camera with auto-edge detection & perspective correction
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.primary}
                    />
                  </TouchableOpacity>

                  {/* Option 2: Gallery */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.outlineVariant,
                      },
                    ]}
                    onPress={handleGalleryPick}>
                    <View
                      style={[
                        styles.optionIconBox,
                        { backgroundColor: colors.surfaceVariant },
                      ]}>
                      <Ionicons
                        name="images-outline"
                        size={22}
                        color={colors.onSurfaceVariant}
                      />
                    </View>
                    <View style={styles.optionContent}>
                      <Text
                        style={[
                          typography.bodyMedium,
                          { color: colors.onBackground, fontWeight: "600" },
                        ]}>
                        Choose Photo
                      </Text>
                      <Text
                        style={[
                          typography.label,
                          { color: colors.onSurfaceVariant, marginTop: 2 },
                        ]}>
                        Select a saved receipt photo from your gallery
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.onSurfaceVariant}
                    />
                  </TouchableOpacity>

                  {/* Option 3: Document / PDF */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.outlineVariant,
                      },
                    ]}
                    onPress={handleDocumentPick}>
                    <View
                      style={[
                        styles.optionIconBox,
                        { backgroundColor: colors.surfaceVariant },
                      ]}>
                      <Ionicons
                        name="document-text-outline"
                        size={22}
                        color={colors.onSurfaceVariant}
                      />
                    </View>
                    <View style={styles.optionContent}>
                      <Text
                        style={[
                          typography.bodyMedium,
                          { color: colors.onBackground, fontWeight: "600" },
                        ]}>
                        PDF or File
                      </Text>
                      <Text
                        style={[
                          typography.label,
                          { color: colors.onSurfaceVariant, marginTop: 2 },
                        ]}>
                        Browse files for digital invoice, slip or PDF
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.onSurfaceVariant}
                    />
                  </TouchableOpacity>
                </View>
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
      <ToastOverlay />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 32,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
  },
  optionsList: {
    gap: 12,
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  optionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionContent: {
    flex: 1,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginTop: 4,
  },
  loadingContainer: {
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
